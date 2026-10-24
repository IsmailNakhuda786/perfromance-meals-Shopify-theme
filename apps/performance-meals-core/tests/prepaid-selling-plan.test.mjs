import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
await build({entryPoints:['app/services/prepaid-selling-plan.ts'],outdir:'.shopify/prepaid-selling-plan-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {prepaidSellingPlanCandidate:buildPlan,assertPrepaidAllocation:verify}=await import('../.shopify/prepaid-selling-plan-test/prepaid-selling-plan.js');
const spec={productGid:'gid://shopify/Product/1',variantGid:'gid://shopify/ProductVariant/2',months:3,upfrontMinor:25520};
test('prepaid terms use full approved cents, monthly delivery and independent renewing billing',()=>{
 for(const [months,upfrontMinor]of [[3,25520],[6,49360]]){
  const input={...spec,months,upfrontMinor},before=structuredClone(input),candidate=buildPlan(input),plan=candidate.input.sellingPlansToCreate[0];
  assert.deepEqual(candidate.resources,{productVariantIds:[spec.variantGid]});
  assert.deepEqual(plan.billingPolicy,{recurring:{interval:'MONTH',intervalCount:months,minCycles:1}});
  assert.deepEqual(plan.deliveryPolicy,{recurring:{interval:'MONTH',intervalCount:1}});
  assert.deepEqual(plan.pricingPolicies,[{fixed:{adjustmentType:'PRICE',adjustmentValue:{fixedValue:(upfrontMinor/100).toFixed(2)}}}]);
  assert.equal(candidate.input.sellingPlansToCreate.length,1);assert.equal(candidate.nativeCheckoutVerified,false);assert.deepEqual(input,before);
 }
});
test('unapproved terms, ambiguous identities and invalid money cannot create plan inputs',()=>{
 for(const change of [{months:1},{months:12},{upfrontMinor:0},{upfrontMinor:1.5},{upfrontMinor:2147483648},{variantGid:'gid://shopify/Product/2'},{productGid:'other'}])assert.throws(()=>buildPlan({...spec,...change}),/snapshot/);
});
test('native allocation must match the exact term variant and price without claiming paid acceptance',()=>{
 const allocation={variantGid:spec.variantGid,sellingPlanGid:'gid://shopify/SellingPlan/3',priceMinor:25520,currency:'SGD',recurring:true};
 assert.equal(verify(spec,allocation).paymentVerified,false);
 for(const change of [{variantGid:'gid://shopify/ProductVariant/9'},{priceMinor:25518},{priceMinor:25521},{priceMinor:8507},{priceMinor:76560},{currency:'USD'},{recurring:false},{sellingPlanGid:''}])assert.throws(()=>verify(spec,{...allocation,...change}),/allocation differs/);
});
test('captured native prepaid truncation is a release hold, never an accepted price correction',()=>{
 for(const [months,upfrontMinor,nativeMinor]of [[3,25520,25518],[6,49360,49356]]){
  const expected={...spec,months,upfrontMinor};assert.equal(buildPlan(expected).fractionalDeliveryCents,true);
  assert.throws(()=>verify(expected,{variantGid:spec.variantGid,sellingPlanGid:'gid://shopify/SellingPlan/3',priceMinor:nativeMinor,currency:'SGD',recurring:true}),/allocation differs/);
 }
 assert.equal(buildPlan({...spec,upfrontMinor:28665}).fractionalDeliveryCents,false);
});

test('exact-price planning preserves every package price without claiming native discount propagation',async()=>{
 const {prepaidExactPriceCorrectionCandidate:plan}=await import('../.shopify/prepaid-selling-plan-test/prepaid-selling-plan.js');
 const spec={productGid:'gid://shopify/Product/1',variantGid:'gid://shopify/ProductVariant/2',months:3,upfrontMinor:25520};
 const two=plan(spec,2);assert.equal(two.expectedTotalMinor,51040);assert.equal(two.grossTotalMinor,51042);assert.equal(two.totalCorrectionMinor,2);assert.equal(two.discountPerPackageMinor,1);assert.equal(two.nativeCheckoutVerified,false);
 const six=plan({...spec,months:6,upfrontMinor:49360},3);assert.equal(six.expectedTotalMinor,148080);assert.equal(six.totalCorrectionMinor,6);assert.equal(six.futureRenewalVerified,false);
 assert.equal(plan({...spec,upfrontMinor:30000},2).totalCorrectionMinor,0);for(const count of[0,-1,1.5,NaN,'2',2147483647])assert.throws(()=>plan(spec,count));
});
