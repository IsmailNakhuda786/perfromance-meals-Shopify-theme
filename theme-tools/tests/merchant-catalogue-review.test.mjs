import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reviewMerchantCatalogue} from '../catalogue/review-merchant.mjs';
const source = JSON.parse(fs.readFileSync(new URL('../merchant-catalogue-20261015.json', import.meta.url)));
const names = [...new Set([...source.bundles, ...source.subscriptions].flatMap(record => record.contents.map(item => item.name)))];
function fixture() {
  const bindings = Object.fromEntries(names.map((name, i) => [name, `gid://shopify/ProductVariant/${1000+i}`]));
  const native = {shop: {myshopifyDomain:'performance-meals-development.myshopify.com',currencyCode:'SGD'}, products:{pageInfo:{hasNextPage:false},nodes:names.map((name,i)=>({id:`gid://shopify/Product/${1000+i}`,title:name,status:'ACTIVE',isGiftCard:false,requiresSellingPlan:false,metafields:{nodes:[{namespace:'performance',key:'business_stream',value:'ready_series'}]},variants:{pageInfo:{hasNextPage:false},nodes:[{id:bindings[name]}]}}))}};
  return {native,bindings};
}
test('approved sheets retain exact quantities and upfront prices without inventing mappings or a calendar', () => {
  const {native,bindings}=fixture();
  const unresolved=reviewMerchantCatalogue(source,native);
  assert.equal(unresolved.distinctDishes,28); assert.equal(unresolved.mappedDishes,0); assert.equal(unresolved.unresolved.length,28);
  const before=JSON.stringify({source,native,bindings});
  const review=reviewMerchantCatalogue(source,native,bindings);
  assert.equal(review.records.length,21); assert.equal(review.mappedDishes,28); assert.equal(review.unresolved.length,0);
  assert.equal(review.readyForActivation,false); assert.equal(review.nativeWritesPerformed,false); assert.equal(review.nativeEvidenceFreshnessVerified,false);
  for(const record of review.records) {
    assert.equal(record.contents.reduce((sum,item)=>sum+item.quantity,0),record.itemsPerDelivery);
    assert.ok(record.contents.every(item=>item.variantGid));
    if(record.kind==='subscription') { assert.deepEqual(record.terms.map(term=>term.months),[3,6]); assert.equal(record.calendarPending,true); }
  }
  for(const record of review.records.filter(item=>item.kind==='bundle'&&item.title.includes('Mixed Bundle'))) {assert.equal(record.itemsPerDelivery,14);assert.equal(record.purchasePriceMinor,10980);}
  assert.equal(JSON.stringify({source,native,bindings}),before);
});
test('missing/truncated native evidence and unsafe component substitutions cannot become an import plan', () => {
  for(const change of [f=>f.native.shop.myshopifyDomain='other.myshopify.com',f=>f.native.products.pageInfo.hasNextPage=true,f=>f.native.products.nodes[0].variants.pageInfo.hasNextPage=true,f=>f.native.products.nodes[0].isGiftCard=true,f=>f.native.products.nodes[0].requiresSellingPlan=true,f=>f.native.products.nodes[0].status='DRAFT',f=>f.native.products.nodes[0].metafields.nodes[0].value='meal_plan',f=>delete f.native.products.nodes[0].isGiftCard,f=>f.bindings[names[1]]=f.bindings[names[0]],f=>f.bindings['invented dish']=f.bindings[names[0]]]) {
    const f=fixture();change(f);assert.throws(()=>reviewMerchantCatalogue(source,f.native,f.bindings));
  }
});
test('tampered quantities, money, source evidence and one-month purchasable terms are rejected', () => {
  const {native,bindings}=fixture();
  for(const change of [s=>s.bundles[0].contents[0].quantity++,s=>s.bundles[0].purchasePriceMinor=-1,s=>s.bundles[0].displayUnitMinor++,s=>s.bundles[0].source.sha256='unverified',s=>s.subscriptions[0].terms[0].months=1,s=>s.subscriptions[0].automaticTermRenewal=false,s=>s.subscriptions[0].deliveryIncluded=false,s=>s.subscriptions[0].calendarRuleStatus='assumed']) {
    const altered=structuredClone(source);change(altered);assert.throws(()=>reviewMerchantCatalogue(altered,native,bindings));
  }
});

test('mapping refuses missing pagination evidence even when a partial response looks valid',()=>{
  const {native,bindings}=fixture();
  delete native.products.pageInfo;
  assert.throws(()=>reviewMerchantCatalogue(source,native,bindings),/pagination/);
  const complete=fixture();delete complete.native.products.nodes[0].variants.pageInfo;
  assert.throws(()=>reviewMerchantCatalogue(source,complete.native,complete.bindings),/verified active/);
});

test('explicit draft-only assembly review preserves the activation gate and rejects unrelated draft products',()=>{
  const {native,bindings}=fixture();
  for(const product of native.products.nodes){product.status='DRAFT';product.tags=['pm-merchant-20261015'];}
  assert.throws(()=>reviewMerchantCatalogue(source,native,bindings));
  const review=reviewMerchantCatalogue(source,native,bindings,{draftReview:true});
  assert.equal(review.mappedDishes,28);assert.equal(review.draftReview,true);assert.equal(review.readyForActivation,false);
  native.products.nodes[0].title='Different dish';
  assert.throws(()=>reviewMerchantCatalogue(source,native,bindings,{draftReview:true}));
  native.products.nodes[0].title=names[0];native.products.nodes[0].tags=[];
  assert.throws(()=>reviewMerchantCatalogue(source,native,bindings,{draftReview:true}));
  assert.throws(()=>reviewMerchantCatalogue(source,native,bindings,{activate:true}));
});
