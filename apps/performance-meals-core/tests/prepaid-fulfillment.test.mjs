import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['app/services/prepaid-fulfillment.ts'],outdir:'.shopify/prepaid-fulfillment-test',bundle:true,format:'esm',platform:'node'});
const {verifyReadySeriesFulfillments}=await import('../.shopify/prepaid-fulfillment-test/prepaid-fulfillment.js');
const orderGid='gid://shopify/Order/1',lineGid='gid://shopify/LineItem/2';
const dates=['2027-01-31','2027-02-28','2027-03-31','2027-04-30','2027-05-31','2027-06-30'];
const expected=deliveries=>({deliveries,deliveryDates:dates.slice(0,deliveries),orderGid,lineGid,quantityPerDelivery:1});
const fixture=count=>dates.slice(0,count).map((date,i)=>({id:`gid://shopify/FulfillmentOrder/${i+10}`,orderGid,lineGid,quantity:1,status:i?'SCHEDULED':'OPEN',fulfillAt:date+'T00:00:00Z'}));
test('3/6 deliveries match the explicit monthly merchant calendar, irrespective of evidence order',()=>{
 for(const count of [3,6])assert.equal(verifyReadySeriesFulfillments(fixture(count).reverse(),expected(count)).scheduleMatches,true);
});
test('missing dates, duplicates, held/cancelled records and quantity/order mismatches cannot prove coverage',()=>{
 for(const mutate of [a=>a.pop(),a=>{a[0].fulfillAt=null;},a=>{a[1].fulfillAt=a[0].fulfillAt;},a=>{a[1].id=a[0].id;},a=>{a[1].orderGid='gid://shopify/Order/99';},a=>{a[1].quantity=2;},a=>{a[1].status='CANCELLED';},a=>{a[1].status='ON_HOLD';},a=>{a[1].status='invented';},a=>{a[1].fulfillAt='2027-02-30T00:00:00Z';}]){
  const data=fixture(3);mutate(data);assert.equal(verifyReadySeriesFulfillments(data,expected(3)).scheduleMatches,false);
 }
});
test('Singapore dates govern coverage and unrelated cart lines are excluded',()=>{
 const data=fixture(3);data[0].fulfillAt='2027-01-30T16:30:00Z';
 data.push({...data[0],id:'gid://shopify/FulfillmentOrder/99',lineGid:'gid://shopify/LineItem/99'});
 assert.equal(verifyReadySeriesFulfillments(data,expected(3)).scheduleMatches,true);
 for(const change of [{deliveries:12},{deliveryDates:['2027-02-30',...dates.slice(1,3)]},{deliveryDates:[dates[0],dates[0],dates[2]]}])assert.throws(()=>verifyReadySeriesFulfillments(data,{...expected(3),...change}),/Invalid/);
});
test('unapproved date changes cannot pass as the monthly plan; an approved one-off date adjustment can',()=>{
 const data=fixture(3);data[1].fulfillAt='2027-03-01T00:00:00Z';
 assert.equal(verifyReadySeriesFulfillments(data,expected(3)).scheduleMatches,false);
 assert.equal(verifyReadySeriesFulfillments(data,{...expected(3),deliveryDates:[dates[0],'2027-03-01',dates[2]]}).scheduleMatches,true);
});
