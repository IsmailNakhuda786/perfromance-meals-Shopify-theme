import test from'node:test';import assert from'node:assert/strict';
import{createRenewalStopClient}from'../extensions/performance-meals-account/src/renewal-stop-client.js';
const contractGid='gid://shopify/SubscriptionContract/2',requestKey='11111111-1111-4111-8111-111111111111';
const success=()=>({contractGid,state:'COMPLETED',futureRenewalsStopped:true,paidEntitlementsUnchanged:true,refundIssued:false});
const defaults={origin:'https://core.example.invalid',contractGid,getToken:async()=>'fixture-token',newKey:()=>requestKey};
test('explicit confirmation is required and concurrent clicks send one token-bound request',async()=>{
 let calls=0,release;const wait=new Promise(r=>release=r);const client=createRenewalStopClient({...defaults,transport:async(url,input)=>{calls++;assert.equal(url.href,'https://core.example.invalid/api/subscription-renewal-stop');assert.equal(input.headers.Authorization,'Bearer fixture-token');assert.deepEqual(JSON.parse(input.body),{contractGid,requestKey,confirmation:'STOP_FUTURE_RENEWALS'});await wait;return Response.json(success());}});
 await assert.rejects(client.submit(false));assert.equal(calls,0);const first=client.submit(true),second=client.submit(true);release();const results=await Promise.all([first,second]);assert.deepEqual(results,[{state:'COMPLETED',futureRenewalsStopped:true},{state:'COMPLETED',futureRenewalsStopped:true}]);await client.submit(true);assert.equal(calls,1);
});
test('network loss, rejected, malformed or foreign responses remain held with no automatic retry',async()=>{
 for(const transport of [async()=>{throw Error('Connection lost');},async()=>Response.json(success(),{status:409}),async()=>new Response('not-json'),async()=>Response.json({...success(),contractGid:'gid://shopify/SubscriptionContract/99'}),async()=>Response.json({...success(),refundIssued:true}),async()=>Response.json({...success(),paidEntitlementsUnchanged:false}),async()=>Response.json({...success(),state:'UNKNOWN'})]){
  let calls=0;const client=createRenewalStopClient({...defaults,transport:async(...a)=>{calls++;return transport(...a);}});assert.equal((await client.submit(true)).futureRenewalsStopped,false);await client.submit(true);assert.equal(calls,1);
 }
});
test('an auth timeout resolves as unknown and cannot send a late request after the token eventually arrives',async()=>{
 let calls=0,token;const pendingToken=new Promise(r=>token=r);const client=createRenewalStopClient({...defaults,timeoutMs:5,getToken:()=>pendingToken,transport:async()=>{calls++;return Response.json(success());}});
 assert.equal((await client.submit(true)).state,'UNKNOWN');token('late-token');await Promise.resolve();await Promise.resolve();assert.equal(calls,0);await client.submit(true);assert.equal(calls,0);
});
test('a transport ignoring cancellation cannot overwrite an unknown result after the timeout',async()=>{
 let release,calls=0;const wait=new Promise(r=>release=r);const client=createRenewalStopClient({...defaults,timeoutMs:5,transport:async()=>{calls++;await wait;return Response.json(success());}});
 assert.equal((await client.submit(true)).state,'UNKNOWN');release();await Promise.resolve();await Promise.resolve();assert.equal((await client.submit(true)).state,'UNKNOWN');assert.equal(calls,1);
});
test('unsafe origins, wrong resources and invalid request keys stop before transmission',async()=>{
 for(const change of [{origin:'http://core.example.invalid'},{origin:'https://user:qa@example.invalid'},{origin:'https://core.example.invalid/path'},{origin:'https://core.example.invalid?secret=x'},{contractGid:'gid://shopify/Order/2'},{timeoutMs:0}])assert.throws(()=>createRenewalStopClient({...defaults,...change}));
 let calls=0;const client=createRenewalStopClient({...defaults,newKey:()=>'',transport:async()=>{calls++;}});assert.equal((await client.submit(true)).state,'UNKNOWN');assert.equal(calls,0);
});
