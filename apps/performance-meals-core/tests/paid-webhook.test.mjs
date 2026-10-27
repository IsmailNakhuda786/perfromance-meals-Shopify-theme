import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const state={topic:'ORDERS_PAID',routed:false,routeCalls:0,earnCalls:0,failEarn:true,failAuth:false,packageCalls:0,packageHandled:false};
globalThis.paidWebhookFixture=state;
await build({entryPoints:['app/routes/webhooks.orders.paid.tsx'],outfile:'.shopify/paid-webhook-test.js',bundle:true,packages:'external',platform:'node',format:'esm',plugins:[{name:'authenticated-webhook-fixture',setup(b){
 b.onResolve({filter:/shopify\.server|security\.server|orders\.server|rewards-native\.server|wallet-package-pipeline\.server/},args=>({path:args.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:args.path.includes('shopify.server')?'export const authenticate={webhook:async()=>{if(globalThis.paidWebhookFixture.failAuth)throw new Response(null,{status:401});return {shop:"fixture.myshopify.com",admin:{},payload:{admin_graphql_api_id:"gid://shopify/Order/900"},topic:globalThis.paidWebhookFixture.topic};}};':args.path.includes('wallet-package-pipeline')?'export async function handleWalletPackageWebhook(){const s=globalThis.paidWebhookFixture;s.packageCalls++;return s.packageHandled;}':args.path.includes('security.server')?'export function assertShop(shop){if(shop!=="fixture.myshopify.com")throw Error("Wrong store")}':args.path.includes('rewards-native')?'export async function earnNativeOrderRewards(){const s=globalThis.paidWebhookFixture;s.earnCalls++;if(s.failEarn)throw Error("Evidence temporarily unavailable")}':'export async function recordOrder(){const s=globalThis.paidWebhookFixture;s.routeCalls++;if(s.routed)return;s.routed=true;}'}));
}}]});
const {action}=await import('../.shopify/paid-webhook-test.js');
const request=()=>new Request('https://example.invalid/webhooks/orders/paid',{method:'POST',headers:{'X-Shopify-Event-Id':'same-delivery'}});
test('retry still verifies earning after routing was persisted before an evidence failure',async()=>{
 await assert.rejects(action({request:request()}),/Evidence temporarily unavailable/);
 assert.equal(state.routed,true);state.failEarn=false;
 assert.equal((await action({request:request()})).status,200);
 assert.equal(state.routeCalls,2);assert.equal(state.earnCalls,2);
});
test('wrong topic and missing event identity cannot trigger routing or earning',async()=>{
 const before=[state.routeCalls,state.earnCalls];state.topic='ORDERS_CREATE';
 await assert.rejects(action({request:request()}),e=>e instanceof Response&&e.status===400);
 state.topic='ORDERS_PAID';
 await assert.rejects(action({request:new Request('https://example.invalid',{method:'POST'})}),e=>e instanceof Response&&e.status===400);
 assert.deepEqual([state.routeCalls,state.earnCalls],before);
});

test('SDK authentication precedes package intake and package events bypass food routing and Rewards',async()=>{
 const before=[state.routeCalls,state.earnCalls,state.packageCalls];state.packageHandled=true;assert.equal((await action({request:request()})).status,200);assert.deepEqual([state.routeCalls,state.earnCalls],before.slice(0,2));assert.equal(state.packageCalls,before[2]+1);state.failAuth=true;try{await assert.rejects(action({request:request()}),e=>e instanceof Response&&e.status===401);assert.equal(state.packageCalls,before[2]+1);}finally{state.failAuth=false;state.packageHandled=false;}
});
