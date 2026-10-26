import {createHash} from 'node:crypto';
import db from '../db.server';
import {assertShop} from './security.server';
import {planReadyDeliveryVisit} from './ready-delivery-visit';

type Input=Parameters<typeof planReadyDeliveryVisit>[0];
// Internal development reservation only. The caller supplies a verified server
// destination identity; this does not infer matching addresses, move native work,
// confirm dispatch safety or authorize a customer booking.
export async function reserveReadyDeliveryVisit(input:Input,options:{now?:Date}={}){
 assertShop(input.shop);
 if(process.env.NODE_ENV==='production'||process.env.READY_DELIVERY_CAPACITY_ENABLED!=='true')throw Error('Delivery capacity management is not activated');
 const plan=planReadyDeliveryVisit(input),{shop,customerGid,slotId}=plan,now=options.now??new Date();
 if(!Number.isFinite(now.getTime()))throw Error('Valid reservation time required');
 const serialized=JSON.stringify(plan);
 return db.$transaction(async tx=>{
  const lock=await tx.readyDeliverySlot.updateMany({where:{id:slotId,shop},data:{updatedAt:new Date()}});
  if(lock.count!==1)throw Error('Delivery slot unavailable');
  const slot=await tx.readyDeliverySlot.findFirstOrThrow({where:{id:slotId,shop}});
  const count=await tx.readyDeliverySlotReservation.count({where:{shop,slotId,state:'RESERVED'}});
  if(count!==slot.reserved||slot.reserved<0||slot.reserved>slot.capacity)throw Error('Delivery capacity requires reconciliation');
  if(slot.deliveryAt.toISOString()!==plan.deliveryAt||slot.deliveryEndsAt.toISOString()!==plan.deliveryEndsAt)throw Error('Visit window differs from merchant slot');
  // Sorted draft locks serialize overlap with both legacy single reservations
  // and rescheduling. All membership changes roll back if any member fails.
  for(const member of plan.members){
   const locked=await tx.readyDeliveryDraft.updateMany({where:{id:member.draftId,shop,customerGid,state:'DRAFT',revision:member.revision},data:{updatedAt:new Date()}});
   if(locked.count!==1)throw Error('Delivery draft changed; reload');
   const draft=await tx.readyDeliveryDraft.findUniqueOrThrow({where:{id:member.draftId}});
   if(draft.operationalLineId!==member.operationalLineId||draft.occurrence!==member.occurrence||draft.deliveryAt.toISOString()!==plan.deliveryAt)throw Error('Visit member differs from delivery draft');
   const line=await tx.operationalLine.findFirst({where:{id:member.operationalLineId,shop,customerGid,orderGid:plan.orderGid,businessStream:'ready_series',validationStatus:'VALIDATED',fulfillmentState:'UNASSIGNED'}});
   if(!line?.contractGid)throw Error('Validated undispatched paid delivery binding required');
   const paid=await tx.prepaidPurchaseEvidence.findUnique({where:{shop_originalLineGid:{shop,originalLineGid:line.orderLineGid}}});
   if(!paid||paid.customerGid!==customerGid||paid.contractGid!==line.contractGid||paid.originalOrderGid!==plan.orderGid||createHash('sha256').update(paid.snapshot).digest('hex')!==paid.snapshotHash)throw Error('Immutable paid entitlement required');
   const proof=JSON.parse(paid.snapshot),e=proof.expected;
   if(proof.version!==1||proof.contractGid!==line.contractGid||!e||e.customerGid!==customerGid||e.orderGid!==line.orderGid||e.orderLineGid!==line.orderLineGid||e.productGid!==line.productGid||e.variantGid!==line.variantGid||![3,6].includes(e.months)||member.occurrence>e.months||member.packages!==(e.packageQuantity??1))throw Error('Visit exceeds its purchased entitlement');
  }
  const keys=plan.members.map(m=>({deliveryDraftId:m.draftId,deliveryRevision:m.revision}));
  const existing=await tx.readyDeliveryVisitMember.findMany({where:{shop,OR:keys}});
  if(existing.length){
   const visit=await tx.readyDeliveryVisit.findFirst({where:{id:existing[0].visitId,shop,customerGid,state:'RESERVED'}});
   if(!visit||visit.plan!==serialized||existing.length!==plan.members.length||existing.some(m=>m.visitId!==visit.id||m.customerGid!==customerGid||m.state!=='RESERVED'))throw Error('Delivery is already assigned to another or released visit');
   const members=await tx.readyDeliveryVisitMember.findMany({where:{shop,visitId:visit.id}});
   const reservation=await tx.readyDeliverySlotReservation.findFirst({where:{id:visit.reservationId,shop,slotId,customerGid,state:'RESERVED',releasedAt:null,deliveryDraftId:plan.members[0].draftId,deliveryRevision:plan.members[0].revision}});
   if(await tx.readyDeliverySlotReservation.count({where:{shop,OR:keys}})!==1)throw Error('Visit has conflicting standalone reservations');
   if(!reservation||members.length!==existing.length||members.some(m=>m.state!=='RESERVED'))throw Error('Visit reservation requires reconciliation');
   return {visit,reservation,created:false,bookingConfirmed:false as const};
  }
  if(await tx.readyDeliverySlotReservation.count({where:{shop,OR:keys}}))throw Error('Delivery already has a standalone reservation');
  if(slot.revision!==plan.slotRevision||!slot.available||slot.reserved>=slot.capacity||slot.deliveryAt<=now||new Date(slot.deliveryAt.getTime()+8*3600000).getUTCDay()===6)throw Error('Delivery slot changed, closed or full');
  const claimed=await tx.readyDeliverySlot.updateMany({where:{id:slotId,shop,revision:plan.slotRevision,reserved:slot.reserved,available:true},data:{reserved:{increment:1}}});
  if(claimed.count!==1)throw Error('Delivery slot changed; reload');
  const leader=plan.members[0];
  const reservation=await tx.readyDeliverySlotReservation.create({data:{shop,customerGid,slotId,deliveryDraftId:leader.draftId,deliveryRevision:leader.revision}});
  const visit=await tx.readyDeliveryVisit.create({data:{shop,customerGid,orderGid:plan.orderGid,destinationKey:plan.destinationKey,slotId,reservationId:reservation.id,plan:serialized,packageCount:plan.packageCount}});
  for(const member of plan.members)await tx.readyDeliveryVisitMember.create({data:{shop,customerGid,visitId:visit.id,deliveryDraftId:member.draftId,deliveryRevision:member.revision}});
  return {visit,reservation,created:true,bookingConfirmed:false as const};
 },{timeout:30000});
}
