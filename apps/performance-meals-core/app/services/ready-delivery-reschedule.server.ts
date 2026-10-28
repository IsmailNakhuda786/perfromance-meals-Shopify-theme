import db from '../db.server';
import type {Prisma} from '@prisma/client';
import {assertShop} from './security.server';
import {planReadyDeliveryVisit} from './ready-delivery-visit';
import {reserveReadyDeliveryVisitTx} from './ready-delivery-visit.server';
import {releaseReadyDeliveryCapacityTx} from './ready-delivery-capacity.server';
import {stageReadyDeliveryRemindersTx} from './ready-delivery-draft.server';
import {reviewDeliveryChangeNotice} from './ready-series-calendar';

type Input={shop:string;customerGid:string;visitId:string;replacementSlotId:string;replacementSlotRevision:number;noticeHours:number};
const identity=(v:unknown)=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
// Internal development preparation only. No route exposes this operation, no
// native fulfilment or billing mutation occurs and bookingConfirmed stays false.
// A future caller must authenticate ownership, supply merchant notice policy,
// and verify current native dispatch/destination before confirming any booking.
export async function rescheduleReadyDeliveryVisit(input:Input,options:{now?:Date}={}){
 return db.$transaction(tx=>rescheduleReadyDeliveryVisitTx(tx,input,options.now??new Date()),{timeout:30000});
}
export async function rescheduleReadyDeliveryVisitTx(tx:Prisma.TransactionClient,input:Input,now:Date,verifiedUnsentLineIds:ReadonlySet<string>=new Set()){
 const {shop,customerGid,visitId,replacementSlotId,replacementSlotRevision,noticeHours}=input;
 assertShop(shop);
 if(process.env.NODE_ENV==='production'||process.env.READY_DELIVERY_CAPACITY_ENABLED!=='true')throw Error('Delivery capacity management is not activated');

 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!identity(visitId)||!identity(replacementSlotId)||!Number.isSafeInteger(replacementSlotRevision)||replacementSlotRevision<1||!Number.isSafeInteger(noticeHours)||noticeHours<1||noticeHours>8760||!Number.isFinite(now.getTime()))throw Error('Owned visit, merchant notice policy and replacement revision required');

  const initial=await tx.readyDeliveryVisit.findFirst({where:{id:visitId,shop,customerGid}});
  if(!initial||initial.slotId===replacementSlotId)throw Error('Distinct owned replacement slot required');
  // All slot locks precede draft locks, in a stable order for crossing moves.
  for(const id of [initial.slotId,replacementSlotId].sort()){
   if((await tx.readyDeliverySlot.updateMany({where:{id,shop},data:{updatedAt:new Date()}})).count!==1)throw Error('Delivery slot unavailable');
   const locked=await tx.readyDeliverySlot.findUniqueOrThrow({where:{id}}),count=await tx.readyDeliverySlotReservation.count({where:{shop,slotId:id,state:'RESERVED'}});
   if(count!==locked.reserved||locked.reserved<0||locked.reserved>locked.capacity)throw Error('Delivery capacity requires reconciliation');
  }
  const old=await tx.readyDeliveryVisit.findFirstOrThrow({where:{id:visitId,shop,customerGid}});
  const plan=planReadyDeliveryVisit(JSON.parse(old.plan));
  if(old.plan!==JSON.stringify(plan)||plan.shop!==shop||plan.customerGid!==customerGid||old.orderGid!==plan.orderGid||old.slotId!==plan.slotId||old.destinationKey!==plan.destinationKey||old.packageCount!==plan.packageCount)throw Error('Original visit requires reconciliation');
  const slot=await tx.readyDeliverySlot.findFirstOrThrow({where:{id:replacementSlotId,shop}});
  const replacement={...plan,slotId:slot.id,slotRevision:replacementSlotRevision,deliveryAt:slot.deliveryAt.toISOString(),deliveryEndsAt:slot.deliveryEndsAt.toISOString(),members:plan.members.map(m=>({...m,revision:m.revision+1}))};
  const originalMembers=await tx.readyDeliveryVisitMember.findMany({where:{shop,visitId:old.id}});
  if(originalMembers.length!==plan.members.length||originalMembers.some(m=>m.customerGid!==customerGid||!plan.members.some(p=>p.draftId===m.deliveryDraftId&&p.revision===m.deliveryRevision)))throw Error('Original visit membership differs');
  const oldReservation=await tx.readyDeliverySlotReservation.findFirst({where:{id:old.reservationId,shop,customerGid,slotId:old.slotId,deliveryDraftId:plan.members[0].draftId,deliveryRevision:plan.members[0].revision}});
  if(!oldReservation)throw Error('Original reservation differs');
  if(old.state==='RELEASED'){
   if(oldReservation.state!=='RELEASED'||!oldReservation.releasedAt)throw Error('Original release requires reconciliation');
   // A retry must find the exact already-created replacement. A standalone
   // release cannot be turned into a new booking by replaying this operation.
   const nextMembers=await tx.readyDeliveryVisitMember.findMany({where:{shop,OR:replacement.members.map(m=>({deliveryDraftId:m.draftId,deliveryRevision:m.revision}))}});
   if(nextMembers.length!==plan.members.length||new Set(nextMembers.map(m=>m.visitId)).size!==1||nextMembers.some(m=>m.state!=='RESERVED'||m.customerGid!==customerGid)||originalMembers.some(m=>m.state!=='RELEASED'))throw Error('No matching completed replacement; reconciliation required');
   const replay=await reserveReadyDeliveryVisitTx(tx,replacement,now,verifiedUnsentLineIds);
   if(replay.created)throw Error('Replacement replay must not create a visit');
   return {...replay,rescheduledFrom:old.id,replayed:true};
  }
  if(old.state!=='RESERVED'||originalMembers.some(m=>m.state!=='RESERVED'))throw Error('Original visit is unavailable');
  const notice=reviewDeliveryChangeNotice(now.toISOString(),plan.deliveryAt,replacement.deliveryAt,noticeHours);
  if(!notice.selfServiceNoticeMet)throw Error('Contact Support: both deliveries require the configured notice');
  await releaseReadyDeliveryCapacityTx(tx,{shop,customerGid,reservationId:old.reservationId});
  for(const m of plan.members)await stageReadyDeliveryRemindersTx(tx,{shop,customerGid,operationalLineId:m.operationalLineId,occurrence:m.occurrence,deliveryAt:replacement.deliveryAt,expectedRevision:m.revision},{verifiedUnsentLineIds});
  const result=await reserveReadyDeliveryVisitTx(tx,replacement,now,verifiedUnsentLineIds);
  if(!result.created)throw Error('Replacement visit already exists; reconciliation required');
  return {...result,rescheduledFrom:old.id,replayed:false};
}
