import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/order-cancellation-policy.ts'],outdir:'.shopify/cancellation-policy-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {assessOrderCancellation,nativeDispatchEvidence}=await import('../.shopify/cancellation-policy-test/order-cancellation-policy.js');
const evidence=()=>({createdAt:'2026-10-12T00:00:00Z',paid:true,alreadyCancelled:false,hasEverDispatched:false,businessStreams:['ready_series','meal_plan']});
test('48-hour cancellation uses exact elapsed time across timezone representations',()=>{
 assert.equal(assessOrderCancellation(evidence(),new Date('2026-10-14T00:00:00Z')).eligible,true);
 assert.equal(assessOrderCancellation(evidence(),new Date('2026-10-14T00:00:00.001Z')).reason,'CANCELLATION_WINDOW_CLOSED');
 assert.equal(assessOrderCancellation({...evidence(),createdAt:'2026-10-12T08:00:00+08:00'},new Date('2026-10-14T08:00:00+08:00')).eligible,true);
 const allowed=assessOrderCancellation(evidence(),new Date('2026-10-12T01:00:00Z'));
 assert.equal(allowed.refundDestination,'wallet');assert.equal(allowed.refundScope,'full_paid_total_including_delivery');assert.equal(allowed.stopFutureRenewals,true);
});
test('any dispatch blocks automatic cancellation immediately; unknown history cannot pass',()=>{
 assert.equal(assessOrderCancellation({...evidence(),hasEverDispatched:true},new Date('2026-10-12T00:01:00Z')).reason,'DISPATCHED_CONTACT_SUPPORT');
 assert.equal(assessOrderCancellation({...evidence(),hasEverDispatched:null},new Date('2026-10-12T00:01:00Z')).reason,'DISPATCH_EVIDENCE_REQUIRED');
});
test('one native successful fulfillment locks cancellation; later cancellation cannot erase dispatch history',()=>{
 assert.equal(nativeDispatchEvidence(['PENDING','SUCCESS'],false,true),true);
 assert.equal(nativeDispatchEvidence(['CANCELLED'],true,true),true);
 assert.equal(nativeDispatchEvidence(['CANCELLED'],false,true),null);
 assert.equal(nativeDispatchEvidence([],null,true),null);
 assert.equal(nativeDispatchEvidence([],false,false),null);
 assert.equal(nativeDispatchEvidence([],false,true),false);
});
test('repeated cancellations, unpaid orders, invalid times and shared-commerce lines require review',()=>{
 const now=new Date('2026-10-12T01:00:00Z');
 for(const change of [{alreadyCancelled:true},{paid:false},{createdAt:'invalid'},{createdAt:'2026-10-13T00:00:00Z'},{businessStreams:['ready_series','shared']},{businessStreams:[]}])assert.equal(assessOrderCancellation({...evidence(),...change},now).eligible,false);
 assert.equal(assessOrderCancellation({...evidence(),businessStreams:['ready_series','shared']},now).reason,'MIXED_COMMERCE_REVIEW_REQUIRED');
});
