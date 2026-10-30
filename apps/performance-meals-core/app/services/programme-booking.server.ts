import {createHash} from 'node:crypto';
import type {Prisma} from '@prisma/client';
import db from '../db.server';
import {assertShop} from './security.server';
import {readyHolidayCalendar,readyBookingSlotAllowed} from './ready-booking-policy.server';
import {verifiedProgrammeBookingBatch} from './programme-deliveries.server';

export class ProgrammeBookingRejected extends Error {}
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
type Tx=Prisma.TransactionClient;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const ident=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
const owner=(v:string)=>/^gid:\/\/shopify\/Customer\/\d+$/.test(v);
export const programmeBookingEnabled=()=>process.env.NODE_ENV!=='production'&&process.env.MEAL_PLAN_BOOKING_ENABLED==='true'&&process.env.MEAL_PLAN_BOOKING_STORAGE_READY==='true'&&process.env.SIXTY_DAY_BATCHES_ENABLED==='true'&&process.env.SIXTY_DAY_DISH_ALLOCATION_ENABLED==='true';
function scope(shop:string){assertShop(shop);if(!programmeBookingEnabled())throw new ProgrammeBookingRejected('Meal Plan booking is not activated');}
function time(v:string){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,19)!==v.slice(0,19))throw new ProgrammeBookingRejected('Exact delivery time required');return new Date(v);}
function localDay(v:Date){return new Date(v.getTime()+8*3600000).toISOString().slice(0,10);}
function nowValid(now:Date){if(!Number.isFinite(now.getTime()))throw new ProgrammeBookingRejected('Valid request time required');}
async function policy(tx:Tx,shop:string){const p=await tx.readyDeliveryPolicy.findUnique({where:{shop}});if(!p||!Number.isSafeInteger(p.noticeHours)||p.noticeHours<1||p.noticeHours>8760)throw new ProgrammeBookingRejected('Confirmed merchant delivery policy required');return {...p,calendar:readyHolidayCalendar(JSON.parse(p.holidayCalendar))};}
async function lockSlots(tx:Tx,shop:string,ids:string[]){
 const slots=[];
 for(const id of [...new Set(ids)].sort()){
  if((await tx.mealPlanDeliverySlot.updateMany({where:{id,shop},data:{updatedAt:new Date()}})).count!==1)throw new ProgrammeBookingRejected('Owned Meal Plan slot unavailable');
  const s=await tx.mealPlanDeliverySlot.findFirstOrThrow({where:{id,shop}});
  const count=await tx.mealPlanDeliveryVisit.count({where:{shop,slotId:id,state:{in:['BOOKED','DISPATCHED']}}});
  if(s.reserved!==count||s.reserved<0||s.reserved>s.capacity)throw new ProgrammeBookingRejected('Meal Plan capacity requires reconciliation');
  slots.push(s);
 }
 return slots;
}
function available(s:{deliveryAt:Date;available:boolean;revision:number},p:Awaited<ReturnType<typeof policy>>,rev:number,now:Date){if(s.revision!==rev||!s.available||s.deliveryAt<=now||!readyBookingSlotAllowed(s.deliveryAt,p.calendar))throw new ProgrammeBookingRejected('Delivery slot changed, closed or unavailable');}
export async function configureMealPlanSlot(input:{shop:string;slotKey:string;deliveryAt:string;deliveryEndsAt:string;capacity:number;available:boolean;expectedRevision:number}){
 scope(input.shop);const a=time(input.deliveryAt),b=time(input.deliveryEndsAt);
 if(!ident(input.slotKey)||b<=a||localDay(a)!==localDay(b)||!Number.isSafeInteger(input.capacity)||input.capacity<1||input.capacity>2147483647||typeof input.available!=='boolean'||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)throw new ProgrammeBookingRejected('Explicit same-day slot and capacity required');
 return db.$transaction(async tx=>{
  const p=await policy(tx,input.shop);if(input.available&&!readyBookingSlotAllowed(a,p.calendar))throw new ProgrammeBookingRejected('Delivery date closed or holiday coverage unavailable');
  let s=await tx.mealPlanDeliverySlot.findUnique({where:{shop_slotKey:{shop:input.shop,slotKey:input.slotKey}}});
  if(!s){if(input.expectedRevision!==0)throw new ProgrammeBookingRejected('Slot changed; reload');return tx.mealPlanDeliverySlot.create({data:{shop:input.shop,slotKey:input.slotKey,deliveryAt:a,deliveryEndsAt:b,capacity:input.capacity,available:input.available}});}
  [s]=await lockSlots(tx,input.shop,[s.id]);
  const same=s.deliveryAt.getTime()===a.getTime()&&s.deliveryEndsAt.getTime()===b.getTime()&&s.capacity===input.capacity&&s.available===input.available;
  if(same&&(s.revision===input.expectedRevision||s.revision===1&&input.expectedRevision===0))return s;
  if(s.revision!==input.expectedRevision)throw new ProgrammeBookingRejected('Slot changed; reload');
  if(s.reserved>input.capacity||s.reserved>0&&(s.deliveryAt.getTime()!==a.getTime()||s.deliveryEndsAt.getTime()!==b.getTime()))throw new ProgrammeBookingRejected('Existing visits must be preserved');
  await tx.mealPlanDeliverySlot.update({where:{id:s.id},data:{deliveryAt:a,deliveryEndsAt:b,capacity:input.capacity,available:input.available,revision:{increment:1}}});
  return tx.mealPlanDeliverySlot.findUniqueOrThrow({where:{id:s.id}});
 },{timeout:30000});
}
export const PROGRAMME_BOOKING_DESTINATION_QUERY=`#graphql
query CoreProgrammeBookingDestination($id:ID!){
 shop{myshopifyDomain}
 order(id:$id){id test cancelledAt displayFinancialStatus customer{id}
 shippingAddress{address1 address2 city company countryCodeV2 province zip}
 }
}`;
async function destination(admin:Admin,p:{shop:string;customerGid:string;orderGid:string|null}){
 const response=await admin.graphql(PROGRAMME_BOOKING_DESTINATION_QUERY,{variables:{id:p.orderGid}}),body=await response.json(),o=body.data?.order,a=o?.shippingAddress;
 if(!response.ok||body.errors||body.data?.shop?.myshopifyDomain!==p.shop||o?.id!==p.orderGid||o?.customer?.id!==p.customerGid||o?.test!==true||o?.cancelledAt!==null||o?.displayFinancialStatus!=='PAID'||a?.countryCodeV2!=='SG'||typeof a.address1!=='string'||!a.address1.trim()||!/^\d{6}$/.test(a.zip))throw new ProgrammeBookingRejected('Verified Singapore delivery destination unavailable');
 const fields=['address1','address2','city','company','countryCodeV2','province','zip'].map(k=>{const v=a[k]??'';if(typeof v!=='string'||v.length>512)throw new ProgrammeBookingRejected('Delivery address requires review');return v.trim();});
 return hash([p.shop,p.customerGid,p.orderGid,fields]);
}
type Proof=Awaited<ReturnType<typeof verifiedProgrammeBookingBatch>>;
async function lockProof(tx:Tx,e:Proof){
 const p=e.programme;
 const changed=await tx.planOperation.updateMany({where:{id:e.parent.id,shop:p.shop,selectionId:p.id,state:'ACTIVE',productionReference:e.parent.productionReference},data:{updatedAt:new Date()}});
 if(changed.count!==1)throw new ProgrammeBookingRejected('Original delivery basis changed');
 const selection=await tx.mealPlanSelection.updateMany({where:{id:p.id,shop:p.shop,customerGid:p.customerGid,status:'ORDERED',selectionHash:p.selectionHash,orderGid:p.orderGid,orderLineGid:p.orderLineGid,entitlement:p.entitlement,startsOn:p.startsOn,endsOn:p.endsOn,programmeGid:p.programmeGid,variantGid:p.variantGid,selections:p.selections},data:{updatedAt:new Date()}});
 if(selection.count!==1)throw new ProgrammeBookingRejected('Original programme changed');
 const b=await tx.planOperation.findFirst({where:{id:e.row.id,shop:p.shop,selectionId:p.id,state:'PLANNED',productionReference:e.row.productionReference}});
 if(!b)throw new ProgrammeBookingRejected('Batch changed; reload');
 // Menu writers use the same selection lock. Re-check the committed revision
 // frontier after waiting, rather than accepting an earlier external snapshot.
 const revisions=await tx.mealPlanMenuRevision.findMany({where:{shop:p.shop,selectionId:p.id,state:'SAVED'},orderBy:[{block:'asc'},{revision:'desc'}]});
 return revisions;
}
async function evidence(admin:Admin,shop:string,selectionId:string,batchId:string,customerGid:string){
 const menus=await db.mealPlanMenuRevision.findMany({where:{shop,selectionId,state:'SAVED'},orderBy:[{block:'asc'},{revision:'desc'}]});
 const e=await verifiedProgrammeBookingBatch(admin,shop,selectionId,batchId);if(e.programme.customerGid!==customerGid)throw new ProgrammeBookingRejected('Owned programme required');
 return {...e,destinationKey:await destination(admin,e.programme),menus};
}
function menuFence(revisions:unknown,e:{menus:unknown}){if(JSON.stringify(revisions)!==JSON.stringify(e.menus))throw new ProgrammeBookingRejected('Saved menu changed; reload booking');}
type Request={shop:string;customerGid:string;requestKey:string};
function request(input:Request,now:Date){scope(input.shop);nowValid(now);if(!owner(input.customerGid)||!ident(input.requestKey))throw new ProgrammeBookingRejected('Owned booking and unique request required');}
async function replay(tx:Tx,input:Request,inputHash:string){const old=await tx.programmeBookingRequest.findUnique({where:{shop_customerGid_requestKey:{shop:input.shop,customerGid:input.customerGid,requestKey:input.requestKey}}});if(!old)return null;if(old.inputHash!==inputHash)throw new ProgrammeBookingRejected('Request key already describes another action');return {...JSON.parse(old.result),replayed:true};}
async function receipt(tx:Tx,input:Request,inputHash:string,result:{bookingId?:string;visitId:string;revision:number;deliveryAt:string;deliveryEndsAt:string}){await tx.programmeBookingRequest.create({data:{shop:input.shop,customerGid:input.customerGid,requestKey:input.requestKey,inputHash,result:JSON.stringify(result)}});return {...result,replayed:false};}
// Staff-only initial scheduling. Route must authenticate the merchant/operator;
// this server-only API never accepts purchase identity from customer form data.
export async function bookProgrammeBatch(admin:Admin,input:Request&{selectionId:string;batchId:string;slotId:string;slotRevision:number},now=new Date()){
 request(input,now);if(!ident(input.slotId)||!Number.isSafeInteger(input.slotRevision)||input.slotRevision<1)throw new ProgrammeBookingRejected('Exact slot revision required');
 const inputHash=hash(['book',input.selectionId,input.batchId,input.slotId,input.slotRevision]);
 const prior=await replay(db as unknown as Tx,input,inputHash);if(prior)return prior;
 const e=await evidence(admin,input.shop,input.selectionId,input.batchId,input.customerGid);
 return db.$transaction(async tx=>{
  menuFence(await lockProof(tx,e),e);const [s]=await lockSlots(tx,input.shop,[input.slotId]);
  const again=await replay(tx,input,inputHash);if(again)return again;
  const p=await policy(tx,input.shop);available(s,p,input.slotRevision,now);
  if(await tx.programmeDeliveryBooking.findUnique({where:{shop_batchId:{shop:input.shop,batchId:input.batchId}}}))throw new ProgrammeBookingRejected('Batch already booked; use its current visit');
  const candidates=await tx.mealPlanDeliveryVisit.findMany({where:{shop:input.shop,customerGid:input.customerGid,orderGid:e.programme.orderGid!,destinationKey:e.destinationKey,slotId:s.id,state:'BOOKED'},take:2});
  if(candidates.length>1)throw new ProgrammeBookingRejected('Combined visit requires reconciliation');
  let visit=candidates[0];
  if(visit){
   const sent=await tx.programmeDeliveryBooking.count({where:{shop:input.shop,visitId:visit.id,state:'DISPATCHED'}});if(sent)throw new ProgrammeBookingRejected('Dispatched visit cannot receive new batches');
   visit=await tx.mealPlanDeliveryVisit.update({where:{id:visit.id},data:{revision:{increment:1}}});
  }else{
   if(s.reserved>=s.capacity)throw new ProgrammeBookingRejected('Meal Plan delivery slot is full');
   await tx.mealPlanDeliverySlot.update({where:{id:s.id},data:{reserved:{increment:1}}});
   visit=await tx.mealPlanDeliveryVisit.create({data:{shop:input.shop,customerGid:input.customerGid,orderGid:e.programme.orderGid!,destinationKey:e.destinationKey,slotId:s.id}});
  }
  const booking=await tx.programmeDeliveryBooking.create({data:{shop:input.shop,customerGid:input.customerGid,orderGid:e.programme.orderGid!,selectionId:input.selectionId,batchId:input.batchId,batchHash:e.batchHash,visitId:visit.id}});
  return receipt(tx,input,inputHash,{bookingId:booking.id,visitId:visit.id,revision:visit.revision,deliveryAt:s.deliveryAt.toISOString(),deliveryEndsAt:s.deliveryEndsAt.toISOString()});
 },{timeout:30000});
}
export async function rescheduleProgrammeVisit(admin:Admin,input:Request&{visitId:string;visitRevision:number;slotId:string;slotRevision:number},now=new Date()){
 request(input,now);if(!ident(input.visitId)||!ident(input.slotId)||!Number.isSafeInteger(input.visitRevision)||input.visitRevision<1||!Number.isSafeInteger(input.slotRevision)||input.slotRevision<1)throw new ProgrammeBookingRejected('Exact visit and slot revisions required');
 const inputHash=hash(['move',input.visitId,input.visitRevision,input.slotId,input.slotRevision]);const prior=await replay(db as unknown as Tx,input,inputHash);if(prior)return prior;
 const old=await db.mealPlanDeliveryVisit.findFirst({where:{id:input.visitId,shop:input.shop,customerGid:input.customerGid,state:'BOOKED',revision:input.visitRevision}});if(!old)throw new ProgrammeBookingRejected('Owned unsent visit changed');
 const members=await db.programmeDeliveryBooking.findMany({where:{shop:input.shop,visitId:old.id,state:{not:'CANCELLED'}},orderBy:{id:'asc'}});if(!members.length||members.length>250||members.some(m=>m.state!=='BOOKED'||m.customerGid!==input.customerGid))throw new ProgrammeBookingRejected('Whole unsent visit required');
 const proofs:Awaited<ReturnType<typeof evidence>>[]=[];for(const m of members)proofs.push(await evidence(admin,input.shop,m.selectionId,m.batchId,input.customerGid));
 if(proofs.some(e=>e.destinationKey!==old.destinationKey||e.programme.orderGid!==old.orderGid))throw new ProgrammeBookingRejected('Delivery destination changed; Support review required');
 return db.$transaction(async tx=>{
  for(const e of [...proofs].sort((a,b)=>a.programme.id.localeCompare(b.programme.id)))menuFence(await lockProof(tx,e),e);
  const slots=await lockSlots(tx,input.shop,[old.slotId,input.slotId]);const again=await replay(tx,input,inputHash);if(again)return again;
  const current=await tx.mealPlanDeliveryVisit.findUniqueOrThrow({where:{id:old.id}}),live=await tx.programmeDeliveryBooking.findMany({where:{shop:input.shop,visitId:old.id,state:{not:'CANCELLED'}},orderBy:{id:'asc'}});
  if(current.state!=='BOOKED'||current.revision!==input.visitRevision||current.slotId!==old.slotId||JSON.stringify(live)!==JSON.stringify(members)||live.some((m,i)=>m.batchHash!==proofs[i].batchHash))throw new ProgrammeBookingRejected('Whole visit changed; reload');
  const source=slots.find(s=>s.id===old.slotId)!,target=slots.find(s=>s.id===input.slotId)!,p=await policy(tx,input.shop),notice=p.noticeHours*3600000;
  available(target,p,input.slotRevision,now);
  if(source.deliveryAt.getTime()-now.getTime()<notice||target.deliveryAt.getTime()-now.getTime()<notice)throw new ProgrammeBookingRejected('Change is inside the notice period; contact Support');
  if(source.id===target.id)throw new ProgrammeBookingRejected('Choose a different delivery slot');
  // Never merge into an existing visit implicitly. The customer is moving this
  // whole visit, preserving its members and avoiding hidden capacity changes.
  if(await tx.mealPlanDeliveryVisit.count({where:{shop:input.shop,customerGid:input.customerGid,orderGid:old.orderGid,destinationKey:old.destinationKey,slotId:target.id,state:{in:['BOOKED','DISPATCHED']}}}))throw new ProgrammeBookingRejected('Another visit already uses this slot; contact Support to combine');
  if(target.reserved>=target.capacity)throw new ProgrammeBookingRejected('Meal Plan delivery slot is full');
  await tx.mealPlanDeliverySlot.update({where:{id:source.id},data:{reserved:{decrement:1}}});await tx.mealPlanDeliverySlot.update({where:{id:target.id},data:{reserved:{increment:1}}});
  const moved=await tx.mealPlanDeliveryVisit.update({where:{id:old.id},data:{slotId:target.id,revision:{increment:1}}});
  return receipt(tx,input,inputHash,{visitId:moved.id,revision:moved.revision,deliveryAt:target.deliveryAt.toISOString(),deliveryEndsAt:target.deliveryEndsAt.toISOString()});
 },{timeout:30000});
}
// Authenticated customer/merchant reads only. No address, source-menu payload,
// operator identity or payment details leave this response.
export async function readProgrammeBookings(shop:string,customerGid:string,selectionId:string,options:{afterSlot?:string;now?:Date}={}){
 scope(shop);if(!owner(customerGid))throw new ProgrammeBookingRejected('Customer sign-in required');const now=options.now??new Date();nowValid(now);
 const p=await db.mealPlanSelection.findFirst({where:{id:selectionId,shop,customerGid,status:'ORDERED',businessStream:'meal_plan',sellingPlanGid:null,contractGid:null}});if(!p)throw new ProgrammeBookingRejected('Owned programme unavailable');
 const bookings=await db.programmeDeliveryBooking.findMany({where:{shop,customerGid,selectionId},take:251,orderBy:{createdAt:'asc'}});if(bookings.length>250)throw new ProgrammeBookingRejected('Programme booking history requires review');
 const visits=[];
 for(const visitId of [...new Set(bookings.map(b=>b.visitId))]){
  const v=await db.mealPlanDeliveryVisit.findFirst({where:{id:visitId,shop,customerGid,orderGid:p.orderGid!}}),s=v?await db.mealPlanDeliverySlot.findFirst({where:{id:v.slotId,shop}}):null;
  if(!v||!s)throw new ProgrammeBookingRejected('Owned booking evidence unavailable');
  const members=await db.programmeDeliveryBooking.findMany({where:{shop,visitId:v.id},take:251});
  if(!members.length||members.length>250||members.some(m=>m.customerGid!==customerGid||m.orderGid!==p.orderGid))throw new ProgrammeBookingRejected('Combined visit requires review');
  visits.push({id:v.id,revision:v.revision,state:v.state,deliveryAt:s.deliveryAt.toISOString(),deliveryEndsAt:s.deliveryEndsAt.toISOString(),batchIds:bookings.filter(b=>b.visitId===v.id).map(b=>b.batchId),combinedBatchCount:members.filter(m=>m.state!=='CANCELLED').length,canReschedule:v.state==='BOOKED'&&members.filter(m=>m.state!=='CANCELLED').every(m=>m.state==='BOOKED')});
 }
 const pol=await policy(db as unknown as Tx,shop),cursor=options.afterSlot?await db.mealPlanDeliverySlot.findFirst({where:{id:options.afterSlot,shop}}):null;
 if(options.afterSlot&&!cursor)throw new ProgrammeBookingRejected('Owned slot cursor required');
 const slots=await db.mealPlanDeliverySlot.findMany({where:{shop,available:true,deliveryAt:{gt:now},...(cursor?{OR:[{deliveryAt:{gt:cursor.deliveryAt}},{deliveryAt:cursor.deliveryAt,id:{gt:cursor.id}}]}:{})},orderBy:[{deliveryAt:'asc'},{id:'asc'}],take:26});
 const page=slots.slice(0,25),notice=pol.noticeHours*3600000;
 return {visible:true,noticeHours:pol.noticeHours,visits:visits.map(v=>({...v,canReschedule:v.canReschedule&&Date.parse(v.deliveryAt)-now.getTime()>=notice})),slots:page.filter(s=>readyBookingSlotAllowed(s.deliveryAt,pol.calendar)&&s.reserved<s.capacity).map(s=>({id:s.id,revision:s.revision,deliveryAt:s.deliveryAt.toISOString(),deliveryEndsAt:s.deliveryEndsAt.toISOString(),canReplace:s.deliveryAt.getTime()-now.getTime()>=notice})),nextSlotCursor:slots.length>25?page.at(-1)!.id:null};
}
export function programmeBookingCustomerActive(shop:string,customerGid:string){assertShop(shop);return programmeBookingEnabled()&&owner(customerGid)&&process.env.MEAL_PLAN_BOOKING_QA_CUSTOMER===customerGid;}
export function programmeRescheduleCommand(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ProgrammeBookingRejected('Choose an owned visit and replacement slot');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).sort().join(',')!=='requestKey,slotId,slotRevision,visitId,visitRevision'||!ident(v.requestKey)||!ident(v.visitId)||!ident(v.slotId)||!Number.isSafeInteger(v.visitRevision)||(v.visitRevision as number)<1||!Number.isSafeInteger(v.slotRevision)||(v.slotRevision as number)<1)throw new ProgrammeBookingRejected('Exact visit and slot revisions required');
 return v as {requestKey:string;visitId:string;visitRevision:number;slotId:string;slotRevision:number};
}

export async function readProgrammeBookingRequest(shop:string,customerGid:string,requestKey:string){
 scope(shop);if(!owner(customerGid)||!ident(requestKey))throw new ProgrammeBookingRejected('Owned request key required');
 const row=await db.programmeBookingRequest.findUnique({where:{shop_customerGid_requestKey:{shop,customerGid,requestKey}}});
 return row?{state:'COMPLETED' as const,result:{...JSON.parse(row.result),replayed:true}}:{state:'NOT_FOUND' as const};
}
