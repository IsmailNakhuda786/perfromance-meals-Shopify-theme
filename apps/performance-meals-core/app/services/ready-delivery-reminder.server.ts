import {createHash} from 'node:crypto';
import db from '../db.server';
import type {Prisma} from '@prisma/client';
import {assertShop} from './security.server';
import {readyBookingActive} from './ready-booking-policy.server';
import {bookingHash,readOwnedReadyBookingSources} from './ready-booking-native.server';
import {planReadyDeliveryVisit} from './ready-delivery-visit';
import {readyDeliveryNotice} from './ready-delivery-notice';

type Admin=Parameters<typeof readOwnedReadyBookingSources>[0];
type Input={shop:string;customerGid:string;bookingId:string;revision:number;channel:'email'|'whatsapp';hoursBefore:0|24|72};
type Content=Parameters<typeof readyDeliveryNotice>[0];
type Delivery={customerGid:string;channel:'email'|'whatsapp';packages:number;idempotencyKey:string;notice:Content};
export type ReadyDeliveryNoticeGateway={send:(delivery:Delivery)=>Promise<{reference:string}>};
const KIND='READY_DELIVERY_NOTICE';
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const key=(i:Input)=>'delivery-notice:'+digest(i);
function scope(i:Input){
 assertShop(i.shop);
 if(Object.keys(i).sort().join(',')!==['shop','customerGid','bookingId','revision','channel','hoursBefore'].sort().join(','))throw Error('Exact server notice command required');
 if(!readyBookingActive(i.shop,i.customerGid)||process.env.CORE_READY_DELIVERY_NOTICES_ENABLED!=='true'||!/^[-a-zA-Z0-9_:]{1,128}$/.test(i.bookingId)||!Number.isSafeInteger(i.revision)||i.revision<1||!['email','whatsapp'].includes(i.channel)||![0,24,72].includes(i.hoursBefore))throw Error('Isolated delivery notices are not activated');
}
type Prepared={version:1;input:Input;delivery:Delivery;memberIds:string[];receipt:string|null};
function saved(value:string|null,i:Input){
 if(!value)throw Error('Delivery notice receipt requires review');const p=JSON.parse(value) as Prepared;
 if(p.version!==1||JSON.stringify(p.input)!==JSON.stringify(i)||p.delivery.customerGid!==i.customerGid||p.delivery.channel!==i.channel||p.delivery.idempotencyKey!==digest(i)||!Array.isArray(p.memberIds)||!p.memberIds.length)throw Error('Saved delivery notice differs');readyDeliveryNotice(p.delivery.notice);return p;
}
async function verify(tx:Prisma.TransactionClient,i:Input,source:Awaited<ReturnType<typeof readOwnedReadyBookingSources>>[number],now:Date){
 const policy=await tx.readyDeliveryPolicy.findUniqueOrThrow({where:{shop:i.shop}});
 // Use the same policy→booking→slot→draft lock order as customer changes.
 if((await tx.readyDeliveryPolicy.updateMany({where:{shop:i.shop,revision:policy.revision},data:{updatedAt:new Date()}})).count!==1)throw Error('Delivery policy changed');
 const locked=await tx.readyDeliveryBooking.updateMany({where:{id:i.bookingId,shop:i.shop,customerGid:i.customerGid,state:'BOOKED',revision:i.revision,orderGid:process.env.CORE_READY_BOOKING_QA_ORDER},data:{updatedAt:new Date()}});if(locked.count!==1)throw Error('Current confirmed booking required');
 const booking=await tx.readyDeliveryBooking.findUniqueOrThrow({where:{id:i.bookingId}});
 if(!booking.visitId||booking.sourceKey!==source.key||booking.nativeHash!==bookingHash(source)||booking.nativeProof!==JSON.stringify(source))throw Error('Current native delivery proof differs');
 const visit=await tx.readyDeliveryVisit.findFirstOrThrow({where:{id:booking.visitId,shop:i.shop,customerGid:i.customerGid,orderGid:booking.orderGid,state:'RESERVED'}}),plan=planReadyDeliveryVisit(JSON.parse(visit.plan));
 if(visit.plan!==JSON.stringify(plan)||visit.destinationKey!==source.destinationKey||visit.slotId!==plan.slotId||visit.packageCount!==plan.packageCount||plan.orderGid!==booking.orderGid||plan.shop!==i.shop||plan.customerGid!==i.customerGid||plan.members.length!==source.members.length)throw Error('Confirmed visit differs');
 if((await tx.readyDeliverySlot.updateMany({where:{id:visit.slotId,shop:i.shop},data:{updatedAt:new Date()}})).count!==1)throw Error('Delivery slot missing');
 const slot=await tx.readyDeliverySlot.findUniqueOrThrow({where:{id:visit.slotId}}),reservation=await tx.readyDeliverySlotReservation.findFirst({where:{id:visit.reservationId,shop:i.shop,customerGid:i.customerGid,slotId:slot.id,state:'RESERVED',releasedAt:null}});
 if(!reservation||slot.deliveryAt.toISOString()!==plan.deliveryAt||slot.deliveryEndsAt.toISOString()!==plan.deliveryEndsAt||slot.deliveryAt<=now)throw Error('Upcoming reserved delivery required');
 const members=await tx.readyDeliveryVisitMember.findMany({where:{shop:i.shop,visitId:visit.id}});if(members.length!==plan.members.length)throw Error('Complete visit membership required');
 const reminders=[];
 for(const member of plan.members){
  if(!source.members.some(m=>m.operationalLineId===member.operationalLineId&&m.occurrence===member.occurrence&&m.packages===member.packages)||!members.some(m=>m.deliveryDraftId===member.draftId&&m.deliveryRevision===member.revision&&m.customerGid===i.customerGid&&m.state==='RESERVED'))throw Error('Paid delivery member changed');
  if((await tx.readyDeliveryDraft.updateMany({where:{id:member.draftId,shop:i.shop,customerGid:i.customerGid,revision:member.revision,state:'DRAFT',deliveryAt:slot.deliveryAt},data:{updatedAt:new Date()}})).count!==1)throw Error('Delivery draft changed');
  const reminder=await tx.readyDeliveryReminder.findUnique({where:{shop_deliveryDraftId_deliveryRevision_channel_hoursBefore:{shop:i.shop,deliveryDraftId:member.draftId,deliveryRevision:member.revision,channel:i.channel,hoursBefore:i.hoursBefore}}});
  if(!reminder||reminder.customerGid!==i.customerGid||reminder.state!=='DRAFT'||reminder.scheduledAt>now||reminder.deliveryAt.getTime()!==slot.deliveryAt.getTime())throw Error('Current due reminder required');reminders.push(reminder.id);
 }
 const reference=source.members[0],notice:Content={orderReference:source.orderName,occurrence:reference.occurrence,deliveries:reference.deliveries,packageDeliveries:source.members.map(m=>({occurrence:m.occurrence,deliveries:m.deliveries,quantity:m.packages})),deliveryAt:plan.deliveryAt,deliveryEndsAt:plan.deliveryEndsAt,hoursBefore:i.hoursBefore,noticeHours:policy.noticeHours,shopDomain:i.shop,accountShopId:process.env.CORE_ACCOUNT_SHOP_ID??'',accountUrl:process.env.CORE_CUSTOMER_ACCOUNT_URL??'',whatsappNumber:process.env.CORE_SUPPORT_WHATSAPP_NUMBER??''};
 readyDeliveryNotice(notice);
 return {version:1 as const,input:i,delivery:{customerGid:i.customerGid,channel:i.channel,packages:plan.packageCount,idempotencyKey:digest(i),notice},memberIds:reminders,receipt:null};
}
async function native(admin:Admin,i:Input){const booking=await db.readyDeliveryBooking.findFirstOrThrow({where:{id:i.bookingId,shop:i.shop,customerGid:i.customerGid,orderGid:process.env.CORE_READY_BOOKING_QA_ORDER}});const sources=await readOwnedReadyBookingSources(admin,i.shop,i.customerGid,booking.orderGid),source=sources.find(s=>s.key===booking.sourceKey);if(!source)throw Error('Fresh undispatched native visit required');return source;}
// A durable claim precedes the external request. A timeout or unknown database
// commit is never retried automatically. One receipt covers all packages in the
// same visit; drafts alone can never generate a message.
export async function sendReadyDeliveryNotice(admin:Admin,input:Input,gateway:ReadyDeliveryNoticeGateway,options:{now?:Date}={}){
 scope(input);const i:Input={shop:input.shop,customerGid:input.customerGid,bookingId:input.bookingId,revision:input.revision,channel:input.channel,hoursBefore:input.hoursBefore};const now=options.now??new Date();if(!Number.isFinite(now.getTime()))throw Error('Verified reminder time required');
 const id=key(i),previous=await db.planOperation.findUnique({where:{id}});
 if(previous){const p=saved(previous.productionReference,i);if(previous.shop!==i.shop||previous.kind!==KIND||previous.cycleReference!==i.bookingId)throw Error('Saved notice scope differs');return {state:previous.state,reference:p.receipt,replayed:true};}
 const source=await native(admin,i);
 try{await db.$transaction(async tx=>{const p=await verify(tx,i,source,now);await tx.planOperation.create({data:{id,shop:i.shop,selectionId:'customer:'+i.customerGid.split('/').at(-1),kind:KIND,state:'DELIVERING',cycleReference:i.bookingId,productionReference:JSON.stringify(p)}});},{timeout:30000});}
 catch(error){if((error as{code?:string}).code==='P2002')return {state:'HELD',reference:null,replayed:true};throw error;}
 let reference:string|null=null;
 try{
  const current=await native(admin,i);
  await db.$transaction(async tx=>{
   const p=await verify(tx,i,current,now),row=await tx.planOperation.findUniqueOrThrow({where:{id}});
   if(row.state!=='DELIVERING'||JSON.stringify(saved(row.productionReference,i))!==JSON.stringify(p))throw Error('Notice changed before sending');
   // Holding the booking locks prevents a customer reschedule between this
   // final current-revision check and provider acceptance.
   const receipt=await gateway.send(p.delivery);
   if(typeof receipt?.reference!=='string'||!/^[-a-zA-Z0-9:_.]{1,200}$/.test(receipt.reference))throw Error('Provider acceptance unconfirmed');reference=receipt.reference;
   const updated=await tx.planOperation.updateMany({where:{id,shop:i.shop,state:'DELIVERING',productionReference:row.productionReference},data:{state:'SENT',productionReference:JSON.stringify({...p,receipt:reference})}});if(updated.count!==1)throw Error('Notice receipt commit unconfirmed');
   const marked=await tx.readyDeliveryReminder.updateMany({where:{shop:i.shop,id:{in:p.memberIds},state:'DRAFT'},data:{state:'SENT'}});if(marked.count!==p.memberIds.length)throw Error('Reminder receipt coverage differs');
  },{timeout:30000});
  return {state:'SENT',reference,replayed:false};
 }catch{
  // The request might have reached the provider. Keep its receipt if known and
  // hold the notice even beyond the provider's idempotency retention window.
  const row=await db.planOperation.findUnique({where:{id}});
  if(row?.state==='DELIVERING'){const p=saved(row.productionReference,i);await db.planOperation.updateMany({where:{id,shop:i.shop,state:'DELIVERING',productionReference:row.productionReference},data:{state:'UNKNOWN',productionReference:JSON.stringify({...p,receipt:reference})}});}
  return {state:row?.state==='SENT'?'SENT':'UNKNOWN',reference,replayed:false};
 }
}
