import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {authenticate} from '../shopify.server';
import {proxyCustomer,issueNonce,validateNonce,privateHeaders} from '../services/security.server';
import {prepareBundleReview} from '../services/bundle-reviews.server';
async function context(request:Request){
 if(process.env.BUNDLE_REVIEW_ENABLED!=='true')throw new Response('Bundle review is not enabled',{status:404,headers:privateHeaders});
 const verified=await authenticate.public.appProxy(request);
 if(!verified.admin||!verified.session)throw new Response('App unavailable',{status:503,headers:privateHeaders});
 const shop=verified.session.shop,customerGid=proxyCustomer(request,shop);
 if(!process.env.SHOPIFY_API_SECRET)throw new Response('App unavailable',{status:503,headers:privateHeaders});
 return {shop,customerGid,admin:verified.admin};
}
export async function loader({request}:LoaderFunctionArgs){
 const {shop,customerGid}=await context(request);
 return Response.json({nonce:issueNonce(shop,customerGid,process.env.SHOPIFY_API_SECRET!)},{headers:privateHeaders});
}
export async function action({request}:ActionFunctionArgs){
 const {shop,customerGid,admin}=await context(request);
 if(request.method!=='POST'||!request.headers.get('content-type')?.startsWith('application/json'))throw new Response('Unsupported request',{status:415,headers:privateHeaders});
 const text=await request.text();if(text.length>4096)throw new Response('Review payload too large',{status:413,headers:privateHeaders});
 let body;try{body=JSON.parse(text);}catch{throw new Response('Invalid JSON',{status:400,headers:privateHeaders});}
 if(!body||typeof body!=='object'||!validateNonce(body.nonce,shop,customerGid,process.env.SHOPIFY_API_SECRET!))throw new Response('Reload your review session',{status:403,headers:privateHeaders});
 if(typeof body.productGid!=='string'||typeof body.variantGid!=='string'||!Number.isSafeInteger(body.quantity)||body.quantity<1)throw new Response('Invalid bundle review',{status:400,headers:privateHeaders});
 try{
  const review=await prepareBundleReview(admin,{shop,customerGid,productGid:body.productGid,variantGid:body.variantGid,quantity:body.quantity});
  return Response.json({id:review.id,hash:review.snapshotHash,quantity:review.quantity,snapshot:JSON.parse(review.snapshot)},{headers:privateHeaders});
 }catch{return Response.json({error:'Bundle review could not be confirmed. Reload the current catalogue before checkout.'},{status:422,headers:privateHeaders});}
}
