import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['app/services/prepaid-fulfillment.ts'],outdir:'.shopify/prepaid-fulfillment-test',bundle:true,format:'esm',platform:'node'});
const {verifyMonthlyFulfillments}=await import('../.shopify/prepaid-fulfillment-test/prepaid-fulfillment.js');
const orderGid='gid://shopify/Order/1',lineGid='gid://shopify/LineItem/2';
const expected=months=>({months,orderGid,lineGid,quantityPerDelivery:1});
const fixture=months=>Array.from({length:months},(_,i)=>({id:`gid://shopify/FulfillmentOrder/${i+10}`,orderGid,lineGid,quantity:1,status:i?'SCHEDULED':'OPEN',fulfillAt:new Date(Date.UTC(2026,10+i,1)).toISOString()}));
test('3/6 monthly deliveries remain attached to one original order across year boundaries',()=>{
 for(const months of [3,6]) assert.equal(verifyMonthlyFulfillments(fixture(months).reverse(),expected(months)).scheduleMatches,true);
});
test('missing dates, gaps, duplicate records, cancellation and quantity/order mismatches cannot prove coverage',()=>{
 for(const mutate of [a=>a.pop(),a=>{a[0].fulfillAt=null;},a=>{a[1].fulfillAt=a[0].fulfillAt;},a=>{a[1].id=a[0].id;},a=>{a[1].orderGid='gid://shopify/Order/99';},a=>{a[1].quantity=2;},a=>{a[1].status='CANCELLED';}]){
  const data=fixture(3);mutate(data);assert.equal(verifyMonthlyFulfillments(data,expected(3)).scheduleMatches,false);
 }
});
test('Singapore calendar boundaries govern monthly coverage; unrelated cart lines are excluded',()=>{
 const data=fixture(3);data[0].fulfillAt='2026-10-31T16:30:00Z';
 data.push({...data[0],id:'gid://shopify/FulfillmentOrder/99',lineGid:'gid://shopify/LineItem/99'});
 assert.equal(verifyMonthlyFulfillments(data,expected(3)).scheduleMatches,true);
 assert.throws(()=>verifyMonthlyFulfillments(data,{...expected(3),months:12}),/Invalid/);
});
