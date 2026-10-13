import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/rewards-native.server.ts'],outdir:'.shopify/rewards-native-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {readNativeRewardEvidence,REWARDS_ORDER_QUERY}=await import('../.shopify/rewards-native-test/rewards-native.server.js');
const db=new PrismaClient(),shop=`rewards-native-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/860',id='gid://shopify/Order/861';process.env.ALLOWED_SHOP=shop;
const money=amount=>({shopMoney:{amount,currencyCode:'SGD'}});
const makeOrder=()=>({id,createdAt:new Date().toISOString(),currencyCode:'SGD',displayFinancialStatus:'PAID',cancelledAt:null,customer:{id:customer},disputes:[],totalPriceSet:money('110'),totalReceivedSet:money('110'),totalRefundedSet:money('0'),totalTaxSet:money('0'),transactions:[{id:'gid://shopify/OrderTransaction/862',status:'SUCCESS',kind:'SALE',gateway:'gift_card',amountSet:money('50')},{id:'gid://shopify/OrderTransaction/863',status:'SUCCESS',kind:'SALE',gateway:'fixture_direct',amountSet:money('60')}],lineItems:{pageInfo:{hasNextPage:false},nodes:[{id:'gid://shopify/LineItem/864',quantity:1,currentQuantity:1,isGiftCard:false,priceAfterAllDiscountsBeforeTaxesSet:money('100'),product:{id:'gid://shopify/Product/865',stream:{jsonValue:'ready_series'}}}]}});
let order=makeOrder(),domain=shop;
const admin={graphql:async(query)=>{assert.equal(query,REWARDS_ORDER_QUERY);return new Response(JSON.stringify({data:{shop:{myshopifyDomain:domain,currencyCode:'SGD'},order}}));}};
test.after(async()=>{await db.operationalLine.deleteMany({where:{shop}});await db.commercePolicy.deleteMany({where:{shop}});await db.$disconnect();});
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
