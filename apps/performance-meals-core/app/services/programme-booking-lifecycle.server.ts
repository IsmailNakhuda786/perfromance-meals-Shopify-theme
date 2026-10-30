import type {Prisma} from '@prisma/client';
// Called inside the same programme/batch transaction after its source lock.
// Storage readiness stays on after migration, independently of customer controls.
export async function programmeBookingBatchTransition(tx:Prisma.TransactionClient,input:{shop:string;customerGid:string;batchId:string;target:'DISPATCHED'|'CANCELLED'}){
 if(process.env.MEAL_PLAN_BOOKING_STORAGE_READY!=='true')return;
 const booking=await tx.programmeDeliveryBooking.findUnique({where:{shop_batchId:{shop:input.shop,batchId:input.batchId}}});if(!booking)return;
 if(booking.customerGid!==input.customerGid||booking.state!=='BOOKED')throw Error('Booked batch requires reconciliation');
 const snapshot=await tx.mealPlanDeliveryVisit.findFirst({where:{id:booking.visitId,shop:input.shop,customerGid:input.customerGid,state:'BOOKED'}});if(!snapshot)throw Error('Booked visit requires reconciliation');
 if((await tx.mealPlanDeliverySlot.updateMany({where:{id:snapshot.slotId,shop:input.shop},data:{updatedAt:new Date()}})).count!==1)throw Error('Booked slot unavailable');
 const visit=await tx.mealPlanDeliveryVisit.findUniqueOrThrow({where:{id:snapshot.id}}),slot=await tx.mealPlanDeliverySlot.findUniqueOrThrow({where:{id:snapshot.slotId}});
 if(visit.slotId!==snapshot.slotId||visit.state!=='BOOKED')throw Error('Booked visit changed');
 const count=await tx.mealPlanDeliveryVisit.count({where:{shop:input.shop,slotId:slot.id,state:{in:['BOOKED','DISPATCHED']}}});
 if(count!==slot.reserved||slot.reserved<1||slot.reserved>slot.capacity)throw Error('Meal Plan capacity requires reconciliation');
 const changed=await tx.programmeDeliveryBooking.updateMany({where:{id:booking.id,shop:input.shop,customerGid:input.customerGid,state:'BOOKED',revision:booking.revision},data:{state:input.target,revision:{increment:1}}});if(changed.count!==1)throw Error('Booked batch changed');
 const members=await tx.programmeDeliveryBooking.findMany({where:{shop:input.shop,visitId:visit.id}});
 if(!members.length||members.some(m=>m.customerGid!==visit.customerGid||m.orderGid!==visit.orderGid||!['BOOKED','DISPATCHED','CANCELLED'].includes(m.state)))throw Error('Visit membership requires reconciliation');
 const pending=members.some(m=>m.state==='BOOKED'),sent=members.some(m=>m.state==='DISPATCHED');
 const state=pending?'BOOKED':sent?'DISPATCHED':'CANCELLED';
 await tx.mealPlanDeliveryVisit.update({where:{id:visit.id},data:{state,revision:{increment:1}}});
 // A visit already sent still consumes its place. Only an entirely unsent,
 // cancelled visit releases capacity; cancelling one of two boxes does not.
 if(state==='CANCELLED')await tx.mealPlanDeliverySlot.update({where:{id:slot.id},data:{reserved:{decrement:1}}});
}
