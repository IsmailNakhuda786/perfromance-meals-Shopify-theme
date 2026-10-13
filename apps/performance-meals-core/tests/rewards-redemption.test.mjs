import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/rewards-redemption.server.ts','app/services/rewards-ledger.server.ts','app/services/wallet-ledger.server.ts'],outdir:'.shopify/rewards-redemption-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {redeemRewards}=await import('../.shopify/rewards-redemption-test/rewards-redemption.server.js');
const {configureRewards,earnVerifiedOrderRewards}=await import('../.shopify/rewards-redemption-test/rewards-ledger.server.js');
const {readWalletLedger}=await import('../.shopify/rewards-redemption-test/wallet-ledger.server.js');
const db=new PrismaClient(),shop=`reward-redemption-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/810';
process.env.ALLOWED_SHOP=shop;
const rules={version:'client-20261013',merchantApproved:true,defaultPointsPerSgd:1,rules:[]};
const input={shop,customerGid:customer,orderGid:'gid://shopify/Order/811',paidAt:new Date().toISOString(),lines:[{productGid:'gid://shopify/Product/812',stream:'meal_plan',netMinor:10000,funding:{direct_customer:10000,customer_funded:0,gift_card_funded:0,reward_funded:0,bonus:0},giftCard:false,walletTopUp:false}]};
test.after(async()=>{for(const table of ['walletEntry','customerWallet','rewardRedemption','rewardsEntry','rewardsAccount','commercePolicy','rewardRuleVersion'])await db[table].deleteMany({where:{shop}});await db.$disconnect();});
test('persistent configuration does not enable earning; native-verified input earns once without auto Wallet credit',async()=>{
 await configureRewards(shop,rules);
 await assert.rejects(configureRewards(shop,{...rules,defaultPointsPerSgd:2}),/immutable/);
 await assert.rejects(earnVerifiedOrderRewards(input),/not activated/);
 await db.commercePolicy.update({where:{shop},data:{walletEnabled:false,rewardsEnabled:true}});
 await earnVerifiedOrderRewards(input);await earnVerifiedOrderRewards(input);
 assert.equal((await db.rewardsAccount.findFirst({where:{shop}})).points,100);
 assert.equal(await db.walletEntry.count({where:{shop}}),0);
});
test('redemption deducts points once and credits native-backed Wallet with Reward attribution',async()=>{
 let credits=0;
 const gateway={credit:async(owner,amount)=>{credits++;return {id:'gid://shopify/StoreCreditAccountCreditTransaction/813',ownerGid:owner,currency:'SGD',amountMinor:amount};}};
 const first=await redeemRewards(shop,customer,'test-redemption-0001',50,gateway);
 assert.equal(first.state,'COMPLETED');
 assert.equal((await redeemRewards(shop,customer,'test-redemption-0001',50,gateway)).id,first.id);
 assert.equal(credits,1);
 assert.equal((await db.rewardsAccount.findFirst({where:{shop}})).points,50);
 const ledger=await readWalletLedger(shop,customer,'SGD');
 assert.equal(ledger.sources[0].sourceKind,'reward_funded');assert.equal(ledger.sources[0].fundedDelta,500);
 assert.equal(ledger.balanceMatchesLedger,true);
 await assert.rejects(redeemRewards(shop,customer,'test-redemption-0001',60,gateway),/conflict/);
 await assert.rejects(redeemRewards(shop,customer,'test-redemption-0002',60,gateway),/Insufficient/);
});
test('lost credit response holds points and never repeats an uncertain financial mutation',async()=>{
 let calls=0;const gateway={credit:async()=>{calls++;throw Error('lost response');}};
 await assert.rejects(redeemRewards(shop,customer,'test-redemption-0003',10,gateway),/reconciliation/);
 await assert.rejects(redeemRewards(shop,customer,'test-redemption-0003',10,gateway),/reconciliation/);
 assert.equal(calls,1);
 assert.equal((await db.rewardsAccount.findFirst({where:{shop}})).points,40);
 assert.equal((await db.rewardRedemption.findFirst({where:{shop,requestKey:'test-redemption-0003'}})).state,'RECONCILIATION_REQUIRED');
});

test('confirmed native credit survives ledger failure without a second credit on recovery',async()=>{
 let credits=0;
 const nativeId='gid://shopify/StoreCreditAccountCreditTransaction/815';
 const conflict=await db.walletEntry.create({data:{shop,customerGid:'gid://shopify/Customer/999',currency:'SGD',sourceEvent:'redemption-fixture-conflict',sourceKind:'customer_funded',nativeTransactionGid:nativeId,fundedDelta:100,bonusDelta:0}});
 const gateway={credit:async(owner,amount)=>{credits++;return {id:nativeId,ownerGid:owner,currency:'SGD',amountMinor:amount};}};
 const before=(await db.customerWallet.findFirst({where:{shop,customerGid:customer}})).fundedBalance;
 await assert.rejects(redeemRewards(shop,customer,'test-redemption-0004',10,gateway));
 const pending=await db.rewardRedemption.findFirst({where:{shop,requestKey:'test-redemption-0004'}});
 assert.equal(pending.state,'AWAITING_LEDGER');assert.equal(pending.nativeTransactionGid,nativeId);
 assert.equal((await db.customerWallet.findFirst({where:{shop,customerGid:customer}})).fundedBalance,before);
 await db.walletEntry.delete({where:{id:conflict.id}});
 const recovered=await redeemRewards(shop,customer,'test-redemption-0004',10,gateway);
 assert.equal(recovered.state,'COMPLETED');assert.equal(credits,1);
 assert.equal((await db.customerWallet.findFirst({where:{shop,customerGid:customer}})).fundedBalance,before+100);
 assert.equal(await db.walletEntry.count({where:{shop,sourceGid:recovered.id,sourceKind:'reward_funded'}}),1);
});

test('concurrent same-key redemptions cannot duplicate points deductions or native credit',async()=>{
 let credits=0;
 const gateway={credit:async(owner,amount)=>{credits++;await new Promise(resolve=>setTimeout(resolve,20));return {id:'gid://shopify/StoreCreditAccountCreditTransaction/816',ownerGid:owner,currency:'SGD',amountMinor:amount};}};
 const before=(await db.rewardsAccount.findFirst({where:{shop,customerGid:customer}})).points;
 const results=await Promise.allSettled([redeemRewards(shop,customer,'test-redemption-0005',10,gateway),redeemRewards(shop,customer,'test-redemption-0005',10,gateway)]);
 assert.ok(results.some(result=>result.status==='fulfilled'));
 assert.equal(credits,1);
 assert.equal((await db.rewardsAccount.findFirst({where:{shop,customerGid:customer}})).points,before-10);
 const operation=await db.rewardRedemption.findFirst({where:{shop,requestKey:'test-redemption-0005'}});
 assert.equal(operation.state,'COMPLETED');
 assert.equal(await db.walletEntry.count({where:{shop,sourceGid:operation.id,sourceKind:'reward_funded'}}),1);
});
