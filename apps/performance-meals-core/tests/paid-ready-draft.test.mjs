import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
import {prepaidFixture} from './support/prepaid-purchase.mjs';
await buildServices({entryPoints:['app/services/paid-ready-draft.server.ts'],outdir:'.shopify/paid-ready-draft-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {preparePaidReadySeriesDraft,prepareRegisteredPaidReadySeriesDraft}=await import('../.shopify/paid-ready-draft-test/paid-ready-draft.server.js');
const db=new PrismaClient(),shop=`paid-ready-${randomUUID()}.myshopify.com`;process.env.ALLOWED_SHOP=shop;process.env.READY_SERIES_PAID_DRAFTS_ENABLED='true';
const now=new Date('2026-10-20T02:00:00Z');let sequence=0;
async function seed(months=3){
 const fixture=prepaidFixture(shop,++sequence,months),e=fixture.input.expected;
 const line=await db.operationalLine.create({data:{shop,customerGid:e.customerGid,orderGid:e.orderGid,orderLineGid:e.orderLineGid,productGid:e.productGid,variantGid:e.variantGid,contractGid:fixture.input.contractGid,businessStream:'ready_series',department:'ready_series',validationStatus:'VALIDATED'}});
 return {...fixture,line};
}
const admin=data=>({graphql:async query=>{assert.doesNotMatch(query,/\bmutation\b/);return Response.json({data});}});
const run=(f,options={now})=>preparePaidReadySeriesDraft(admin(f.data),f.input,options);
const count=f=>db.readyDeliveryDraft.count({where:{shop,operationalLineId:f.line.id}});
test.after(async()=>{for(const table of ['readyDeliveryReminder','readyDeliveryDraft','planOperation','prepaidPurchaseEvidence','operationalLine'])await db[table].deleteMany({where:{shop}});await db.$disconnect();});
test('verified 3/6 paid terms atomically prepare inactive monthly drafts and catch-up reminders',async()=>{
 for(const months of [3,6]){
  const f=await seed(months),result=await run(f);
  assert.equal(result.state,'DRAFT');assert.equal(result.created,true);assert.equal(result.nativeScheduleVerified,true);assert.equal(result.deliveryTimeSlotVerified,false);assert.equal(result.drafts.length,months);
  assert.deepEqual(result.drafts.map(x=>x.deliveryAt.toISOString()),f.input.deliveryAt.map(x=>new Date(x).toISOString()));
  const active=await db.readyDeliveryReminder.findMany({where:{shop,deliveryDraftId:{in:result.drafts.map(x=>x.id)},state:'DRAFT'}});
  assert.equal(active.length,months*4-2);assert.equal(active.filter(x=>x.hoursBefore===0).length,2);
  assert.ok(active.every(x=>x.customerGid===f.input.expected.customerGid));
  assert.equal((await db.planOperation.findUnique({where:{id:result.operationId}})).state,'DRAFT');
 }
});
test('replayed native proof preserves draft IDs and the first immediate reminder time',async()=>{
 const f=await seed(),first=await run(f),before=await db.readyDeliveryReminder.findMany({where:{shop,deliveryDraftId:{in:first.drafts.map(x=>x.id)}}});
 const replay=await run(f,{now:new Date('2026-10-20T07:00:00Z')});
 assert.equal(replay.created,false);assert.equal(replay.operationId,first.operationId);assert.deepEqual(replay.drafts.map(x=>x.id),first.drafts.map(x=>x.id));
 assert.deepEqual(await db.readyDeliveryReminder.findMany({where:{shop,deliveryDraftId:{in:first.drafts.map(x=>x.id)}}}),before);
 await assert.rejects(run({...f,input:{...f.input,calendarVersion:'changed'}}),/evidence changed/);
});
test('partial old drafts roll back a newly prepared term without overwriting existing records',async()=>{
 const f=await seed(),old=await db.readyDeliveryDraft.create({data:{shop,customerGid:f.input.expected.customerGid,operationalLineId:f.line.id,occurrence:2,deliveryAt:new Date(f.input.deliveryAt[1])}});
 await assert.rejects(run(f),/changed/);assert.equal(await count(f),1);assert.ok(await db.readyDeliveryDraft.findUnique({where:{id:old.id}}));
 assert.equal(await db.planOperation.count({where:{shop,cycleReference:JSON.stringify([f.input.contractGid,f.input.expected.orderGid,f.input.expected.orderLineGid])}}),0);
 assert.equal(await db.readyDeliveryReminder.count({where:{shop,deliveryDraftId:old.id}}),0);
});
test('payment, active contract, complete dispatch and exact original routing all precede preparation',async()=>{
 for(const edit of [f=>f.data.order.displayFinancialStatus='PENDING',f=>f.data.subscriptionContract.status='PAUSED',f=>f.data.order.fulfillmentsCount.precision='AT_LEAST',f=>f.data.order.cancelledAt='2026-10-20T01:30:00Z',f=>f.data.order.fulfillmentsCount.count=1]){
  const f=await seed();edit(f);await assert.rejects(run(f));assert.equal(await count(f),0);
 }
 const f=await seed();await db.operationalLine.update({where:{id:f.line.id},data:{fulfillmentState:'DISPATCH_REVIEW'}});await assert.rejects(run(f));assert.equal(await count(f),0);
});
test('default-off and production gates refuse all native requests',async()=>{
 const f=await seed(),gateway={graphql:async()=>{throw Error('must not call native');}};
 process.env.READY_SERIES_PAID_DRAFTS_ENABLED='false';await assert.rejects(preparePaidReadySeriesDraft(gateway,f.input,{now}),/not activated/);
 process.env.READY_SERIES_PAID_DRAFTS_ENABLED='true';const old=process.env.NODE_ENV;process.env.NODE_ENV='production';
 try{await assert.rejects(preparePaidReadySeriesDraft(gateway,f.input,{now}),/not activated/);}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}
 assert.equal(await count(f),0);
});
test('concurrent term preparation cannot duplicate term audits, deliveries or reminders',async()=>{
 const f=await seed(),attempts=await Promise.allSettled([run(f),run(f)]);assert.ok(attempts.some(x=>x.status==='fulfilled'));
 const replay=await run(f);assert.equal(await count(f),3);assert.equal(replay.created,false);
 assert.equal(await db.planOperation.count({where:{shop,cycleReference:JSON.stringify([f.input.contractGid,f.input.expected.orderGid,f.input.expected.orderLineGid])}}),1);
 assert.equal(await db.readyDeliveryReminder.count({where:{shop,deliveryDraftId:{in:replay.drafts.map(x=>x.id)},state:'DRAFT'}}),10);
});

test('purchase replay holds changed reminder evidence or a later delivery revision without resetting it',async()=>{
 const f=await seed(),first=await run(f),draft=first.drafts[1];
 const reminder=await db.readyDeliveryReminder.findFirstOrThrow({where:{shop,deliveryDraftId:draft.id,state:'DRAFT'}});
 await db.readyDeliveryReminder.update({where:{id:reminder.id},data:{scheduledAt:new Date('2026-11-01T00:00:00Z')}});
 await assert.rejects(run(f),/reconciliation/);
 assert.equal((await db.readyDeliveryReminder.findUnique({where:{id:reminder.id}})).scheduledAt.toISOString(),'2026-11-01T00:00:00.000Z');
 await db.readyDeliveryReminder.update({where:{id:reminder.id},data:{scheduledAt:reminder.scheduledAt}});
 await db.readyDeliveryDraft.update({where:{id:draft.id},data:{revision:2,deliveryAt:new Date('2026-11-23T00:00:00Z')}});
 await assert.rejects(run(f),/rescheduling workflow/);
 const saved=await db.readyDeliveryDraft.findUnique({where:{id:draft.id}});assert.equal(saved.revision,2);assert.equal(saved.deliveryAt.toISOString(),'2026-11-23T00:00:00.000Z');
});

test('missing native delivery work or changed schedule prevents all term drafts',async()=>{
 for(const edit of [f=>f.data.order.fulfillmentOrders.nodes.pop(),f=>f.data.order.fulfillmentOrders.nodes[0].fulfillAt='2026-10-22T00:00:00Z',f=>f.data.order.fulfillmentOrders.nodes[0].lineItems.nodes[0].remainingQuantity=0]){
  const f=await seed();edit(f);await assert.rejects(run(f));assert.equal(await count(f),0);
 }
});

async function registered(months=3,packages=1,mixed=false){
 const f=await seed(months),e=f.input.expected,net=e.upfrontMinor*packages,gross=Math.ceil(e.upfrontMinor/months)*months*packages,reduction=gross-net;
 e.packageQuantity=packages;e.upfrontMinor=net;if(mixed)e.paymentScope='PREPAID_LINE';
 const money=n=>({shopMoney:{amount:(n/100).toFixed(2),currencyCode:'SGD'}}),o=f.data.order,c=f.data.subscriptionContract;
 c.lines.nodes[0].quantity=packages;c.lines.nodes[0].currentPrice.amount=(gross/packages/100).toFixed(2);
 for(const key of ['totalPriceSet','currentTotalPriceSet','totalReceivedSet'])o[key]=money(net+(mixed?10000:0));
 o.transactions[0].amountSet=money(net+(mixed?10000:0));o.totalDiscountsSet=money(reduction);o.totalTaxSet=money(0);o.currentTotalTaxSet=money(0);
 const l=o.lineItems.nodes[0];l.quantity=months*packages;l.currentQuantity=l.quantity;l.originalTotalSet=money(gross);l.discountAllocations=[{allocatedAmountSet:money(reduction),discountApplication:{__typename:'AutomaticDiscountApplication',title:'Approved cent correction'}}];
 if(mixed)o.lineItems.nodes.push({...structuredClone(l),id:'gid://shopify/LineItem/999999',quantity:1,currentQuantity:1,variant:{id:'gid://shopify/ProductVariant/99'},sellingPlan:{sellingPlanId:'gid://shopify/SellingPlan/99'},originalTotalSet:money(10000),discountAllocations:[]});
 for(const group of o.fulfillmentOrders.nodes){group.lineItems.nodes[0].totalQuantity=packages;group.lineItems.nodes[0].remainingQuantity=packages;}
 const correction={baseMinor:gross,discountMinor:reduction,applicationKind:'AUTOMATIC',title:'Approved cent correction',taxMinor:0};
 const snapshot=JSON.stringify({version:1,contractGid:f.input.contractGid,expected:e,correction}),{createHash}=await import('node:crypto');
 const saved=await db.prepaidPurchaseEvidence.create({data:{shop,customerGid:e.customerGid,contractGid:f.input.contractGid,originalOrderGid:e.orderGid,originalLineGid:e.orderLineGid,snapshot,snapshotHash:createHash('sha256').update(snapshot).digest('hex')}});
 process.env.CORE_PREPAID_RENEWAL_LINKS_ENABLED='true';process.env.CORE_PREPAID_RENEWAL_LINKS_QA_CUSTOMER=e.customerGid;
 const {contractGid,expected,...calendar}=f.input;
 return {...f,saved,registeredInput:{...calendar,purchaseEvidenceId:saved.id}};
}
const runRegistered=f=>prepareRegisteredPaidReadySeriesDraft(admin(f.data),f.registeredInput,{now});
test('registered corrected 3/6 terms, multiple packages and mixed-order lines prepare replay-safe inactive drafts',async()=>{
 for(const [months,packages,mixed]of[[3,1,false],[6,1,false],[3,2,false],[3,1,true]]){
  const f=await registered(months,packages,mixed),first=await runRegistered(f),again=await runRegistered(f);
  assert.equal(first.created,true);assert.equal(first.drafts.length,months);assert.equal(again.created,false);assert.deepEqual(again.drafts.map(d=>d.id),first.drafts.map(d=>d.id));
  const snapshot=JSON.parse((await db.planOperation.findUnique({where:{id:first.operationId}})).productionReference);
  assert.equal(snapshot.version,2);assert.equal(snapshot.purchaseHash,f.saved.snapshotHash);assert.equal(snapshot.packageQuantity,packages);assert.equal(snapshot.paymentScope,mixed?'PREPAID_LINE':'ORDER');assert.equal(snapshot.correction.discountMinor,months===3?packages:2*packages);
  assert.equal(await db.prepaidPurchaseEvidence.count({where:{shop,id:f.saved.id}}),1);
 }
});
test('registered draft preparation rejects changed payment, gross price, saved checksum and foreign ownership',async()=>{
 for(const edit of[f=>f.data.order.totalRefundedSet.shopMoney.amount='1',f=>f.data.subscriptionContract.lines.nodes[0].currentPrice.amount='255.22',f=>f.data.subscriptionContract.status='CANCELLED']){
  const f=await registered();edit(f);await assert.rejects(runRegistered(f));assert.equal(await count(f),0);
 }
 const f=await registered();await db.prepaidPurchaseEvidence.update({where:{id:f.saved.id},data:{snapshotHash:'broken'}});await assert.rejects(runRegistered(f),/checksum/);assert.equal(await count(f),0);
 const other=await registered();await db.prepaidPurchaseEvidence.update({where:{id:other.saved.id},data:{customerGid:'gid://shopify/Customer/99'}});await assert.rejects(runRegistered(other),/unavailable/);assert.equal(await count(other),0);
});
test('registered preparation gates invalid identities and activation before native requests',async()=>{
 const f=await registered(),api={graphql:async()=>assert.fail('Unexpected native read')};
 for(const id of[undefined,'','../other'])await assert.rejects(prepareRegisteredPaidReadySeriesDraft(api,{...f.registeredInput,purchaseEvidenceId:id},{now}));
 process.env.READY_SERIES_PAID_DRAFTS_ENABLED='false';try{await assert.rejects(prepareRegisteredPaidReadySeriesDraft(api,f.registeredInput,{now}),/not activated/);}finally{process.env.READY_SERIES_PAID_DRAFTS_ENABLED='true';}
 assert.equal(await count(f),0);
});
test('purchase evidence changed during native checks cannot create delivery drafts',async()=>{
 const f=await registered();
 const api={graphql:async query=>{
  assert.doesNotMatch(query,/\bmutation\b/);
  if(query.includes('fulfillmentsCount'))await db.prepaidPurchaseEvidence.update({where:{id:f.saved.id},data:{snapshotHash:'changed-during-native-read'}});
  return Response.json({data:f.data});
 }};
 await assert.rejects(prepareRegisteredPaidReadySeriesDraft(api,f.registeredInput,{now}),/changed before draft/);
 assert.equal(await count(f),0);assert.equal(await db.planOperation.count({where:{shop,cycleReference:JSON.stringify([f.input.contractGid,f.input.expected.orderGid,f.input.expected.orderLineGid])}}),0);
});
