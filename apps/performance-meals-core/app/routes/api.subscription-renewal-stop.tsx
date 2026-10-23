import type{ActionFunctionArgs,LoaderFunctionArgs}from'react-router';
import{authenticate,unauthenticated}from'../shopify.server';
import{assertShop,privateHeaders}from'../services/security.server';
import{stopFutureSubscriptionRenewals}from'../services/subscription-renewal-stop.server';
export async function loader({request}:LoaderFunctionArgs){const{cors}=await authenticate.public.customerAccount(request);return cors(new Response(null,{status:405,headers:{...privateHeaders,Allow:'POST'}}));}
// No storefront/account control enables this route yet. Identity is exclusively
// from Shopify's verified account token; the payload conveys intent, not owner.
export async function action({request}:ActionFunctionArgs){
 const{sessionToken,cors}=await authenticate.public.customerAccount(request);
 const shop=sessionToken.dest.replace(/^https:\/\//,'').replace(/\/$/,'');assertShop(shop);
 const customerGid=sessionToken.sub;
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid||''))return cors(Response.json({error:'Sign in required'},{status:401,headers:privateHeaders}));
 if(request.method!=='POST')return cors(new Response(null,{status:405,headers:{...privateHeaders,Allow:'POST'}}));
 if(process.env.NODE_ENV==='production'||process.env.CORE_SUBSCRIPTION_RENEWAL_STOPS_ENABLED!=='true')return cors(Response.json({error:'Future-renewal management is not activated.'},{status:403,headers:privateHeaders}));
 let contractGid:string,requestKey:string;
 try{
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error();const reader=request.body?.getReader();if(!reader)throw Error();
  let length=0,text='';const decoder=new TextDecoder();for(;;){const{done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>512){await reader.cancel();throw Error();}text+=decoder.decode(value,{stream:true});}
  const body=JSON.parse(text+decoder.decode());
  if(!body||typeof body!=='object'||Object.keys(body).sort().join(',')!=='confirmation,contractGid,requestKey'||body.confirmation!=='STOP_FUTURE_RENEWALS'||typeof body.contractGid!=='string'||!/^gid:\/\/shopify\/SubscriptionContract\/\d+$/.test(body.contractGid)||typeof body.requestKey!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.requestKey))throw Error();
  ({contractGid,requestKey}=body);
 }catch{return cors(Response.json({error:'Confirm that you want to stop future renewals.'},{status:400,headers:privateHeaders}));}
 try{
  const{admin}=await unauthenticated.admin(shop);const result=await stopFutureSubscriptionRenewals(admin,shop,customerGid!,contractGid,requestKey);
  return cors(Response.json(result,{status:result.futureRenewalsStopped?200:409,headers:privateHeaders}));
 }catch{return cors(Response.json({error:'We could not confirm the renewal change. Contact Support before trying again.',futureRenewalsStopped:false},{status:409,headers:privateHeaders}));}
}
