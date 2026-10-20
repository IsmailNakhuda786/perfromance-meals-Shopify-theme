import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/prepaid-purchase.server.ts'],outdir:'.shopify/prepaid-purchase-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {inspectPrepaidPurchase}=await import('../.shopify/prepaid-purchase-test/prepaid-purchase.server.js');
const shop='prepaid-purchase-fixture.myshopify.com';process.env.ALLOWED_SHOP=shop;
const expected={months:3,appGid:'gid://shopify/App/1',customerGid:'gid://shopify/Customer/2',orderGid:'gid://shopify/Order/3',orderLineGid:'gid://shopify/LineItem/9',productGid:'gid://shopify/Product/4',variantGid:'gid://shopify/ProductVariant/5',sellingPlanGid:'gid://shopify/SellingPlan/6',upfrontMinor:25520};
const contractGid='gid://shopify/SubscriptionContract/7';
const money=amount=>({shopMoney:{amount,currencyCode:'SGD'}});
const fixture=()=>({shop:{myshopifyDomain:shop,currencyCode:'SGD'},currentAppInstallation:{app:{id:expected.appGid}},subscriptionContract:{id:contractGid,status:'ACTIVE',currencyCode:'SGD',app:{id:expected.appGid},customer:{id:expected.customerGid},billingPolicy:{interval:'MONTH',intervalCount:3,minCycles:1,maxCycles:null},deliveryPolicy:{interval:'MONTH',intervalCount:1},originOrder:{id:expected.orderGid,test:true,currencyCode:'SGD',customer:{id:expected.customerGid}},lines:{nodes:[{id:'gid://shopify/SubscriptionLine/8',productId:expected.productGid,variantId:expected.variantGid,sellingPlanId:expected.sellingPlanGid,quantity:1,currentPrice:{amount:'85.07',currencyCode:'SGD'}}],pageInfo:{hasNextPage:false}}},order:{id:expected.orderGid,test:true,createdAt:'2026-10-20T01:00:00Z',cancelledAt:null,currencyCode:'SGD',taxesIncluded:true,displayFinancialStatus:'PAID',customer:{id:expected.customerGid},disputes:[],totalPriceSet:money('255.20'),currentTotalPriceSet:money('255.20'),totalReceivedSet:money('255.20'),totalRefundedSet:money('0'),totalShippingPriceSet:money('0'),totalDiscountsSet:money('0'),transactions:[{id:'gid://shopify/OrderTransaction/10',test:true,status:'SUCCESS',kind:'SALE',gateway:'test-gateway',manualPaymentGateway:false,processedAt:'2026-10-20T01:01:00Z',amountSet:money('255.20')}],lineItems:{nodes:[{id:expected.orderLineGid,quantity:3,currentQuantity:3,isGiftCard:false,product:{id:expected.productGid},variant:{id:expected.variantGid},sellingPlan:{sellingPlanId:expected.sellingPlanGid}}],pageInfo:{hasNextPage:false}}}});
const admin=data=>({graphql:async(query,{variables})=>{assert.doesNotMatch(query,/\bmutation\b/);assert.equal(variables.id,query.includes('ReadySeriesOriginalPayment')?expected.orderGid:contractGid);return Response.json({data});}});
test('contract and original payment must agree before internal delivery preparation; native schedule remains unverified',async()=>{
 const result=await inspectPrepaidPurchase(admin(fixture()),shop,contractGid,expected);
 assert.equal(result.draftPreparationOnly,true);assert.equal(result.nativeScheduleVerified,false);assert.equal(result.payment.upfrontMinor,25520);assert.equal(result.months,3);assert.equal(result.perDeliveryContractPriceMinor,8507);assert.equal(result.renewalPriceVerified,false);
 assert.ok(result.pendingEvidence.includes('Actual native fulfillment schedule'));
});
test('wrong contract price, billing, status, identity or extra lines cannot authorize draft preparation',async()=>{
 for(const change of [d=>d.subscriptionContract.status='PAUSED',d=>d.subscriptionContract.lines.nodes[0].currentPrice.amount='0',d=>d.subscriptionContract.billingPolicy.intervalCount=1,d=>d.subscriptionContract.billingPolicy.maxCycles=1,d=>d.subscriptionContract.deliveryPolicy.intervalCount=3,d=>d.subscriptionContract.app.id='gid://shopify/App/99',d=>d.subscriptionContract.lines.nodes.push({...d.subscriptionContract.lines.nodes[0],id:'gid://shopify/SubscriptionLine/99'}),d=>d.subscriptionContract.lines.nodes[0].id='8']){
  const data=fixture();change(data);await assert.rejects(inspectPrepaidPurchase(admin(data),shop,contractGid,expected));
 }
});
test('matching contract alone cannot replace actual payment and original line evidence',async()=>{
 for(const change of [d=>d.order.totalReceivedSet=money('0'),d=>d.order.lineItems.nodes[0].sellingPlan.sellingPlanId='gid://shopify/SellingPlan/99',d=>d.order.displayFinancialStatus='PENDING',d=>d.order.transactions[0].status='PENDING']){
  const data=fixture();change(data);await assert.rejects(inspectPrepaidPurchase(admin(data),shop,contractGid,expected));
 }
});
