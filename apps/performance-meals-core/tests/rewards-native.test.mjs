import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/rewards-native.server.ts','app/services/rewards-policy.ts'],outdir:'.shopify/rewards-native-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {readNativeRewardEvidence,REWARDS_ORDER_QUERY}=await import('../.shopify/rewards-native-test/rewards-native.server.js');
const {calculateRewardPoints}=await import('../.shopify/rewards-native-test/rewards-policy.js');
const db=new PrismaClient(),shop=`rewards-native-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/860',id='gid://shopify/Order/861';process.env.ALLOWED_SHOP=shop;
const money=amount=>({shopMoney:{amount,currencyCode:'SGD'}});
const makeOrder=()=>({id,createdAt:new Date().toISOString(),currencyCode:'SGD',taxesIncluded:false,displayFinancialStatus:'PAID',cancelledAt:null,customer:{id:customer},disputes:[],shippingLines:{nodes:[{isRemoved:false,discountedPriceSet:money('10'),taxLines:[]}],pageInfo:{hasNextPage:false}},totalPriceSet:money('110'),totalReceivedSet:money('110'),totalRefundedSet:money('0'),totalTaxSet:money('0'),transactions:[{id:'gid://shopify/OrderTransaction/862',status:'SUCCESS',kind:'SALE',gateway:'gift_card',processedAt:'2026-10-13T04:00:00Z',amountSet:money('50')},{id:'gid://shopify/OrderTransaction/863',status:'SUCCESS',kind:'SALE',gateway:'fixture_direct',processedAt:'2026-10-13T04:01:00Z',amountSet:money('60')}],lineItems:{pageInfo:{hasNextPage:false},nodes:[{id:'gid://shopify/LineItem/864',quantity:1,currentQuantity:1,isGiftCard:false,priceAfterAllDiscountsBeforeTaxesSet:money('100'),taxLines:[],product:{id:'gid://shopify/Product/865',stream:{jsonValue:'ready_series'}}}]}});
let order=makeOrder(),domain=shop;
const admin={graphql:async(query)=>{assert.equal(query,REWARDS_ORDER_QUERY);return new Response(JSON.stringify({data:{shop:{myshopifyDomain:domain,currencyCode:'SGD'},order}}));}};
test.after(async()=>{await db.walletEntry.deleteMany({where:{shop}});await db.operationalLine.deleteMany({where:{shop}});await db.commercePolicy.deleteMany({where:{shop}});await db.$disconnect();});
test('native successful Gift Card/direct payments prove only the customer-paid food portion',async()=>{
 await db.operationalLine.create({data:{shop,orderGid:id,orderLineGid:'gid://shopify/LineItem/864',customerGid:customer,productGid:'gid://shopify/Product/865',businessStream:'ready_series',validationStatus:'VALIDATED'}});
 await db.commercePolicy.create({data:{shop,rewardsRules:JSON.stringify({directPaymentGateways:['fixture_direct']})}});
 const result=await readNativeRewardEvidence(admin,shop,id);
 assert.equal(result.lines[0].funding.direct_customer,5000);
 assert.equal(result.lines[0].funding.gift_card_funded,5000);
});
test('foreign store, unpaid/changed/refunded/disputed orders cannot establish earning',async()=>{
 domain='different.myshopify.com';await assert.rejects(readNativeRewardEvidence(admin,shop,id));domain=shop;
 for(const change of [{displayFinancialStatus:'PENDING'},{totalReceivedSet:money('109')},{totalRefundedSet:money('1')},{disputes:[{id:'fixture'}]},{totalTaxSet:money('1')}]){order={...makeOrder(),...change};await assert.rejects(readNativeRewardEvidence(admin,shop,id));}
 order=makeOrder();order.lineItems.pageInfo.hasNextPage=true;await assert.rejects(readNativeRewardEvidence(admin,shop,id));
 order=makeOrder();order.lineItems.nodes[0].currentQuantity=0;await assert.rejects(readNativeRewardEvidence(admin,shop,id));
});
test('unverified direct gateway and unreconciled Store Credit cannot masquerade as customer money',async()=>{
 order=makeOrder();order.transactions[1].gateway='unverified';await assert.rejects(readNativeRewardEvidence(admin,shop,id),/not verified/);
 order=makeOrder();order.transactions[1].gateway='shopify_store_credit';await assert.rejects(readNativeRewardEvidence(admin,shop,id),/reconciliation/);
});

test('promotion time follows completed funding, not order creation or authorization',async()=>{
 order=makeOrder();order.createdAt='2026-10-12T00:00:00Z';
 order.transactions.push({id:'gid://shopify/OrderTransaction/899',status:'SUCCESS',kind:'AUTHORIZATION',gateway:'fixture_direct',processedAt:'2026-10-14T00:00:00Z',amountSet:money('60')});
 assert.equal((await readNativeRewardEvidence(admin,shop,id)).paidAt,'2026-10-13T04:01:00.000Z');
 for(const processedAt of [null,'not-a-date','2026-02-30T04:01:00Z','2026-10-13T04:01:00']){order=makeOrder();order.transactions[1].processedAt=processedAt;await assert.rejects(readNativeRewardEvidence(admin,shop,id),/completion time/);}
 order=makeOrder();
 await db.commercePolicy.update({where:{shop},data:{rewardsRules:JSON.stringify({directPaymentGateways:['fixture_direct'],earningStartsAt:'2026-10-13T04:00:30Z'})}});
 order.createdAt='2026-10-12T00:00:00Z';
 assert.equal((await readNativeRewardEvidence(admin,shop,id)).paidAt,'2026-10-13T04:01:00.000Z');
});

test('native food GST qualifies while delivery tax stays excluded',async()=>{
 order=makeOrder();order.totalPriceSet=money('119.90');order.totalReceivedSet=money('119.90');order.totalTaxSet=money('9.90');
 order.transactions[1].amountSet=money('69.90');
 order.lineItems.nodes[0].taxLines=[{priceSet:money('9.00')}];
 order.shippingLines.nodes=[{isRemoved:false,discountedPriceSet:money('10'),taxLines:[{priceSet:money('0.90')}]}];
 const result=await readNativeRewardEvidence(admin,shop,id);
 assert.equal(result.lines[0].netMinor,10900);
 assert.equal(result.lines[0].funding.direct_customer,5900);
 order.taxesIncluded=true;order.shippingLines.nodes[0].discountedPriceSet=money('10.90');
 assert.equal((await readNativeRewardEvidence(admin,shop,id)).lines[0].netMinor,10900);
 order.shippingLines.pageInfo.hasNextPage=true;await assert.rejects(readNativeRewardEvidence(admin,shop,id),/shipping tax/);
 order.shippingLines.pageInfo.hasNextPage=false;order.totalTaxSet=money('10');await assert.rejects(readNativeRewardEvidence(admin,shop,id),/tax totals/);
});

test('discounted multi-quantity food includes GST once without multiplying the native line total',async()=>{
 order=makeOrder();
 // Native field is the entire discounted line subtotal, not a unit price.
 order.lineItems.nodes[0].quantity=2;order.lineItems.nodes[0].currentQuantity=2;
 order.lineItems.nodes[0].priceAfterAllDiscountsBeforeTaxesSet=money('20');
 order.lineItems.nodes[0].taxLines=[{priceSet:money('1.80')}];
 order.totalTaxSet=money('1.80');order.totalPriceSet=money('31.80');order.totalReceivedSet=money('31.80');
 order.transactions=[{...order.transactions[1],amountSet:money('31.80')}];
 const exclusive=await readNativeRewardEvidence(admin,shop,id);
 assert.equal(exclusive.lines[0].netMinor,2180);assert.equal(exclusive.lines[0].funding.direct_customer,2180);
 order.taxesIncluded=true;
 const inclusive=await readNativeRewardEvidence(admin,shop,id);
 assert.equal(inclusive.lines[0].netMinor,2180);
 assert.equal(inclusive.lines[0].funding.direct_customer,2180);
});

test('unidentified fees and removed shipping cannot masquerade as delivery allocation',async()=>{
 order=makeOrder();order.shippingLines.nodes[0].discountedPriceSet=money('9');
 await assert.rejects(readNativeRewardEvidence(admin,shop,id),/total incomplete/);
 order=makeOrder();order.shippingLines.nodes[0].isRemoved=true;
 await assert.rejects(readNativeRewardEvidence(admin,shop,id),/shipping tax/);
});

test('verified Reward-funded native Wallet debit uses only remaining food/delivery proportions',async()=>{
 order=makeOrder();order.transactions[1].amountSet=money('40');
 const transaction='gid://shopify/OrderTransaction/866';
 order.transactions.push({id:transaction,status:'SUCCESS',kind:'SALE',gateway:'shopify_store_credit',processedAt:'2026-10-13T04:02:00Z',amountSet:money('20')});
 const debit=await db.walletEntry.create({data:{shop,customerGid:customer,currency:'SGD',sourceEvent:'reward-funding-fixture',sourceGid:id,sourceKind:'reward_funded',nativeSourceTransactionGid:transaction,fundedDelta:-2000,bonusDelta:0,fundedAllocations:JSON.stringify([{creditEntryId:'fixture-reward-credit',sourceKind:'reward_funded',amountMinor:2000}])}});
 const result=await readNativeRewardEvidence(admin,shop,id);
 assert.equal(result.lines[0].funding.direct_customer,3333);
 assert.equal(result.lines[0].funding.reward_funded,1667);
 assert.equal(result.lines[0].funding.gift_card_funded,5000);
 await db.walletEntry.update({where:{id:debit.id},data:{customerGid:'gid://shopify/Customer/999'}});
 await assert.rejects(readNativeRewardEvidence(admin,shop,id),/reconciliation/);
 await db.walletEntry.delete({where:{id:debit.id}});
});

test('mixed Gift Card purchases cannot silently absorb Reward allocation intended for delivery',async()=>{
 order=makeOrder();order.totalPriceSet=money('135');order.totalReceivedSet=money('135');order.transactions[1].amountSet=money('85');
 order.lineItems.nodes.push({id:'gid://shopify/LineItem/867',quantity:1,currentQuantity:1,isGiftCard:true,priceAfterAllDiscountsBeforeTaxesSet:money('25'),taxLines:[],product:{id:'gid://shopify/Product/868',stream:{jsonValue:'shared'}}});
 await assert.rejects(readNativeRewardEvidence(admin,shop,id),/Shared-commerce/);
 order.transactions[0].amountSet=money('0');order.transactions[1].amountSet=money('135');
 assert.equal((await readNativeRewardEvidence(admin,shop,id)).lines[0].funding.direct_customer,10000);
});

test('native mixed Wallet and direct payment preserves the verified cents-only earning result',async()=>{
 order=makeOrder();order.totalPriceSet=money('35.80');order.totalReceivedSet=money('35.80');
 order.lineItems.nodes[0].quantity=2;order.lineItems.nodes[0].currentQuantity=2;
 order.lineItems.nodes[0].priceAfterAllDiscountsBeforeTaxesSet=money('25.80');
 order.transactions[0].gateway='shopify_store_credit';order.transactions[0].amountSet=money('26.00');
 order.transactions[1].amountSet=money('9.80');
 await db.walletEntry.create({data:{shop,customerGid:customer,currency:'SGD',sourceEvent:'mixed-native-regression',sourceGid:id,sourceKind:'gift_card_funded',nativeSourceTransactionGid:order.transactions[0].id,fundedDelta:-2600,bonusDelta:0,fundedAllocations:JSON.stringify([
  {creditEntryId:'fixture-gift-remainder',sourceKind:'gift_card_funded',amountMinor:210},
  {creditEntryId:'fixture-returned-gift',sourceKind:'gift_card_funded',amountMinor:2290},
  {creditEntryId:'fixture-reward',sourceKind:'reward_funded',amountMinor:100},
 ])}});
 const evidence=await readNativeRewardEvidence(admin,shop,id);
 assert.deepEqual(evidence.lines[0].funding,{direct_customer:73,customer_funded:0,gift_card_funded:2500,reward_funded:7,bonus:0});
 assert.equal(calculateRewardPoints(evidence.lines,{version:'fixture',merchantApproved:true,defaultPointsPerSgd:1,rules:[]},evidence.paidAt),0);
});
