import {randomUUID} from 'node:crypto';
import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {Form,useActionData,useLoaderData,useNavigation} from 'react-router';
import {authenticate} from '../shopify.server';
import {assertShop} from '../services/security.server';
import {configureReadyDeliverySlot,readReadyDeliverySlots} from '../services/ready-delivery-capacity.server';
import {readyDeliverySlotForm} from '../services/ready-delivery-slot-form';
const enabled=()=>process.env.NODE_ENV!=='production'&&process.env.READY_DELIVERY_CAPACITY_ENABLED==='true';
const local=(value:Date)=>new Date(value.getTime()+8*3600000).toISOString();
export async function loader({request}:LoaderFunctionArgs){
 const {session}=await authenticate.admin(request);assertShop(session.shop);
 if(!enabled())return {enabled:false,slots:[],nextUrl:null};
 const url=new URL(request.url),after=url.searchParams.get('after')??undefined;
 const page=await readReadyDeliverySlots(session.shop,{after});
 if(page.nextCursor)url.searchParams.set('after',page.nextCursor);
 return {enabled:true,slots:page.slots.map(slot=>({slotKey:slot.slotKey,date:local(slot.deliveryAt).slice(0,10),start:local(slot.deliveryAt).slice(11,16),end:local(slot.deliveryEndsAt).slice(11,16),capacity:slot.capacity,reserved:slot.reserved,available:slot.available,revision:slot.revision})),nextUrl:page.nextCursor?url.pathname+url.search:null};
}
export async function action({request}:ActionFunctionArgs){
 const {session}=await authenticate.admin(request);assertShop(session.shop);
 if(request.method!=='POST')throw new Response('Method not allowed',{status:405});
 if(!enabled())throw new Response('Delivery slot management is not activated',{status:403});
 const form=await request.formData(),intent=form.get('intent');
 if(intent!=='create'&&intent!=='update')throw new Response('Unknown slot operation',{status:400});
 try{
  const spec=readyDeliverySlotForm(form),slotKey=intent==='create'?randomUUID():form.get('slotKey');
  if(typeof slotKey!=='string'||intent==='create'&&spec.expectedRevision!==0||intent==='update'&&spec.expectedRevision<1)throw Error('Invalid slot revision');
  await configureReadyDeliverySlot({shop:session.shop,slotKey,...spec});
  return {message:'Delivery slot saved.',error:null};
 }catch{return {message:null,error:'The slot could not be saved. Check the date, times and delivery limit, then reload if someone else changed it. Existing reservations must fit within the limit; a reserved time window cannot be moved.'};}
}
type Slot={slotKey:string;date:string;start:string;end:string;capacity:number;reserved:number;available:boolean;revision:number};
function SlotForm({slot,busy}:{slot?:Slot;busy:boolean}){
 return <Form method="post">
  <input type="hidden" name="intent" value={slot?'update':'create'}/>
  <input type="hidden" name="revision" value={slot?.revision??0}/>
  {slot&&<input type="hidden" name="slotKey" value={slot.slotKey}/>}
  <s-stack gap="base">
   <label>Delivery date (Singapore)<input type="date" name="date" required defaultValue={slot?.date}/></label>
   <label>Start time (Singapore)<input type="time" name="start" required defaultValue={slot?.start}/></label>
   <label>End time (Singapore)<input type="time" name="end" required defaultValue={slot?.end}/></label>
   <label>Maximum deliveries<input type="number" name="capacity" min="1" max="2147483647" step="1" required defaultValue={slot?.capacity}/></label>
   <label><input type="checkbox" name="available" value="yes" defaultChecked={slot?.available??true}/> Available for new reservations</label>
   {slot&&<s-paragraph>{slot.reserved} of {slot.capacity} places reserved</s-paragraph>}
   <button type="submit" disabled={busy}>{slot?'Save changes':'Add delivery slot'}</button>
  </s-stack>
 </Form>;
}
export default function ReadyDeliverySlots(){
 const data=useLoaderData<typeof loader>(),result=useActionData<typeof action>(),busy=useNavigation().state!=='idle';
 return <s-page heading="Ready Series delivery slots">
  <s-link slot="breadcrumb-actions" href="/app">Core</s-link>
  <s-section heading="Delivery capacity">
   <s-paragraph>All dates and times use Singapore time. Set the maximum deliveries for each slot. Closing a slot keeps its existing reservations and prevents new ones.</s-paragraph>
   {!data.enabled?<s-paragraph>Delivery slot management is awaiting activation.</s-paragraph>:<s-paragraph>Development verification: internal reservations do not confirm Shopify delivery bookings or send customer reminders.</s-paragraph>}
   {result?.message&&<p role="status">{result.message}</p>}{result?.error&&<p role="alert">{result.error}</p>}
  </s-section>
  {data.enabled&&<><s-section heading="Add a delivery slot"><SlotForm busy={busy}/></s-section>
   {data.slots.map(slot=><s-section key={slot.slotKey+':'+slot.revision} heading={slot.date+' · '+slot.start+'–'+slot.end}><SlotForm slot={slot} busy={busy}/></s-section>)}
   {data.nextUrl&&<s-link href={data.nextUrl}>Next delivery slots</s-link>}
  </>}
 </s-page>;
}
