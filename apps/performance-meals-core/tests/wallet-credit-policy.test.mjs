import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-credit-policy.ts'],outdir:'.shopify/wallet-credit-policy-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {approvedTopUpPackage,walletCreditTerm,planApprovedWalletSpend}=await import('../.shopify/wallet-credit-policy-test/wallet-credit-policy.js');
test('approved replacement packages preserve paid principal and exact separate bonus; labels never change expiry',()=>{
 for(const [paid,bonus,total]of [[87000,8500,95500],[174000,18500,192500],[269000,40000,309000]])assert.deepEqual([approvedTopUpPackage(paid).paidMinor,approvedTopUpPackage(paid).bonusMinor,approvedTopUpPackage(paid).totalMinor],[paid,bonus,total]);
 for(const invalid of [2000,5000,10000,20000,870,87001,NaN])assert.throws(()=>approvedTopUpPackage(invalid));
});
test('fresh claim anniversary and reminders use Singapore dates, calendar years and valid month ends',()=>{
 assert.deepEqual(walletCreditTerm('2026-11-01T04:00:00Z'),{policyVersion:'merchant-20261015',issuedAt:'2026-11-01T04:00:00.000Z',expiryDate:'2027-11-01',expiresAt:'2027-11-01T15:59:59.999Z',reminderDate:'2027-10-01'});
 assert.equal(walletCreditTerm('2028-02-29T10:00:00Z').expiryDate,'2029-02-28');
 assert.equal(walletCreditTerm('2026-01-31T15:00:00Z').reminderDate,'2026-12-31');
 assert.equal(walletCreditTerm('2026-10-31T18:00:00Z').expiryDate,'2027-11-01');
 for(const invalid of ['2026-11-01','2026-02-29T00:00:00Z','invalid',''])assert.throws(()=>walletCreditTerm(invalid));
});
const lot=(id,sourceKind,remainingMinor,issuedAt='2026-10-01T00:00:00Z',expiresAt='2027-10-01T15:59:59.999Z')=>({id,sourceKind,remainingMinor,issuedAt,expiresAt});
test('customer money then Gift Card then food-only bonus then Reward credit; expired funds and top-up loops excluded',()=>{
 const lots=[lot('r','reward_funded',1000),lot('b','bonus',1000),lot('g','gift_card_funded',1000),lot('c','customer_funded',1000),lot('expired','customer_funded',10000,'2025-01-01T00:00:00Z','2026-01-01T00:00:00Z')];
 const result=planApprovedWalletSpend(lots,[{id:'food',kind:'food',amountMinor:3500},{id:'delivery',kind:'delivery',amountMinor:500},{id:'topup',kind:'top_up',amountMinor:87000}],'2026-10-15T00:00:00Z');
 assert.deepEqual(result.allocations.map(a=>[a.creditId,a.amountMinor]),[['c',1000],['g',1000],['b',1000],['r',1000]]);
 assert.equal(result.excludedTopUpMinor,87000);
 assert.deepEqual(planApprovedWalletSpend([lot('b','bonus',1000)],[{id:'gift',kind:'gift_card',amountMinor:1000}],'2026-10-15T00:00:00Z').allocations,[]);
});
test('oldest credit within a funding category wins; input is immutable and invalid evidence rejects',()=>{
 const lots=[lot('new','customer_funded',1000,'2026-10-02T00:00:00Z'),lot('old','customer_funded',1000)];const snapshot=JSON.stringify(lots);
 assert.equal(planApprovedWalletSpend(lots,[{id:'food',kind:'food',amountMinor:100}],'2026-10-15T00:00:00Z').allocations[0].creditId,'old');assert.equal(JSON.stringify(lots),snapshot);
 assert.throws(()=>planApprovedWalletSpend([lots[0],lots[0]],[],'2026-10-15T00:00:00Z'));
 assert.throws(()=>planApprovedWalletSpend([{...lots[0],remainingMinor:-1}],[],'2026-10-15T00:00:00Z'));
});


test('principal covers delivery first and bonus can only settle food still unpaid',()=>{
 const lines=[{id:'food',kind:'food',amountMinor:10000},{id:'delivery',kind:'delivery',amountMinor:1000}];
 const plan=planApprovedWalletSpend([lot('principal','customer_funded',10000),lot('bonus','bonus',2000)],lines,'2026-10-15T00:00:00Z');
 assert.deepEqual(plan.allocations,[{creditId:'principal',sourceKind:'customer_funded',amountMinor:10000,foodMinor:9000,otherMinor:1000},{creditId:'bonus',sourceKind:'bonus',amountMinor:1000,foodMinor:1000,otherMinor:0}]);
 assert.equal(plan.remainingPurchaseMinor,0);assert.equal(plan.foodOnlyBonusMinor,1000);
 const paidFood=planApprovedWalletSpend([lot('principal','customer_funded',11000),lot('bonus','bonus',2000)],lines,'2026-10-15T00:00:00Z');
 assert.equal(paidFood.foodOnlyBonusMinor,0,'fully covered food cannot spend bonus on delivery');
 const deliveryOnly=planApprovedWalletSpend([lot('bonus','bonus',2000)],[lines[1]],'2026-10-15T00:00:00Z');
 assert.equal(deliveryOnly.remainingPurchaseMinor,1000);assert.equal(deliveryOnly.foodOnlyBonusMinor,0);
});

test('Wallet planning rejects impossible/ambiguous times and unsafe excluded top-up totals',()=>{
 const credit=lot('principal','customer_funded',1000);
 for(const now of ['2026-02-30T00:00:00Z','2026-10-15','2026-10-15T00:00:00+00:00','2026-10-15T24:00:00Z'])assert.throws(()=>planApprovedWalletSpend([credit],[],now));
 for(const field of ['issuedAt','expiresAt'])assert.throws(()=>planApprovedWalletSpend([{...credit,[field]:'2026-02-30T00:00:00Z'}],[],'2026-10-15T00:00:00Z'));
 assert.throws(()=>planApprovedWalletSpend([],Array.from({length:2},(_,i)=>({id:String(i),kind:'top_up',amountMinor:2147483647})),'2026-10-15T00:00:00Z'));
 assert.throws(()=>planApprovedWalletSpend([null],[],'2026-10-15T00:00:00Z'));
});
