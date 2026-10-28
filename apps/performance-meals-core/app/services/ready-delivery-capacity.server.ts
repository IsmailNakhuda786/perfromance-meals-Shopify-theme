import db from '../db.server';
import type {Prisma} from '@prisma/client';
import {assertShop} from './security.server';

type Tx=Prisma.TransactionClient;
type SlotSpec={shop:string;slotKey:string;deliveryAt:string;deliveryEndsAt:string;capacity:number;available:boolean;expectedRevision:number};
const identity=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
function scope(shop:string){
 assertShop(shop);
 if(process.env.NODE_ENV==='production'||process.env.READY_DELIVERY_CAPACITY_ENABLED!=='true')throw Error('Delivery capacity management is not activated');
}
function window(start:string,end:string){
 const parse=(v:string)=>{
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,19)!==v.slice(0,19))throw Error('Exact merchant delivery window required');
  return new Date(v);
 };
 const a=parse(start),b=parse(end),day=(d:Date)=>new Date(d.getTime()+8*3600000).toISOString().slice(0,10);
 if(b<=a||day(a)!==day(b))throw Error('Same-day Singapore delivery window required');
 return {deliveryAt:a,deliveryEndsAt:b};
}
async function countMatches(tx:Tx,slot:{id:string;shop:string;reserved:number;capacity:number}){
 const count=await tx.readyDeliverySlotReservation.count({where:{shop:slot.shop,slotId:slot.id,state:'RESERVED'}});
 if(count!==slot.reserved||slot.reserved<0||slot.reserved>slot.capacity)throw Error('Delivery capacity requires reconciliation');
}
async function lockSlot(tx:Tx,shop:string,id:string){
 const lock=await tx.readyDeliverySlot.updateMany({where:{id,shop},data:{updatedAt:new Date()}});
 if(lock.count!==1)throw Error('Delivery slot unavailable');
 const slot=await tx.readyDeliverySlot.findFirstOrThrow({where:{id,shop}});await countMatches(tx,slot);return slot;
}

// Server-only merchant configuration. The eventual admin route must authenticate
// the merchant. No defaults invent capacity, dates, holidays or time windows.
export async function configureReadyDeliverySlot(input:SlotSpec){
 scope(input.shop);
 const {shop,slotKey,capacity,available,expectedRevision}=input,w=window(input.deliveryAt,input.deliveryEndsAt);
 if(!identity(slotKey)||!Number.isSafeInteger(capacity)||capacity<1||capacity>2147483647||typeof available!=='boolean'||!Number.isSafeInteger(expectedRevision)||expectedRevision<0||expectedRevision>=2147483647)throw Error('Explicit merchant slot and capacity required');
 // Jerome excludes Saturdays. Keep closure available for any legacy slot,
 // while refusing to create or reopen Saturday availability.
 if(available&&new Date(w.deliveryAt.getTime()+8*3600000).getUTCDay()===6)throw Error('Saturday deliveries are unavailable');
 return db.$transaction(async tx=>{
  let slot=await tx.readyDeliverySlot.findUnique({where:{shop_slotKey:{shop,slotKey}}});
  if(!slot){
   if(expectedRevision!==0)throw Error('Delivery slot changed; reload');
   return tx.readyDeliverySlot.create({data:{shop,slotKey,...w,capacity,available}});
  }
  slot=await lockSlot(tx,shop,slot.id);
  const identical=slot.deliveryAt.getTime()===w.deliveryAt.getTime()&&slot.deliveryEndsAt.getTime()===w.deliveryEndsAt.getTime()&&slot.capacity===capacity&&slot.available===available;
  if(identical&&(slot.revision===expectedRevision||expectedRevision===0&&slot.revision===1))return slot;
  if(slot.revision!==expectedRevision)throw Error('Delivery slot changed; reload');
  if(capacity<slot.reserved||slot.reserved>0&&(slot.deliveryAt.getTime()!==w.deliveryAt.getTime()||slot.deliveryEndsAt.getTime()!==w.deliveryEndsAt.getTime()))throw Error('Existing delivery reservations must be preserved');
  const changed=await tx.readyDeliverySlot.updateMany({where:{id:slot.id,shop,revision:expectedRevision},data:{...w,capacity,available,revision:{increment:1}}});
  if(changed.count!==1)throw Error('Delivery slot changed; reload');
  return tx.readyDeliverySlot.findUniqueOrThrow({where:{id:slot.id}});
 },{timeout:30000});
}

type Reserve={shop:string;customerGid:string;slotId:string;slotRevision:number;deliveryDraftId:string;deliveryRevision:number};
export async function readReadyDeliverySlots(shop:string,options:{limit?:number;after?:string}={}){
 scope(shop);const limit=options.limit??25;
 if(!Number.isSafeInteger(limit)||limit<1||limit>50||options.after!==undefined&&!identity(options.after))throw Error('Invalid delivery slot page');
 const cursor=options.after?await db.readyDeliverySlot.findFirst({where:{id:options.after,shop}}):null;
 if(options.after&&!cursor)throw Error('Invalid delivery slot cursor');
 const rows=await db.readyDeliverySlot.findMany({where:{shop,...(cursor?{OR:[{deliveryAt:{gt:cursor.deliveryAt}},{deliveryAt:cursor.deliveryAt,id:{gt:cursor.id}}]}:{})},orderBy:[{deliveryAt:'asc'},{id:'asc'}],take:limit+1});
 return {slots:rows.slice(0,limit),hasMore:rows.length>limit,nextCursor:rows.length>limit?rows[limit-1].id:null};
}
// One internal reservation consumes one delivery place. The caller must bind
// draft-to-physical-delivery grouping and fresh native dispatch before exposing
// a confirmed booking. This service never changes Shopify, billing or meals.
export async function reserveReadyDeliveryCapacity(input:Reserve,options:{now?:Date}={}){
 scope(input.shop);
 const {shop,customerGid,slotId,slotRevision,deliveryDraftId,deliveryRevision}=input,now=options.now??new Date();
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!identity(slotId)||!identity(deliveryDraftId)||!Number.isSafeInteger(slotRevision)||slotRevision<1||!Number.isSafeInteger(deliveryRevision)||deliveryRevision<1||!Number.isFinite(now.getTime()))throw Error('Exact owned delivery and slot revisions required');
 return db.$transaction(async tx=>{
  const slot=await lockSlot(tx,shop,slotId);
  const draftLock=await tx.readyDeliveryDraft.updateMany({where:{id:deliveryDraftId,shop,customerGid,state:'DRAFT',revision:deliveryRevision},data:{updatedAt:new Date()}});
  if(draftLock.count!==1)throw Error('Delivery draft or slot changed; reload');
  const draft=await tx.readyDeliveryDraft.findFirst({where:{id:deliveryDraftId,shop,customerGid,state:'DRAFT',revision:deliveryRevision}});
  if(!draft||draft.deliveryAt.getTime()!==slot.deliveryAt.getTime())throw Error('Delivery draft or slot changed; reload');
  const line=await tx.operationalLine.findFirst({where:{id:draft.operationalLineId,shop,customerGid,businessStream:'ready_series',validationStatus:'VALIDATED',fulfillmentState:'UNASSIGNED'}});
  if(!line?.contractGid)throw Error('Validated undispatched paid delivery binding required');
  if(await tx.readyDeliveryVisitMember.count({where:{shop,deliveryDraftId,deliveryRevision}}))throw Error('Delivery belongs to a combined visit; manage the whole visit');
  const key={shop_deliveryDraftId_deliveryRevision:{shop,deliveryDraftId,deliveryRevision}},old=await tx.readyDeliverySlotReservation.findUnique({where:key});
  if(old){
   if(old.slotId!==slotId||old.customerGid!==customerGid||old.state!=='RESERVED'||old.releasedAt)throw Error('Delivery reservation requires review');
   return {reservation:old,created:false,bookingConfirmed:false as const};
  }
  if(slot.revision!==slotRevision||!slot.available||slot.deliveryAt<=now||new Date(slot.deliveryAt.getTime()+8*3600000).getUTCDay()===6||slot.reserved>=slot.capacity)throw Error('Delivery slot changed, closed or full');
  const claimed=await tx.readyDeliverySlot.updateMany({where:{id:slot.id,shop,revision:slotRevision,reserved:slot.reserved,capacity:slot.capacity,available:true},data:{reserved:{increment:1}}});
  if(claimed.count!==1)throw Error('Delivery slot changed; reload');
  const reservation=await tx.readyDeliverySlotReservation.create({data:{shop,customerGid,slotId,deliveryDraftId,deliveryRevision}});
  return {reservation,created:true,bookingConfirmed:false as const};
 },{timeout:30000});
}

type ReleaseInput={shop:string;customerGid:string;reservationId:string};
export async function releaseReadyDeliveryCapacity(input:ReleaseInput){
 scope(input.shop);
 return db.$transaction(tx=>releaseReadyDeliveryCapacityTx(tx,input),{timeout:30000});
}
export async function releaseReadyDeliveryCapacityTx(tx:Tx,input:ReleaseInput){
 scope(input.shop);
 const {shop,customerGid,reservationId}=input;
 if(!identity(reservationId)||!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid))throw Error('Owned delivery reservation required');
  const old=await tx.readyDeliverySlotReservation.findFirst({where:{id:reservationId,shop,customerGid}});
  if(!old)throw Error('Owned delivery reservation unavailable');
  const slot=await lockSlot(tx,shop,old.slotId),current=await tx.readyDeliverySlotReservation.findUniqueOrThrow({where:{id:old.id}});
  if(current.state==='RELEASED'&&current.releasedAt){
   const visit=await tx.readyDeliveryVisit.findUnique({where:{reservationId:old.id}});
   if(visit&&(visit.shop!==shop||visit.customerGid!==customerGid||visit.state!=='RELEASED'||await tx.readyDeliveryVisitMember.count({where:{shop,visitId:visit.id,state:{not:'RELEASED'}}})))throw Error('Combined visit requires reconciliation');
   return {released:true,replayed:true};
  }
  if(current.state!=='RESERVED'||current.releasedAt||slot.reserved<1)throw Error('Delivery reservation requires reconciliation');
  const visit=await tx.readyDeliveryVisit.findUnique({where:{reservationId:old.id}});
  if(visit){
   const plan=JSON.parse(visit.plan),members=await tx.readyDeliveryVisitMember.findMany({where:{shop,visitId:visit.id}});
   if(visit.shop!==shop||visit.customerGid!==customerGid||visit.slotId!==slot.id||visit.state!=='RESERVED'||!Array.isArray(plan.members)||!plan.members.length||members.length!==plan.members.length||members.some(m=>m.customerGid!==customerGid||m.state!=='RESERVED'||!plan.members.some((p:{draftId:string;revision:number})=>p.draftId===m.deliveryDraftId&&p.revision===m.deliveryRevision)))throw Error('Combined visit requires reconciliation');
   await tx.readyDeliveryVisit.update({where:{id:visit.id},data:{state:'RELEASED'}});
   await tx.readyDeliveryVisitMember.updateMany({where:{shop,visitId:visit.id,state:'RESERVED'},data:{state:'RELEASED'}});
  }
  const changed=await tx.readyDeliverySlotReservation.updateMany({where:{id:old.id,shop,customerGid,state:'RESERVED',releasedAt:null},data:{state:'RELEASED',releasedAt:new Date()}});
  if(changed.count!==1)throw Error('Delivery reservation changed; reload');
  await tx.readyDeliverySlot.update({where:{id:slot.id},data:{reserved:{decrement:1}}});
  return {released:true,replayed:false};
}
