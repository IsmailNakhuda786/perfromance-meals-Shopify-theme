import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['extensions/core-delivery-qa/src/cart_delivery_options_transform_run.ts'],outdir:'.shopify/core-delivery-qa-test',bundle:true,format:'esm',platform:'node'});
const {cartDeliveryOptionsTransformRun:run}=await import('../.shopify/core-delivery-qa-test/cart_delivery_options_transform_run.js');
const lab=new URL('../../../labs/core-delivery-function/',import.meta.url);
test('development Function ships the exact reviewed Core policy and isolated lab wrapper',()=>{
 for(const name of ['core-delivery-options.ts','delivery-policy.ts'])assert.equal(readFileSync(new URL('../app/services/'+name,import.meta.url),'utf8'),readFileSync(new URL('../extensions/core-delivery-qa/src/'+name,import.meta.url),'utf8'));
 assert.equal(readFileSync(new URL('src/cart_delivery_options_transform_run.ts',lab),'utf8'),readFileSync(new URL('../extensions/core-delivery-qa/src/cart_delivery_options_transform_run.ts',import.meta.url),'utf8'));
});
for(const name of readdirSync(new URL('tests/fixtures/',lab)).filter(n=>n.endsWith('.json'))){
 test('development Function runtime parity: '+name,()=>{
  const {payload}=JSON.parse(readFileSync(new URL('tests/fixtures/'+name,lab),'utf8'));
  const before=JSON.stringify(payload.input);
  assert.deepEqual(run(payload.input),payload.output);
  assert.equal(JSON.stringify(payload.input),before);
 });
}
