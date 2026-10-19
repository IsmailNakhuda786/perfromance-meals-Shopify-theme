import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const state={shop:'fixture.myshopify.com',topic:'ORDERS_UPDATED',id:'gid://shopify/Order/901',failAuth:false,admin:true,failDispatch:true,routed:false,sequence:[]};
globalThis.orderWebhookFixture=state;
await build({entryPoints:['app/routes/webhooks.orders.create.tsx'],outfile:'.shopify/order-webhook-test.js',bundle:true,packages:'external',platform:'node',format:'esm',plugins:[{name:'order-webhook-boundaries',setup(b){
 b.onResolve({filter:/shopify\.server|security\.server|orders\.server|order-dispatch\.server/},args=>({path:args.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:args.path.includes('shopify.server')?'export const authenticate={webhook:async()=>{const s=globalThis.orderWebhookFixture;if(s.failAuth)throw new Response(null,{status:401});return {shop:s.shop,topic:s.topic,payload:{admin_graphql_api_id:s.id},admin:s.admin?{}:null};}};':args.path.includes('security.server')?'export function assertShop(shop){if(shop!=="fixture.myshopify.com")throw new Response(null,{status:403});}':args.path.includes('order-dispatch')?'export async function syncOrderDispatch(){const s=globalThis.orderWebhookFixture;s.sequence.push("dispatch");if(s.failDispatch)throw Error("Dispatch read unavailable");}':'export async function recordOrder(){const s=globalThis.orderWebhookFixture;s.sequence.push("routing");s.routed=true;}'}));
}}]});
const {action}=await import('../.shopify/order-webhook-test.js');
const request=()=>new Request('https://fixture.invalid/webhooks/orders/create',{method:'POST',headers:{'X-Shopify-Event-Id':'fixture-event'}});
test('a failed dispatch read remains retryable after routing succeeded',async()=>{
 await assert.rejects(action({request:request()}),/Dispatch read unavailable/);assert.equal(state.routed,true);
 state.failDispatch=false;assert.equal((await action({request:request()})).status,200);
 assert.deepEqual(state.sequence,['routing','dispatch','routing','dispatch']);
});
test('authentication, store, topic and native identity gates precede any routing or dispatch',async()=>{
 const before=[...state.sequence];
 for(const [key,value,status]of [['failAuth',true,401],['shop','other.myshopify.com',403],['topic','ORDERS_PAID',400],['id','gid://shopify/Customer/901',400],['admin',false,503]]){
  const old=state[key];state[key]=value;await assert.rejects(action({request:request()}),e=>e instanceof Response&&e.status===status);state[key]=old;
 }
 await assert.rejects(action({request:new Request('https://fixture.invalid/webhooks/orders/create',{method:'POST'})}),e=>e instanceof Response&&e.status===400);
 assert.deepEqual(state.sequence,before);
});
test('created and updated notifications both refresh dispatch with the fallback delivery header',async()=>{
 const before=state.sequence.length;
 for(const topic of ['ORDERS_CREATE','ORDERS_UPDATED']){
  state.topic=topic;
  assert.equal((await action({request:new Request('https://fixture.invalid/webhooks/orders/create',{method:'POST',headers:{'X-Shopify-Webhook-Id':'fallback-event'}})})).status,200);
 }
 assert.deepEqual(state.sequence.slice(before),['routing','dispatch','routing','dispatch']);
});
