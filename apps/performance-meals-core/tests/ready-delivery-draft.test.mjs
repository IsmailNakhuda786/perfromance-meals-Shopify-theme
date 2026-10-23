import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/ready-delivery-draft.server.ts','app/services/ready-series-change.ts'],outdir:'.shopify/ready-delivery-draft-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {stageReadyDeliveryReminders,stageReadyDeliveryCatchUp}=await import('../.shopify/ready-delivery-draft-test/ready-delivery-draft.server.js');
const {planReadySeriesDeliveryChange}=await import('../.shopify/ready-delivery-draft-test/ready-series-change.js');
const db=new PrismaClient(),shop=`delivery-${randomUUID()}.myshopify.com`,customerGid='gid://shopify/Customer/771';
process.env.ALLOWED_SHOP=shop;
let sequence=0;
async function seed(change={}){
 const n=++sequence;
 const line=await db.operationalLine.create({data:{shop,customerGid,orderGid:`gid://shopify/Order/${7700+n}`,orderLineGid:`gid://shopify/LineItem/${7700+n}`,businessStream:'ready_series',validationStatus:'VALIDATED',contractGid:`gid://shopify/SubscriptionContract/${7700+n}`,...change}});
 return {shop,customerGid,operationalLineId:line.id,occurrence:1,deliveryAt:'2027-03-01T00:00:00Z',expectedRevision:0};
}
test.after(async()=>{for(const table of ['readyDeliveryReminder','readyDeliveryDraft','operationalLine'])await db[table].deleteMany({where:{shop}});await db.$disconnect();});
test('a linked delivery persists exactly four inactive reminders with separate channel/lead keys',async()=>{
 const input=await seed(),result=await stageReadyDeliveryReminders(input);
 assert.equal(result.draft.state,'DRAFT');assert.equal(result.draft.revision,1);assert.equal(result.reminders.length,4);
 assert.equal(new Set(result.reminders.map(row=>row.deliveryKey)).size,4);
 assert.deepEqual(result.reminders.map(row=>[row.channel,row.hoursBefore,row.scheduledAt.toISOString()]).sort(),[
 ['email',24,'2027-02-28T00:00:00.000Z'],['email',72,'2027-02-26T00:00:00.000Z'],['whatsapp',24,'2027-02-28T00:00:00.000Z'],['whatsapp',72,'2027-02-26T00:00:00.000Z']].sort());
 assert.ok(result.reminders.every(row=>row.state==='DRAFT'&&row.customerGid===customerGid));
 const replay=await stageReadyDeliveryReminders({...input,expectedRevision:1});
 assert.equal(replay.draft.id,result.draft.id);assert.equal(await db.readyDeliveryReminder.count({where:{shop,deliveryDraftId:result.draft.id}}),4);
 await assert.rejects(stageReadyDeliveryReminders(input),/changed/);
});
test('rescheduling supersedes old reminders atomically without moving another occurrence',async()=>{
 const input=await seed(),first=await stageReadyDeliveryReminders(input);
 const other=await stageReadyDeliveryReminders({...input,occurrence:2,deliveryAt:'2027-03-29T00:00:00Z'});
 const changed=await stageReadyDeliveryReminders({...input,expectedRevision:1,deliveryAt:'2027-03-02T00:00:00Z'});
 assert.equal(changed.draft.revision,2);assert.ok(changed.reminders.every(row=>row.deliveryRevision===2&&row.deliveryAt.toISOString()==='2027-03-02T00:00:00.000Z'));
 const old=await db.readyDeliveryReminder.findMany({where:{shop,deliveryDraftId:first.draft.id,deliveryRevision:1}});
 assert.equal(old.length,4);assert.ok(old.every(row=>row.state==='SUPERSEDED'));
 assert.equal((await db.readyDeliveryDraft.findUnique({where:{id:other.draft.id}})).deliveryAt.toISOString(),'2027-03-29T00:00:00.000Z');
 await assert.rejects(stageReadyDeliveryReminders({...input,expectedRevision:1,deliveryAt:'2027-03-03T00:00:00Z'}),/changed/);
 assert.equal(await db.readyDeliveryReminder.count({where:{shop,deliveryDraftId:first.draft.id}}),8);
});
test('foreign ownership, unlinked/unvalidated/dispatched lines and invalid dates never create reminders',async()=>{
 for(const change of [{customerGid:'gid://shopify/Customer/999'},{contractGid:null},{validationStatus:'QUARANTINED'},{businessStream:'meal_plan'},{fulfillmentState:'DISPATCHED'},{fulfillmentState:'CANCELLED'}]){
  const input=await seed(change);await assert.rejects(stageReadyDeliveryReminders(input));
  assert.equal(await db.readyDeliveryDraft.count({where:{shop,operationalLineId:input.operationalLineId}}),0);
 }
 const input=await seed();
 for(const change of [{shop:'foreign.myshopify.com'},{deliveryAt:'2027-02-30T00:00:00Z'},{occurrence:7},{expectedRevision:-1}])await assert.rejects(stageReadyDeliveryReminders({...input,...change}));
});
test('concurrent changes cannot leave two active draft revisions or duplicate reminders',async()=>{
 const input=await seed();await stageReadyDeliveryReminders(input);
 const results=await Promise.allSettled(['2027-03-02T00:00:00Z','2027-03-03T00:00:00Z'].map(deliveryAt=>stageReadyDeliveryReminders({...input,deliveryAt,expectedRevision:1})));
 assert.equal(results.filter(row=>row.status==='fulfilled').length,1);
 const draft=await db.readyDeliveryDraft.findUnique({where:{shop_operationalLineId_occurrence:{shop,operationalLineId:input.operationalLineId,occurrence:1}}});
 assert.equal(draft.revision,2);assert.equal(await db.readyDeliveryReminder.count({where:{shop,deliveryDraftId:draft.id,state:'DRAFT'}}),4);
});
test('a missing or already-processed reminder holds replacement instead of losing history',async()=>{
 const input=await seed(),first=await stageReadyDeliveryReminders(input);
 await db.readyDeliveryReminder.update({where:{id:first.reminders[0].id},data:{state:'UNKNOWN'}});
 await assert.rejects(stageReadyDeliveryReminders({...input,expectedRevision:1,deliveryAt:'2027-03-02T00:00:00Z'}),/reconciliation/);
 assert.equal((await db.readyDeliveryDraft.findUnique({where:{id:first.draft.id}})).revision,1);
});

test('late confirmation atomically replaces missed stages with one inactive immediate reminder per channel',async()=>{
 const input=await seed(),first=await stageReadyDeliveryReminders(input);
 const context={shop,customerGid,draftId:first.draft.id,expectedRevision:1,confirmedAt:'2027-02-27T00:00:00Z'};
 const result=await stageReadyDeliveryCatchUp(context);
 assert.equal(result.reminders.length,4);assert.equal(result.reminders.filter(x=>x.hoursBefore===0).length,2);
 assert.equal(result.reminders.filter(x=>x.hoursBefore===24).length,2);
 assert.equal(await db.readyDeliveryReminder.count({where:{shop,deliveryDraftId:first.draft.id,state:'SUPERSEDED'}}),2);
 const replay=await stageReadyDeliveryCatchUp(context);assert.deepEqual(replay.reminders.map(x=>x.id).sort(),result.reminders.map(x=>x.id).sort());
 await assert.rejects(stageReadyDeliveryCatchUp({...context,confirmedAt:'2027-02-27T01:00:00Z'}),/reconciliation/);
 assert.equal(await db.readyDeliveryReminder.count({where:{shop,deliveryDraftId:first.draft.id}}),6);
});
test('both missed stages coalesce and unknown delivery history or altered reminders hold catch-up',async()=>{
 const input=await seed(),first=await stageReadyDeliveryReminders(input);
 const context={shop,customerGid,draftId:first.draft.id,expectedRevision:1,confirmedAt:'2027-02-28T12:00:00Z'};
 const result=await stageReadyDeliveryCatchUp(context);assert.equal(result.reminders.length,2);assert.ok(result.reminders.every(x=>x.hoursBefore===0&&x.state==='DRAFT'));
 await db.readyDeliveryReminder.update({where:{id:result.reminders[0].id},data:{state:'UNKNOWN'}});
 await assert.rejects(stageReadyDeliveryCatchUp(context),/reconciliation/);
 const second=await stageReadyDeliveryReminders(await seed());
 await db.operationalLine.update({where:{id:second.draft.operationalLineId},data:{fulfillmentState:'DISPATCH_REVIEW'}});
 await assert.rejects(stageReadyDeliveryCatchUp({...context,draftId:second.draft.id}),/undispatched/);
 await assert.rejects(stageReadyDeliveryCatchUp({...context,customerGid:'gid://shopify/Customer/999'}));
 await assert.rejects(stageReadyDeliveryCatchUp({...context,expectedRevision:2}));
});
test('concurrent catch-up never duplicates immediate rows and early confirmation preserves all four stages',async()=>{
 const input=await seed(),first=await stageReadyDeliveryReminders(input);
 const context={shop,customerGid,draftId:first.draft.id,expectedRevision:1,confirmedAt:'2027-02-25T00:00:00Z'};
 const early=await stageReadyDeliveryCatchUp(context);assert.equal(early.reminders.length,4);assert.ok(early.reminders.every(x=>x.hoursBefore>0));
 const late={...context,confirmedAt:'2027-02-28T00:00:00Z'};
 const attempts=await Promise.allSettled([stageReadyDeliveryCatchUp(late),stageReadyDeliveryCatchUp(late)]);
 assert.ok(attempts.some(x=>x.status==='fulfilled'));
 const replay=await stageReadyDeliveryCatchUp(late);assert.equal(replay.reminders.length,2);
 assert.equal(await db.readyDeliveryReminder.count({where:{shop,deliveryDraftId:first.draft.id,hoursBefore:0}}),2);
 await assert.rejects(stageReadyDeliveryCatchUp({...late,confirmedAt:input.deliveryAt}));
});
test('catch-up racing a reschedule cannot leave active reminders on a stale revision',async()=>{
 const input=await seed(),first=await stageReadyDeliveryReminders(input);
 const attempts=await Promise.allSettled([
  stageReadyDeliveryCatchUp({shop,customerGid,draftId:first.draft.id,expectedRevision:1,confirmedAt:'2027-02-28T12:00:00Z'}),
  stageReadyDeliveryReminders({...input,expectedRevision:1,deliveryAt:'2027-03-02T00:00:00Z'})
 ]);
 assert.ok(attempts.some(x=>x.status==='fulfilled'));
 const draft=await db.readyDeliveryDraft.findUnique({where:{id:first.draft.id}});
 const active=await db.readyDeliveryReminder.findMany({where:{shop,deliveryDraftId:first.draft.id,state:'DRAFT'}});
 assert.ok(active.every(x=>x.deliveryRevision===draft.revision));
 assert.equal(active.length,draft.revision===1?2:4);
});


test('late-purchase reminder history survives a later reschedule without duplicate active messages',async()=>{
 for(const confirmedAt of ['2027-02-27T00:00:00Z','2027-02-28T12:00:00Z']){
  const input=await seed(),first=await stageReadyDeliveryReminders(input);
  const late=await stageReadyDeliveryCatchUp({shop,customerGid,draftId:first.draft.id,expectedRevision:1,confirmedAt});
  const replay=await stageReadyDeliveryReminders({...input,expectedRevision:1});
  assert.deepEqual(replay.reminders.map(r=>r.id).sort(),late.reminders.map(r=>r.id).sort());
  const moved=await stageReadyDeliveryReminders({...input,expectedRevision:1,deliveryAt:'2027-03-04T00:00:00Z'});
  assert.equal(moved.draft.revision,2);assert.equal(moved.reminders.length,4);
  const history=await db.readyDeliveryReminder.findMany({where:{shop,deliveryDraftId:first.draft.id,deliveryRevision:1}});
  assert.equal(history.length,6);assert.ok(history.every(r=>r.state==='SUPERSEDED'));
  assert.equal(await db.readyDeliveryReminder.count({where:{shop,deliveryDraftId:first.draft.id,state:'DRAFT'}}),4);
  await assert.rejects(stageReadyDeliveryCatchUp({shop,customerGid,draftId:first.draft.id,expectedRevision:1,confirmedAt}),/changed/);
 }
});

test('damaged or processed catch-up history cannot be replaced by rescheduling',async()=>{
 for(const alter of [async rows=>db.readyDeliveryReminder.delete({where:{id:rows[0].id}}),async rows=>db.readyDeliveryReminder.update({where:{id:rows[0].id},data:{state:'SENT'}}),async rows=>db.readyDeliveryReminder.update({where:{id:rows.find(r=>r.hoursBefore===0).id},data:{scheduledAt:new Date('2027-02-27T01:00:00Z')}})]){
  const input=await seed(),first=await stageReadyDeliveryReminders(input);
  const late=await stageReadyDeliveryCatchUp({shop,customerGid,draftId:first.draft.id,expectedRevision:1,confirmedAt:'2027-02-27T00:00:00Z'});
  await alter(late.reminders);
  await assert.rejects(stageReadyDeliveryReminders({...input,expectedRevision:1,deliveryAt:'2027-03-04T00:00:00Z'}),/reconciliation/);
  assert.equal((await db.readyDeliveryDraft.findUnique({where:{id:first.draft.id}})).revision,1);
 }
});


test('verified change plan composes with inactive persistence without replacing other paid occurrences',async()=>{
 const base=await seed(),drafts=[];
 for(const [index,day]of ['2027-03-01','2027-04-01','2027-05-01'].entries())drafts.push(await stageReadyDeliveryReminders({...base,occurrence:index+1,deliveryAt:day+'T01:00:00Z'}));
 const before=await db.readyDeliveryDraft.findMany({where:{shop,operationalLineId:base.operationalLineId},orderBy:{occurrence:'asc'}});
 const current=before.map(row=>({id:row.id,occurrence:row.occurrence,revision:row.revision,slotId:'slot-'+row.occurrence,deliveryAt:row.deliveryAt.toISOString(),deliveryEndsAt:new Date(row.deliveryAt.getTime()+3*3600000).toISOString(),dispatchState:'UNDISPATCHED'}));
 const planned=planReadySeriesDeliveryChange({deliveries:3,occurrence:2,expectedRevision:1,requestedAt:'2027-02-01T01:00:00Z',replacementSlotId:'replacement',noticeHours:72,current,slots:[{id:'replacement',deliveryAt:'2027-04-02T01:00:00Z',deliveryEndsAt:'2027-04-02T04:00:00Z',available:true}]});
 assert.equal(planned.state,'READY_FOR_REVALIDATION');
 const c=planned.change,changed=await stageReadyDeliveryReminders({...base,occurrence:c.occurrence,expectedRevision:c.expectedRevision,deliveryAt:c.replacement.deliveryAt});
 assert.equal(changed.draft.id,c.previous.id);assert.equal(changed.draft.revision,c.replacement.revision);
 assert.deepEqual(changed.reminders.map(row=>row.deliveryKey).sort(),c.reminders.map(row=>JSON.stringify([shop,row.idempotencyKey])).sort());
 const after=await db.readyDeliveryDraft.findMany({where:{shop,operationalLineId:base.operationalLineId},orderBy:{occurrence:'asc'}});
 assert.deepEqual([after[0],after[2]],[before[0],before[2]]);
 const old=await db.readyDeliveryReminder.findMany({where:{shop,deliveryDraftId:changed.draft.id,deliveryRevision:1}});
 assert.equal(old.length,4);assert.ok(old.every(row=>row.state==='SUPERSEDED'));
 await assert.rejects(stageReadyDeliveryReminders({...base,occurrence:2,expectedRevision:c.expectedRevision,deliveryAt:c.replacement.deliveryAt}),/changed/);
 assert.equal(await db.readyDeliveryReminder.count({where:{shop,deliveryDraftId:changed.draft.id,state:'DRAFT'}}),4);
});
