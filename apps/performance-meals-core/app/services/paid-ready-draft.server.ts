import {createHash} from 'node:crypto';
import db from '../db.server';
import {assertShop} from './security.server';
import {inspectPrepaidPurchase,type PrepaidPurchaseExpectation} from './prepaid-purchase.server';
import {readOrderDispatch} from './order-dispatch.server';
import {readPrepaidSchedule} from './prepaid-schedule.server';
import {planReadySeriesDeliveries,planReadyDeliveryReminders} from './ready-series-calendar';
import {stageReadyDeliveryRemindersTx,stageReadyDeliveryCatchUpTx} from './ready-delivery-draft.server';
import {inspectRegisteredPrepaidPurchase} from './registered-prepaid-purchase.server';

type Admin=Parameters<typeof inspectPrepaidPurchase>[0];
type Input={shop:string;contractGid:string;expected:PrepaidPurchaseExpectation;calendarVersion:string;availableDates:string[];deliveryAt:string[]};
// Default-off development orchestration. A server caller must supply an approved
// immutable price and explicit merchant calendar/times. No public route accepts
// these fields. Draft preparation is not capacity reservation or native booking.
export async function preparePaidReadySeriesDraft(admin:Admin,input:Input,options:{now?:Date}={}){
 return prepareDraft(admin,input,options);
}

// The corrected-price path accepts only an internal saved purchase identity.
// Price, quantity and funding scope come from immutable verified evidence.
export async function prepareRegisteredPaidReadySeriesDraft(admin:Admin,input:Omit<Input,'contractGid'|'expected'>&{purchaseEvidenceId:string},options:{now?:Date}={}){
 assertShop(input.shop);
 if(process.env.NODE_ENV==='production'||process.env.READY_SERIES_PAID_DRAFTS_ENABLED!=='true')throw Error('Paid Ready Series draft preparation is not activated');
 const proof=await inspectRegisteredPrepaidPurchase(admin,input.shop,input.purchaseEvidenceId);
 return prepareDraft(admin,{...input,contractGid:proof.contractGid,expected:proof.expected},options,proof);
}

async function prepareDraft(admin:Admin,input:Input,options:{now?:Date},registered?:Awaited<ReturnType<typeof inspectRegisteredPrepaidPurchase>>){
 const {shop,contractGid,expected,calendarVersion,availableDates,deliveryAt}=input;
 assertShop(shop);
 if(process.env.NODE_ENV==='production'||process.env.READY_SERIES_PAID_DRAFTS_ENABLED!=='true')throw Error('Paid Ready Series draft preparation is not activated');
 const now=options.now??new Date();
 if(!Number.isFinite(now.getTime())||typeof calendarVersion!=='string'||!calendarVersion.trim()||calendarVersion.length>128||!Array.isArray(deliveryAt)||deliveryAt.length!==expected.months)throw Error('Verified merchant calendar required');
 const normalized=deliveryAt.map(at=>{
  planReadyDeliveryReminders('validate-paid-term',1,at);
  return new Date(Date.parse(at)).toISOString();
 });
 const dates=normalized.map(at=>new Date(Date.parse(at)+8*3600000).toISOString().slice(0,10));
 const plan=planReadySeriesDeliveries(dates[0],expected.months,availableDates);
 if(plan.some((day,index)=>day.deliveryDate!==dates[index]))throw Error('Delivery dates differ from the approved monthly calendar');
 const proof=registered??await inspectPrepaidPurchase(admin,shop,contractGid,expected);
 if(Date.parse(normalized[0])<=Date.parse(proof.payment.paidAt)||Date.parse(proof.payment.paidAt)>now.getTime())throw Error('Delivery or payment confirmation time differs');
 const schedule=await readPrepaidSchedule(admin,shop,{...expected,deliveryDates:dates});
 if(!schedule.scheduleMatches)throw Error('Native prepaid schedule differs from approved delivery dates');
 const dispatch=await readOrderDispatch(admin,shop,expected.orderGid);
 if(!dispatch.complete||dispatch.cancelled||dispatch.customerGid!==expected.customerGid||dispatch.byLine.size)throw Error('Current undispatched native order evidence required');
 const snapshot=JSON.stringify({version:registered?2:1,contractGid,expected:[expected.months,expected.appGid,expected.customerGid,expected.orderGid,expected.orderLineGid,expected.productGid,expected.variantGid,expected.sellingPlanGid,expected.upfrontMinor],...(registered?{purchaseEvidenceId:registered.purchaseEvidenceId,purchaseHash:registered.purchaseHash,packageQuantity:expected.packageQuantity??1,paymentScope:expected.paymentScope??'ORDER',correction:registered.correction}:{}),calendarVersion,availabilityHash:createHash('sha256').update(JSON.stringify([...availableDates].sort())).digest('hex'),deliveryAt:normalized,fulfillments:[...schedule.evidence].sort((a,b)=>a.id.localeCompare(b.id)).map(row=>({id:row.id,fulfillAt:row.fulfillAt,quantity:row.quantity})),paidAt:proof.payment.paidAt,payments:[...proof.payment.payments].sort((a,b)=>a.id.localeCompare(b.id))});
 const cycleReference=JSON.stringify([contractGid,expected.orderGid,expected.orderLineGid]);
 return db.$transaction(async tx=>{
  if(registered){
   const saved=await tx.prepaidPurchaseEvidence.findFirst({where:{id:registered.purchaseEvidenceId,shop,customerGid:expected.customerGid,contractGid,snapshotHash:registered.purchaseHash}});
   if(!saved||createHash('sha256').update(saved.snapshot).digest('hex')!==registered.purchaseHash)throw Error('Registered purchase changed before draft preparation');
  }
  const where={shop,orderLineGid:expected.orderLineGid,orderGid:expected.orderGid,customerGid:expected.customerGid,productGid:expected.productGid,variantGid:expected.variantGid,contractGid,validationStatus:'VALIDATED',businessStream:'ready_series',selectionId:null,fulfillmentState:'UNASSIGNED'};
  // The existing original row serializes same-term preparation and dispatch
  // updates. No operational line or subscription is manufactured here.
  const locked=await tx.operationalLine.updateMany({where,data:{updatedAt:new Date()}});
  if(locked.count!==1)throw Error('Validated original linked Ready Series order required');
  const line=await tx.operationalLine.findFirstOrThrow({where});
  const operations=await tx.planOperation.findMany({where:{shop,kind:'READY_SERIES_PAID_DRAFT',cycleReference}});
  if(operations.length>1)throw Error('Paid-term draft audit requires reconciliation');
  const existing=operations[0];
  if(existing){
   if(existing.state!=='DRAFT'||existing.selectionId!=='customer:'+expected.customerGid.split('/').at(-1)||existing.productionReference!==snapshot)throw Error('Paid-term draft evidence changed; review required');
   const drafts=await tx.readyDeliveryDraft.findMany({where:{shop,operationalLineId:line.id},orderBy:{occurrence:'asc'}});
   if(drafts.length!==expected.months||drafts.some((draft,index)=>draft.customerGid!==expected.customerGid||draft.state!=='DRAFT'||draft.occurrence!==index+1))throw Error('Paid-term delivery drafts require reconciliation');
   for(const [index,draft]of drafts.entries()){
    // Later changes belong to the rescheduling workflow, never purchase replay.
    if(draft.revision!==1||draft.deliveryAt.toISOString()!==normalized[index]||!existing.deliveryAt)throw Error('Existing delivery draft changed; use the rescheduling workflow');
    await stageReadyDeliveryCatchUpTx(tx,{shop,customerGid:expected.customerGid,draftId:draft.id,expectedRevision:1,confirmedAt:existing.deliveryAt.toISOString()});
   }
   // Never replace later approved draft revisions with the original schedule.
   return {operationId:existing.id,state:'DRAFT' as const,created:false,drafts,nativeScheduleVerified:true as const,deliveryTimeSlotVerified:false as const};
  }
  if(Date.parse(normalized[0])<=now.getTime())throw Error('First delivery must still be upcoming');
  const drafts=[];
  for(let index=0;index<expected.months;index++){
   const staged=await stageReadyDeliveryRemindersTx(tx,{shop,customerGid:expected.customerGid,operationalLineId:line.id,occurrence:index+1,deliveryAt:normalized[index],expectedRevision:0});
   await stageReadyDeliveryCatchUpTx(tx,{shop,customerGid:expected.customerGid,draftId:staged.draft.id,expectedRevision:staged.draft.revision,confirmedAt:now.toISOString()});
   drafts.push(staged.draft);
  }
  const operation=await tx.planOperation.create({data:{shop,selectionId:'customer:'+expected.customerGid.split('/').at(-1),kind:'READY_SERIES_PAID_DRAFT',state:'DRAFT',cycleReference,deliveryAt:now,productionReference:snapshot}});
  return {operationId:operation.id,state:'DRAFT' as const,created:true,drafts,nativeScheduleVerified:true as const,deliveryTimeSlotVerified:false as const};
 },{timeout:30000});
}
