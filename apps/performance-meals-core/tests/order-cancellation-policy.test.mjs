import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/order-cancellation-policy.ts'],outdir:'.shopify/cancellation-policy-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {assessOrderCancellation,nativeDispatchEvidence}=await import('../.shopify/cancellation-policy-test/order-cancellation-policy.js');
test('no time, payment or dispatch state automatically authorizes cancellation or Wallet credit',()=>{
 for(const stream of ['ready_series','meal_plan','shared'])for(const dispatched of [true,false,null]){
  assert.deepEqual(assessOrderCancellation({createdAt:new Date().toISOString(),paid:true,alreadyCancelled:false,hasEverDispatched:dispatched,businessStreams:[stream]}),{eligible:false,reason:'SUPPORT_APPROVAL_REQUIRED'});
 }
});
test('native fulfillment history remains authoritative Support evidence',()=>{
 assert.equal(nativeDispatchEvidence(['SUCCESS'],false,true),true);
 assert.equal(nativeDispatchEvidence(['CANCELLED'],true,true),true);
 assert.equal(nativeDispatchEvidence(['CANCELLED'],false,true),null);
 assert.equal(nativeDispatchEvidence([],false,true),false);
});
