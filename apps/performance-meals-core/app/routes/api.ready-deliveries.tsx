import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {authenticate,unauthenticated} from '../shopify.server';
import {assertShop,privateHeaders} from '../services/security.server';
import {readyBookingActive} from '../services/ready-booking-policy.server';
import {readCustomerReadyDeliveries,readyBookingReadable} from '../services/ready-booking-read.server';
import {performReadyCustomerBooking,readReadyBookingRequest,readyBookingCommand,ReadyBookingRejected} from '../services/ready-customer-booking.server';
async function context(request:Request){const auth=await authenticate.public.customerAccount(request),shop=auth.sessionToken.dest.replace(/^https:\/\//,'').replace(/\/$/,'');assertShop(shop);return {...auth,shop,customerGid:auth.sessionToken.sub};}
export async function loader({request}:LoaderFunctionArgs){
 const {cors,shop,customerGid}=await context(request);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid??''))return cors(Response.json({error:'Sign in required'},{status:401,headers:privateHeaders}));
 if(!readyBookingReadable(shop,customerGid!))return cors(Response.json({visible:false},{headers:privateHeaders}));
 try{
  const url=new URL(request.url),key=url.searchParams.get('requestKey'),afterSlot=url.searchParams.get('afterSlot')??undefined;
  if(key)return cors(Response.json(await readReadyBookingRequest(shop,customerGid!,key),{headers:privateHeaders}));
  const {admin}=await unauthenticated.admin(shop);return cors(Response.json(await readCustomerReadyDeliveries(admin,shop,customerGid!,{afterSlot}),{headers:privateHeaders}));
 }catch{return cors(Response.json({error:'Your delivery information could not be loaded. Please try again or contact Support.'},{status:503,headers:privateHeaders}));}
}
export async function action({request}:ActionFunctionArgs){
 const {cors,shop,customerGid}=await context(request);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid??''))return cors(Response.json({error:'Sign in required'},{status:401,headers:privateHeaders}));
 if(request.method!=='POST')return cors(new Response(null,{status:405,headers:{...privateHeaders,Allow:'POST'}}));
 if(!readyBookingReadable(shop,customerGid!)||!readyBookingActive(shop,customerGid!))return cors(Response.json({error:'Delivery changes are not available here.'},{status:403,headers:privateHeaders}));
 let body:unknown;
 try{
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error();const reader=request.body?.getReader();if(!reader)throw Error();let bytes=0,text='';const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2048){await reader.cancel();throw Error();}text+=decoder.decode(value,{stream:true});}body=readyBookingCommand(JSON.parse(text+decoder.decode()));
 }catch{return cors(Response.json({error:'Choose a delivery and an available slot.'},{status:400,headers:privateHeaders}));}
 try{const {admin}=await unauthenticated.admin(shop);return cors(Response.json(await performReadyCustomerBooking(admin,shop,customerGid!,body),{headers:privateHeaders}));}
 catch(error){return cors(Response.json({state:error instanceof ReadyBookingRejected?'REJECTED':'UNCONFIRMED',error:'The change could not be confirmed. Reload your deliveries before trying again, or contact Support. Your renewal billing has not changed.'},{status:409,headers:privateHeaders}));}
}
