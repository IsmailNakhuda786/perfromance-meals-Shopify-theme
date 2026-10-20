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
