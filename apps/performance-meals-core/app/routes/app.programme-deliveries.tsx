import {createHash} from 'node:crypto';
import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {Form,useActionData,useLoaderData,useNavigation} from 'react-router';
import db from '../db.server';
import {programmeBookingEnabled,readProgrammeBookings,bookProgrammeBatch,configureMealPlanSlot} from '../services/programme-booking.server';
import {authenticate} from '../shopify.server';
import {accountMealNames} from '../services/account-programmes.server';
import {assertShop} from '../services/security.server';
import {savedSixtyDayEntitlement} from '../services/programme-period';
import {planProgrammeDeliveryBatch,changeProgrammeDeliveryBatch,programmeDeliveryProgress,programmeDeliveryEnabled,listProgrammeDeliverySelections,programmeDishAllocationEnabled,readProgrammeDishChoices} from '../services/programme-deliveries.server';
const enabled=programmeDeliveryEnabled;
const windowLabel=(value:string|null)=>value==='mon-tue'?'Monday & Tuesday':value==='wed-thu'?'Wednesday & Thursday':value==='fri'?'Friday':'';
const menuDate=(value:string)=>new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',dateStyle:'medium'}).format(new Date(value+'T00:00:00+08:00'));
export async function loader({request}:LoaderFunctionArgs){
 const {session,admin}=await authenticate.admin(request);assertShop(session.shop);
 if(!enabled())return {enabled:false,programmes:[],selected:null,progress:null,after:null,nextCursor:null,dishMode:false,dishChoices:null,batchMealNames:{} as Record<string,string>,bookingMode:false,bookings:null as Awaited<ReturnType<typeof readProgrammeBookings>>|null};
 const params=new URL(request.url).searchParams,after=params.get('after')??undefined;
 const {programmes,nextCursor}=await listProgrammeDeliverySelections(session.shop,{after});
 const requested=params.get('programme'),selected=requested?programmes.find(p=>p.id===requested):programmes[0];
 if(requested&&!selected)throw new Response('Programme unavailable on this page',{status:404});
 let dishChoices:({menuHash:string;choices:Array<{sourceKey:string;kind:string;productGid:string;remaining:number;quantity:number;startsOn:string|null;window:string|null;title:string|null}>}|null)=null;
 const progress=selected?await programmeDeliveryProgress(session.shop,selected.customerGid,selected.id):null;
 let batchMealNames:Record<string,string>={};
 if(progress?.available)try{const ids=progress.batches.flatMap(b=>b.version===2?b.dishes.picks.map(p=>p.productGid):[]);batchMealNames=Object.fromEntries(await accountMealNames(admin,ids));}catch{/* A missing title never becomes a different selected dish. */}
 const dishMode=programmeDishAllocationEnabled();
 if(dishMode&&selected)try{const result=await readProgrammeDishChoices(admin,session.shop,selected.id);if(result.available){const names=await accountMealNames(admin,result.choices.map(c=>c.productGid));dishChoices={menuHash:result.menuHash,choices:result.choices.map(c=>({...c,title:names.get(c.productGid)??null}))};}}catch{/* Missing menu/evidence is a hold, never a count-only fallback. */}
 let bookings:Awaited<ReturnType<typeof readProgrammeBookings>>|null=null;
 const bookingMode=programmeBookingEnabled();if(bookingMode&&selected)try{bookings=await readProgrammeBookings(session.shop,selected.customerGid,selected.id,{afterSlot:params.get('afterSlot')??undefined});}catch{/* No booking is inferred from unavailable policy/storage. */}
 return {bookingMode,bookings,enabled:true,dishMode,dishChoices,batchMealNames,after:after??null,nextCursor,programmes:programmes.map(p=>({id:p.id,label:`${p.startsOn} – ${p.endsOn} · ${p.orderGid?.split('/').at(-1)??'Order unavailable'}`})),selected:selected?{id:selected.id,hasEntitlement:!!savedSixtyDayEntitlement(selected.entitlement,selected.startsOn,selected.endsOn)}:null,progress};
}
export async function action({request}:ActionFunctionArgs){
 const context=await authenticate.admin(request);assertShop(context.session.shop);
 if(request.method!=='POST')throw new Response('Method not allowed',{status:405});
 if(!enabled())throw new Response('Programme delivery batches are not activated',{status:403});
 const form=await request.formData(),selectionId=form.get('selectionId'),intent=form.get('intent');
 if(typeof selectionId!=='string')throw new Response('Invalid programme',{status:400});
 const actor='shopify-admin:'+createHash('sha256').update(context.sessionToken?.sub??context.session.id).digest('hex');
 try{
  if(intent==='book'){
   if(!programmeBookingEnabled())throw Error('Booking is not activated');
   const batchId=form.get('batchId'),slotId=form.get('slotId'),slotRevision=form.get('slotRevision'),requestKey=form.get('requestKey');
   if(typeof batchId!=='string'||typeof slotId!=='string'||typeof slotRevision!=='string'||!/^\d{1,9}$/.test(slotRevision)||typeof requestKey!=='string')throw Error('Choose a batch and slot');
   const programme=await db.mealPlanSelection.findFirst({where:{id:selectionId,shop:context.session.shop,status:'ORDERED'}});if(!programme)throw Error('Programme unavailable');
   await bookProgrammeBatch(context.admin,{shop:context.session.shop,customerGid:programme.customerGid,selectionId,batchId,slotId,slotRevision:Number(slotRevision),requestKey});
   return {message:'Meal batch booked. Batches from this order arriving together share one driver visit.',error:null};
  }
  if(intent==='configure-slot'){
   if(!programmeBookingEnabled())throw Error('Booking is not activated');
   const key=form.get('slotKey'),start=form.get('deliveryAt'),end=form.get('deliveryEndsAt'),capacity=form.get('capacity');
   if(typeof key!=='string'||typeof start!=='string'||typeof end!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(end)||typeof capacity!=='string'||!/^\d{1,6}$/.test(capacity))throw Error('Enter explicit Singapore times and capacity');
   await configureMealPlanSlot({shop:context.session.shop,slotKey:key,deliveryAt:new Date(start+':00+08:00').toISOString(),deliveryEndsAt:new Date(end+':00+08:00').toISOString(),capacity:Number(capacity),available:true,expectedRevision:0});
   return {message:'Meal Plans slot created with its own delivery limit.',error:null};
  }
  if(intent==='plan'&&programmeDishAllocationEnabled()){
   const reference=form.get('reference'),menuHash=form.get('menuHash'),dishes=[];
   if(typeof reference!=='string'||form.getAll('reference').length!==1||typeof menuHash!=='string'||form.getAll('menuHash').length!==1||!/^[a-f0-9]{64}$/.test(menuHash))throw Error('Reload the customer menu before allocating');
   for(const[key,value]of form.entries())if(key.startsWith('dish_')){if(!/^dish_[a-f0-9]{64}$/.test(key)||form.getAll(key).length!==1||typeof value!=='string'||!/^\d{1,2}$/.test(value))throw Error('Enter each selected dish quantity once');if(Number(value)>0)dishes.push({sourceKey:key.slice(5),quantity:Number(value)});}
   if(!dishes.length||dishes.length>120)throw Error('Select at least one dish within the batch limit');
   await planProgrammeDeliveryBatch(context.admin,{shop:context.session.shop,selectionId,reference,weekdayMeals:0,frozenMeals:0,actor,menuHash,dishes});
   return {message:'Selected dishes allocated once. No meals have been dispatched.',error:null};
  }
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
 }catch{return {message:null,error:'The batch could not be updated. Check the original entitlement, paid-order status, saved customer dishes, quantities and latest batch revision. Missing historical entitlements or native dispatch outside Core require review.'};}
}
export default function ProgrammeDeliveries(){
 const data=useLoaderData<typeof loader>(),result=useActionData<typeof action>(),busy=useNavigation().state!=='idle';
 const p=data.progress?.available?data.progress:null;
 const slotLabel=(s:{deliveryAt:string;deliveryEndsAt:string})=>new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',dateStyle:'medium',timeStyle:'short'}).format(new Date(s.deliveryAt))+' – '+new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',timeStyle:'short'}).format(new Date(s.deliveryEndsAt))+' (Singapore)';
 return <s-page heading="6 by 60 delivery batches">
  <s-link slot="breadcrumb-actions" href="/app">Core</s-link>
  <s-section heading="Record actual meal batches">
   <s-paragraph>Track weekday and frozen meals separately. Allocating meals does not book a date or time. Confirm dispatch only after the team has sent the meals.</s-paragraph>
   {!data.enabled&&<s-paragraph>Programme delivery batches are awaiting activation.</s-paragraph>}
   {result?.message&&<p role="status">{result.message}</p>}{result?.error&&<p role="alert">{result.error}</p>}
  </s-section>
  {data.enabled&&<s-section heading="Programme">
   <Form method="get">{data.after&&<input type="hidden" name="after" value={data.after}/>}<label>Select programme <select name="programme" defaultValue={data.selected?.id}>{data.programmes.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label><button type="submit" disabled={busy}>Open programme</button></Form>{data.nextCursor&&<s-link href={'/app/programme-deliveries?after='+encodeURIComponent(data.nextCursor)}>More programmes</s-link>}{data.after&&<s-link href="/app/programme-deliveries">Return to first page</s-link>}
   {!data.selected?<s-paragraph>No paid programme is available on this page.</s-paragraph>:!data.selected.hasEntitlement?<s-paragraph>This older programme has no verified meal-entitlement snapshot. Contact Support for review; Core will not invent an entitlement from today’s catalogue.</s-paragraph>:<>
    {p&&<s-paragraph>Recorded dispatches: {p.dispatchedWeekday} of 88 weekday meals and {p.dispatchedFrozen} of 32 frozen meals. Unallocated: {p.unallocatedWeekday} weekday, {p.unallocatedFrozen} frozen.</s-paragraph>}
    {data.dishMode?<s-section heading="Customer-selected dishes">
     <s-paragraph>Allocate weekday meals from the saved customer quantities. Frozen meals may use any dish the customer selected, within the separate 32-meal allowance. Delivery dates are arranged separately.</s-paragraph>
     {!data.dishChoices?<s-paragraph>The customer menu or existing batch attribution requires review. No replacement menu has been chosen.</s-paragraph>:<Form key={data.dishChoices.menuHash+':'+data.dishChoices.choices.map(c=>c.remaining).join(',')} method="post"><input type="hidden" name="intent" value="plan"/><input type="hidden" name="selectionId" value={data.selected.id}/><input type="hidden" name="menuHash" value={data.dishChoices.menuHash}/>
      <label>Unique batch reference <input name="reference" required maxLength={100} pattern="[a-zA-Z0-9-]+"/></label>
      {data.dishChoices.choices.map(c=><div key={c.sourceKey}><label>{c.kind==='weekday'?'Weekday':'Frozen'} · {c.title??'Selected meal details unavailable'}{c.startsOn?' · '+menuDate(c.startsOn)+' · '+windowLabel(c.window):''} · {c.remaining} remaining <input type="number" name={'dish_'+c.sourceKey} min="0" max={c.remaining} step="1" defaultValue="0" disabled={!c.title||busy||c.remaining===0} required/></label></div>)}
      <button type="submit" disabled={busy||!data.dishChoices.choices.some(c=>c.title&&c.remaining>0)}>Allocate selected dishes</button>
     </Form>}
    </s-section>:<Form method="post"><input type="hidden" name="intent" value="plan"/><input type="hidden" name="selectionId" value={data.selected.id}/>
     <label>Unique batch reference <input name="reference" required maxLength={100} pattern="[a-zA-Z0-9-]+"/></label>
     <label>Weekday meals <input type="number" name="weekdayMeals" min="0" max="88" step="1" defaultValue="0" required/></label>
     <label>Frozen meals <input type="number" name="frozenMeals" min="0" max="32" step="1" defaultValue="0" required/></label>
     <button type="submit" disabled={busy}>Allocate meal batch</button>
    </Form>}
    {data.bookingMode&&<s-section heading="Meal Plans delivery capacity">
     <s-paragraph>Meal Plans has its own limit, separate from Ready Series. Batches from this order at the same address and time share one driver visit. Initial scheduling is arranged by the team.</s-paragraph>
     {!data.bookings&&<s-paragraph>The delivery policy or booking details require review. No times have been assigned.</s-paragraph>}
     <Form method="post"><input type="hidden" name="intent" value="configure-slot"/><input type="hidden" name="selectionId" value={data.selected.id}/>
      <label>Unique slot reference <input name="slotKey" required maxLength={128} pattern="[A-Za-z0-9_-]+"/></label>
      <label>Start (Singapore time) <input name="deliveryAt" type="datetime-local" required/></label>
      <label>End (Singapore time) <input name="deliveryEndsAt" type="datetime-local" required/></label>
      <label>Maximum driver visits <input name="capacity" type="number" min="1" max="999999" step="1" required/></label>
      <button type="submit" disabled={busy}>Add Meal Plans slot</button>
     </Form>
     {data.bookings?.visits.map(v=><s-paragraph key={v.id}>{slotLabel(v)} · {v.combinedBatchCount} batches · {v.state.toLowerCase()}</s-paragraph>)}
    </s-section>}
    {p?.batches.map(batch=><s-section key={batch.id+':'+batch.revision} heading={batch.reference}>
     <s-paragraph>{batch.weekdayMeals} weekday meals · {batch.frozenMeals} frozen meals · {batch.state.toLowerCase()}</s-paragraph>
     {batch.version===2&&<><s-paragraph>Dish quantities are linked to the customer’s saved menu.</s-paragraph>{batch.dishes.picks.map(d=><s-paragraph key={d.sourceKey}>{d.quantity} × {data.batchMealNames[d.productGid]??'Selected meal details unavailable'} · {d.kind==='weekday'?'Weekday':'Frozen'}{d.startsOn?' · '+menuDate(d.startsOn)+' · '+windowLabel(d.window):''}</s-paragraph>)}</>}
     {batch.dispatchedAt&&<s-paragraph>Recorded dispatch: {new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',dateStyle:'medium',timeStyle:'short'}).format(new Date(batch.dispatchedAt))}</s-paragraph>}
     {batch.state==='PLANNED'&&data.bookingMode&&data.bookings&&!data.bookings.visits.some(v=>v.batchIds.includes(batch.id))&&<Form method="post"><input type="hidden" name="intent" value="book"/><input type="hidden" name="selectionId" value={data.selected!.id}/><input type="hidden" name="batchId" value={batch.id}/><input type="hidden" name="requestKey" value={'book-'+batch.id.replace(/[^A-Za-z0-9_-]/g,'').slice(0,80)}/>
      <label>Delivery slot <select name="slotId" required onChange={event=>{const slot=data.bookings?.slots.find(s=>s.id===event.currentTarget.value),form=event.currentTarget.form,input=form?.elements.namedItem('slotRevision');if(input instanceof HTMLInputElement)input.value=String(slot?.revision??'');}}><option value="">Choose a Meal Plans time</option>{data.bookings.slots.map(s=><option key={s.id} value={s.id}>{slotLabel(s)}</option>)}</select></label><input type="hidden" name="slotRevision"/>
      <button type="submit" disabled={busy}>Book meal batch</button>
     </Form>}
     {batch.state==='PLANNED'&&<Form method="post"><input type="hidden" name="selectionId" value={data.selected!.id}/><input type="hidden" name="batchId" value={batch.id}/><input type="hidden" name="revision" value={batch.revision}/>
      <label><input type="checkbox" name="confirm" value="yes"/> I confirm these meals have been dispatched.</label>
      <button name="intent" value="dispatch" type="submit" disabled={busy||batch.version===2&&!data.dishMode}>Record dispatch</button><button name="intent" value="cancel" type="submit" disabled={busy}>Cancel unsent batch</button>
     </Form>}
    </s-section>)}
   </>}
  </s-section>}
 </s-page>;
}
