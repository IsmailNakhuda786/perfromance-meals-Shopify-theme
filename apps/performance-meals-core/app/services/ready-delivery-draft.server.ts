import db from '../db.server';
import {assertShop} from './security.server';
import {planReadyDeliveryReminders} from './ready-series-calendar';

// Internal preparation, never customer authorization or a confirmed booking.
// No endpoint, sender or worker consumes these DRAFT records. Native paid-term,
// selected slot/capacity and current fulfilment evidence are activation gates.
export async function stageReadyDeliveryReminders(input:{shop:string;customerGid:string;operationalLineId:string;occurrence:number;deliveryAt:string;expectedRevision:number}){
 const {shop,customerGid,operationalLineId,occurrence,deliveryAt,expectedRevision}=input;
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!operationalLineId||!Number.isSafeInteger(occurrence)||occurrence<1||occurrence>6||!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw Error('Invalid delivery draft context');
 // Validate the timestamp before opening the transaction. Revision zero means
 // creation only; repeated creation cannot silently overwrite a newer plan.
 planReadyDeliveryReminders('validation',1,deliveryAt);
 const delivery=new Date(deliveryAt);
 return db.$transaction(async tx=>{
  const line=await tx.operationalLine.findFirst({where:{id:operationalLineId,shop,customerGid,validationStatus:'VALIDATED',businessStream:'ready_series'}});
  if(!line?.contractGid||line.fulfillmentState!=='UNASSIGNED')throw Error('Validated undispatched linked Ready Series line required');
  const key={shop_operationalLineId_occurrence:{shop,operationalLineId,occurrence}};
  let draft=await tx.readyDeliveryDraft.findUnique({where:key});
  if(draft){
   if(draft.customerGid!==customerGid||draft.state!=='DRAFT')throw Error('Delivery draft is unavailable');
   if(draft.revision!==expectedRevision)throw Error('Delivery draft changed; reload');
   const current=await tx.readyDeliveryReminder.findMany({where:{shop,deliveryDraftId:draft.id,deliveryRevision:draft.revision}});
   const expected=planReadyDeliveryReminders(draft.id,draft.revision,draft.deliveryAt.toISOString());
   if(current.length!==4||current.some(row=>row.state!=='DRAFT'||row.customerGid!==customerGid||row.deliveryAt.getTime()!==draft!.deliveryAt.getTime()||!expected.some(plan=>plan.channel===row.channel&&plan.hoursBefore===row.hoursBefore&&Date.parse(plan.scheduledAt)===row.scheduledAt.getTime()&&row.deliveryKey===JSON.stringify([shop,plan.idempotencyKey]))))throw Error('Existing delivery reminders require reconciliation');
   if(draft.deliveryAt.getTime()===delivery.getTime())return {draft,reminders:current};
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
 });
}
