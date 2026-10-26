import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/ready-delivery-capacity.server.ts','app/services/ready-delivery-draft.server.ts'],outdir:'.shopify/ready-capacity-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {configureReadyDeliverySlot:configure,reserveReadyDeliveryCapacity:reserve,releaseReadyDeliveryCapacity:release}=await import('../.shopify/ready-capacity-test/ready-delivery-capacity.server.js');
const {stageReadyDeliveryReminders:stage}=await import('../.shopify/ready-capacity-test/ready-delivery-draft.server.js');
const db=new PrismaClient(),shop=`ready-capacity-${randomUUID()}.myshopify.com`,customerGid='gid://shopify/Customer/91',now=new Date('2026-10-26T00:00:00Z');
process.env.ALLOWED_SHOP=shop;process.env.READY_DELIVERY_CAPACITY_ENABLED='true';
const spec=(key=randomUUID(),capacity=1)=>({shop,slotKey:key,deliveryAt:'2026-11-02T01:00:00Z',deliveryEndsAt:'2026-11-02T04:00:00Z',capacity,available:true,expectedRevision:0});
async function draft(){const key=randomUUID();const line=await db.operationalLine.create({data:{shop,customerGid,orderGid:'gid://shopify/Order/1',orderLineGid:key,productGid:'gid://shopify/Product/4',variantGid:'gid://shopify/ProductVariant/5',contractGid:'gid://shopify/SubscriptionContract/6',businessStream:'ready_series',department:'ready_series',validationStatus:'VALIDATED'}});return (await stage({shop,customerGid,operationalLineId:line.id,occurrence:1,deliveryAt:'2026-11-02T01:00:00Z',expectedRevision:0})).draft;}
const input=(s,d)=>({shop,customerGid,slotId:s.id,slotRevision:s.revision,deliveryDraftId:d.id,deliveryRevision:d.revision});
test.after(async()=>{for(const m of ['readyDeliverySlotReservation','readyDeliverySlot','readyDeliveryReminder','readyDeliveryDraft','operationalLine'])await db[m].deleteMany({where:{shop}});await db.$disconnect();});
test('merchant capacity and windows are explicit, revisioned and replay safe',async()=>{
 const s=spec(),first=await configure(s),again=await configure(s);assert.equal(first.id,again.id);assert.equal(first.revision,1);assert.equal(first.reserved,0);
 const changed=await configure({...s,capacity:3,expectedRevision:1});assert.equal(changed.revision,2);assert.equal(changed.capacity,3);
 await assert.rejects(configure({...s,capacity:4,expectedRevision:1}),/changed/);
 for(const edit of[{capacity:0},{capacity:1.5},{capacity:2147483648},{deliveryEndsAt:'2026-11-01T04:00:00Z'},{deliveryEndsAt:'2026-11-03T04:00:00Z'},{deliveryAt:'2026-02-30T01:00:00Z'},{slotKey:''},{deliveryAt:'2026-11-07T01:00:00Z',deliveryEndsAt:'2026-11-07T04:00:00Z'}])await assert.rejects(configure({...spec(),...edit}));
});
test('one reservation uses one delivery place; replay never consumes another',async()=>{
 const s=await configure(spec()),d=await draft(),first=await reserve(input(s,d),{now});assert.equal(first.created,true);assert.equal(first.bookingConfirmed,false);
 const again=await reserve(input(s,d),{now});assert.equal(again.created,false);assert.equal(again.reservation.id,first.reservation.id);assert.equal((await db.readyDeliverySlot.findUnique({where:{id:s.id}})).reserved,1);
 await assert.rejects(reserve(input(s,await draft()),{now}),/full/);
});
test('concurrent customers cannot exceed the last available delivery place',async()=>{
 const s=await configure(spec()),one=await draft(),two=await draft();
 const outcomes=await Promise.allSettled([reserve(input(s,one),{now}),reserve(input(s,two),{now})]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(await db.readyDeliverySlotReservation.count({where:{shop,slotId:s.id,state:'RESERVED'}}),1);assert.equal((await db.readyDeliverySlot.findUnique({where:{id:s.id}})).reserved,1);
});
test('releasing a place is owned and exactly once, then another delivery can reserve it',async()=>{
 const s=await configure(spec()),d=await draft(),r=await reserve(input(s,d),{now});
 await assert.rejects(release({shop,customerGid:'gid://shopify/Customer/99',reservationId:r.reservation.id}),/unavailable/);
 const first=await release({shop,customerGid,reservationId:r.reservation.id}),again=await release({shop,customerGid,reservationId:r.reservation.id});assert.equal(first.replayed,false);assert.equal(again.replayed,true);
 assert.equal((await db.readyDeliverySlot.findUnique({where:{id:s.id}})).reserved,0);await assert.rejects(reserve(input(s,d),{now}),/review/);
 assert.equal((await reserve(input(s,await draft()),{now})).created,true);
});
test('closure preserves booked places and prevents new ones; reserved windows cannot move',async()=>{
 const s0=spec(randomUUID(),2),s=await configure(s0),d=await draft(),r=await reserve(input(s,d),{now});
 const closed=await configure({...s0,available:false,expectedRevision:1});assert.equal(closed.reserved,1);assert.equal((await reserve(input(s,d),{now})).reservation.id,r.reservation.id);
 await assert.rejects(reserve(input(closed,await draft()),{now}),/closed/);
 await assert.rejects(configure({...s0,deliveryAt:'2026-11-02T02:00:00Z',expectedRevision:2}),/preserved/);
 const s2=await configure({...s0,capacity:3,available:false,expectedRevision:2});assert.equal(s2.capacity,3);
});
test('capacity cannot fall below reservations and stale or different slots cannot capture a draft',async()=>{
 const base=spec(randomUUID(),2),s=await configure(base),d=await draft();await reserve(input(s,d),{now});await reserve(input(s,await draft()),{now});
 await assert.rejects(configure({...base,capacity:1,expectedRevision:1}),/preserved/);
 const other=await configure(spec());await assert.rejects(reserve(input(other,d),{now}),/review/);assert.equal((await db.readyDeliverySlot.findUnique({where:{id:other.id}})).reserved,0);
 const unused=await draft();await assert.rejects(reserve({...input(other,unused),slotRevision:2},{now}),/changed/);await assert.rejects(reserve({...input(other,unused),deliveryRevision:2},{now}),/changed/);
});
test('foreign ownership, past slots and dispatched Core lines cannot consume capacity',async()=>{
 const s=await configure(spec()),d=await draft();await assert.rejects(reserve({...input(s,d),customerGid:'gid://shopify/Customer/99'},{now}));
 await assert.rejects(reserve(input(s,d),{now:new Date('2026-11-02T01:00:00Z')}),/closed/);
 await db.operationalLine.update({where:{id:d.operationalLineId},data:{fulfillmentState:'DISPATCHED'}});await assert.rejects(reserve(input(s,d),{now}),/undispatched/);
 assert.equal((await db.readyDeliverySlot.findUnique({where:{id:s.id}})).reserved,0);
});
test('counter corruption holds instead of overbooking or silently repairing reservations',async()=>{
 const s=await configure(spec()),d=await draft();await db.readyDeliverySlot.update({where:{id:s.id},data:{reserved:1}});
 await assert.rejects(reserve(input(s,d),{now}),/reconciliation/);await assert.rejects(configure({...spec(s.slotKey),expectedRevision:1}),/reconciliation/);
 assert.equal(await db.readyDeliverySlotReservation.count({where:{shop,slotId:s.id}}),0);
});
test('a reserved draft cannot move until its capacity is released',async()=>{
 const s=await configure(spec()),d=await draft(),r=await reserve(input(s,d),{now});
 const move={shop,customerGid,operationalLineId:d.operationalLineId,occurrence:1,deliveryAt:'2026-11-03T01:00:00Z',expectedRevision:1};
 await assert.rejects(stage(move),/Release/);assert.equal((await db.readyDeliveryDraft.findUnique({where:{id:d.id}})).revision,1);
 await release({shop,customerGid,reservationId:r.reservation.id});assert.equal((await stage(move)).draft.revision,2);
});
test('default-off, production and foreign-store gates prevent capacity writes',async()=>{
 process.env.READY_DELIVERY_CAPACITY_ENABLED='false';try{await assert.rejects(configure(spec()),/not activated/);}finally{process.env.READY_DELIVERY_CAPACITY_ENABLED='true';}
 await assert.rejects(configure({...spec(),shop:'other.myshopify.com'}));const old=process.env.NODE_ENV;process.env.NODE_ENV='production';try{await assert.rejects(configure(spec()),/not activated/);}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}
});
test('turning capacity off never allows a reserved draft to move',async()=>{
 const s=await configure(spec()),d=await draft();await reserve(input(s,d),{now});
 process.env.READY_DELIVERY_CAPACITY_ENABLED='false';
 try{
  await assert.rejects(stage({shop,customerGid,operationalLineId:d.operationalLineId,occurrence:1,deliveryAt:'2026-11-03T01:00:00Z',expectedRevision:1}),/Release/);
  assert.equal((await db.readyDeliveryDraft.findUnique({where:{id:d.id}})).revision,1);
  assert.equal((await db.readyDeliverySlot.findUnique({where:{id:s.id}})).reserved,1);
 }finally{process.env.READY_DELIVERY_CAPACITY_ENABLED='true';}
});
test('a simultaneous draft move and capacity reservation cannot both commit',async()=>{
 const s=await configure(spec()),d=await draft();
 const outcomes=await Promise.allSettled([
  reserve(input(s,d),{now}),
  stage({shop,customerGid,operationalLineId:d.operationalLineId,occurrence:1,deliveryAt:'2026-11-03T01:00:00Z',expectedRevision:1}),
 ]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 const current=await db.readyDeliveryDraft.findUnique({where:{id:d.id}}),slot=await db.readyDeliverySlot.findUnique({where:{id:s.id}});
 const reservations=await db.readyDeliverySlotReservation.findMany({where:{shop,deliveryDraftId:d.id,state:'RESERVED'}});
 if(current.revision===1){assert.equal(reservations.length,1);assert.equal(slot.reserved,1);assert.equal(current.deliveryAt.getTime(),slot.deliveryAt.getTime());}
 else{assert.equal(current.revision,2);assert.equal(reservations.length,0);assert.equal(slot.reserved,0);}
});
test('Saturday availability cannot reopen or take a new reservation, but can close safely',async()=>{
 const base={...spec(),deliveryAt:'2026-11-07T01:00:00Z',deliveryEndsAt:'2026-11-07T04:00:00Z',available:false};
 const slot=await configure(base);await assert.rejects(configure({...base,available:true,expectedRevision:1}),/Saturday/);
 // Simulate legacy configuration without inventing an actual customer booking.
 await db.readyDeliverySlot.update({where:{id:slot.id},data:{available:true}});
 const d=await draft();await stage({shop,customerGid,operationalLineId:d.operationalLineId,occurrence:1,deliveryAt:base.deliveryAt,expectedRevision:1});
 await assert.rejects(reserve({...input(slot,d),deliveryRevision:2},{now}),/closed/);
 assert.equal((await configure({...base,expectedRevision:1})).available,false);
 assert.equal((await db.readyDeliverySlot.findUnique({where:{id:slot.id}})).reserved,0);
});
