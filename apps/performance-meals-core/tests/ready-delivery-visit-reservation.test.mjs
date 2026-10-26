import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/ready-delivery-visit.server.ts','app/services/ready-delivery-capacity.server.ts','app/services/ready-delivery-draft.server.ts'],outdir:'.shopify/visit-reservation-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {reserveReadyDeliveryVisit:reserve}=await import('../.shopify/visit-reservation-test/ready-delivery-visit.server.js');
const {configureReadyDeliverySlot:configure,reserveReadyDeliveryCapacity:single,releaseReadyDeliveryCapacity:release}=await import('../.shopify/visit-reservation-test/ready-delivery-capacity.server.js');
const {stageReadyDeliveryReminders:stage}=await import('../.shopify/visit-reservation-test/ready-delivery-draft.server.js');
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
test.after(async()=>{for(const m of ['readyDeliveryVisitMember','readyDeliveryVisit','readyDeliverySlotReservation','readyDeliverySlot','readyDeliveryReminder','readyDeliveryDraft','prepaidPurchaseEvidence','operationalLine'])await db[m].deleteMany({where:{shop}});await db.$disconnect();});
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
