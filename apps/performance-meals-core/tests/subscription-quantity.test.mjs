import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/subscription-quantity.ts'],outdir:'.shopify/subscription-quantity-test',bundle:true,format:'esm',platform:'node'});
const {nativeSubscriptionOrderQuantity}=await import('../.shopify/subscription-quantity-test/subscription-quantity.js');
test('same native policy expands prepaid quantities while pay-per-delivery remains unchanged',()=>{
 for(const term of [1,3,6])assert.equal(nativeSubscriptionOrderQuantity(1,{interval:'MONTH',intervalCount:term},{interval:'MONTH',intervalCount:1}),term);
 assert.equal(nativeSubscriptionOrderQuantity(2,{interval:'MONTH',intervalCount:6},{interval:'MONTH',intervalCount:1}),12);
});
test('no inferred month/week conversion, fractional cycles or unsupported quantity',()=>{
 for(const args of [[1,{interval:'MONTH',intervalCount:1},{interval:'WEEK',intervalCount:1}],[1,{interval:'MONTH',intervalCount:3},{interval:'MONTH',intervalCount:2}],[1,{interval:'MONTH',intervalCount:1},null],[0,{interval:'MONTH',intervalCount:1},{interval:'MONTH',intervalCount:1}],[2147483647,{interval:'MONTH',intervalCount:6},{interval:'MONTH',intervalCount:1}]])assert.throws(()=>nativeSubscriptionOrderQuantity(...args));
});
