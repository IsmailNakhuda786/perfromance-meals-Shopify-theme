import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/orders.server.ts'],outdir:'.shopify/order-routing-evidence-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {recordOrder}=await import('../.shopify/order-routing-evidence-test/orders.server.js');
const db=new PrismaClient(),shop=`routing-${randomUUID()}.myshopify.com`,orderGid='gid://shopify/Order/701';
process.env.ALLOWED_SHOP=shop;
const fixture=()=>({id:orderGid,createdAt:'2026-10-16T08:00:00Z',customer:{id:'gid://shopify/Customer/702'},lineItems:{pageInfo:{hasNextPage:false},nodes:[{id:'gid://shopify/LineItem/703',quantity:1,customAttributes:[{key:'_pm_business_stream',value:'ready_series'},{key:'_pm_stream_schema_version',value:'1'}],product:{id:'gid://shopify/Product/704',isGiftCard:false,stream:{jsonValue:'ready_series'}},variant:{id:'gid://shopify/ProductVariant/705'}}]}});
const admin=(order,status=200)=>({graphql:async()=>Response.json({data:{shop:{myshopifyDomain:shop},order}},{status})});
test.after(async()=>{await db.operationalLine.deleteMany({where:{shop}});await db.webhookReceipt.deleteMany({where:{shop}});await db.mealPlanSelection.deleteMany({where:{shop}});await db.$disconnect();});
test('wrong-order, failed/truncated responses, invalid dates and duplicate lines persist no routing or receipt',async()=>{
 for(const change of [o=>o.id='gid://shopify/Order/999',o=>o.createdAt='2026-02-30T08:00:00Z',o=>o.createdAt='2026-10-16T08:00:00',o=>o.lineItems.nodes.push(structuredClone(o.lineItems.nodes[0])),o=>o.lineItems.nodes[0].quantity=0,o=>o.lineItems.nodes[0].quantity=1.5,o=>o.lineItems.pageInfo.hasNextPage=true,o=>delete o.lineItems.pageInfo.hasNextPage]){
  const order=fixture();change(order);await assert.rejects(recordOrder(shop,orderGid,randomUUID(),admin(order)));
 }
 await assert.rejects(recordOrder(shop,orderGid,randomUUID(),admin(fixture(),503)));
 await assert.rejects(recordOrder('other.myshopify.com',orderGid,randomUUID(),admin(fixture())));
 await assert.rejects(recordOrder(shop,orderGid,'',admin(fixture())));
 await assert.rejects(recordOrder(shop,orderGid,randomUUID(),{graphql:async()=>Response.json({data:{shop:{myshopifyDomain:'other.myshopify.com'},order:fixture()}})}));
 assert.equal(await db.operationalLine.count({where:{shop}}),0);assert.equal(await db.webhookReceipt.count({where:{shop}}),0);
});
test('duplicate customer properties quarantine the line and verified replay never creates another line',async()=>{
 const order=fixture();order.lineItems.nodes[0].customAttributes.push({key:'_pm_business_stream',value:'ready_series'});
 await recordOrder(shop,orderGid,'duplicate-properties',admin(order));
 const line=await db.operationalLine.findUnique({where:{shop_orderLineGid:{shop,orderLineGid:order.lineItems.nodes[0].id}}});
 assert.equal(line.validationStatus,'QUARANTINED');assert.equal(line.department,null);
 let calls=0;
 await recordOrder(shop,orderGid,'duplicate-properties',{graphql:async()=>{calls++;throw Error('already recorded');}});
 assert.equal(calls,0);assert.equal(await db.operationalLine.count({where:{shop}}),1);
});

test('two checkouts cannot bind the same reviewed Meal Plan selection to two orders',async()=>{
 const selection=await db.mealPlanSelection.create({data:{shop,customerGid:'gid://shopify/Customer/702',programmeGid:'gid://shopify/Product/704',variantGid:'gid://shopify/ProductVariant/705',selections:'[]',selectionHash:'reviewed-selection-fixture',cutoffAt:new Date('2026-10-20T00:00:00Z'),reviewedAt:new Date('2026-10-15T00:00:00Z')}});
 const orders=[801,802].map((id,index)=>{
  const order=fixture();order.id=`gid://shopify/Order/${id}`;order.lineItems.nodes[0].id=`gid://shopify/LineItem/${803+index}`;
  const line=order.lineItems.nodes[0];line.product.stream.jsonValue='meal_plan';
  line.customAttributes=[{key:'_pm_business_stream',value:'meal_plan'},{key:'_pm_stream_schema_version',value:'1'},{key:'_pm_selection_id',value:selection.id},{key:'_pm_selection_hash',value:selection.selectionHash}];
  return {order,event:randomUUID()};
 });
 const results=await Promise.allSettled(orders.map(({order,event})=>recordOrder(shop,order.id,event,admin(order))));
 // SQLite may serialize or reject a competing transaction. A webhook retry
 // must still quarantine the losing checkout, never overwrite the winner.
 for(const [index,result]of results.entries())if(result.status==='rejected')await recordOrder(shop,orders[index].order.id,orders[index].event,admin(orders[index].order));
 const rows=await db.operationalLine.findMany({where:{shop,orderGid:{in:orders.map(item=>item.order.id)}}});
 assert.equal(rows.length,2);assert.equal(rows.filter(row=>row.validationStatus==='VALIDATED').length,1);assert.equal(rows.filter(row=>row.validationStatus==='QUARANTINED').length,1);
 const bound=await db.mealPlanSelection.findUnique({where:{id:selection.id}}),winner=rows.find(row=>row.validationStatus==='VALIDATED');
 assert.equal(bound.orderGid,winner.orderGid);assert.equal(bound.orderLineGid,winner.orderLineGid);assert.equal(winner.selectionId,selection.id);
 assert.equal(rows.find(row=>row.validationStatus==='QUARANTINED').selectionId,null);
});
