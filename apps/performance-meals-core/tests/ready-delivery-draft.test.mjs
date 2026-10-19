import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/ready-delivery-draft.server.ts'],outdir:'.shopify/ready-delivery-draft-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {stageReadyDeliveryReminders,stageReadyDeliveryCatchUp}=await import('../.shopify/ready-delivery-draft-test/ready-delivery-draft.server.js');
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
