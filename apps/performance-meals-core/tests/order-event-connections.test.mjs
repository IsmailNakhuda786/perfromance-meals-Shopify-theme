import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/order-event-connections.ts'],outdir:'.shopify/order-event-connections-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {reviewOrderEventConnections,ORDER_EVENT_PATHS}=await import('../.shopify/order-event-connections-test/order-event-connections.js');
const origin='https://current-preview.example';
const all=Object.entries(ORDER_EVENT_PATHS).map(([topic,path])=>({topic,uri:origin+path}));
test('order connection requires create, update and paid events at the current origin',()=>{
 assert.equal(reviewOrderEventConnections(origin,all,true).connected,true);
 for(const event of all){const result=reviewOrderEventConnections(origin,all.filter(s=>s!==event),true);assert.equal(result.connected,false);assert.deepEqual(result.missing,[event.topic]);}
 assert.equal(reviewOrderEventConnections(origin,[...all,all[0]],true).connected,false);
 assert.equal(reviewOrderEventConnections(origin,all.map(s=>({...s,uri:s.uri.replace('current-preview','old-preview')})),true).connected,false);
});
test('incomplete reads and unsafe or unavailable preview origins cannot claim connection',()=>{
 for(const url of [undefined,'invalid','http://current-preview.example','https://user:qa@example.invalid','https://current-preview.example?secret=1'])assert.equal(reviewOrderEventConnections(url,all,true).connected,false);
 assert.equal(reviewOrderEventConnections(origin,all,false).connected,false);
 assert.equal(reviewOrderEventConnections(origin,[],true).connected,false);
});
test('one current callback cannot hide a duplicate for the same topic on an old tunnel',()=>{
 for(const event of all){
  const stale={...event,uri:event.uri.replace('current-preview','expired-preview')};
  const result=reviewOrderEventConnections(origin,[...all,stale],true);
  assert.equal(result.connected,false);assert.deepEqual(result.missing,[event.topic]);
 }
});
