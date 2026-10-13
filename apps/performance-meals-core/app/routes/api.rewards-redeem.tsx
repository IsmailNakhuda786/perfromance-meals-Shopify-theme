import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {authenticate,unauthenticated} from '../shopify.server';
import {assertShop,privateHeaders} from '../services/security.server';
import {redeemRewards} from '../services/rewards-redemption.server';
import {nativeGiftCardGateway} from '../services/gift-card-native.server';
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
 let points:number,requestKey:string;
 try{
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error();
  const reader=request.body?.getReader();if(!reader)throw Error();
  let length=0,text='';const decoder=new TextDecoder();
  for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>512){await reader.cancel();throw Error();}text+=decoder.decode(value,{stream:true});}
  const body=JSON.parse(text+decoder.decode());
  if(Object.keys(body).sort().join(',')!=='points,requestKey'||!Number.isSafeInteger(body.points)||typeof body.requestKey!=='string')throw Error();
  ({points,requestKey}=body);
 }catch{return cors(Response.json({error:'Enter a positive whole number of points.'},{status:400,headers:privateHeaders}));}
 let stage='admin-context';
 try{
  const {admin}=await unauthenticated.admin(shop);
  stage='redemption-service';
  const result=await redeemRewards(shop,customerGid,requestKey,points,nativeGiftCardGateway(admin,shop));
  return cors(Response.json({id:result.id,state:result.state,amountMinor:result.amountMinor,currency:'SGD'},{headers:privateHeaders}));
 }catch(error){
  const safe=['Rewards redemption is not activated','Invalid redemption context','Rewards outside approved QA scope','Insufficient reconciled Rewards','Rewards rules require approval','Invalid Rewards QA scope','Redemption request conflict'];
  const diagnosis=error instanceof Error&&safe.includes(error.message)?error.message:error instanceof Error?error.name:'Unknown error';
  console.warn('Rewards redemption rejected',{stage,diagnosis,revision:'native-store-credit-v2'});
  return cors(Response.json({error:'Redemption could not be confirmed. Check your Rewards and Wallet history before trying again.'},{status:409,headers:privateHeaders}));}
}
