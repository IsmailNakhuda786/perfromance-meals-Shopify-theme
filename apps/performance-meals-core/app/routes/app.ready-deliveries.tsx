import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {Form,useActionData,useLoaderData,useNavigation} from 'react-router';
import {authenticate} from '../shopify.server';
import {assertShop} from '../services/security.server';
import db from '../db.server';
import {readyBookingActive,readyHolidayCalendar,configureReadyBookingPolicy} from '../services/ready-booking-policy.server';
import {prepareReadyBookingCalendar} from '../services/ready-booking-calendar.server';
import {readCustomerReadyDeliveries} from '../services/ready-booking-read.server';
const scope=(shop:string)=>{const customerGid=process.env.CORE_READY_BOOKING_QA_CUSTOMER??'',orderGid=process.env.CORE_READY_BOOKING_QA_ORDER??'';return {customerGid,orderGid,enabled:readyBookingActive(shop,customerGid)&&/^gid:\/\/shopify\/Order\/\d+$/.test(orderGid)};};
const stamp=(at:string)=>new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',dateStyle:'medium',timeStyle:'short'}).format(new Date(at));
export async function loader({request}:LoaderFunctionArgs){
 const {session,admin}=await authenticate.admin(request);assertShop(session.shop);const s=scope(session.shop);
 if(!s.enabled)return {enabled:false as const,policy:null,deliveries:null,orderGid:null};
 const record=await db.readyDeliveryPolicy.findUnique({where:{shop:session.shop}});
 const policy=record?{noticeHours:record.noticeHours,revision:record.revision,...readyHolidayCalendar(JSON.parse(record.holidayCalendar))}:null;
 const deliveries=await readCustomerReadyDeliveries(admin,session.shop,s.customerGid);
 return {enabled:true as const,policy,deliveries,orderGid:s.orderGid};
}
export async function action({request}:ActionFunctionArgs){
 const {session,admin}=await authenticate.admin(request);assertShop(session.shop);const s=scope(session.shop);
 if(request.method!=='POST')throw new Response('Method not allowed',{status:405});
 if(!s.enabled)throw new Response('Customer delivery management is not activated',{status:403});
 try{const form=await request.formData(),intent=form.get('intent');
  if(intent==='policy'){
   const hours=form.get('noticeHours'),revision=form.get('revision'),years=form.get('years'),closed=form.get('closedDates'),source=form.get('source');
   if(typeof hours!=='string'||!/^\d{1,4}$/.test(hours)||typeof revision!=='string'||!/^\d{1,9}$/.test(revision)||typeof years!=='string'||typeof closed!=='string'||typeof source!=='string')throw Error();
   const yearList=years.split(/[\s,]+/).filter(Boolean);if(yearList.some(y=>!/^\d{4}$/.test(y)))throw Error();
   await configureReadyBookingPolicy({shop:session.shop,noticeHours:Number(hours),expectedRevision:Number(revision),calendar:{years:yearList.map(Number),closedDates:closed.split(/[\s,]+/).filter(Boolean),source}});
   return {message:'Delivery policy saved. Official public holidays remain closed; existing bookings and billing were not changed.',error:null};
  }
  if(intent==='prepare'){
   if(form.get('orderGid')!==s.orderGid)throw Error();
   const result=await prepareReadyBookingCalendar(admin,session.shop,s.customerGid,s.orderGid);
   return {message:result.created?'Original monthly calendar prepared from the next available delivery slot. No Shopify dates or payments changed.':'The original calendar already exists; no delivery date was replaced.',error:null};
  }
  throw Error();
 }catch{return {message:null,error:'The delivery change could not be saved. Check calendar coverage, available slots and the latest policy revision. Existing paid dates will not be overwritten.'};}
}
export default function ReadyDeliveriesAdmin(){
 const data=useLoaderData<typeof loader>(),result=useActionData<typeof action>(),busy=useNavigation().state!=='idle',deliveries=data.deliveries?.visible?data.deliveries:null;
 return <s-page heading="Ready Series customer deliveries"><s-link slot="breadcrumb-actions" href="/app">Core</s-link>
  <s-section heading="Delivery calendar"><s-paragraph>Core records the customer delivery date and time. Shopify keeps the original order, payment and fulfilment work records. A delivery change does not change renewal billing.</s-paragraph>
   {!data.enabled&&<s-paragraph>Customer delivery management is awaiting activation.</s-paragraph>}
   {result?.message&&<p role="status">{result.message}</p>}{result?.error&&<p role="alert">{result.error}</p>}
   <s-link href="/app/ready-delivery-slots">Manage delivery slots and limits</s-link>
  </s-section>
  {data.enabled&&<>
   <s-section heading="Notice and closures"><Form method="post"><input type="hidden" name="intent" value="policy"/><input type="hidden" name="revision" value={data.policy?.revision??0}/>
    <label>Hours required for delivery changes<input name="noticeHours" type="number" min="1" max="8760" required defaultValue={data.policy?.noticeHours??72}/></label>
    <label>Calendar years covered<input name="years" required placeholder="2026, 2027" defaultValue={data.policy?.years.join(', ')}/></label>
    <label>Closed dates, one per line (official holidays are always retained)<textarea name="closedDates" defaultValue={data.policy?.closedDates.join('\n')}/></label>
    <label>Calendar source or approval reference<input name="source" required maxLength={1000} defaultValue={data.policy?.source}/></label>
    <s-paragraph>Singapore public holidays for 2026 and 2027 are checked against the published Ministry of Manpower calendars. Saturdays are unavailable. Missing future-year coverage blocks bookings.</s-paragraph>
    <button type="submit" disabled={busy}>Save delivery policy</button>
   </Form></s-section>
   <s-section heading="Original package calendar"><s-paragraph>Prepare the next available first delivery and the approved monthly dates. Existing calendar records are preserved.</s-paragraph>
    <Form method="post"><input type="hidden" name="intent" value="prepare"/><input type="hidden" name="orderGid" value={data.orderGid??''}/><button type="submit" disabled={busy||!data.policy}>Prepare original calendar</button></Form>
    {deliveries&&!deliveries.calendarPrepared&&<s-paragraph>This order still needs its original calendar prepared.</s-paragraph>}
   </s-section>
   <s-section heading="Customer bookings">
    {deliveries?.bookings.map(b=><s-section key={b.id+':'+b.revision} heading={b.orderName}><s-paragraph>{b.deliveryAt?stamp(b.deliveryAt):'Date requires review'} · {b.packages??'Unknown'} packages · one delivery visit</s-paragraph><s-paragraph>{b.reviewRequired?'Support review required':'Booked in Core delivery calendar'}</s-paragraph></s-section>)}
    {!deliveries?.bookings.length&&<s-paragraph>No customer bookings recorded for this development verification.</s-paragraph>}
   </s-section>
  </>}
 </s-page>;
}
