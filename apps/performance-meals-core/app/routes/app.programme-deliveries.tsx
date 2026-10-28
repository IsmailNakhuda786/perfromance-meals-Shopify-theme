import {createHash} from 'node:crypto';
import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {Form,useActionData,useLoaderData,useNavigation} from 'react-router';
import {authenticate} from '../shopify.server';
import db from '../db.server';
import {assertShop} from '../services/security.server';
import {savedSixtyDayEntitlement} from '../services/programme-period';
import {planProgrammeDeliveryBatch,changeProgrammeDeliveryBatch,programmeDeliveryProgress} from '../services/programme-deliveries.server';
const enabled=()=>process.env.NODE_ENV!=='production'&&process.env.SIXTY_DAY_BATCHES_ENABLED==='true'&&/^[a-zA-Z0-9-]{1,100}$/.test(process.env.SIXTY_DAY_BATCH_QA_SELECTION_ID||'');
export async function loader({request}:LoaderFunctionArgs){
 const {session}=await authenticate.admin(request);assertShop(session.shop);
 if(!enabled())return {enabled:false,programmes:[],selected:null,progress:null};
 const programmes=await db.mealPlanSelection.findMany({where:{id:process.env.SIXTY_DAY_BATCH_QA_SELECTION_ID,shop:session.shop,status:'ORDERED',sellingPlanGid:null,startsOn:{not:null},endsOn:{not:null}},orderBy:{createdAt:'desc'},take:50});
 const requested=new URL(request.url).searchParams.get('programme'),selected=programmes.find(p=>p.id===requested)??programmes[0];
 return {enabled:true,programmes:programmes.map(p=>({id:p.id,label:`${p.startsOn} – ${p.endsOn} · ${p.orderGid?.split('/').at(-1)??'Order unavailable'}`})),selected:selected?{id:selected.id,hasEntitlement:!!savedSixtyDayEntitlement(selected.entitlement,selected.startsOn,selected.endsOn)}:null,progress:selected?await programmeDeliveryProgress(session.shop,selected.customerGid,selected.id):null};
}
export async function action({request}:ActionFunctionArgs){
 const context=await authenticate.admin(request);assertShop(context.session.shop);
 if(request.method!=='POST')throw new Response('Method not allowed',{status:405});
 if(!enabled())throw new Response('Programme delivery batches are not activated',{status:403});
 const form=await request.formData(),selectionId=form.get('selectionId'),intent=form.get('intent');
 if(typeof selectionId!=='string')throw new Response('Invalid programme',{status:400});
 const actor='shopify-admin:'+createHash('sha256').update(context.sessionToken?.sub??context.session.id).digest('hex');
 try{
  if(intent==='plan'){
   const reference=form.get('reference'),a=form.get('weekdayMeals'),b=form.get('frozenMeals');
   if(typeof reference!=='string'||typeof a!=='string'||typeof b!=='string'||!/^\d{1,2}$/.test(a)||!/^\d{1,2}$/.test(b))throw Error('Enter a delivery reference and whole meal quantities');
   await planProgrammeDeliveryBatch(context.admin,{shop:context.session.shop,selectionId,reference,weekdayMeals:Number(a),frozenMeals:Number(b),actor});
   return {message:'Meal batch allocated. This does not book a delivery slot or mark meals dispatched.',error:null};
  }
  const batchId=form.get('batchId'),revision=form.get('revision');
  if(!['dispatch','cancel'].includes(String(intent))||typeof batchId!=='string'||typeof revision!=='string'||!/^\d{1,9}$/.test(revision)||intent==='dispatch'&&form.get('confirm')!=='yes')throw Error('Confirm the operation after checking the batch');
  await changeProgrammeDeliveryBatch(context.admin,{shop:context.session.shop,selectionId,batchId,revision:Number(revision),action:intent as 'dispatch'|'cancel',actor});
  return {message:intent==='dispatch'?'Dispatch recorded once. No payment or refund was made.':'Unsent batch cancelled; its meals are available to allocate again.',error:null};
 }catch{return {message:null,error:'The batch could not be updated. Check the original entitlement, paid-order status, quantities and latest batch revision. Missing historical entitlements or native dispatch outside Core require review.'};}
}
export default function ProgrammeDeliveries(){
 const data=useLoaderData<typeof loader>(),result=useActionData<typeof action>(),busy=useNavigation().state!=='idle';
 const p=data.progress?.available?data.progress:null;
 return <s-page heading="6 by 60 delivery batches">
  <s-link slot="breadcrumb-actions" href="/app">Core</s-link>
  <s-section heading="Record actual meal batches">
   <s-paragraph>Track weekday and frozen meals separately. Allocating meals does not book a date or time. Confirm dispatch only after the team has sent the meals.</s-paragraph>
   {!data.enabled&&<s-paragraph>Programme delivery batches are awaiting activation.</s-paragraph>}
   {result?.message&&<p role="status">{result.message}</p>}{result?.error&&<p role="alert">{result.error}</p>}
  </s-section>
  {data.enabled&&<s-section heading="Programme">
   <Form method="get"><label>Select programme <select name="programme" defaultValue={data.selected?.id}>{data.programmes.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label><button type="submit" disabled={busy}>Open programme</button></Form>
   {!data.selected?<s-paragraph>No paid programme is available.</s-paragraph>:!data.selected.hasEntitlement?<s-paragraph>This older programme has no verified meal-entitlement snapshot. Contact Support for review; Core will not invent an entitlement from today’s catalogue.</s-paragraph>:<>
    {p&&<s-paragraph>Recorded dispatches: {p.dispatchedWeekday} of 88 weekday meals and {p.dispatchedFrozen} of 32 frozen meals. Unallocated: {p.unallocatedWeekday} weekday, {p.unallocatedFrozen} frozen.</s-paragraph>}
    <Form method="post"><input type="hidden" name="intent" value="plan"/><input type="hidden" name="selectionId" value={data.selected.id}/>
     <label>Unique batch reference <input name="reference" required maxLength={100} pattern="[a-zA-Z0-9-]+"/></label>
     <label>Weekday meals <input type="number" name="weekdayMeals" min="0" max="88" step="1" defaultValue="0" required/></label>
     <label>Frozen meals <input type="number" name="frozenMeals" min="0" max="32" step="1" defaultValue="0" required/></label>
     <button type="submit" disabled={busy}>Allocate meal batch</button>
    </Form>
    {p?.batches.map(batch=><s-section key={batch.id+':'+batch.revision} heading={batch.reference}>
     <s-paragraph>{batch.weekdayMeals} weekday meals · {batch.frozenMeals} frozen meals · {batch.state.toLowerCase()}</s-paragraph>
     {batch.dispatchedAt&&<s-paragraph>Recorded dispatch: {new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',dateStyle:'medium',timeStyle:'short'}).format(new Date(batch.dispatchedAt))}</s-paragraph>}
     {batch.state==='PLANNED'&&<Form method="post"><input type="hidden" name="selectionId" value={data.selected!.id}/><input type="hidden" name="batchId" value={batch.id}/><input type="hidden" name="revision" value={batch.revision}/>
      <label><input type="checkbox" name="confirm" value="yes"/> I confirm these meals have been dispatched.</label>
      <button name="intent" value="dispatch" type="submit" disabled={busy}>Record dispatch</button><button name="intent" value="cancel" type="submit" disabled={busy}>Cancel unsent batch</button>
     </Form>}
    </s-section>)}
   </>}
  </s-section>}
 </s-page>;
}
