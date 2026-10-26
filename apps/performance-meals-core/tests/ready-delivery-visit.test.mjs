import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['app/services/ready-delivery-visit.ts'],outfile:'.shopify/ready-delivery-visit-test.mjs',bundle:true,format:'esm',platform:'node'});
const {planReadyDeliveryVisit:plan}=await import('../.shopify/ready-delivery-visit-test.mjs');
const member=(id='draft1',packages=1)=>({draftId:id,revision:1,operationalLineId:'line-'+id,occurrence:1,packages});
const input=()=>({shop:'performance-meals-development.myshopify.com',customerGid:'gid://shopify/Customer/1',orderGid:'gid://shopify/Order/2',destinationKey:'verified-address-revision-1',slotId:'slot1',slotRevision:1,deliveryAt:'2026-11-02T01:00:00Z',deliveryEndsAt:'2026-11-02T04:00:00Z',members:[member()]});
test('two packages delivered together consume one visit and preserve both quantities',()=>{
 const a=input();a.members=[member('one'),member('two')];const p=plan(a);
 assert.equal(p.capacityPlaces,1);assert.equal(p.packageCount,2);assert.equal(p.members.length,2);assert.equal(p.bookingConfirmed,false);assert.equal(p.planningOnly,true);
 assert.deepEqual(plan({...a,members:[...a.members].reverse()}),p);a.members[0].packages=9;assert.equal(p.members[0].packages,1);
});
test('a quantity-two package line preserves entitlement while using one visit',()=>{
 const p=plan({...input(),members:[member('one',2),member('two',3)]});assert.equal(p.packageCount,5);assert.equal(p.capacityPlaces,1);
});
test('duplicate drafts or repeated line occurrences cannot inflate a visit',()=>{
 const a=member();assert.throws(()=>plan({...input(),members:[a,a]}),/Distinct/);
 assert.throws(()=>plan({...input(),members:[a,{...a,draftId:'different'}]}),/Duplicate/);
});
test('incomplete identities, invalid revisions and quantities fail closed',()=>{
 for(const edit of [{destinationKey:''},{customerGid:'other'},{orderGid:'other'},{shop:'example.com'},{slotId:''},{slotRevision:0},{members:[]},{members:[member('one',0)]},{members:[{...member(),revision:0}]},{members:[member('one',2147483647),member('two')]}])assert.throws(()=>plan({...input(),...edit}));
});
test('invalid dates, cross-day slots and reversed windows cannot become visits',()=>{
 for(const edit of [{deliveryAt:'2026-02-30T01:00:00Z'},{deliveryEndsAt:'2026-11-03T04:00:00Z'},{deliveryEndsAt:'2026-11-02T00:00:00Z'}])assert.throws(()=>plan({...input(),...edit}));
});
