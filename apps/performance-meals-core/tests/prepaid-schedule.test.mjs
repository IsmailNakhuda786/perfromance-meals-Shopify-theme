import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
import {prepaidFixture} from './support/prepaid-purchase.mjs';
await buildServices({entryPoints:['app/services/prepaid-schedule.server.ts'],outdir:'.shopify/prepaid-schedule-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {readPrepaidSchedule,PREPAID_SCHEDULE_QUERY}=await import('../.shopify/prepaid-schedule-test/prepaid-schedule.server.js');
const shop='prepaid-schedule-fixture.myshopify.com';process.env.ALLOWED_SHOP=shop;
function fixture(months=3){
 const f=prepaidFixture(shop,1,months),expected={...f.input.expected,deliveryDates:f.input.availableDates};
 f.data.currentAppInstallation.accessScopes=['read_merchant_managed_fulfillment_orders','read_third_party_fulfillment_orders'].map(handle=>({handle}));
 f.data.order.fulfillmentOrders={pageInfo:{hasNextPage:false},nodes:expected.deliveryDates.map((date,i)=>({id:`gid://shopify/FulfillmentOrder/${i+100}`,status:i?'SCHEDULED':'OPEN',fulfillAt:date+'T00:00:00Z',order:{id:expected.orderGid},lineItems:{pageInfo:{hasNextPage:false},nodes:[{id:`gid://shopify/FulfillmentOrderLineItem/${i+200}`,totalQuantity:1,remainingQuantity:1,lineItem:{id:expected.orderLineGid}}]}}))};
 return {...f,expected};
}
const admin=(data,status=200)=>({graphql:async(query,{variables})=>{assert.equal(query,PREPAID_SCHEDULE_QUERY);assert.doesNotMatch(query,/\bmutation\b/);assert.equal(variables.id,data.order.id);return Response.json({data},{status});}});
const run=f=>readPrepaidSchedule(admin(f.data),shop,f.expected);
test('visible native 3/6 delivery work matches dates and per-delivery quantities without claiming a customer time slot',async()=>{
 for(const months of [3,6]){
  const f=fixture(months),result=await run(f);assert.equal(result.scheduleMatches,true);assert.equal(result.deliveryCount,months);assert.equal(result.deliveryTimeSlotVerified,false);assert.equal(result.evidence.length,months);
 }
});
test('limited scopes, wrong app/store/customer and incomplete native pages cannot prove complete coverage',async()=>{
 for(const change of [f=>f.data.currentAppInstallation.accessScopes.pop(),f=>f.data.currentAppInstallation.app.id='gid://shopify/App/99',f=>f.data.shop.myshopifyDomain='other.myshopify.com',f=>f.data.order.customer.id='gid://shopify/Customer/99',f=>f.data.order.test=false,f=>f.data.order.cancelledAt='2026-10-20T02:00:00Z',f=>f.data.order.fulfillmentOrders.pageInfo.hasNextPage=true,f=>f.data.order.lineItems.pageInfo.hasNextPage=true,f=>delete f.data.order.fulfillmentOrders.nodes[0].lineItems.pageInfo,f=>f.data.order.lineItems.nodes[0].quantity=1]){
  const f=fixture();change(f);await assert.rejects(run(f));
 }
});
test('processed, held, duplicated, foreign or malformed fulfillment evidence is not an undispatched schedule',async()=>{
 for(const change of [f=>f.data.order.fulfillmentOrders.nodes[0].status='CLOSED',f=>f.data.order.fulfillmentOrders.nodes[0].status='ON_HOLD',f=>f.data.order.fulfillmentOrders.nodes[0].lineItems.nodes[0].remainingQuantity=0,f=>f.data.order.fulfillmentOrders.nodes[0].lineItems.nodes[0].remainingQuantity=2,f=>f.data.order.fulfillmentOrders.nodes[0].order.id='gid://shopify/Order/99',f=>f.data.order.fulfillmentOrders.nodes.push(f.data.order.fulfillmentOrders.nodes[0]),f=>f.data.order.fulfillmentOrders.nodes[0].lineItems.nodes.push(f.data.order.fulfillmentOrders.nodes[0].lineItems.nodes[0]),f=>f.data.order.fulfillmentOrders.nodes[0].lineItems.nodes[0].id='not-native']){
  const f=fixture();change(f);await assert.rejects(run(f));
 }
});
test('wrong quantities, missing occurrences or changed dates remain explicit schedule mismatches',async()=>{
 for(const change of [f=>f.data.order.fulfillmentOrders.nodes.pop(),f=>{const item=f.data.order.fulfillmentOrders.nodes[0].lineItems.nodes[0];item.totalQuantity=2;item.remainingQuantity=2;},f=>f.data.order.fulfillmentOrders.nodes[1].fulfillAt='2026-11-23T00:00:00Z',f=>f.data.order.fulfillmentOrders.nodes[0].fulfillAt=null]){
  const f=fixture();change(f);assert.equal((await run(f)).scheduleMatches,false);
 }
});
test('unrelated mixed-cart work is omitted but its incomplete page cannot hide target lines',async()=>{
 const f=fixture(),unrelated=structuredClone(f.data.order.fulfillmentOrders.nodes[0]);unrelated.id='gid://shopify/FulfillmentOrder/999';unrelated.lineItems.nodes[0].id='gid://shopify/FulfillmentOrderLineItem/999';unrelated.lineItems.nodes[0].lineItem.id='gid://shopify/LineItem/999';
 f.data.order.fulfillmentOrders.nodes.push(unrelated);assert.equal((await run(f)).scheduleMatches,true);
 unrelated.lineItems.pageInfo.hasNextPage=true;await assert.rejects(run(f),/incomplete/);
});

test('cost-bounded parent pages retain every prepaid delivery, including the sixth occurrence',async()=>{
 const f=fixture(6),parents=structuredClone(f.data.order.fulfillmentOrders.nodes),calls=[];
 const result=await readPrepaidSchedule({graphql:async(q,{variables})=>{
  assert.equal(q,PREPAID_SCHEDULE_QUERY);assert.doesNotMatch(q,/\bmutation\b/);calls.push(variables.after);
  const data=structuredClone(f.data);data.order.fulfillmentOrders={nodes:variables.after?parents.slice(5):parents.slice(0,5),pageInfo:variables.after?{hasNextPage:false}:{hasNextPage:true,endCursor:'sixth-delivery'}};
  return Response.json({data});
 }},shop,f.expected);
 assert.deepEqual(calls,[null,'sixth-delivery']);assert.equal(result.deliveryCount,6);assert.equal(result.scheduleMatches,true);
});
test('a target line beyond the first child page is read rather than silently omitted',async()=>{
 const{PREPAID_SCHEDULE_ITEMS_QUERY}=await import('../.shopify/prepaid-schedule-test/prepaid-schedule.server.js');
 const f=fixture(),parent=f.data.order.fulfillmentOrders.nodes[0],target=structuredClone(parent.lineItems.nodes[0]);let childReads=0;
 parent.lineItems={nodes:[{...target,id:'gid://shopify/FulfillmentOrderLineItem/999',lineItem:{id:'gid://shopify/LineItem/999'}}],pageInfo:{hasNextPage:true,endCursor:'target-line'}};
 const result=await readPrepaidSchedule({graphql:async(q,{variables})=>{
  assert.doesNotMatch(q,/\bmutation\b/);if(q===PREPAID_SCHEDULE_QUERY)return Response.json({data:structuredClone(f.data)});
  assert.equal(q,PREPAID_SCHEDULE_ITEMS_QUERY);assert.deepEqual(variables,{id:parent.id,after:'target-line'});childReads++;
  return Response.json({data:{shop:f.data.shop,currentAppInstallation:f.data.currentAppInstallation,fulfillmentOrder:{id:parent.id,order:{id:f.expected.orderGid},lineItems:{nodes:[target],pageInfo:{hasNextPage:false}}}}});
 }},shop,f.expected);
 assert.equal(result.scheduleMatches,true);assert.equal(result.deliveryCount,3);assert.equal(childReads,1);
});
test('repeated parent cursors and a changed original order cannot prove complete coverage',async()=>{
 for(const change of ['repeated','changed']){
  const f=fixture();let calls=0;
  await assert.rejects(readPrepaidSchedule({graphql:async()=>{
   const data=structuredClone(f.data);calls++;
   data.order.fulfillmentOrders={nodes:[data.order.fulfillmentOrders.nodes[0]],pageInfo:{hasNextPage:true,endCursor:'repeat'}};
   if(change==='changed'&&calls===2)data.order.lineItems.nodes[0].currentQuantity=1;
   return Response.json({data});
  }},shop,f.expected),/incomplete|changed/);assert.equal(calls,2);
 }
});
test('foreign child pages, duplicate items and looping child cursors remain held',async()=>{
 for(const change of ['foreign-app','foreign-order','foreign-parent','duplicate','loop','error']){
  const f=fixture(),p=f.data.order.fulfillmentOrders.nodes[0],item=structuredClone(p.lineItems.nodes[0]);p.lineItems.pageInfo={hasNextPage:true,endCursor:'child'};let reads=0;
  await assert.rejects(readPrepaidSchedule({graphql:async(q)=>{
   if(q===PREPAID_SCHEDULE_QUERY)return Response.json({data:structuredClone(f.data)});reads++;
   if(change==='error')return Response.json({errors:[{message:'Unavailable'}]});
   const data={shop:f.data.shop,currentAppInstallation:structuredClone(f.data.currentAppInstallation),fulfillmentOrder:{id:p.id,order:{id:f.expected.orderGid},lineItems:{nodes:[item],pageInfo:change==='loop'?{hasNextPage:true,endCursor:'child'}:{hasNextPage:false}}}};
   if(change==='foreign-app')data.currentAppInstallation.app.id='gid://shopify/App/999';
   if(change==='foreign-order')data.fulfillmentOrder.order.id='gid://shopify/Order/999';
   if(change==='foreign-parent')data.fulfillmentOrder.id='gid://shopify/FulfillmentOrder/999';
   return Response.json({data});
  }},shop,f.expected));assert.equal(reads,1);
 }
});
test('parent pagination has a hard coverage bound and cannot run without limit',async()=>{
 const f=fixture();let reads=0;
 await assert.rejects(readPrepaidSchedule({graphql:async()=>{
  const data=structuredClone(f.data),template=data.order.fulfillmentOrders.nodes[0];reads++;
  data.order.fulfillmentOrders={nodes:Array.from({length:5},(_,i)=>({...template,id:`gid://shopify/FulfillmentOrder/${reads*10+i}`})),pageInfo:{hasNextPage:true,endCursor:'page-'+reads}};
  return Response.json({data});
 }},shop,f.expected),/incomplete/);assert.equal(reads,20);
});
