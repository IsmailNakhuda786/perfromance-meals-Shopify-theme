import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
globalThis.bundleRouteFixture={authCalls:0,prepareCalls:0,shop:'bundle-route.myshopify.com',failAuth:false};
await buildServices({entryPoints:['app/routes/proxy.bundle-review.tsx','app/services/security.server.ts'],outdir:'.shopify/bundle-route-test',outbase:'app',bundle:true,packages:'external',format:'esm',platform:'node',plugins:[{name:'bundle-auth',setup(b){
 b.onResolve({filter:/shopify\.server$/},()=>({path:'auth',namespace:'fixture'}));
 b.onResolve({filter:/bundle-reviews\.server$/},()=>({path:'reviews',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:args.path==='auth'?`export const authenticate={public:{appProxy:async()=>{const s=globalThis.bundleRouteFixture;s.authCalls++;if(s.failAuth)throw new Response('Unauthorized',{status:401});return {session:{shop:s.shop},admin:{}};}}};`:`export async function prepareBundleReview(admin,input){const s=globalThis.bundleRouteFixture;s.prepareCalls++;s.input=input;return {id:'review',snapshotHash:'hash',quantity:input.quantity,snapshot:JSON.stringify({itemsPerBundle:14})};}`}));
}}]});
const {loader,action}=await import('../.shopify/bundle-route-test/routes/proxy.bundle-review.js');
const {issueNonce}=await import('../.shopify/bundle-route-test/services/security.server.js');
const s=globalThis.bundleRouteFixture;process.env.ALLOWED_SHOP=s.shop;process.env.SHOPIFY_API_SECRET='fixture-only';
const url=()=>`https://core.invalid/proxy/bundle-review?timestamp=${Math.floor(Date.now()/1000)}&logged_in_customer_id=901`;
const nonce=()=>issueNonce(s.shop,'gid://shopify/Customer/901',process.env.SHOPIFY_API_SECRET);
const request=(body)=>new Request(url(),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('review route remains unavailable by default without authentication or database work',async()=>{delete process.env.BUNDLE_REVIEW_ENABLED;await assert.rejects(loader({request:new Request(url())}),e=>e.status===404);assert.equal(s.authCalls,0);assert.equal(s.prepareCalls,0);});
test('signed proxy identity and nonce govern review ownership, never client customer fields',async()=>{process.env.BUNDLE_REVIEW_ENABLED='true';const response=await loader({request:new Request(url())});assert.match(response.headers.get('cache-control'),/no-store/);assert.ok((await response.json()).nonce);const result=await action({request:request({nonce:nonce(),productGid:'gid://shopify/Product/1',variantGid:'gid://shopify/ProductVariant/2',quantity:2,customerGid:'gid://shopify/Customer/999'})});assert.equal(result.status,200);assert.equal(s.input.customerGid,'gid://shopify/Customer/901');assert.equal(s.input.shop,s.shop);assert.equal(s.prepareCalls,1);});
test('authentication, anonymous identity, bad nonce and malformed payload cannot prepare reviews',async()=>{s.failAuth=true;await assert.rejects(loader({request:new Request(url())}),e=>e.status===401);s.failAuth=false;await assert.rejects(loader({request:new Request(url().replace('logged_in_customer_id=901','logged_in_customer_id='))}),e=>e.status===401);await assert.rejects(action({request:request({nonce:'bad'})}),e=>e.status===403);await assert.rejects(action({request:request({nonce:nonce(),quantity:0})}),e=>e.status===400);await assert.rejects(action({request:request({nonce:nonce(),value:'x'.repeat(4100)})}),e=>e.status===413);assert.equal(s.prepareCalls,1);});
