import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/ready-delivery-visit.server.ts','app/services/ready-delivery-capacity.server.ts','app/services/ready-delivery-draft.server.ts','app/services/ready-delivery-reschedule.server.ts'],outdir:'.shopify/visit-reservation-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {reserveReadyDeliveryVisit:reserve}=await import('../.shopify/visit-reservation-test/ready-delivery-visit.server.js');
const {configureReadyDeliverySlot:configure,reserveReadyDeliveryCapacity:single,releaseReadyDeliveryCapacity:release}=await import('../.shopify/visit-reservation-test/ready-delivery-capacity.server.js');
const {stageReadyDeliveryReminders:stage}=await import('../.shopify/visit-reservation-test/ready-delivery-draft.server.js');
const {rescheduleReadyDeliveryVisit:move}=await import('../.shopify/visit-reservation-test/ready-delivery-reschedule.server.js');
const db=new PrismaClient(),shop=`visit-${randomUUID()}.myshopify.com`,customerGid='gid://shopify/Customer/91',orderGid='gid://shopify/Order/1',now=new Date('2026-10-26T00:00:00Z');
process.env.ALLOWED_SHOP=shop;process.env.READY_DELIVERY_CAPACITY_ENABLED='true';
async function setup(count=2){
 const slot=await configure({shop,slotKey:randomUUID(),deliveryAt:'2026-11-02T01:00:00Z',deliveryEndsAt:'2026-11-02T04:00:00Z',capacity:1,available:true,expectedRevision:0});
 const members=[];
 for(let i=0;i<count;i++){
  const line=await db.operationalLine.create({data:{shop,customerGid,orderGid,orderLineGid:'gid://shopify/LineItem/'+Date.now()+i,productGid:'gid://shopify/Product/4',variantGid:'gid://shopify/ProductVariant/5',contractGid:'gid://shopify/SubscriptionContract/'+Date.now()+i,businessStream:'ready_series',department:'ready_series',validationStatus:'VALIDATED'}});
  const snapshot=JSON.stringify({version:1,contractGid:line.contractGid,expected:{customerGid,orderGid,orderLineGid:line.orderLineGid,productGid:line.productGid,variantGid:line.variantGid,months:3,packageQuantity:i+1}});
  await db.prepaidPurchaseEvidence.create({data:{shop,customerGid,contractGid:line.contractGid,originalOrderGid:orderGid,originalLineGid:line.orderLineGid,snapshot,snapshotHash:createHash('sha256').update(snapshot).digest('hex')}});
  const {draft}=await stage({shop,customerGid,operationalLineId:line.id,occurrence:1,deliveryAt:slot.deliveryAt.toISOString(),expectedRevision:0});
  members.push({draftId:draft.id,revision:1,operationalLineId:line.id,occurrence:1,packages:i+1});
 }
 return {shop,customerGid,orderGid,destinationKey:'server-verified-destination',slotId:slot.id,slotRevision:slot.revision,deliveryAt:slot.deliveryAt.toISOString(),deliveryEndsAt:slot.deliveryEndsAt.toISOString(),members};
}
const legacy=(p,m)=>({shop,customerGid,slotId:p.slotId,slotRevision:p.slotRevision,deliveryDraftId:m.draftId,deliveryRevision:m.revision});
test.after(async()=>{for(const m of ['readyDeliveryVisitMember','readyDeliveryVisit','readyDeliverySlotReservation','readyDeliverySlot','readyDeliveryReminder','readyDeliveryDraft','prepaidRenewalEvidence','prepaidPurchaseEvidence','operationalLine'])await db[m].deleteMany({where:{shop}});await db.$disconnect();});
test('multiple paid package lines reserve one visit; replay preserves every entitlement',async()=>{
 const p=await setup(),a=await reserve(p,{now}),b=await reserve({...p,members:[...p.members].reverse()},{now});assert.equal(a.created,true);assert.equal(b.created,false);assert.equal(a.visit.id,b.visit.id);assert.equal(a.visit.packageCount,3);assert.equal(a.bookingConfirmed,false);
 assert.equal((await db.readyDeliverySlot.findUnique({where:{id:p.slotId}})).reserved,1);assert.equal(await db.readyDeliveryVisitMember.count({where:{shop,visitId:a.visit.id,state:'RESERVED'}}),2);
});
test('no member, including a non-leader, can reserve again or move while grouped',async()=>{
 const p=await setup(),a=await reserve(p,{now});
 for(const m of p.members){await assert.rejects(single(legacy(p,m),{now}),/combined visit/);await assert.rejects(stage({shop,customerGid,operationalLineId:m.operationalLineId,occurrence:1,deliveryAt:'2026-11-03T01:00:00Z',expectedRevision:1}),/Release/);}
 process.env.READY_DELIVERY_CAPACITY_ENABLED='false';try{await assert.rejects(stage({shop,customerGid,operationalLineId:p.members[1].operationalLineId,occurrence:1,deliveryAt:'2026-11-03T01:00:00Z',expectedRevision:1}),/Release/);}finally{process.env.READY_DELIVERY_CAPACITY_ENABLED='true';}
 await assert.rejects(release({shop,customerGid:'gid://shopify/Customer/99',reservationId:a.reservation.id}));
 await release({shop,customerGid,reservationId:a.reservation.id});assert.equal((await release({shop,customerGid,reservationId:a.reservation.id})).replayed,true);
 assert.equal((await db.readyDeliverySlot.findUnique({where:{id:p.slotId}})).reserved,0);assert.equal(await db.readyDeliveryVisitMember.count({where:{shop,visitId:a.visit.id,state:'RESERVED'}}),0);
 await assert.rejects(reserve(p,{now}),/released visit/);
 for(const m of p.members)await assert.rejects(single(legacy(p,m),{now}),/combined visit/);
 for(const m of p.members)assert.equal((await stage({shop,customerGid,operationalLineId:m.operationalLineId,occurrence:1,deliveryAt:'2026-11-03T01:00:00Z',expectedRevision:1})).draft.revision,2);
});
test('wrong owner, package quantity, paid proof, destination replay or member binding fail atomically',async()=>{
 const p=await setup();
 for(const edit of [{customerGid:'gid://shopify/Customer/99'},{orderGid:'gid://shopify/Order/99'},{members:p.members.map(m=>({...m,packages:9}))},{members:p.members.map(m=>({...m,occurrence:4}))}])await assert.rejects(reserve({...p,...edit},{now}));
 assert.equal((await db.readyDeliverySlot.findUnique({where:{id:p.slotId}})).reserved,0);assert.equal(await db.readyDeliveryVisitMember.count({where:{shop,deliveryDraftId:{in:p.members.map(m=>m.draftId)}}}),0);
 const a=await reserve(p,{now});await assert.rejects(reserve({...p,destinationKey:'different-destination'},{now}),/another/);
 assert.equal((await db.readyDeliveryVisit.findUnique({where:{id:a.visit.id}})).state,'RESERVED');
});
test('a standalone non-leader reservation prevents a combined visit without consuming capacity',async()=>{
 const p=await setup();await single(legacy(p,p.members[1]),{now});await assert.rejects(reserve(p,{now}),/standalone/);assert.equal(await db.readyDeliveryVisit.count({where:{shop,slotId:p.slotId}}),0);assert.equal((await db.readyDeliverySlot.findUnique({where:{id:p.slotId}})).reserved,1);
});
test('missing or corrupted paid evidence cannot create capacity reservations',async()=>{
 for(const corrupt of [false,true]){const p=await setup(1);const line=await db.operationalLine.findUnique({where:{id:p.members[0].operationalLineId}});if(corrupt)await db.prepaidPurchaseEvidence.updateMany({where:{shop,originalLineGid:line.orderLineGid},data:{snapshotHash:'corrupt'}});else await db.prepaidPurchaseEvidence.deleteMany({where:{shop,originalLineGid:line.orderLineGid}});await assert.rejects(reserve(p,{now}),/entitlement/);assert.equal((await db.readyDeliverySlot.findUnique({where:{id:p.slotId}})).reserved,0);}
});
test('concurrent identical visits create one record and one capacity charge',async()=>{
 const p=await setup();const results=await Promise.allSettled([reserve(p,{now}),reserve(p,{now})]);
 const ok=results.filter(r=>r.status==='fulfilled').map(r=>r.value);assert.ok(ok.length>=1);assert.equal(ok.filter(r=>r.created).length,1);
 assert.equal(await db.readyDeliveryVisit.count({where:{shop,slotId:p.slotId}}),1);assert.equal((await db.readyDeliverySlot.findUnique({where:{id:p.slotId}})).reserved,1);
});
test('a simultaneous standalone reservation of a non-leader cannot double-book its combined visit',async()=>{
 const p=await setup();const outcomes=await Promise.allSettled([reserve(p,{now}),single(legacy(p,p.members[1]),{now})]);
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(await db.readyDeliverySlotReservation.count({where:{shop,slotId:p.slotId,state:'RESERVED'}}),1);
 assert.equal((await db.readyDeliverySlot.findUnique({where:{id:p.slotId}})).reserved,1);
});
test('incomplete combined membership blocks release without changing capacity',async()=>{
 const p=await setup(),r=await reserve(p,{now});await db.readyDeliveryVisitMember.updateMany({where:{shop,visitId:r.visit.id,deliveryDraftId:p.members[1].draftId},data:{state:'RELEASED'}});
 await assert.rejects(release({shop,customerGid,reservationId:r.reservation.id}),/reconciliation/);
 assert.equal((await db.readyDeliverySlot.findUnique({where:{id:p.slotId}})).reserved,1);assert.equal((await db.readyDeliveryVisit.findUnique({where:{id:r.visit.id}})).state,'RESERVED');
});

test('an occurrence beyond the paid term cannot be disguised as an otherwise matching draft',async()=>{
 const p=await setup(1),m=p.members[0];await db.readyDeliveryDraft.update({where:{id:m.draftId},data:{occurrence:4}});
 await assert.rejects(reserve({...p,members:[{...m,occurrence:4}]},{now}),/entitlement/);
 assert.equal((await db.readyDeliverySlot.findUnique({where:{id:p.slotId}})).reserved,0);
});
async function renewalFixture(){
 const p=await setup(1),member=p.members[0],line=await db.operationalLine.findUniqueOrThrow({where:{id:member.operationalLineId}});
 const purchase=await db.prepaidPurchaseEvidence.findUniqueOrThrow({where:{shop_originalLineGid:{shop,originalLineGid:line.orderLineGid}}});
 const order='gid://shopify/Order/'+Date.now(),lineGid='gid://shopify/LineItem/'+Date.now()+'9',attempt='gid://shopify/SubscriptionBillingAttempt/'+Date.now();
 const current=await db.operationalLine.create({data:{shop,customerGid,orderGid:order,orderLineGid:lineGid,productGid:line.productGid,variantGid:line.variantGid,contractGid:line.contractGid,businessStream:'ready_series',department:'ready_series',validationStatus:'VALIDATED'}});
 const {draft}=await stage({shop,customerGid,operationalLineId:current.id,occurrence:1,deliveryAt:p.deliveryAt,expectedRevision:0});
 const expected={...JSON.parse(purchase.snapshot).expected,attemptGid:attempt,idempotencyKey:'verified-fixture',renewalOrderGid:order,renewalOrderLineGid:lineGid};
 const snapshot=JSON.stringify({version:1,purchaseHash:purchase.snapshotHash,expected,correction:null});
 const receipt=await db.prepaidRenewalEvidence.create({data:{shop,customerGid,contractGid:line.contractGid,purchaseEvidenceId:purchase.id,attemptGid:attempt,renewalOrderGid:order,snapshot,snapshotHash:createHash('sha256').update(snapshot).digest('hex'),state:'COMPLETED',completedAt:new Date()}});
 return {plan:{...p,orderGid:order,members:[{draftId:draft.id,revision:1,operationalLineId:current.id,occurrence:1,packages:1}]},receipt,purchase};
}
test('a verified paid renewal retains the original package entitlement without billing again',async()=>{
 const {plan}=await renewalFixture(),a=await reserve(plan,{now}),b=await reserve(plan,{now});assert.equal(a.created,true);assert.equal(b.created,false);assert.equal(a.visit.packageCount,1);
});
test('pending renewal evidence cannot authorize delivery reservations',async()=>{
 const {plan,receipt}=await renewalFixture();await db.prepaidRenewalEvidence.update({where:{id:receipt.id},data:{state:'PENDING_LINK',completedAt:null}});
 await assert.rejects(reserve(plan,{now}),/paid renewal linkage/);assert.equal((await db.readyDeliverySlot.findUnique({where:{id:plan.slotId}})).reserved,0);
});
test('renewals with altered package quantities, broken hashes or foreign original ownership fail closed',async()=>{
 for(const mode of ['quantity','hash','owner']){
  const {plan,receipt,purchase}=await renewalFixture();
  if(mode==='owner')await db.prepaidPurchaseEvidence.update({where:{id:purchase.id},data:{customerGid:'gid://shopify/Customer/99'}});
  else{const body=JSON.parse(receipt.snapshot);body.expected.packageQuantity=2;const snapshot=JSON.stringify(body);await db.prepaidRenewalEvidence.update({where:{id:receipt.id},data:{snapshot,snapshotHash:mode==='hash'?'corrupt':createHash('sha256').update(snapshot).digest('hex')}});}
  await assert.rejects(reserve(plan,{now}));assert.equal((await db.readyDeliverySlot.findUnique({where:{id:plan.slotId}})).reserved,0);
 }
});

async function replacement(){return configure({shop,slotKey:randomUUID(),deliveryAt:'2026-11-03T01:00:00Z',deliveryEndsAt:'2026-11-03T04:00:00Z',capacity:1,available:true,expectedRevision:0});}
const moveInput=(visit,slot)=>({shop,customerGid,visitId:visit.id,replacementSlotId:slot.id,replacementSlotRevision:slot.revision,noticeHours:72});
async function slotState(){
 const result={};for(const m of ['readyDeliverySlot','readyDeliverySlotReservation','readyDeliveryVisit','readyDeliveryVisitMember','readyDeliveryDraft','readyDeliveryReminder','operationalLine','prepaidPurchaseEvidence'])result[m]=(await db[m].findMany({where:{shop}})).map(x=>JSON.stringify(x)).sort();return result;
}
test('combined reschedule moves all packages once, preserving entitlement, other occurrences and reminder history',async()=>{
 const p=await setup(),old=await reserve(p,{now}),slot=await replacement();
 const other=await stage({shop,customerGid,operationalLineId:p.members[0].operationalLineId,occurrence:2,deliveryAt:'2026-12-02T01:00:00Z',expectedRevision:0});
 const paid=await db.prepaidPurchaseEvidence.findMany({where:{shop}}),lines=await db.operationalLine.findMany({where:{shop}});
 const a=await move(moveInput(old.visit,slot),{now}),b=await move(moveInput(old.visit,slot),{now:new Date('2026-11-03T00:59:00Z')});
 assert.equal(a.replayed,false);assert.equal(b.replayed,true);assert.equal(b.visit.id,a.visit.id);assert.equal(a.bookingConfirmed,false);assert.equal(a.visit.packageCount,3);
 assert.equal((await db.readyDeliverySlot.findUnique({where:{id:p.slotId}})).reserved,0);assert.equal((await db.readyDeliverySlot.findUnique({where:{id:slot.id}})).reserved,1);
 for(const m of p.members){const d=await db.readyDeliveryDraft.findUnique({where:{id:m.draftId}});assert.equal(d.revision,2);assert.equal(d.deliveryAt.toISOString(),slot.deliveryAt.toISOString());assert.equal(await db.readyDeliveryReminder.count({where:{shop,deliveryDraftId:d.id,deliveryRevision:1,state:'SUPERSEDED'}}),4);assert.equal(await db.readyDeliveryReminder.count({where:{shop,deliveryDraftId:d.id,deliveryRevision:2,state:'DRAFT'}}),4);}
 assert.deepEqual(await db.readyDeliveryDraft.findUnique({where:{id:other.draft.id}}),other.draft);assert.deepEqual(await db.prepaidPurchaseEvidence.findMany({where:{shop}}),paid);assert.deepEqual(await db.operationalLine.findMany({where:{shop}}),lines);
});
test('failed replacement rolls back release, draft revisions and all reminders',async()=>{
 for(const failure of ['closed','full','stale','proof','reminder']){
  const p=await setup(),old=await reserve(p,{now}),slot=await replacement(),input=moveInput(old.visit,slot);
  if(failure==='closed')await configure({shop,slotKey:slot.slotKey,deliveryAt:slot.deliveryAt.toISOString(),deliveryEndsAt:slot.deliveryEndsAt.toISOString(),capacity:1,available:false,expectedRevision:1});
  if(failure==='full'){const occupied=await setup(1);const m=occupied.members[0];const moved=await stage({shop,customerGid,operationalLineId:m.operationalLineId,occurrence:1,deliveryAt:slot.deliveryAt.toISOString(),expectedRevision:1});await reserve({...occupied,slotId:slot.id,slotRevision:slot.revision,deliveryAt:slot.deliveryAt.toISOString(),deliveryEndsAt:slot.deliveryEndsAt.toISOString(),members:[{...m,revision:moved.draft.revision}]},{now});}
  if(failure==='stale')input.replacementSlotRevision=9;
  if(failure==='proof'){const line=await db.operationalLine.findUnique({where:{id:p.members[1].operationalLineId}});await db.prepaidPurchaseEvidence.updateMany({where:{shop,originalLineGid:line.orderLineGid},data:{snapshotHash:'corrupt'}});}
  if(failure==='reminder')await db.readyDeliveryReminder.updateMany({where:{shop,deliveryDraftId:p.members[1].draftId},data:{state:'SENT'}});
  const before=await slotState();await assert.rejects(move(input,{now}));assert.deepEqual(await slotState(),before,failure+' must preserve complete original state');
 }
});
test('notice applies to both current and replacement; foreign owner and disabled activation cannot move',async()=>{
 const p=await setup(),old=await reserve(p,{now}),slot=await replacement(),input=moveInput(old.visit,slot),before=await slotState();
 await assert.rejects(move(input,{now:new Date('2026-10-31T01:00:00Z')}),/Support/);
 await assert.rejects(move({...input,customerGid:'gid://shopify/Customer/999'},{now}));
 await assert.rejects(move({...input,noticeHours:0},{now}));
 process.env.READY_DELIVERY_CAPACITY_ENABLED='false';try{await assert.rejects(move(input,{now}),/not activated/);}finally{process.env.READY_DELIVERY_CAPACITY_ENABLED='true';}
 assert.deepEqual(await slotState(),before);
});
test('a manual release is not mistaken for an already completed reschedule',async()=>{
 const p=await setup(),old=await reserve(p,{now}),slot=await replacement();await release({shop,customerGid,reservationId:old.reservation.id});const before=await slotState();await assert.rejects(move(moveInput(old.visit,slot),{now}),/matching completed replacement/);assert.deepEqual(await slotState(),before);
});
test('concurrent reschedule retries use one replacement visit and one capacity place',async()=>{
 const p=await setup(),old=await reserve(p,{now}),slot=await replacement(),input=moveInput(old.visit,slot);
 const outcomes=await Promise.allSettled([move(input,{now}),move(input,{now})]);assert.ok(outcomes.some(r=>r.status==='fulfilled'));const retry=await move(input,{now});assert.equal(retry.replayed,true);assert.equal(await db.readyDeliveryVisit.count({where:{shop,slotId:slot.id,state:'RESERVED'}}),1);assert.equal((await db.readyDeliverySlot.findUnique({where:{id:slot.id}})).reserved,1);
});

test('replacement notice and corrupt release replay preserve the original or completed visit',async()=>{
 const p=await setup(),old=await reserve(p,{now});const early=await configure({shop,slotKey:randomUUID(),deliveryAt:'2026-11-01T01:00:00Z',deliveryEndsAt:'2026-11-01T04:00:00Z',capacity:1,available:true,expectedRevision:0});const before=await slotState();await assert.rejects(move(moveInput(old.visit,early),{now:new Date('2026-10-30T01:00:00Z')}),/Support/);assert.deepEqual(await slotState(),before);
 const slot=await replacement(),input=moveInput(old.visit,slot);await move(input,{now});await db.readyDeliverySlotReservation.update({where:{id:old.reservation.id},data:{releasedAt:null}});const completed=await slotState();await assert.rejects(move(input,{now}),/release requires reconciliation/);assert.deepEqual(await slotState(),completed);
});
