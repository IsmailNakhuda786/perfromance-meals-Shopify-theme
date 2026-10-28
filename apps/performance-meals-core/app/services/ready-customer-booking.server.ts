import db from '../db.server';
import {reviewDeliveryChangeNotice} from './ready-series-calendar';
import {readReadyBookingCalendar} from './ready-booking-calendar.server';
import {assertShop} from './security.server';
import {bookingHash,readOwnedReadyBookingSources,type ReadyBookingSource} from './ready-booking-native.server';
import {readyBookingActive,readyHolidayCalendar,readyBookingSlotAllowed,readyBookingSlotScope} from './ready-booking-policy.server';
import {stageReadyDeliveryRemindersTx,stageReadyDeliveryCatchUpTx} from './ready-delivery-draft.server';
import {reserveReadyDeliveryVisitTx} from './ready-delivery-visit.server';
import {rescheduleReadyDeliveryVisitTx} from './ready-delivery-reschedule.server';

export class ReadyBookingRejected extends Error{}
type Admin=Parameters<typeof readOwnedReadyBookingSources>[0];
type Base={slotId:string;slotRevision:number;requestKey:string};
export type ReadyBookingCommand=Base&({intent:'book';orderGid:string;sourceKey:string}|{intent:'reschedule';bookingId:string;revision:number});
const identity=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_:-]{1,128}$/.test(v);
const positive=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0&&Number(v)<=2147483647;
export function readyBookingCommand(input:unknown):ReadyBookingCommand{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new ReadyBookingRejected('Confirm a delivery and slot');
 const b=input as Record<string,unknown>,keys=b.intent==='book'?['intent','orderGid','sourceKey','slotId','slotRevision','requestKey']:['intent','bookingId','revision','slotId','slotRevision','requestKey'];
 if(Object.keys(b).sort().join(',')!==keys.sort().join(',')||!identity(b.slotId)||!positive(b.slotRevision)||typeof b.requestKey!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(b.requestKey))throw new ReadyBookingRejected('Exact delivery intent and request required');
 const base={slotId:b.slotId,slotRevision:b.slotRevision,requestKey:b.requestKey};
 if(b.intent==='book'&&typeof b.orderGid==='string'&&/^gid:\/\/shopify\/Order\/\d+$/.test(b.orderGid)&&typeof b.sourceKey==='string'&&/^[a-f0-9]{64}$/.test(b.sourceKey))return {...base,intent:'book',orderGid:b.orderGid,sourceKey:b.sourceKey};
 if(b.intent==='reschedule'&&identity(b.bookingId)&&positive(b.revision))return {...base,intent:'reschedule',bookingId:b.bookingId,revision:b.revision};
 throw new ReadyBookingRejected('Exact booking reference required');
}
type Result={bookingId:string;revision:number;deliveryAt:string;deliveryEndsAt:string;packages:number;bookingConfirmed:true;nativeScheduleChanged:false;replayed:boolean};
const requestWhere=(shop:string,customerGid:string,requestKey:string)=>({shop_customerGid_requestKey:{shop,customerGid,requestKey}});
function replayResult(row:{inputHash:string;bookingId:string;result:string},inputHash:string):Result{
 if(row.inputHash!==inputHash)throw new ReadyBookingRejected('This request already describes another change');
 const result=JSON.parse(row.result) as Result;
 if(result.bookingConfirmed!==true||result.nativeScheduleChanged!==false||result.bookingId!==row.bookingId||!identity(result.bookingId)||!positive(result.revision)||!positive(result.packages)||!Number.isFinite(Date.parse(result.deliveryAt))||!Number.isFinite(Date.parse(result.deliveryEndsAt))||Date.parse(result.deliveryEndsAt)<=Date.parse(result.deliveryAt))throw new ReadyBookingRejected('Previous booking result requires review');
 return {...result,replayed:true};
}
export async function readReadyBookingRequest(shop:string,customerGid:string,requestKey:string){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestKey))throw new ReadyBookingRejected('Owned request required');
 const row=await db.readyDeliveryBookingRequest.findUnique({where:requestWhere(shop,customerGid,requestKey)});
 return row?{state:'COMPLETED' as const,result:replayResult(row,row.inputHash)}:{state:'NOT_FOUND' as const};
}

// The customer owns a Core physical delivery booking. Shopify retains its native
// work schedule and paid order. No payment, contract or native mutation is used.
export async function performReadyCustomerBooking(admin:Admin,shop:string,customerGid:string,raw:unknown,options:{now?:Date}={}){
 assertShop(shop);
 if(!readyBookingActive(shop,customerGid))throw new ReadyBookingRejected('Customer delivery booking is not activated');
 const input=readyBookingCommand(raw),inputHash=bookingHash(input),now=options.now??new Date();
 if(!Number.isFinite(now.getTime()))throw new ReadyBookingRejected('Server booking time required');
 const previous=await db.readyDeliveryBookingRequest.findUnique({where:requestWhere(shop,customerGid,input.requestKey)});
 if(previous)return replayResult(previous,inputHash);
 let orderGid:string,sourceKey:string;
 if(input.intent==='book'){orderGid=input.orderGid;sourceKey=input.sourceKey;}
 else{
  const booking=await db.readyDeliveryBooking.findFirst({where:{id:input.bookingId,shop,customerGid,state:'BOOKED'}});
  if(!booking||booking.revision!==input.revision)throw new ReadyBookingRejected('Booking changed; reload your deliveries');
  if(bookingHash(JSON.parse(booking.nativeProof))!==booking.nativeHash)throw new ReadyBookingRejected('Booking proof requires reconciliation');
  const stored=JSON.parse(booking.nativeProof) as ReadyBookingSource;orderGid=stored.orderGid;sourceKey=booking.sourceKey;
 }
 if(process.env.CORE_READY_BOOKING_QA_ORDER!==orderGid)throw new ReadyBookingRejected('Delivery outside the approved booking test');
 const sources=await readOwnedReadyBookingSources(admin,shop,customerGid,orderGid),source=sources.find(s=>s.key===sourceKey);
 if(!source)throw new ReadyBookingRejected('This paid delivery is no longer available for changes');
 const nativeProof=JSON.stringify(source),nativeHash=bookingHash(source),bookingId='ready-booking:'+sourceKey;
 const verifiedUnsentLineIds=new Set(source.members.map(m=>m.operationalLineId));
 try{return await db.$transaction(async tx=>{
  try{
  const policy=await tx.readyDeliveryPolicy.findUnique({where:{shop}});
  if(!policy)throw new ReadyBookingRejected('Delivery calendar requires merchant configuration');
  const calendar=readyHolidayCalendar(JSON.parse(policy.holidayCalendar));
  if(!positive(policy.noticeHours)||policy.noticeHours>8760||(await tx.readyDeliveryPolicy.updateMany({where:{shop,revision:policy.revision},data:{updatedAt:new Date()}})).count!==1)throw new ReadyBookingRejected('Delivery policy changed; reload');
  const duplicate=await tx.readyDeliveryBookingRequest.findUnique({where:requestWhere(shop,customerGid,input.requestKey)});
  if(duplicate)return replayResult(duplicate,inputHash);
  let booking;
  if(input.intent==='book')booking=await tx.readyDeliveryBooking.upsert({where:{id:bookingId},create:{id:bookingId,shop,customerGid,sourceKey,orderGid,nativeProof,nativeHash},update:{updatedAt:new Date()}});
  else{
   const locked=await tx.readyDeliveryBooking.updateMany({where:{id:input.bookingId,shop,customerGid,state:'BOOKED',revision:input.revision},data:{updatedAt:new Date()}});
   if(locked.count!==1)throw new ReadyBookingRejected('Booking changed; reload');booking=await tx.readyDeliveryBooking.findUniqueOrThrow({where:{id:input.bookingId}});
  }
  if(booking.id!==bookingId||booking.shop!==shop||booking.customerGid!==customerGid||booking.sourceKey!==sourceKey||booking.nativeHash!==nativeHash||booking.nativeProof!==nativeProof)throw new ReadyBookingRejected('Original paid delivery/destination changed; Support review required');
  const slot=await tx.readyDeliverySlot.findFirst({where:{id:input.slotId,...readyBookingSlotScope(shop)}});
  if(!slot)throw new ReadyBookingRejected('Delivery slot unavailable');
  let visit;
  const currentVisit=booking.state==='BOOKED'&&booking.visitId?await tx.readyDeliveryVisit.findFirst({where:{id:booking.visitId,shop,customerGid,orderGid,state:'RESERVED'}}):null;
  if(booking.state==='BOOKED'&&!currentVisit)throw new ReadyBookingRejected('Original visit requires reconciliation');
  if(input.intent==='book'&&currentVisit&&currentVisit.slotId!==slot.id)throw new ReadyBookingRejected('This delivery is already booked; use reschedule');
  if(currentVisit&&currentVisit.slotId===slot.id){visit=currentVisit;}else{
   const sameVisit=await tx.readyDeliveryVisit.findFirst({where:{shop,customerGid,orderGid,destinationKey:source.destinationKey,slotId:slot.id,state:'RESERVED'}});
   if(sameVisit)throw new ReadyBookingRejected('Contact Support to combine these deliveries into one visit; no second place was reserved');
   if(!slot.available||slot.reserved>=slot.capacity||slot.revision!==input.slotRevision||slot.deliveryAt<=now)throw new ReadyBookingRejected('Delivery slot changed, closed or full');
   if(!readyBookingSlotAllowed(slot.deliveryAt,calendar))throw new ReadyBookingRejected('Delivery date is closed or outside the verified holiday calendar');
   if(input.intent==='book'){
    if(booking.state!=='PREPARING'||booking.visitId)throw new ReadyBookingRejected('Booking requires reconciliation');
    if((await tx.readyDeliverySlot.updateMany({where:{id:slot.id,shop,revision:input.slotRevision},data:{updatedAt:new Date()}})).count!==1)throw new ReadyBookingRejected('Slot changed; reload');
    const members=[];
    for(const m of source.members){
     const calendar=await readReadyBookingCalendar(tx,shop,customerGid,orderGid);
     if(!calendar.sources.some(s=>s.key===source.key&&s.nativeHash===nativeHash))throw new ReadyBookingRejected('Original calendar/native proof differs');
     const current=await tx.readyDeliveryDraft.findUnique({where:{shop_operationalLineId_occurrence:{shop,operationalLineId:m.operationalLineId,occurrence:m.occurrence}}});
     if(!current||!calendar.drafts.some(d=>d.operationalLineId===m.operationalLineId&&d.occurrence===m.occurrence&&d.deliveryAt===current.deliveryAt.toISOString())||current.revision!==1)throw new ReadyBookingRejected('Original delivery calendar changed; merchant review required');
     const localDate=(at:Date)=>new Date(at.getTime()+8*3600000).toISOString().slice(0,10);
     if(localDate(current.deliveryAt)!==localDate(slot.deliveryAt)&&!reviewDeliveryChangeNotice(now.toISOString(),current.deliveryAt.toISOString(),slot.deliveryAt.toISOString(),policy.noticeHours).selfServiceNoticeMet)throw new ReadyBookingRejected('Contact Support: changing the planned delivery date requires notice');
     const {draft}=await stageReadyDeliveryRemindersTx(tx,{shop,customerGid,operationalLineId:m.operationalLineId,occurrence:m.occurrence,deliveryAt:slot.deliveryAt.toISOString(),expectedRevision:current?.revision??0},{verifiedUnsentLineIds});
     members.push({draftId:draft.id,revision:draft.revision,operationalLineId:m.operationalLineId,occurrence:m.occurrence,packages:m.packages});
    }
    const reserved=await reserveReadyDeliveryVisitTx(tx,{shop,customerGid,orderGid,destinationKey:source.destinationKey,slotId:slot.id,slotRevision:input.slotRevision,deliveryAt:slot.deliveryAt.toISOString(),deliveryEndsAt:slot.deliveryEndsAt.toISOString(),members},now,verifiedUnsentLineIds);
    if(!reserved.created)throw new ReadyBookingRejected('An unconfirmed reservation already exists; Support review required');
    visit=reserved.visit;
    for(const member of members)await stageReadyDeliveryCatchUpTx(tx,{shop,customerGid,draftId:member.draftId,expectedRevision:member.revision,confirmedAt:now.toISOString()},{verifiedUnsentLineIds});
    booking=await tx.readyDeliveryBooking.update({where:{id:booking.id},data:{state:'BOOKED',visitId:visit.id}});
   }else{
    if(!booking.visitId)throw new ReadyBookingRejected('Original booking requires review');
    const moved=await rescheduleReadyDeliveryVisitTx(tx,{shop,customerGid,visitId:booking.visitId,replacementSlotId:slot.id,replacementSlotRevision:input.slotRevision,noticeHours:policy.noticeHours},now,verifiedUnsentLineIds);
    visit=moved.visit;
    const changed=await tx.readyDeliveryBooking.updateMany({where:{id:booking.id,shop,customerGid,revision:input.revision,visitId:booking.visitId},data:{visitId:visit.id,revision:{increment:1}}});
    if(changed.count!==1)throw new ReadyBookingRejected('Booking changed; reload');booking=await tx.readyDeliveryBooking.findUniqueOrThrow({where:{id:booking.id}});
   }
  }
  // A changed/refunded/dispatched native occurrence observed before commit
  // rolls back capacity, revisions, reminders and request receipt together.
  const latest=(await readOwnedReadyBookingSources(admin,shop,customerGid,orderGid)).find(s=>s.key===sourceKey);
  if(!latest||bookingHash(latest)!==nativeHash)throw new ReadyBookingRejected('Native delivery changed during booking; no changes saved');
  const result:Result={bookingId:booking.id,revision:booking.revision,deliveryAt:slot.deliveryAt.toISOString(),deliveryEndsAt:slot.deliveryEndsAt.toISOString(),packages:visit.packageCount,bookingConfirmed:true,nativeScheduleChanged:false,replayed:false};
  await tx.readyDeliveryBookingRequest.create({data:{shop,customerGid,requestKey:input.requestKey,inputHash,bookingId:booking.id,result:JSON.stringify(result)}});
  return result;
  }catch(error){if(error instanceof ReadyBookingRejected)throw error;throw new ReadyBookingRejected('Delivery checks failed; no booking change was committed',{cause:error});}
 },{timeout:60000});}catch(error){
  // A racing request may have committed the same key while this transaction
  // rolled back. Only the identical owned request can return its saved receipt.
  const saved=await db.readyDeliveryBookingRequest.findUnique({where:requestWhere(shop,customerGid,input.requestKey)});
  if(saved)return replayResult(saved,inputHash);throw error;
 }
}
