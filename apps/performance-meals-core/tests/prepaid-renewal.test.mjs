import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/prepaid-renewal.server.ts'],outdir:'.shopify/prepaid-renewal-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {inspectPrepaidRenewal}=await import('../.shopify/prepaid-renewal-test/prepaid-renewal.server.js');
const shop='prepaid-purchase-fixture.myshopify.com';process.env.ALLOWED_SHOP=shop;
const expected={months:3,appGid:'gid://shopify/App/1',customerGid:'gid://shopify/Customer/2',orderGid:'gid://shopify/Order/3',orderLineGid:'gid://shopify/LineItem/9',productGid:'gid://shopify/Product/4',variantGid:'gid://shopify/ProductVariant/5',sellingPlanGid:'gid://shopify/SellingPlan/6',upfrontMinor:25520};
const contractGid='gid://shopify/SubscriptionContract/7';
const money=amount=>({shopMoney:{amount,currencyCode:'SGD'}});
const fixture=()=>({shop:{myshopifyDomain:shop,currencyCode:'SGD'},currentAppInstallation:{app:{id:expected.appGid}},subscriptionContract:{id:contractGid,status:'ACTIVE',currencyCode:'SGD',app:{id:expected.appGid},customer:{id:expected.customerGid},billingPolicy:{interval:'MONTH',intervalCount:3,minCycles:1,maxCycles:null},deliveryPolicy:{interval:'MONTH',intervalCount:1},originOrder:{id:expected.orderGid,test:true,currencyCode:'SGD',customer:{id:expected.customerGid}},lines:{nodes:[{id:'gid://shopify/SubscriptionLine/8',productId:expected.productGid,variantId:expected.variantGid,sellingPlanId:expected.sellingPlanGid,quantity:1,currentPrice:{amount:'85.07',currencyCode:'SGD'}}],pageInfo:{hasNextPage:false}}},order:{id:expected.orderGid,test:true,createdAt:'2026-10-20T01:00:00Z',cancelledAt:null,currencyCode:'SGD',taxesIncluded:true,displayFinancialStatus:'PAID',customer:{id:expected.customerGid},disputes:[],totalPriceSet:money('255.20'),currentTotalPriceSet:money('255.20'),totalReceivedSet:money('255.20'),totalRefundedSet:money('0'),totalShippingPriceSet:money('0'),totalDiscountsSet:money('0'),transactions:[{id:'gid://shopify/OrderTransaction/10',test:true,status:'SUCCESS',kind:'SALE',gateway:'test-gateway',manualPaymentGateway:false,processedAt:'2026-10-20T01:01:00Z',amountSet:money('255.20')}],lineItems:{nodes:[{id:expected.orderLineGid,quantity:3,currentQuantity:3,isGiftCard:false,product:{id:expected.productGid},variant:{id:expected.variantGid},sellingPlan:{sellingPlanId:expected.sellingPlanGid}}],pageInfo:{hasNextPage:false}}}});

const renewalExpected={...expected,attemptGid:'gid://shopify/SubscriptionBillingAttempt/20',idempotencyKey:'saved-renewal-key',renewalOrderGid:'gid://shopify/Order/21',renewalOrderLineGid:'gid://shopify/LineItem/22'};
function data(){const d=fixture();d.order.id=renewalExpected.renewalOrderGid;d.order.lineItems.nodes[0].id=renewalExpected.renewalOrderLineGid;d.subscriptionBillingAttempt={id:renewalExpected.attemptGid,idempotencyKey:renewalExpected.idempotencyKey,subscriptionContract:{id:contractGid},state:{__typename:'SubscriptionBillingAttemptSuccessState',order:{id:renewalExpected.renewalOrderGid}}};return d;}
const admin=d=>({graphql:async(q,{variables})=>{assert.doesNotMatch(q,/\bmutation\b/);assert.equal(variables.id,q.includes('ReadySeriesRenewalAttempt')?renewalExpected.attemptGid:q.includes('ReadySeriesOriginalPayment')?renewalExpected.renewalOrderGid:contractGid);return Response.json({data:d});}});
test('a renewal needs its own exact attempt, contract and captured test payment; old success never enables another charge',async()=>{
 for(const status of ['ACTIVE','PAUSED','CANCELLED']){const d=data();d.subscriptionContract.status=status;const r=await inspectPrepaidRenewal(admin(d),shop,contractGid,renewalExpected);assert.equal(r.payment.upfrontMinor,25520);assert.equal(r.observedRenewalVerified,true);assert.equal(r.activationAllowed,false);assert.equal(r.futureRenewalsVerified,false);}
});
test('original order, another attempt/key/contract/order or incomplete payment cannot stand in for a renewal',async()=>{
 for(const change of [d=>d.subscriptionBillingAttempt.id='gid://shopify/SubscriptionBillingAttempt/99',d=>d.subscriptionBillingAttempt.idempotencyKey='different',d=>d.subscriptionBillingAttempt.subscriptionContract.id='gid://shopify/SubscriptionContract/99',d=>d.subscriptionBillingAttempt.state.order.id=expected.orderGid,d=>d.subscriptionContract.app.id='gid://shopify/App/99',d=>d.order.customer.id='gid://shopify/Customer/99',d=>d.order.totalReceivedSet=money('0'),d=>d.order.transactions[0].test=false,d=>d.order.transactions.push({...d.order.transactions[0]})]){const d=data();change(d);await assert.rejects(inspectPrepaidRenewal(admin(d),shop,contractGid,renewalExpected));}
});
test('pending, failed, customer-action-required and future unknown states fail closed',async()=>{
 for(const state of ['SubscriptionBillingAttemptPendingState','SubscriptionBillingAttemptFailedState','SubscriptionBillingAttemptActionRequiredState','UnknownState']){const d=data();d.subscriptionBillingAttempt.state.__typename=state;await assert.rejects(inspectPrepaidRenewal(admin(d),shop,contractGid,renewalExpected));}
});
test('native two-cent truncation is not an exact approved renewal payment',async()=>{
 const d=data();for(const k of ['totalPriceSet','currentTotalPriceSet','totalReceivedSet'])d.order[k]=money('255.18');d.order.transactions[0].amountSet=money('255.18');await assert.rejects(inspectPrepaidRenewal(admin(d),shop,contractGid,renewalExpected));
});
test('invalid references, reused original order and missing saved keys stop before any native call',async()=>{
 for(const change of [e=>e.renewalOrderGid=e.orderGid,e=>e.attemptGid='20',e=>e.renewalOrderLineGid='22',e=>e.idempotencyKey='',e=>e.idempotencyKey='x'.repeat(256)]){const e={...renewalExpected};change(e);await assert.rejects(inspectPrepaidRenewal({graphql:async()=>{assert.fail('Unexpected API call');}},shop,contractGid,e));}
});
test('wrong-store, missing native data and GraphQL errors cannot assert success',async()=>{
 for(const response of [Response.json({errors:[{message:'unavailable'}]}),Response.json({data:{...data(),shop:{myshopifyDomain:'other.myshopify.com'}}}),Response.json({data:null})])await assert.rejects(inspectPrepaidRenewal({graphql:async()=>response},shop,contractGid,renewalExpected));
});
test('six-delivery renewal requires six original quantities and every approved cent',async()=>{
 const e={...renewalExpected,months:6,upfrontMinor:49360};
 const d=data();d.subscriptionContract.billingPolicy.intervalCount=6;d.subscriptionContract.lines.nodes[0].currentPrice.amount='493.60';d.order.lineItems.nodes[0].quantity=6;d.order.lineItems.nodes[0].currentQuantity=6;
 for(const k of ['totalPriceSet','currentTotalPriceSet','totalReceivedSet'])d.order[k]=money('493.60');d.order.transactions[0].amountSet=money('493.60');
 assert.equal((await inspectPrepaidRenewal(admin(d),shop,contractGid,e)).payment.upfrontMinor,49360);
 d.order.lineItems.nodes[0].quantity=3;await assert.rejects(inspectPrepaidRenewal(admin(d),shop,contractGid,e));d.order.lineItems.nodes[0].quantity=6;
 for(const k of ['totalPriceSet','currentTotalPriceSet','totalReceivedSet'])d.order[k]=money('493.56');d.order.transactions[0].amountSet=money('493.56');await assert.rejects(inspectPrepaidRenewal(admin(d),shop,contractGid,e));
});
