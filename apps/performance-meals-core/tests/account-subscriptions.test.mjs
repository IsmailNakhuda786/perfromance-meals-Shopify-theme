import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/account-subscriptions.server.ts'],outdir:'.shopify/account-subscriptions-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {readAccountSubscriptions}=await import('../.shopify/account-subscriptions-test/account-subscriptions.server.js');
const shop='subscription-fixture.myshopify.com',customer='gid://shopify/Customer/1';process.env.ALLOWED_SHOP=shop;
const binding={contractGid:'gid://shopify/SubscriptionContract/2',orderGid:'gid://shopify/Order/3',productGid:'gid://shopify/Product/4',variantGid:'gid://shopify/ProductVariant/5',businessStream:'meal_plan'};
const fixture=()=>({shop:{myshopifyDomain:shop,currencyCode:'SGD'},currentAppInstallation:{app:{id:'gid://shopify/App/6'}},subscriptionContract:{id:binding.contractGid,status:'PAUSED',currencyCode:'SGD',app:{id:'gid://shopify/App/6'},customer:{id:customer},originOrder:{id:binding.orderGid,customer:{id:customer}},lines:{pageInfo:{hasNextPage:false},nodes:[{id:'gid://shopify/SubscriptionLine/7',title:'Merchant editable plan',quantity:1,productId:binding.productGid,variantId:binding.variantGid}]}}});
const gateway=(edit=()=>{},status=200)=>({graphql:async()=>{const data=fixture();edit(data);return Response.json({data},{status});}});
test('linked status is freshly verified and deduplicated without native mutations',async()=>{
 let reads=0;const admin={graphql:async(q)=>{assert.match(q,/query AccountLinkedContract/);assert.doesNotMatch(q,/mutation/);reads++;return Response.json({data:fixture()});}};
 const result=await readAccountSubscriptions(admin,shop,customer,[binding,binding]);assert.equal(reads,1);assert.equal(result.length,1);assert.equal(result[0].status,'PAUSED');assert.equal(result[0].lines[0].title,'Merchant editable plan');
 const renewed=await readAccountSubscriptions(admin,shop,customer,[binding,{...binding,orderGid:'gid://shopify/Order/88'}]);assert.equal(renewed.length,1,'renewal orders do not replace the original contract anchor');
 assert.deepEqual(await readAccountSubscriptions({graphql:()=>{throw Error('Unexpected read');}},shop,customer,[]),[]);
});
test('other customer/app/order, incomplete or changed lines and failed native reads expose no status',async()=>{
 for(const edit of [d=>d.shop.myshopifyDomain='other',d=>d.subscriptionContract.customer.id='gid://shopify/Customer/99',d=>d.subscriptionContract.originOrder.customer.id='gid://shopify/Customer/99',d=>d.subscriptionContract.originOrder.id='gid://shopify/Order/99',d=>d.subscriptionContract.app.id='gid://shopify/App/99',d=>d.subscriptionContract.id='gid://shopify/SubscriptionContract/99',d=>d.subscriptionContract.currencyCode='USD',d=>d.subscriptionContract.status='UNKNOWN',d=>delete d.subscriptionContract.lines.pageInfo,d=>d.subscriptionContract.lines.nodes[0].variantId='gid://shopify/ProductVariant/99',d=>d.subscriptionContract.lines.nodes.push(d.subscriptionContract.lines.nodes[0]),d=>d.subscriptionContract.lines.nodes[0].quantity=0])await assert.rejects(()=>readAccountSubscriptions(gateway(edit),shop,customer,[binding]));
 await assert.rejects(()=>readAccountSubscriptions(gateway(()=>{},503),shop,customer,[binding]));
 await assert.rejects(()=>readAccountSubscriptions(gateway(),shop,'invalid',[binding]));
});
