import type {Prisma} from '@prisma/client';
import db from '../db.server';
import {assertShop} from './security.server';
import {planReadyDeliveryReminders,planReadyDeliveryCatchUp} from './ready-series-calendar';

// Internal preparation, never customer authorization or a confirmed booking.
// Draft records alone authorize no message. The guarded sender separately requires
// a confirmed booking, native paid-term, slot and current fulfilment evidence.
export async function stageReadyDeliveryReminders(input:{shop:string;customerGid:string;operationalLineId:string;occurrence:number;deliveryAt:string;expectedRevision:number}){
 return db.$transaction(tx=>stageReadyDeliveryRemindersTx(tx,input));
}
export async function stageReadyDeliveryRemindersTx(tx:Prisma.TransactionClient,input:{shop:string;customerGid:string;operationalLineId:string;occurrence:number;deliveryAt:string;expectedRevision:number},options:{verifiedUnsentLineIds?:ReadonlySet<string>}={}){
 const {shop,customerGid,operationalLineId,occurrence,deliveryAt,expectedRevision}=input;
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!operationalLineId||!Number.isSafeInteger(occurrence)||occurrence<1||occurrence>6||!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw Error('Invalid delivery draft context');
 // Validate the timestamp before writing any draft. Revision zero means
 // creation only; repeated creation cannot silently overwrite a newer plan.
 planReadyDeliveryReminders('validation',1,deliveryAt);
 const delivery=new Date(deliveryAt);
  const line=await tx.operationalLine.findFirst({where:{id:operationalLineId,shop,customerGid,validationStatus:'VALIDATED',businessStream:'ready_series'}});
  if(!line?.contractGid||!(['UNASSIGNED',...(options.verifiedUnsentLineIds?.has(operationalLineId)?['DISPATCHED']:[])].includes(line.fulfillmentState)))throw Error('Validated undispatched linked Ready Series line required');
  const key={shop_operationalLineId_occurrence:{shop,operationalLineId,occurrence}};
  let draft=await tx.readyDeliveryDraft.findUnique({where:key});
  if(draft){
   if(draft.customerGid!==customerGid||draft.state!=='DRAFT')throw Error('Delivery draft is unavailable');
   if(draft.revision!==expectedRevision)throw Error('Delivery draft changed; reload');
   // Serialize against a capacity reservation taking this same revision. A
   // feature switch controls new writes, never the integrity of existing ones.
   const locked=await tx.readyDeliveryDraft.updateMany({where:{id:draft.id,shop,customerGid,state:'DRAFT',revision:expectedRevision},data:{updatedAt:new Date()}});
   if(locked.count!==1)throw Error('Delivery draft changed; reload');
   const current=await tx.readyDeliveryReminder.findMany({where:{shop,deliveryDraftId:draft.id,deliveryRevision:draft.revision}});
   // A SENT marker alone is not proof that a message was legitimately sent.
   // Preserve the old reconciliation guard unless the guarded sender's
   // committed visit receipt covers this exact member/revision/channel/stage.
   for(const row of current.filter(r=>r.state==='SENT')){
    const receipts=await tx.planOperation.findMany({where:{shop,selectionId:'customer:'+customerGid.split('/').at(-1),kind:'READY_DELIVERY_NOTICE',state:'SENT',productionReference:{contains:row.id}},take:2});
    if(receipts.length!==1||!receipts[0].productionReference)throw Error('Existing delivery reminders require reconciliation');
    const receipt=JSON.parse(receipts[0].productionReference);
    if(receipt.version!==1||receipt.input?.shop!==shop||receipt.input.customerGid!==customerGid||receipt.input.bookingId!==receipts[0].cycleReference||receipt.input.channel!==row.channel||receipt.input.hoursBefore!==row.hoursBefore||receipt.delivery?.customerGid!==customerGid||receipt.delivery.channel!==row.channel||receipt.delivery.notice?.deliveryAt!==draft.deliveryAt.toISOString()||!Array.isArray(receipt.memberIds)||!receipt.memberIds.includes(row.id)||typeof receipt.receipt!=='string'||!/^[-a-zA-Z0-9:_.]{1,200}$/.test(receipt.receipt))throw Error('Existing delivery reminders require reconciliation');
   }
   const expected=planReadyDeliveryReminders(draft.id,draft.revision,draft.deliveryAt.toISOString());
   const matches=(row:typeof current[number],plan:typeof expected[number]|ReturnType<typeof planReadyDeliveryCatchUp>[number])=>row.customerGid===customerGid&&row.deliveryAt.getTime()===draft!.deliveryAt.getTime()&&plan.channel===row.channel&&plan.hoursBefore===row.hoursBefore&&Date.parse(plan.scheduledAt)===row.scheduledAt.getTime()&&row.deliveryKey===JSON.stringify([shop,plan.idempotencyKey]);
   let complete=current.length===expected.length&&current.every(row=>['DRAFT','SENT'].includes(row.state)&&expected.some(plan=>matches(row,plan)));
   // A verified late-purchase plan also contains superseded missed stages and
   // exactly one immediate draft per channel. Preserve that history on a move.
   const immediate=current.filter(row=>row.hoursBefore===0);
   if(!complete&&immediate.length===2&&immediate.every(row=>['DRAFT','SENT'].includes(row.state)&&row.scheduledAt.getTime()===immediate[0].scheduledAt.getTime())){
    const catchUp=planReadyDeliveryCatchUp(draft.id,draft.revision,draft.deliveryAt.toISOString(),immediate[0].scheduledAt.toISOString());
    const retained=new Set(catchUp.map(plan=>JSON.stringify([shop,plan.idempotencyKey])));
    const superseded=expected.filter(plan=>!retained.has(JSON.stringify([shop,plan.idempotencyKey])));
    const desired=[...catchUp.map(plan=>({plan,state:'DRAFT'})),...superseded.map(plan=>({plan,state:'SUPERSEDED'}))];
    complete=current.length===desired.length&&new Set(current.map(row=>row.deliveryKey)).size===current.length&&desired.every(({plan,state})=>current.some(row=>(row.state===state||state==='DRAFT'&&row.state==='SENT')&&matches(row,plan)));
   }
   if(!complete)throw Error('Existing delivery reminders require reconciliation');
   if(draft.deliveryAt.getTime()===delivery.getTime())return {draft,reminders:current.filter(row=>row.state==='DRAFT')};
   if(await tx.readyDeliverySlotReservation.count({where:{shop,deliveryDraftId:draft.id,deliveryRevision:draft.revision,state:'RESERVED'}})||await tx.readyDeliveryVisitMember.count({where:{shop,deliveryDraftId:draft.id,deliveryRevision:draft.revision,state:'RESERVED'}}))throw Error('Release the existing delivery capacity through the scheduling workflow before moving this draft');
   const changed=await tx.readyDeliveryDraft.updateMany({where:{id:draft.id,shop,customerGid,state:'DRAFT',revision:expectedRevision},data:{deliveryAt:delivery,revision:{increment:1}}});
   if(changed.count!==1)throw Error('Delivery draft changed; reload');
   await tx.readyDeliveryReminder.updateMany({where:{shop,deliveryDraftId:draft.id,deliveryRevision:expectedRevision,state:'DRAFT'},data:{state:'SUPERSEDED'}});
   draft=await tx.readyDeliveryDraft.findUniqueOrThrow({where:key});
  }else{
   if(expectedRevision!==0)throw Error('Delivery draft changed; reload');
   draft=await tx.readyDeliveryDraft.create({data:{shop,customerGid,operationalLineId,occurrence,deliveryAt:delivery}});
  }
  const plans=planReadyDeliveryReminders(draft.id,draft.revision,delivery.toISOString());
  for(const plan of plans)await tx.readyDeliveryReminder.create({data:{shop,customerGid,deliveryDraftId:draft.id,deliveryRevision:draft.revision,channel:plan.channel,hoursBefore:plan.hoursBefore,scheduledAt:new Date(plan.scheduledAt),deliveryAt:delivery,deliveryKey:JSON.stringify([shop,plan.idempotencyKey])}});
  return {draft,reminders:await tx.readyDeliveryReminder.findMany({where:{shop,deliveryDraftId:draft.id,deliveryRevision:draft.revision},orderBy:[{hoursBefore:'desc'},{channel:'asc'}]})};
}


// Internal inactive preparation only. confirmedAt must come from verified purchase
// evidence at the eventual caller, never a customer-controlled timestamp.
export async function stageReadyDeliveryCatchUp(input:{shop:string;customerGid:string;draftId:string;expectedRevision:number;confirmedAt:string}){
 return db.$transaction(tx=>stageReadyDeliveryCatchUpTx(tx,input));
}
export async function stageReadyDeliveryCatchUpTx(tx:Prisma.TransactionClient,input:{shop:string;customerGid:string;draftId:string;expectedRevision:number;confirmedAt:string},options:{verifiedUnsentLineIds?:ReadonlySet<string>}={}){
 const {shop,customerGid,draftId,expectedRevision,confirmedAt}=input;
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!draftId||!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw Error('Invalid catch-up context');
  const draft=await tx.readyDeliveryDraft.findFirst({where:{id:draftId,shop,customerGid,state:'DRAFT',revision:expectedRevision}});
  if(!draft)throw Error('Delivery draft changed; reload');
  // Serialize catch-up against rescheduling on the parent draft in PostgreSQL.
  // Lock before reading reminder rows; revision CAS prevents stale insertion.
  const locked=await tx.readyDeliveryDraft.updateMany({where:{id:draft.id,shop,customerGid,state:'DRAFT',revision:expectedRevision},data:{updatedAt:new Date()}});
  if(locked.count!==1)throw Error('Delivery draft changed; reload');
  const line=await tx.operationalLine.findFirst({where:{id:draft.operationalLineId,shop,customerGid,validationStatus:'VALIDATED',businessStream:'ready_series',fulfillmentState:{in:options.verifiedUnsentLineIds?.has(draft.operationalLineId)?['UNASSIGNED','DISPATCHED']:['UNASSIGNED']}}});
  if(!line?.contractGid)throw Error('Validated undispatched linked Ready Series line required');
  const original=planReadyDeliveryReminders(draft.id,draft.revision,draft.deliveryAt.toISOString());
  const planned=planReadyDeliveryCatchUp(draft.id,draft.revision,draft.deliveryAt.toISOString(),confirmedAt);
  const key=(plan:{idempotencyKey:string})=>JSON.stringify([shop,plan.idempotencyKey]);
  const rows=await tx.readyDeliveryReminder.findMany({where:{shop,deliveryDraftId:draft.id,deliveryRevision:draft.revision}});
  const active=rows.filter(row=>row.state==='DRAFT');
  const matches=(row:typeof rows[number],plan:typeof planned[number]|typeof original[number])=>row.customerGid===customerGid&&row.deliveryAt.getTime()===draft.deliveryAt.getTime()&&row.channel===plan.channel&&row.hoursBefore===plan.hoursBefore&&row.scheduledAt.getTime()===Date.parse(plan.scheduledAt)&&row.deliveryKey===key(plan);
  if(rows.length===original.length&&rows.every(row=>row.state==='DRAFT'&&original.some(plan=>matches(row,plan)))){
   const retained=new Set(planned.map(key));
   for(const row of rows.filter(row=>!retained.has(row.deliveryKey))){
    const changed=await tx.readyDeliveryReminder.updateMany({where:{id:row.id,shop,state:'DRAFT',updatedAt:row.updatedAt},data:{state:'SUPERSEDED'}});
    if(changed.count!==1)throw Error('Delivery reminder changed; reload');
   }
   for(const plan of planned.filter(plan=>plan.kind==='IMMEDIATE'))await tx.readyDeliveryReminder.create({data:{shop,customerGid,deliveryDraftId:draft.id,deliveryRevision:draft.revision,channel:plan.channel,hoursBefore:0,scheduledAt:new Date(plan.scheduledAt),deliveryAt:draft.deliveryAt,deliveryKey:key(plan)}});
  }else{
   // Replay must describe the same complete plan. Unknown, sent, extra or missing
   // records hold for reconciliation rather than issuing another immediate row.
   const retained=new Set(planned.map(key));
   const old=original.filter(plan=>!retained.has(key(plan)));
   if(active.length!==planned.length||active.some(row=>!planned.some(plan=>matches(row,plan)))||rows.length!==planned.length+old.length||rows.filter(row=>row.state!=='DRAFT').some(row=>row.state!=='SUPERSEDED'||!old.some(plan=>matches(row,plan))))throw Error('Existing catch-up reminders require reconciliation');
  }
  return {draft,reminders:await tx.readyDeliveryReminder.findMany({where:{shop,deliveryDraftId:draft.id,deliveryRevision:draft.revision,state:'DRAFT'},orderBy:[{scheduledAt:'asc'},{channel:'asc'}]})};
}
