import db from '../db.server';
import {assertShop} from './security.server';
import {bookingHash,readOwnedReadyBookingSources,readOwnedReadyBookingEvidence} from './ready-booking-native.server';
import {readReadyDeliveryProgress} from './ready-delivery-progress.server';
import {readyBookingActive,readyHolidayCalendar,readyBookingSlotAllowed,readyBookingSlotScope} from './ready-booking-policy.server';
import {readReadyBookingCalendar} from './ready-booking-calendar.server';
import {reviewDeliveryChangeNotice} from './ready-series-calendar';
type Admin=Parameters<typeof readOwnedReadyBookingSources>[0];
export function readyBookingReadable(shop:string,customerGid:string){
 assertShop(shop);return process.env.NODE_ENV!=='production'&&process.env.CORE_READY_BOOKING_QA_CUSTOMER===customerGid&&/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)&&/^gid:\/\/shopify\/Order\/\d+$/.test(process.env.CORE_READY_BOOKING_QA_ORDER??'');
}
export async function readCustomerReadyDeliveries(admin:Admin,shop:string,customerGid:string,options:{afterSlot?:string;now?:Date}={}){
 if(!readyBookingReadable(shop,customerGid))return {visible:false as const};
 const orderGid=process.env.CORE_READY_BOOKING_QA_ORDER!,now=options.now??new Date();if(!Number.isFinite(now.getTime()))throw Error('Server time required');
 const owner=await db.operationalLine.findFirst({where:{shop,customerGid,orderGid,businessStream:'ready_series',validationStatus:'VALIDATED'}});
 if(!owner)return {visible:false as const};
 const enabled=readyBookingActive(shop,customerGid),policy=await db.readyDeliveryPolicy.findUnique({where:{shop}});
 const calendar=policy?readyHolidayCalendar(JSON.parse(policy.holidayCalendar)):null;
 let nativePending=false,sources:Awaited<ReturnType<typeof readOwnedReadyBookingSources>>=[];
 let progress:Awaited<ReturnType<typeof readReadyDeliveryProgress>>|null=null;
 try{const evidence=await readOwnedReadyBookingEvidence(admin,shop,customerGid,orderGid);sources=evidence.groups;try{progress=await readReadyDeliveryProgress(admin,shop,customerGid,orderGid,evidence);}catch{/* Partial history never becomes a made-up shipment count. */}}catch{nativePending=true;}
 let prepared:Awaited<ReturnType<typeof readReadyBookingCalendar>>|null=null;
 try{prepared=await readReadyBookingCalendar(db,shop,customerGid,orderGid);}catch{/* Merchant preparation remains explicit; a GET cannot invent dates. */}
 const saved=await db.readyDeliveryBooking.findMany({where:{shop,customerGid,orderGid},orderBy:{createdAt:'asc'},take:101});
 if(saved.length>100)throw Error('Booking coverage requires reconciliation');
 const bookings=[];
 for(const row of saved){
  const visit=row.visitId?await db.readyDeliveryVisit.findFirst({where:{id:row.visitId,shop,customerGid,orderGid,state:'RESERVED'}}):null,slot=visit?await db.readyDeliverySlot.findFirst({where:{id:visit.slotId,shop}}):null;
  const current=sources.find(s=>s.key===row.sourceKey),valid=row.state==='BOOKED'&&bookingHash(JSON.parse(row.nativeProof))===row.nativeHash&&current&&bookingHash(current)===row.nativeHash&&visit&&slot;
  const dispatchState=progress?.rows.find(p=>p.sourceKey===row.sourceKey)?.state??null;
  bookings.push({id:row.id,revision:row.revision,orderName:current?.orderName||'Ready Series',packages:visit?.packageCount??null,deliveryAt:slot?.deliveryAt.toISOString()??null,deliveryEndsAt:slot?.deliveryEndsAt.toISOString()??null,canChange:!!(enabled&&valid&&policy&&reviewDeliveryChangeNotice(now.toISOString(),slot!.deliveryAt.toISOString(),slot!.deliveryAt.toISOString(),policy.noticeHours).selfServiceNoticeMet),reviewRequired:!valid&&dispatchState!=='DISPATCHED',dispatchState});
 }
 const groups=[];
 for(const source of sources){
  if(saved.some(b=>b.sourceKey===source.key))continue;
  const initial=prepared?.sources.some(s=>s.key===source.key&&s.nativeHash===bookingHash(source));
  const dates=source.members.map(m=>prepared?.drafts.find(d=>d.operationalLineId===m.operationalLineId&&d.occurrence===m.occurrence)?.deliveryAt);
  groups.push({sourceKey:source.key,orderGid,orderName:source.orderName,packages:source.members.reduce((sum,m)=>sum+m.packages,0),occurrences:source.members.map(m=>({number:m.occurrence,deliveries:m.deliveries,packages:m.packages})),plannedAt:dates[0]??null,canBook:!!(enabled&&initial&&dates.every(d=>d&&d===dates[0]))});
 }
 const slots=[];let nextSlotCursor:string|null=null;
 if(calendar){
  const after=options.afterSlot?await db.readyDeliverySlot.findFirst({where:{id:options.afterSlot,...readyBookingSlotScope(shop)}}):null;
  if(options.afterSlot&&!after)throw Error('Invalid slot page');
  const rows=await db.readyDeliverySlot.findMany({where:{...readyBookingSlotScope(shop),available:true,deliveryAt:{gt:now},reserved:{lt:db.readyDeliverySlot.fields.capacity},...(after?{OR:[{deliveryAt:{gt:after.deliveryAt}},{deliveryAt:after.deliveryAt,id:{gt:after.id}}]}:{})},orderBy:[{deliveryAt:'asc'},{id:'asc'}],take:26});
  for(const slot of rows.slice(0,25))if(readyBookingSlotAllowed(slot.deliveryAt,calendar))slots.push({id:slot.id,revision:slot.revision,deliveryAt:slot.deliveryAt.toISOString(),deliveryEndsAt:slot.deliveryEndsAt.toISOString(),placesRemaining:slot.capacity-slot.reserved});
  if(rows.length>25)nextSlotCursor=rows[24].id;
 }
 const phone=process.env.CORE_SUPPORT_WHATSAPP_NUMBER;const supportUrl=phone&&/^\d{8,15}$/.test(phone)?'https://wa.me/'+phone:null;
 return {visible:true as const,supportUrl,enabled,nativePending,progress,calendarPrepared:!!prepared,policyReady:!!policy,noticeHours:policy?.noticeHours??null,bookings,groups,slots,nextSlotCursor};
}
