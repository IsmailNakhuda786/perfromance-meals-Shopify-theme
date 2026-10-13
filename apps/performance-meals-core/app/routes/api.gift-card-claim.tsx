import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {authenticate,unauthenticated} from '../shopify.server';
import {assertShop,privateHeaders} from '../services/security.server';
import {claimGiftCard} from '../services/gift-card-claim.server';
import {nativeGiftCardGateway} from '../services/gift-card-native.server';
import db from '../db.server';
import {readGiftCardCode} from '../services/gift-card-request';

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
 const policy=await db.commercePolicy.findUnique({where:{shop},select:{giftCardClaimsEnabled:true}});
 if(!policy?.giftCardClaimsEnabled)return cors(Response.json({error:'Gift Card to Wallet conversion is not available yet.'},{status:409,headers:privateHeaders}));
 let code;
 try{code=await readGiftCardCode(request);}
 catch{return cors(Response.json({error:'Enter a valid Gift Card code.'},{status:400,headers:privateHeaders}));}
 try{
  const {admin}=await unauthenticated.admin(shop);
  const claim=await claimGiftCard(shop,customerGid,code,nativeGiftCardGateway(admin,shop));
  return cors(Response.json({id:claim.id,state:claim.state,currency:claim.currency,amountMinor:claim.amountMinor,alreadyCompleted:claim.alreadyCompleted},{headers:privateHeaders}));
 }catch{
  // Do not echo Gift Card codes, native error payloads or financial identifiers.
  return cors(Response.json({error:'The Gift Card transfer could not be confirmed. Check your Wallet history before trying again.'},{status:409,headers:privateHeaders}));
 }
}
