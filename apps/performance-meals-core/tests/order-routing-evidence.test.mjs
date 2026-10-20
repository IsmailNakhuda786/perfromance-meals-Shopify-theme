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
 for(const change of [o=>o.id='gid://shopify/Order/999',o=>o.createdAt='2026-02-30T08:00:00Z',o=>o.createdAt='2026-10-16T08:00:00',o=>o.lineItems.nodes.push(structuredClone(o.lineItems.nodes[0])),o=>o.lineItems.nodes[0].quantity=0,o=>o.lineItems.nodes[0].quantity=1.5,o=>o.lineItems.pageInfo.hasNextPage=true,o=>delete o.lineItems.pageInfo.hasNextPage,o=>o.customer.id='gid://shopify/Order/702',o=>o.customer.id=702,o=>o.lineItems.nodes[0].product.id='gid://shopify/ProductVariant/704',o=>delete o.lineItems.nodes[0].product.isGiftCard,o=>o.lineItems.nodes[0].variant.id='705',o=>o.lineItems.nodes[0].sellingPlan={sellingPlanId:'gid://shopify/Product/706'},o=>o.lineItems.nodes=[null],o=>o.lineItems.nodes[0].customAttributes=[null]]){
  const order=fixture();change(order);await assert.rejects(recordOrder(shop,orderGid,randomUUID(),admin(order)));
 }
 await assert.rejects(recordOrder(shop,orderGid,randomUUID(),admin(fixture(),503)));
 await assert.rejects(recordOrder('other.myshopify.com',orderGid,randomUUID(),admin(fixture())));
 await assert.rejects(recordOrder(shop,orderGid,'',admin(fixture())));
 await assert.rejects(recordOrder(shop,orderGid,randomUUID(),{graphql:async()=>Response.json({data:{shop:{myshopifyDomain:'other.myshopify.com'},order:fixture()}})}));
 assert.equal(await db.operationalLine.count({where:{shop}}),0);assert.equal(await db.webhookReceipt.count({where:{shop}}),0);
});

test('changed native ownership quarantines an existing line without overwriting the purchased identity',async()=>{
 for(const [index,change]of [o=>o.customer.id='gid://shopify/Customer/999',o=>o.lineItems.nodes[0].product.id='gid://shopify/Product/999',o=>o.lineItems.nodes[0].variant.id='gid://shopify/ProductVariant/999',o=>o.lineItems.nodes[0].product.stream.jsonValue='meal_plan',o=>o.lineItems.nodes[0].customAttributes.push({key:'_pm_business_stream',value:'ready_series'})].entries()){
  const order=fixture();order.id=`gid://shopify/Order/${900+index}`;order.lineItems.nodes[0].id=`gid://shopify/LineItem/${900+index}`;
  await recordOrder(shop,order.id,`identity-before-${index}`,admin(order));
  const original=await db.operationalLine.findUnique({where:{shop_orderLineGid:{shop,orderLineGid:order.lineItems.nodes[0].id}}});
  change(order);await recordOrder(shop,order.id,`identity-after-${index}`,admin(order),'ORDERS_UPDATED');
  const after=await db.operationalLine.findUnique({where:{id:original.id}});
  assert.equal(after.validationStatus,'QUARANTINED');assert.equal(after.department,null);
  for(const key of ['orderGid','customerGid','productGid','variantGid','selectionId','contractGid'])assert.equal(after[key],original[key]);
  const restored=fixture();restored.id=original.orderGid;restored.lineItems.nodes[0].id=original.orderLineGid;
  await recordOrder(shop,restored.id,`identity-restored-${index}`,admin(restored),'ORDERS_UPDATED');
  assert.equal((await db.operationalLine.findUnique({where:{id:original.id}})).validationStatus,'QUARANTINED');
 }
});

test('a reused native line cannot attach to another order, while unavailable catalogue links require review',async()=>{
 const original=fixture();original.id='gid://shopify/Order/950';original.lineItems.nodes[0].id='gid://shopify/LineItem/950';
 await recordOrder(shop,original.id,'original-line-950',admin(original));
 const conflicting=structuredClone(original);conflicting.id='gid://shopify/Order/951';
 await assert.rejects(recordOrder(shop,conflicting.id,'conflicting-line-950',admin(conflicting)),/another original order/);
 assert.equal(await db.webhookReceipt.count({where:{shop,id:`${shop}:conflicting-line-950`}}),0);
 assert.equal((await db.operationalLine.findUnique({where:{shop_orderLineGid:{shop,orderLineGid:original.lineItems.nodes[0].id}}})).orderGid,original.id);
 const deleted=fixture();deleted.id='gid://shopify/Order/960';deleted.lineItems.nodes[0].id='gid://shopify/LineItem/960';deleted.lineItems.nodes[0].variant=null;
 await recordOrder(shop,deleted.id,'deleted-variant-960',admin(deleted));
 assert.equal((await db.operationalLine.findUnique({where:{shop_orderLineGid:{shop,orderLineGid:deleted.lineItems.nodes[0].id}}})).validationStatus,'QUARANTINED');
});
test('duplicate customer properties quarantine the line and verified replay never creates another line',async()=>{
 const order=fixture();order.lineItems.nodes[0].customAttributes.push({key:'_pm_business_stream',value:'ready_series'});
 await recordOrder(shop,orderGid,'duplicate-properties',admin(order));
 const line=await db.operationalLine.findUnique({where:{shop_orderLineGid:{shop,orderLineGid:order.lineItems.nodes[0].id}}});
 assert.equal(line.validationStatus,'QUARANTINED');assert.equal(line.department,null);
 let calls=0;
 await recordOrder(shop,orderGid,'duplicate-properties',{graphql:async()=>{calls++;throw Error('already recorded');}});
 assert.equal(calls,0);assert.equal(await db.operationalLine.count({where:{shop,orderGid:order.id}}),1);
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


test('simultaneous created, paid and updated events reconcile the same native line and persist each receipt once',async()=>{
 for(const [index,sameEvent]of [false,true].entries()){
  const order=fixture();order.id=`gid://shopify/Order/${1100+index}`;order.lineItems.nodes[0].id=`gid://shopify/LineItem/${1100+index}`;
  const topics=sameEvent?Array(4).fill('ORDERS_PAID'):['ORDERS_CREATE','ORDERS_PAID','ORDERS_UPDATED','ORDERS_UPDATED'];
  const events=topics.map((_,i)=>`parallel-${index}-${sameEvent?0:i}`);
  await Promise.all(topics.map((topic,i)=>recordOrder(shop,order.id,events[i],admin(order),topic)));
  const rows=await db.operationalLine.findMany({where:{shop,orderGid:order.id}});
  assert.equal(rows.length,1);assert.equal(rows[0].validationStatus,'VALIDATED');
  assert.equal(await db.webhookReceipt.count({where:{shop,id:{in:[...new Set(events)].map(e=>`${shop}:${e}`)}}}),new Set(events).size);
  const before=rows[0];await recordOrder(shop,order.id,events[0],admin(order));
  assert.deepEqual(await db.operationalLine.findUnique({where:{id:before.id}}),before);
 }
});
