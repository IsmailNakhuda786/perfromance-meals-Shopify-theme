import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/prepaid-calculation.server.ts'],outdir:'.shopify/prepaid-calculation-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {inspectPrepaidCalculation:inspect}=await import('../.shopify/prepaid-calculation-test/prepaid-calculation.server.js');
const shop='calculation-fixture.myshopify.com';process.env.ALLOWED_SHOP=shop;
const id='gid://shopify/SubscriptionContractCalculation/1';
const expected={appGid:'gid://shopify/App/2',customerGid:'gid://shopify/Customer/3',productGid:'gid://shopify/Product/4',variantGid:'gid://shopify/ProductVariant/5',months:3,upfrontMinor:25520};
const money=amount=>({amount,currencyCode:'SGD'});
function fixture(months=3){const price=months===3?'255.20':'493.60';return {shop:{myshopifyDomain:shop,currencyCode:'SGD',taxesIncluded:true},currentAppInstallation:{app:{id:expected.appGid}},subscriptionContractCalculation:{id,__typename:'SubscriptionContractCalculationSuccess',warnings:[],calculatedContract:{currencyCode:'SGD',customer:{id:expected.customerGid},customerPaymentMethod:null,deliveryPrice:money('0.0'),billingPolicy:{interval:'MONTH',intervalCount:months,minCycles:1,maxCycles:null},deliveryPolicy:{interval:'MONTH',intervalCount:1,multiFulfillment:{cadence:{unit:'MONTH',count:1},numberOfFulfillments:months}},lines:{nodes:[{id:'gid://shopify/SubscriptionLine/11111111-1111-4111-8111-111111111111',productId:expected.productGid,variantId:expected.variantGid,quantity:1,currentPrice:money(price)}],pageInfo:{hasNextPage:false}}},projectedOrderTotals:{subtotal:money(price),total:money(price),totalDelivery:money('0'),totalTax:money('0'),totalMerchandiseDiscounts:money('0'),totalDeliveryDiscounts:money('0')}}};}
const admin=data=>({graphql:async(query,{variables})=>{assert.doesNotMatch(query,/\bmutation\b/);assert.equal(variables.id,id);return Response.json({data});}});
test('both terms verify exact projected amount and explicit delivery count without claiming payment, renewal or calendar acceptance',async()=>{
 for(const months of [3,6]){const proof=await inspect(admin(fixture(months)),shop,id,{...expected,months,upfrontMinor:months===3?25520:49360});assert.equal(proof.calculationMatches,true);assert.equal(proof.state,'VERIFIED_CALCULATION');assert.equal(proof.projectedTotalMinor,months===3?25520:49360);assert.equal(proof.calculationOnly,true);for(const key of ['paymentVerified','renewalVerified','deliveryCalendarVerified'])assert.equal(proof[key],false);}
});
test('pending, failed and voided calculations never become verified projections',async()=>{
 for(const [__typename,state]of [['SubscriptionContractCalculationPending','PENDING'],['SubscriptionContractCalculationFailure','FAILED']]){const data=fixture();data.subscriptionContractCalculation={id,__typename,errors:[]};const proof=await inspect(admin(data),shop,id,expected);assert.equal(proof.state,state);assert.equal(proof.calculationMatches,false);}
});
test('wrong store, app, customer, product, variant, payment method and incomplete line coverage fail closed',async()=>{
 for(const change of [d=>d.shop.myshopifyDomain='foreign.myshopify.com',d=>d.shop.taxesIncluded=false,d=>d.currentAppInstallation.app.id='gid://shopify/App/99',d=>d.subscriptionContractCalculation.id='gid://shopify/SubscriptionContractCalculation/99',d=>d.subscriptionContractCalculation.calculatedContract.customer.id='gid://shopify/Customer/99',d=>d.subscriptionContractCalculation.calculatedContract.customerPaymentMethod={id:'gid://shopify/CustomerPaymentMethod/99'},d=>d.subscriptionContractCalculation.calculatedContract.lines.pageInfo.hasNextPage=true,d=>d.subscriptionContractCalculation.calculatedContract.lines.nodes.push({...d.subscriptionContractCalculation.calculatedContract.lines.nodes[0]}),d=>d.subscriptionContractCalculation.calculatedContract.lines.nodes[0].variantId='gid://shopify/ProductVariant/99',d=>d.subscriptionContractCalculation.calculatedContract.lines.nodes[0].quantity=3,d=>d.subscriptionContractCalculation.calculatedContract.lines.nodes[0].id='malformed']){const data=fixture();change(data);await assert.rejects(inspect(admin(data),shop,id,expected));}
});
test('wrong billing, missing explicit fulfilment configuration, delivery counts and native warnings require review',async()=>{
 for(const change of [r=>r.calculatedContract.billingPolicy.intervalCount=1,r=>r.calculatedContract.billingPolicy.maxCycles=1,r=>r.calculatedContract.deliveryPolicy.multiFulfillment=null,r=>r.calculatedContract.deliveryPolicy.multiFulfillment.numberOfFulfillments=4,r=>r.calculatedContract.deliveryPolicy.multiFulfillment.cadence.unit='WEEK',r=>r.warnings=[{code:'REVIEW'}]]){const data=fixture();change(data.subscriptionContractCalculation);assert.equal((await inspect(admin(data),shop,id,expected)).state,'REVIEW');}
});
test('one-cent mismatch, extra delivery charge, hidden discount or inconsistent subtotal cannot pass',async()=>{
 for(const change of [r=>r.projectedOrderTotals.total=money('255.21'),r=>r.calculatedContract.lines.nodes[0].currentPrice=money('85.07'),r=>r.projectedOrderTotals.totalDelivery=money('5'),r=>r.calculatedContract.deliveryPrice=money('5'),r=>r.projectedOrderTotals.totalMerchandiseDiscounts=money('0.01'),r=>r.projectedOrderTotals.totalDeliveryDiscounts=money('5'),r=>r.projectedOrderTotals.subtotal=money('0'),r=>r.projectedOrderTotals.totalTax=money('300')]){const data=fixture();change(data.subscriptionContractCalculation);assert.equal((await inspect(admin(data),shop,id,expected)).calculationMatches,false);}
});
test('qualifying GST may be present in the exact inclusive projection; foreign or malformed money cannot pass',async()=>{
 const data=fixture();data.subscriptionContractCalculation.projectedOrderTotals.totalTax=money('21.07');assert.equal((await inspect(admin(data),shop,id,expected)).calculationMatches,true);
 for(const change of [r=>r.projectedOrderTotals.total.currencyCode='USD',r=>r.projectedOrderTotals.total.amount='NaN',r=>r.projectedOrderTotals=null,r=>r.calculatedContract.deliveryPrice.amount='-1']){const invalid=fixture();change(invalid.subscriptionContractCalculation);await assert.rejects(inspect(admin(invalid),shop,id,expected));}
});
test('invalid references and production execution cannot reach the native API',async()=>{
 let calls=0;const api={graphql:async()=>{calls++;throw Error('Must not call');}};
 for(const change of [{months:1},{upfrontMinor:0},{upfrontMinor:1.5},{appGid:'bad'},{customerGid:'bad'}])await assert.rejects(inspect(api,shop,id,{...expected,...change}));
 await assert.rejects(inspect(api,'foreign.myshopify.com',id,expected));await assert.rejects(inspect(api,shop,'bad',expected));
 const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';try{await assert.rejects(inspect(api,shop,id,expected));}finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}assert.equal(calls,0);
});

const {inspectPrepaidCorrectionCalculation:inspectCorrection}=await import('../.shopify/prepaid-calculation-test/prepaid-calculation.server.js');
const correction=months=>({baseMinor:months===3?25521:49362,discountMinor:months===3?1:2,title:'QA approved cent correction'});
function correctedFixture(months=3){
 const data=fixture(months),r=data.subscriptionContractCalculation,c=correction(months),line=r.calculatedContract.lines.nodes[0];
 line.currentPrice=money((c.baseMinor/100).toFixed(2));r.projectedOrderTotals.totalMerchandiseDiscounts=money((c.discountMinor/100).toFixed(2));
 r.calculatedContract.discounts={pageInfo:{hasNextPage:false},nodes:[{id:'gid://shopify/SubscriptionManualDiscount/11111111-1111-4111-8111-111111111111',title:c.title,recurringCycleLimit:null,rejectionReason:null,targetType:'LINE_ITEM',type:'MANUAL',usageCount:0,value:{__typename:'SubscriptionDiscountFixedAmountValue',amount:money((c.discountMinor/100).toFixed(2)),appliesOnEachItem:false},entitledLines:{all:false,lines:{nodes:[{id:line.id}],pageInfo:{hasNextPage:false}}}}]};
 return data;
}
test('explicit cent-correction projections preserve every approved cent without claiming checkout or renewal acceptance',async()=>{
 for(const months of [3,6]){
  const data=correctedFixture(months),context={...expected,months,upfrontMinor:months===3?25520:49360},proof=await inspectCorrection(admin(data),shop,id,context,correction(months));
  assert.equal(proof.calculationMatches,true);assert.equal(proof.projectedTotalMinor,context.upfrontMinor);assert.equal(proof.nativeUnitPriceMinor,correction(months).baseMinor);assert.equal(proof.explicitCorrection,true);
  for(const flag of ['paymentVerified','renewalVerified','checkoutPropagationVerified','deliveryCalendarVerified'])assert.equal(proof[flag],false);
  assert.equal((await inspect(admin(data),shop,id,context)).calculationMatches,false,'the original strict inspector must not silently accept a discount');
 }
});
test('a matching total cannot conceal a missing, extra, capped, rejected, foreign or differently scoped correction',async()=>{
 for(const edit of [r=>delete r.calculatedContract.discounts,r=>r.calculatedContract.discounts.pageInfo.hasNextPage=true,r=>r.calculatedContract.discounts.nodes.push(r.calculatedContract.discounts.nodes[0]),r=>r.calculatedContract.discounts.nodes[0].recurringCycleLimit=1,r=>r.calculatedContract.discounts.nodes[0].rejectionReason='CUSTOMER_NOT_ELIGIBLE',r=>r.calculatedContract.discounts.nodes[0].id='gid://shopify/Order/1',r=>r.calculatedContract.discounts.nodes[0].title='Different discount',r=>r.calculatedContract.discounts.nodes[0].type='CODE',r=>r.calculatedContract.discounts.nodes[0].targetType='SHIPPING_LINE',r=>r.calculatedContract.discounts.nodes[0].usageCount=1,r=>r.calculatedContract.discounts.nodes[0].value.__typename='SubscriptionDiscountPercentageValue',r=>r.calculatedContract.discounts.nodes[0].value.appliesOnEachItem=true,r=>r.calculatedContract.discounts.nodes[0].entitledLines.all=true,r=>r.calculatedContract.discounts.nodes[0].entitledLines.lines.pageInfo.hasNextPage=true,r=>r.calculatedContract.discounts.nodes[0].entitledLines.lines.nodes[0].id='gid://shopify/SubscriptionLine/99']){
  const data=correctedFixture();edit(data.subscriptionContractCalculation);await assert.rejects(inspectCorrection(admin(data),shop,id,expected,correction(3)));
 }
});
test('cent corrections require matching native discount, base, net amount and zero delivery',async()=>{
 for(const edit of [r=>r.projectedOrderTotals.total=money('255.21'),r=>r.calculatedContract.lines.nodes[0].currentPrice=money('255.22'),r=>r.projectedOrderTotals.totalMerchandiseDiscounts=money('0.02'),r=>r.calculatedContract.discounts.nodes[0].value.amount=money('0.02'),r=>r.projectedOrderTotals.totalDelivery=money('0.01')]){
  const data=correctedFixture();edit(data.subscriptionContractCalculation);assert.equal((await inspectCorrection(admin(data),shop,id,expected,correction(3))).calculationMatches,false);
 }
});
test('invalid correction configuration and production use cannot reach the native API',async()=>{
 let reads=0;const api={graphql:async()=>{reads++;throw Error('No read authorized');}};
 for(const c of [null,{...correction(3),discountMinor:0},{...correction(3),discountMinor:1.5},{...correction(3),baseMinor:25522},{...correction(3),title:''},{...correction(3),title:'x'.repeat(256)}])await assert.rejects(inspectCorrection(api,shop,id,expected,c));
 const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';try{await assert.rejects(inspectCorrection(api,shop,id,expected,correction(3)));}finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
 assert.equal(reads,0);
});
test('pending and failed correction calculations explicitly preserve every acceptance hold',async()=>{
 for(const __typename of ['SubscriptionContractCalculationPending','SubscriptionContractCalculationFailure']){
  const data=fixture();data.subscriptionContractCalculation={id,__typename,errors:[]};const proof=await inspectCorrection(admin(data),shop,id,expected,correction(3));
  assert.equal(proof.explicitCorrection,true);assert.equal(proof.calculationMatches,false);for(const flag of ['paymentVerified','renewalVerified','checkoutPropagationVerified','deliveryCalendarVerified'])assert.equal(proof[flag],false);
 }
});
