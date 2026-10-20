import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
import {prepaidFixture} from './support/prepaid-purchase.mjs';
await buildServices({entryPoints:['app/services/paid-ready-draft.server.ts'],outdir:'.shopify/paid-ready-draft-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {preparePaidReadySeriesDraft}=await import('../.shopify/paid-ready-draft-test/paid-ready-draft.server.js');
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
test.after(async()=>{for(const table of ['readyDeliveryReminder','readyDeliveryDraft','planOperation','operationalLine'])await db[table].deleteMany({where:{shop}});await db.$disconnect();});
test('verified 3/6 paid terms atomically prepare inactive monthly drafts and catch-up reminders',async()=>{
 for(const months of [3,6]){
  const f=await seed(months),result=await run(f);
  assert.equal(result.state,'DRAFT');assert.equal(result.created,true);assert.equal(result.nativeScheduleVerified,false);assert.equal(result.drafts.length,months);
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
