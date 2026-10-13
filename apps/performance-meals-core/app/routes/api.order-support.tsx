import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {authenticate,unauthenticated} from '../shopify.server';
import {assertShop,privateHeaders} from '../services/security.server';
import {requestOrderSupport} from '../services/order-support.server';
import {nativeCancellationGateway} from '../services/order-cancellation-native.server';
export async function loader({request}:LoaderFunctionArgs){
 const {cors}=await authenticate.public.customerAccount(request);
 return cors(new Response(null,{status:405,headers:{...privateHeaders,Allow:'POST'}}));
}
export async function action({request}:ActionFunctionArgs){
 const {sessionToken,cors}=await authenticate.public.customerAccount(request);
 const shop=sessionToken.dest.replace(/^https:\/\//,'').replace(/\/$/,'');assertShop(shop);
 const customerGid=sessionToken.sub;
 if(!customerGid||!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid))return cors(new Response('Sign in required',{status:401,headers:privateHeaders}));
 if(request.method!=='POST')return cors(new Response(null,{status:405,headers:{...privateHeaders,Allow:'POST'}}));
 let orderGid:string;
 try{
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error();
  const reader=request.body?.getReader();if(!reader)throw Error();
  let length=0,text='';const decoder=new TextDecoder();
  for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>256){await reader.cancel();throw Error();}text+=decoder.decode(value,{stream:true});}
  const body=JSON.parse(text+decoder.decode());if(Object.keys(body).join(',')!=='orderGid'||typeof body.orderGid!=='string')throw Error();orderGid=body.orderGid;
 }catch{return cors(Response.json({error:'Invalid order request.'},{status:400,headers:privateHeaders}));}
 try{
  const {admin}=await unauthenticated.admin(shop);
  const result=await requestOrderSupport(shop,customerGid,orderGid,nativeCancellationGateway(admin,shop));
  return cors(Response.json({id:result.id,state:result.state},{headers:privateHeaders}));
 }catch{return cors(Response.json({error:'Your Support request could not be saved. No cancellation or refund was performed.'},{status:409,headers:privateHeaders}));}
}
