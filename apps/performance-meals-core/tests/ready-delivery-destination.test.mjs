import test from 'node:test';import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/ready-delivery-destination.server.ts'],outdir:'.shopify/visit-destination-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {readReadyDeliveryVisitDestination:read}=await import('../.shopify/visit-destination-test/ready-delivery-destination.server.js');
const shop='visit-destination-fixture.myshopify.com';process.env.ALLOWED_SHOP=shop;
const expected={appGid:'gid://shopify/App/1',customerGid:'gid://shopify/Customer/1',orderGid:'gid://shopify/Order/1',fulfillmentOrderGids:['gid://shopify/FulfillmentOrder/1','gid://shopify/FulfillmentOrder/2']};
function fixture(){
 const row=n=>({id:'gid://shopify/FulfillmentOrder/'+n,order:{id:expected.orderGid},deliveryMethod:{methodType:'SHIPPING'},destination:{id:'gid://shopify/FulfillmentOrderDestination/'+n,address1:'QA TEST ADDRESS',address2:null,city:'Singapore',company:null,countryCode:'SG',province:null,zip:'000001'}});
 const data={shop:{myshopifyDomain:shop},currentAppInstallation:{app:{id:expected.appGid},accessScopes:[{handle:'read_merchant_managed_fulfillment_orders'},{handle:'read_third_party_fulfillment_orders'}]},order:{id:expected.orderGid,test:true,cancelledAt:null,customer:{id:expected.customerGid},fulfillmentOrders:{nodes:[row(1),row(2)],pageInfo:{hasNextPage:false}}}};
 const dispatch={shop:{myshopifyDomain:shop},order:{id:expected.orderGid,cancelledAt:null,customer:{id:expected.customerGid},fulfillmentsCount:{count:0,precision:'EXACT'},fulfillments:[]}};
 const f={data,dispatch,calls:0,page:null};f.admin={graphql:async(q,o)=>{f.calls++;assert.doesNotMatch(q,/\bmutation\b/);return Response.json({data:q.includes('CoreOrderDispatch')?f.dispatch:f.page?f.page(o.variables.after):f.data});}};return f;
}
test('exact same destination across distinct native IDs produces only an opaque stable fingerprint',async()=>{
 const f=fixture(),before=JSON.stringify(f.data),a=await read(f.admin,shop,expected),b=await read(f.admin,shop,expected);
 assert.match(a.destinationKey,/^[a-f0-9]{64}$/);assert.deepEqual(a,b);assert.equal(a.bookingConfirmed,false);assert.equal(a.dispatchVerified,true);assert.equal(JSON.stringify(f.data),before);assert.doesNotMatch(JSON.stringify(a),/QA TEST ADDRESS|000001/);
});
test('different address, unit, postcode or company never silently share a driver visit',async()=>{
 for(const [key,value]of [['address1','OTHER'],['address2','Unit 2'],['zip','000002'],['company','Other']]){const f=fixture();f.data.order.fulfillmentOrders.nodes[1].destination[key]=value;await assert.rejects(read(f.admin,shop,expected),/different/);}
});
test('missing fields, pickup locations, foreign ownership and hidden work hold destination proof',async()=>{
 for(const edit of [f=>f.data.order.fulfillmentOrders.nodes[0].destination=null,f=>delete f.data.order.fulfillmentOrders.nodes[0].destination.city,f=>f.data.order.fulfillmentOrders.nodes[0].deliveryMethod.methodType='PICK_UP',f=>f.data.order.customer.id='gid://shopify/Customer/2',f=>f.data.currentAppInstallation.accessScopes.pop(),f=>f.data.order.test=false,f=>f.data.order.fulfillmentOrders.nodes.pop(),f=>f.data.order.fulfillmentOrders.nodes.push(f.data.order.fulfillmentOrders.nodes[0])]){const f=fixture();edit(f);await assert.rejects(read(f.admin,shop,expected));}
});
test('bounded pagination verifies all requested native delivery destinations',async()=>{
 const f=fixture(),first=structuredClone(f.data),last=structuredClone(f.data);first.order.fulfillmentOrders.nodes.pop();first.order.fulfillmentOrders.pageInfo={hasNextPage:true,endCursor:'next'};last.order.fulfillmentOrders.nodes.shift();
 f.page=after=>after?last:first;assert.equal((await read(f.admin,shop,expected)).destinationVerified,true);assert.equal(f.calls,3);
 last.order.fulfillmentOrders.nodes[0].destination.address2='different';await assert.rejects(read(f.admin,shop,expected),/different/);
});
test('broken cursors, repeated IDs and identity changes across pages hold instead of partial proof',async()=>{
 for(const mode of ['cursor','duplicate','owner']){const f=fixture(),first=structuredClone(f.data),last=structuredClone(f.data);first.order.fulfillmentOrders.pageInfo={hasNextPage:true,endCursor:'next'};if(mode==='cursor')last.order.fulfillmentOrders.pageInfo={hasNextPage:true,endCursor:'next'};if(mode==='owner')last.order.customer.id='gid://shopify/Customer/2';f.page=after=>after?last:first;await assert.rejects(read(f.admin,shop,expected));}
});
test('incomplete dispatch, a cancellation or any dispatched line blocks the proof',async()=>{
 for(const edit of [f=>f.dispatch.order.fulfillmentsCount.precision='AT_LEAST',f=>f.dispatch.order.cancelledAt='2026-10-27T00:00:00Z',f=>f.dispatch.order.customer.id='gid://shopify/Customer/2',f=>{f.dispatch.order.fulfillmentsCount.count=1;f.dispatch.order.fulfillments=[{id:'gid://shopify/Fulfillment/1',status:'SUCCESS',fulfillmentLineItems:{nodes:[{id:'gid://shopify/FulfillmentLineItem/1',quantity:1,lineItem:{id:'gid://shopify/LineItem/1'}}],pageInfo:{hasNextPage:false}}}];}]){const f=fixture();edit(f);await assert.rejects(read(f.admin,shop,expected));}
});
test('invalid or duplicate requested references and production context make no remote calls',async()=>{
 const f=fixture();for(const ids of [[],['bad'],[expected.fulfillmentOrderGids[0],expected.fulfillmentOrderGids[0]]])await assert.rejects(read(f.admin,shop,{...expected,fulfillmentOrderGids:ids}));
 const old=process.env.NODE_ENV;process.env.NODE_ENV='production';try{await assert.rejects(read(f.admin,shop,expected),/Development/);}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}assert.equal(f.calls,0);
});

test('native local delivery is supported; pickup and unknown delivery methods are held',async()=>{
 const f=fixture();for(const row of f.data.order.fulfillmentOrders.nodes)row.deliveryMethod.methodType='LOCAL';assert.equal((await read(f.admin,shop,expected)).destinationVerified,true);
 for(const method of ['NONE','RETAIL','PICKUP_POINT',null]){const f=fixture();f.data.order.fulfillmentOrders.nodes[0].deliveryMethod.methodType=method;await assert.rejects(read(f.admin,shop,expected));}
});
