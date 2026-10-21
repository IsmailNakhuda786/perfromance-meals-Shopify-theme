import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/bundle-checkout-approvals.ts','app/services/bundle-snapshot.ts'],outdir:'.shopify/bundle-approval-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {buildBundleCheckoutApprovals}=await import('../.shopify/bundle-approval-test/bundle-checkout-approvals.js');
const {bundleReviewHash}=await import('../.shopify/bundle-approval-test/bundle-snapshot.js');
const shop='approval-fixture.myshopify.com',customerGid='gid://shopify/Customer/1';
function row(id='review-a'){
 const snapshot={version:'native-bundle-v1',productGid:'gid://shopify/Product/2',variantGid:'gid://shopify/ProductVariant/3',currency:'SGD',unitPriceMinor:10980,itemsPerBundle:14,components:[{componentGid:"gid://shopify/Metaobject/6",productGid:"gid://shopify/Product/7",variantGid:"gid://shopify/ProductVariant/8",quantity:14,label:"Fixture meal"}]};
 return {id,shop,customerGid,productGid:snapshot.productGid,variantGid:snapshot.variantGid,quantity:1,currency:'SGD',snapshot:JSON.stringify(snapshot),snapshotHash:bundleReviewHash({id,shop,customerGid,quantity:1,snapshot}),state:'REVIEWED',orderGid:null,orderLineGid:null};
}
test('approval projection is deterministic and contains only exact purchase references',()=>{
 const result=buildBundleCheckoutApprovals(shop,customerGid,[row('b'),row('a')]);
 assert.deepEqual(result.reviews.map(r=>r.reviewId),['a','b']);assert.equal(result.reviews[0].quantity,1);
 assert.equal(JSON.stringify(result).includes('snapshot'),false);assert.equal(JSON.stringify(result).includes('10980'),false);
});
test('used reviews are removed and an empty document withdraws all approvals',()=>{
 const used={...row(),state:'ORDERED',orderGid:'gid://shopify/Order/4',orderLineGid:'gid://shopify/LineItem/5'};
 assert.equal(buildBundleCheckoutApprovals(shop,customerGid,[used]).reviews.length,0);
 assert.equal(buildBundleCheckoutApprovals(shop,customerGid,[]).reviews.length,0);
});
test('foreign ownership, duplicate IDs, invalid state and altered snapshots cannot be published',()=>{
 for(const change of [r=>r.shop='other.myshopify.com',r=>r.customerGid='gid://shopify/Customer/9',r=>r.state='UNKNOWN',r=>r.orderGid='gid://shopify/Order/4',r=>r.quantity=2,r=>r.snapshotHash='b'.repeat(64),r=>r.snapshot='not-json',r=>r.variantGid='gid://shopify/ProductVariant/8']){const r=row();change(r);assert.throws(()=>buildBundleCheckoutApprovals(shop,customerGid,[r]));}
 assert.throws(()=>buildBundleCheckoutApprovals(shop,customerGid,[row(),row()]));
 assert.throws(()=>buildBundleCheckoutApprovals(shop,customerGid,[{...row(),state:'ORDERED'}]));
});
test('bounded approval input refuses truncation and does not mutate source rows',()=>{
 const r=row(),before=JSON.stringify(r);buildBundleCheckoutApprovals(shop,customerGid,[r]);assert.equal(JSON.stringify(r),before);
 assert.throws(()=>buildBundleCheckoutApprovals(shop,customerGid,Array.from({length:101},(_,i)=>row(String(i)))));
});
