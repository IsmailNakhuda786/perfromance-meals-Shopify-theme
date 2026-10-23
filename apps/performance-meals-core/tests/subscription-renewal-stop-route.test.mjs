import test from'node:test';import assert from'node:assert/strict';import{randomUUID}from'node:crypto';import{build}from'esbuild';
globalThis.renewalRoute={failAuth:false,customer:'gid://shopify/Customer/1',calls:[],adminReads:0,state:'COMPLETED'};
await build({entryPoints:['app/routes/api.subscription-renewal-stop.tsx'],outdir:'.shopify/renewal-stop-route-test',bundle:true,packages:'external',format:'esm',platform:'node',plugins:[{name:'renewal-route-boundaries',setup(b){
 b.onResolve({filter:/shopify\.server$/},()=>({path:'auth',namespace:'renewal-route'}));b.onResolve({filter:/subscription-renewal-stop\.server$/},()=>({path:'service',namespace:'renewal-route'}));
 b.onLoad({filter:/.*/,namespace:'renewal-route'},args=>({loader:'js',contents:args.path==='auth'?`export const authenticate={public:{customerAccount:async()=>{const s=globalThis.renewalRoute;if(s.failAuth)throw new Response(null,{status:401});return{sessionToken:{dest:'https://route-fixture.myshopify.com',sub:s.customer},cors:r=>r};}}};export const unauthenticated={admin:async()=>{globalThis.renewalRoute.adminReads++;return{admin:{}};}};`:`export async function stopFutureSubscriptionRenewals(...args){globalThis.renewalRoute.calls.push(args);const state=globalThis.renewalRoute.state;return{state,futureRenewalsStopped:state==='COMPLETED',refundIssued:false};}` }));
 }}]});
const{action,loader}=await import('../.shopify/renewal-stop-route-test/api.subscription-renewal-stop.js');
process.env.ALLOWED_SHOP='route-fixture.myshopify.com';process.env.CORE_SUBSCRIPTION_RENEWAL_STOPS_ENABLED='true';
const payload=()=>({contractGid:'gid://shopify/SubscriptionContract/2',requestKey:randomUUID(),confirmation:'STOP_FUTURE_RENEWALS'});
const request=body=>new Request('https://fixture.invalid/api/subscription-renewal-stop',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('Shopify token supplies the customer and explicit intent reaches only the guarded service',async()=>{
 const body=payload(),r=await action({request:request(body)});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store, private');const call=globalThis.renewalRoute.calls.at(-1);assert.deepEqual(call.slice(1),['route-fixture.myshopify.com','gid://shopify/Customer/1',body.contractGid,body.requestKey]);
});
test('missing authentication, disabled/production execution and read requests cannot call the service',async()=>{
 const s=globalThis.renewalRoute,before=s.calls.length; s.failAuth=true;await assert.rejects(action({request:request(payload())}),e=>e instanceof Response&&e.status===401);s.failAuth=false;
 process.env.CORE_SUBSCRIPTION_RENEWAL_STOPS_ENABLED='false';assert.equal((await action({request:request(payload())})).status,403);process.env.CORE_SUBSCRIPTION_RENEWAL_STOPS_ENABLED='true';
 const old=process.env.NODE_ENV;process.env.NODE_ENV='production';try{assert.equal((await action({request:request(payload())})).status,403);}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}
 assert.equal((await loader({request:new Request('https://fixture.invalid')})).status,405);assert.equal(s.calls.length,before);
});
test('foreign identity payloads, absent confirmation, malformed JSON and oversized bodies stop before native access',async()=>{
 const s=globalThis.renewalRoute,before=s.adminReads;
 for(const change of [p=>p.customerGid='gid://shopify/Customer/99',p=>delete p.confirmation,p=>p.confirmation='REFUND',p=>p.requestKey='bad',p=>p.contractGid='gid://shopify/Order/2',p=>p.extra='x'.repeat(600)]){const p=payload();change(p);assert.equal((await action({request:request(p)})).status,400);}
 assert.equal((await action({request:new Request('https://fixture.invalid',{method:'POST',headers:{'content-type':'application/json'},body:'{'})})).status,400);assert.equal(s.adminReads,before);
});
test('unknown outcomes return a hold, never a false success or refund promise',async()=>{
 globalThis.renewalRoute.state='UNKNOWN';const r=await action({request:request(payload())});assert.equal(r.status,409);const body=await r.json();assert.equal(body.futureRenewalsStopped,false);assert.equal(body.refundIssued,false);globalThis.renewalRoute.state='COMPLETED';
});
