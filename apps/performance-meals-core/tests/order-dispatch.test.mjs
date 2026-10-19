import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/order-dispatch.server.ts'],outdir:'.shopify/order-dispatch-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {readOrderDispatch,syncOrderDispatch}=await import('../.shopify/order-dispatch-test/order-dispatch.server.js');
const db=new PrismaClient(),shop=`dispatch-${randomUUID()}.myshopify.com`,customerGid='gid://shopify/Customer/1101';
process.env.ALLOWED_SHOP=shop;
let sequence=1102;
async function seed(){
 const n=sequence++,orderGid=`gid://shopify/Order/${n}`;
 const lines=[];
 for(const number of [n*10,n*10+1])lines.push(await db.operationalLine.create({data:{shop,orderGid,orderLineGid:`gid://shopify/LineItem/${number}`,customerGid,validationStatus:'VALIDATED',businessStream:'ready_series'}}));
 return {orderGid,lines};
}
const fulfillment=(line,status='SUCCESS',id=1200)=>({id:`gid://shopify/Fulfillment/${id}`,status,fulfillmentLineItems:{nodes:[{id:`gid://shopify/FulfillmentLineItem/${id}`,quantity:1,lineItem:{id:line.orderLineGid}}],pageInfo:{hasNextPage:false}}});
const order=(seed,fulfillments=[])=>({id:seed.orderGid,cancelledAt:null,customer:{id:customerGid},fulfillmentsCount:{count:fulfillments.length,precision:'EXACT'},fulfillments});
const admin=(native,status=200,domain=shop)=>({graphql:async(query,{variables})=>{
 assert.match(query,/query CoreOrderDispatch/);assert.doesNotMatch(query,/mutation|trackingInfo|shippingAddress|email/);assert.equal(variables.id,native.id);
 return Response.json({data:{shop:{myshopifyDomain:domain},order:structuredClone(native)}},{status});
}});
const saved=id=>db.operationalLine.findUnique({where:{id}});
test.after(async()=>{await db.planOperation.deleteMany({where:{shop}});await db.operationalLine.deleteMany({where:{shop}});await db.$disconnect();});

test('partial successful fulfillment locks only its original line and creates one durable audit fact',async()=>{
 const fixture=await seed(),native=order(fixture,[fulfillment(fixture.lines[0])]);
 const before=await db.walletEntry.count({where:{shop}});
 await syncOrderDispatch(admin(native),shop,fixture.orderGid);
 assert.equal((await saved(fixture.lines[0].id)).fulfillmentState,'DISPATCHED');
 assert.equal((await saved(fixture.lines[1].id)).fulfillmentState,'UNASSIGNED');
 await syncOrderDispatch(admin(native),shop,fixture.orderGid);
 const audit=await db.planOperation.findMany({where:{shop,kind:'NATIVE_DISPATCH_OBSERVED',cycleReference:fixture.lines[0].orderLineGid}});
 assert.equal(audit.length,1);assert.equal(audit[0].fulfillmentGid,native.fulfillments[0].id);assert.equal(audit[0].state,'COMPLETED');
 assert.equal(await db.walletEntry.count({where:{shop}}),before);
});

test('later cancelled or removed fulfillment never clears observed dispatch',async()=>{
 const fixture=await seed(),native=order(fixture,[fulfillment(fixture.lines[0])]);
 await syncOrderDispatch(admin(native),shop,fixture.orderGid);
 native.fulfillments[0].status='CANCELLED';await syncOrderDispatch(admin(native),shop,fixture.orderGid);
 assert.equal((await saved(fixture.lines[0].id)).fulfillmentState,'DISPATCHED');
 await syncOrderDispatch(admin(order(fixture)),shop,fixture.orderGid);
 assert.equal((await saved(fixture.lines[0].id)).fulfillmentState,'DISPATCHED');
 assert.equal(await db.planOperation.count({where:{shop,cycleReference:fixture.lines[0].orderLineGid}}),1);
});

test('unobserved cancelled fulfillment requires review instead of claiming it was never dispatched',async()=>{
 const fixture=await seed();await syncOrderDispatch(admin(order(fixture,[fulfillment(fixture.lines[0],'CANCELLED')])),shop,fixture.orderGid);
 assert.equal((await saved(fixture.lines[0].id)).fulfillmentState,'DISPATCH_REVIEW');
 assert.equal((await saved(fixture.lines[1].id)).fulfillmentState,'UNASSIGNED');
 await syncOrderDispatch(admin(order(fixture)),shop,fixture.orderGid);
 assert.equal((await saved(fixture.lines[0].id)).fulfillmentState,'DISPATCH_REVIEW');
 const cancelled=order(fixture);cancelled.cancelledAt='2026-10-19T00:00:00Z';
 await syncOrderDispatch(admin(cancelled),shop,fixture.orderGid);
 assert.equal((await saved(fixture.lines[0].id)).fulfillmentState,'DISPATCH_REVIEW');
});

test('truncated history cannot prove absence of dispatch; visible success still proves dispatch',async()=>{
 for(const mutate of [o=>o.fulfillmentsCount.count=251,o=>o.fulfillmentsCount.precision='AT_LEAST',o=>o.fulfillmentsCount=null,o=>o.fulfillments[0].fulfillmentLineItems.pageInfo.hasNextPage=true]){
  const fixture=await seed(),native=order(fixture,[fulfillment(fixture.lines[0])]);mutate(native);
  const result=await syncOrderDispatch(admin(native),shop,fixture.orderGid);assert.equal(result.complete,false);
  assert.equal((await saved(fixture.lines[0].id)).fulfillmentState,'DISPATCHED');
  assert.equal((await saved(fixture.lines[1].id)).fulfillmentState,'DISPATCH_REVIEW');
 }
});

test('cancelled orders remain stopped, and dispatch remains stronger than cancellation',async()=>{
 const fixture=await seed(),native=order(fixture,[fulfillment(fixture.lines[0])]);native.cancelledAt='2026-10-19T00:00:00Z';
 await syncOrderDispatch(admin(native),shop,fixture.orderGid);
 assert.equal((await saved(fixture.lines[0].id)).fulfillmentState,'DISPATCHED');assert.equal((await saved(fixture.lines[1].id)).fulfillmentState,'CANCELLED');
 await syncOrderDispatch(admin(order(fixture)),shop,fixture.orderGid);
 assert.equal((await saved(fixture.lines[1].id)).fulfillmentState,'CANCELLED');
});

test('foreign identity, invalid quantities and duplicate references produce no partial updates',async()=>{
 const fixture=await seed();
 for(const mutate of [o=>o.customer.id='not-a-customer',o=>o.cancelledAt='2026-02-30T00:00:00Z',o=>o.fulfillments.push(structuredClone(o.fulfillments[0])),o=>o.fulfillments[0].fulfillmentLineItems.nodes[0].quantity=0,o=>o.fulfillments[0].fulfillmentLineItems.nodes[0].quantity=0.5,o=>o.fulfillments[0].fulfillmentLineItems.nodes.push(structuredClone(o.fulfillments[0].fulfillmentLineItems.nodes[0])),o=>o.fulfillments[0].fulfillmentLineItems.nodes[0].lineItem.id='gid://shopify/Order/1']){
  const native=order(fixture,[fulfillment(fixture.lines[0])]);mutate(native);await assert.rejects(syncOrderDispatch(admin(native),shop,fixture.orderGid));
 }
 await assert.rejects(syncOrderDispatch(admin(order(fixture),503),shop,fixture.orderGid));
 await assert.rejects(syncOrderDispatch(admin(order(fixture),200,'other.myshopify.com'),shop,fixture.orderGid));
 await assert.rejects(syncOrderDispatch(admin(order(fixture)),'other.myshopify.com',fixture.orderGid));
 assert.ok((await db.operationalLine.findMany({where:{shop,orderGid:fixture.orderGid}})).every(row=>row.fulfillmentState==='UNASSIGNED'));
});

test('empty or unmapped fulfillment coverage and changed ownership cannot authorize an undispatched state',async()=>{
 for(const change of ['empty','unmapped','customer']){
  const fixture=await seed(),native=order(fixture,[fulfillment(fixture.lines[0],'ERROR')]);
  if(change==='empty')native.fulfillments[0].fulfillmentLineItems.nodes=[];
  if(change==='unmapped')native.fulfillments[0].fulfillmentLineItems.nodes[0].lineItem.id='gid://shopify/LineItem/999999';
  if(change==='customer')native.customer.id='gid://shopify/Customer/999999';
  await syncOrderDispatch(admin(native),shop,fixture.orderGid);
  assert.ok((await db.operationalLine.findMany({where:{shop,orderGid:fixture.orderGid}})).every(row=>row.fulfillmentState==='DISPATCH_REVIEW'));
 }
});

test('missing original routing is not created, and duplicate concurrent delivery cannot duplicate dispatch audit',async()=>{
 const missing={orderGid:'gid://shopify/Order/999999'};
 await assert.rejects(syncOrderDispatch(admin(order(missing)),shop,missing.orderGid),/Original operational/);
 const fixture=await seed(),native=order(fixture,[fulfillment(fixture.lines[0])]);
 const attempts=await Promise.allSettled([1,2,3].map(()=>syncOrderDispatch(admin(native),shop,fixture.orderGid)));
 assert.ok(attempts.some(row=>row.status==='fulfilled'));
 await syncOrderDispatch(admin(native),shop,fixture.orderGid);
 assert.equal(await db.planOperation.count({where:{shop,kind:'NATIVE_DISPATCH_OBSERVED',cycleReference:fixture.lines[0].orderLineGid}}),1);
});

test('complete zero-fulfillment evidence is read-only and contains no invented dispatch',async()=>{
 const fixture=await seed(),proof=await readOrderDispatch(admin(order(fixture)),shop,fixture.orderGid);
 assert.equal(proof.complete,true);assert.equal(proof.byLine.size,0);
 assert.ok((await db.operationalLine.findMany({where:{shop,orderGid:fixture.orderGid}})).every(row=>row.fulfillmentState==='UNASSIGNED'));
});
