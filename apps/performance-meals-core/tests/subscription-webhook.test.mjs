import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const state={topic:'SUBSCRIPTION_CONTRACTS_CREATE',id:'gid://shopify/SubscriptionContract/2',shop:'fixture.myshopify.com',session:true,failAuth:false,failLink:false,calls:0};
globalThis.subscriptionWebhookFixture=state;
await build({entryPoints:['app/routes/webhooks.subscriptions.create.tsx'],outfile:'.shopify/subscription-webhook-test.js',bundle:true,packages:'external',platform:'node',format:'esm',plugins:[{name:'authenticated-contract-fixture',setup(b){
 b.onResolve({filter:/shopify\.server|security\.server|subscription-links\.server/},args=>({path:args.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:args.path.includes('shopify.server')?'export const authenticate={webhook:async()=>{const s=globalThis.subscriptionWebhookFixture;if(s.failAuth)throw new Response(null,{status:401});return {shop:s.shop,admin:s.session?{}:null,payload:{admin_graphql_api_id:s.id},topic:s.topic};}};':args.path.includes('security.server')?'export function assertShop(shop){if(shop!=="fixture.myshopify.com")throw Error("Wrong store")}':'export async function linkSubscriptionOrigin(){const s=globalThis.subscriptionWebhookFixture;s.calls++;if(s.failLink)throw Error("Original order not ready");}'}));
}}]});
const {action}=await import('../.shopify/subscription-webhook-test.js');
const request=(event=true)=>new Request('https://fixture.invalid/webhooks/subscriptions/create',{method:'POST',headers:event?{'X-Shopify-Event-Id':'contract-event'}:{}});
test('authenticated contract notification retries when original evidence is not ready',async()=>{
 state.failLink=true;await assert.rejects(()=>action({request:request()}),/Original order not ready/);
 state.failLink=false;assert.equal((await action({request:request()})).status,200);assert.equal(state.calls,2);
});
test('invalid identity, foreign store, wrong topic or missing session never reaches linking',async()=>{
 const before=state.calls;
 for(const [key,value]of [['topic','ORDERS_PAID'],['id','gid://shopify/Order/2'],['shop','other.myshopify.com'],['session',false],['failAuth',true]]){const original=state[key];state[key]=value;await assert.rejects(()=>action({request:request()}));state[key]=original;}
 await assert.rejects(()=>action({request:request(false)}));assert.equal(state.calls,before);
});
