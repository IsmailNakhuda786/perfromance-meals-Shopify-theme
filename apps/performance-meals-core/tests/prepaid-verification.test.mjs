import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

await build({entryPoints:['app/services/prepaid-verification.server.ts'],outdir:'.shopify/prepaid-verification-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {inspectPrepaidContract}=await import('../.shopify/prepaid-verification-test/prepaid-verification.server.js');
const shop='prepaid-fixture.myshopify.com';
const expected={months:3,appGid:'gid://shopify/App/1',customerGid:'gid://shopify/Customer/2',orderGid:'gid://shopify/Order/3',productGid:'gid://shopify/Product/4',variantGid:'gid://shopify/ProductVariant/5',sellingPlanGid:'gid://shopify/SellingPlan/6'};
const contractGid='gid://shopify/SubscriptionContract/7';
const fixture=(months=3)=>({shop:{myshopifyDomain:shop,currencyCode:'SGD'},subscriptionContract:{id:contractGid,status:'ACTIVE',currencyCode:'SGD',app:{id:expected.appGid},customer:{id:expected.customerGid},billingPolicy:{interval:'MONTH',intervalCount:months,minCycles:1,maxCycles:null},deliveryPolicy:{interval:'MONTH',intervalCount:1},originOrder:{id:expected.orderGid,name:'#fixture',test:true,currencyCode:'SGD',customer:{id:expected.customerGid}},lines:{nodes:[{id:'gid://shopify/SubscriptionLine/8',productId:expected.productGid,variantId:expected.variantGid,sellingPlanId:expected.sellingPlanGid,quantity:1,currentPrice:{amount:'252.90',currencyCode:'SGD'}}],pageInfo:{hasNextPage:false}}}});
const admin=data=>({graphql:async(query,options)=>{assert.ok(!/\bmutation\b/.test(query));assert.equal(options.variables.id,contractGid);return Response.json({data});}});

test('3/6-month readback checks native identity and automatic term renewal without claiming payment acceptance',async()=>{
 process.env.ALLOWED_SHOP=shop;
 for(const months of [3,6]){
  const result=await inspectPrepaidContract(admin(fixture(months)),shop,contractGid,{...expected,months});
  assert.equal(result.billingConfigurationMatches,true);
  assert.equal(result.configurationMatches,false);
  assert.equal(result.deliveryCalendarPending,false);
  assert.ok(result.pendingEvidence.includes('Exact approved upfront transaction amount'));
  assert.equal(result.deliveryPolicyMatches,true);
  assert.ok(result.pendingEvidence.includes('Automatic term renewal and cancellation behavior'));
 }
});

test('monthly instalments, finite cycle caps, wrong owner/customer and non-test orders fail verification',async()=>{
 process.env.ALLOWED_SHOP=shop;
 const cases=[data=>{data.subscriptionContract.billingPolicy.intervalCount=1;},data=>{data.subscriptionContract.billingPolicy.maxCycles=1;},data=>{data.subscriptionContract.billingPolicy.maxCycles=2;},data=>{delete data.subscriptionContract.billingPolicy.maxCycles;},data=>{data.subscriptionContract.app.id='gid://shopify/App/99';},data=>{data.subscriptionContract.customer.id='gid://shopify/Customer/99';},data=>{data.subscriptionContract.originOrder.test=false;},data=>{data.subscriptionContract.lines.nodes[0].sellingPlanId='gid://shopify/SellingPlan/99';},data=>{data.subscriptionContract.currencyCode='USD';}];
 for(const change of cases){const data=fixture();change(data);assert.equal((await inspectPrepaidContract(admin(data),shop,contractGid,expected)).billingConfigurationMatches,false);}
});

test('missing/truncated contracts, wrong stores and invalid references cannot become successful evidence',async()=>{
 process.env.ALLOWED_SHOP=shop;
 await assert.rejects(()=>inspectPrepaidContract(admin({...fixture(),subscriptionContract:null}),shop,contractGid,expected),/unavailable/);
 const truncated=fixture();truncated.subscriptionContract.lines.pageInfo.hasNextPage=true;
 await assert.rejects(()=>inspectPrepaidContract(admin(truncated),shop,contractGid,expected),/pagination/);
 await assert.rejects(()=>inspectPrepaidContract(admin(fixture()),'unapproved.myshopify.com',contractGid,expected));
 await assert.rejects(()=>inspectPrepaidContract(admin(fixture()),shop,contractGid,{...expected,productGid:''}),/Invalid expected/);
});

 test('confirmed monthly cadence is checked separately from calendar-month billing and native acceptance',async()=>{
 process.env.ALLOWED_SHOP=shop;
 for(const policy of [{interval:'MONTH',intervalCount:1},{interval:'WEEK',intervalCount:4},{interval:'DAY',intervalCount:28}]){
  const data=fixture();data.subscriptionContract.deliveryPolicy=policy;
  const result=await inspectPrepaidContract(admin(data),shop,contractGid,expected);
  assert.equal(result.billingConfigurationMatches,true);
  assert.equal(result.configurationMatches,false);
  assert.equal(result.deliveryCalendarPending,false);
  assert.equal(result.deliveryPolicyMatches,policy.interval==='MONTH');
  assert.deepEqual(result.contract.deliveryPolicy,policy,'preserve observed evidence');
 }
});
