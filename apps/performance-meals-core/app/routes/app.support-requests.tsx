import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {useLoaderData} from 'react-router';
import {authenticate} from '../shopify.server';
import {assertShop} from '../services/security.server';
import {listOrderSupportInbox,supportInboxEnabled} from '../services/order-support-inbox.server';
export async function loader({request}:LoaderFunctionArgs){
 const {session}=await authenticate.admin(request);assertShop(session.shop);
 if(!supportInboxEnabled())return Response.json({enabled:false,requests:[],nextCursor:null},{headers:{'Cache-Control':'no-store, private'}});
 const after=new URL(request.url).searchParams.get('after')??undefined;
 try{return Response.json({enabled:true,...await listOrderSupportInbox(session.shop,{after})},{headers:{'Cache-Control':'no-store, private'}});}
 catch{throw new Response('Support requests could not be loaded. No changes were made.',{status:503,headers:{'Cache-Control':'no-store, private'}});}
}
export async function action({request}:ActionFunctionArgs){
 const {session}=await authenticate.admin(request);assertShop(session.shop);
 return new Response('This inbox is read-only',{status:405,headers:{Allow:'GET','Cache-Control':'no-store, private'}});
}
type Data={enabled:boolean;requests:Awaited<ReturnType<typeof listOrderSupportInbox>>['requests'];nextCursor:string|null};
const stamp=(value:string)=>new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
export default function SupportRequests(){
 const data=useLoaderData<Data>();
 return <s-page heading="Customer Support requests"><s-link slot="breadcrumb-actions" href="/app">Core</s-link>
  <s-section heading="Requests for review"><s-paragraph>Review the facts recorded when the customer asked for help. Check the current order before making a decision. This screen does not approve adjustments, cancel orders or issue refunds.</s-paragraph>
   {!data.enabled?<s-paragraph>The Support inbox is awaiting activation.</s-paragraph>:!data.requests.length?<s-paragraph>No customer requests are available on this page.</s-paragraph>:null}
  </s-section>
  {data.requests.map(row=><s-section key={row.id} heading={row.orderName}>
   <s-paragraph>Request status: {row.state} · Received {stamp(row.createdAt)} Singapore time</s-paragraph>
   {row.evidence.available?<><s-paragraph>Recorded order total: {new Intl.NumberFormat('en-SG',{style:'currency',currency:row.evidence.currency}).format(row.evidence.totalMinor/100)} · {row.evidence.paid?'Paid':'Payment requires review'}</s-paragraph><s-paragraph>{row.evidence.dispatched?'A dispatch was already recorded':'No dispatch was recorded'} · {row.evidence.cancelled?'Order was already cancelled':'Order was not cancelled'}</s-paragraph><s-paragraph>Evidence recorded {stamp(row.evidence.observedAt)} Singapore time. {row.evidence.fundingVerified?'Original payment attribution matched the recorded order.':'Payment attribution requires review.'}</s-paragraph></>:<s-paragraph>The saved request evidence needs review. No financial action is available here.</s-paragraph>}
  </s-section>)}
  {data.enabled&&<s-section>{data.nextCursor&&<s-link href={'/app/support-requests?after='+encodeURIComponent(data.nextCursor)}>Older requests</s-link>}<s-link href="/app/support-requests">Latest requests</s-link></s-section>}
 </s-page>;
}
