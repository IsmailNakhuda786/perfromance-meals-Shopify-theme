import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {authenticate} from '../shopify.server';
import db from '../db.server';
import {proxyCustomer,issueNonce,validateNonce,privateHeaders} from '../services/security.server';
import {saveDraft,reviewDraft} from '../services/selections.server';
import {paidProgramme,saveProgrammeMenu} from '../services/programme-menus.server';
async function context(request:Request) {
 const verified=await authenticate.public.appProxy(request);
 if(!verified.admin||!verified.session) throw new Response('App unavailable',{status:503});
 const shop=verified.session.shop;const customer=proxyCustomer(request,shop);
 return {shop,customer,admin:verified.admin};
}
export async function loader({request}:LoaderFunctionArgs) {
 const {shop,customer,admin}=await context(request);
 try {
 const selectionId=new URL(request.url).searchParams.get('selection');
 if(selectionId) {
  const record=await paidProgramme(shop,customer,selectionId,admin);
  const menus=await db.mealPlanMenuRevision.findMany({where:{shop,customerGid:customer,selectionId},orderBy:{revision:'desc'}});
  return Response.json({nonce:issueNonce(shop,customer,process.env.SHOPIFY_API_SECRET!),programme:{id:record.id,programmeId:record.programmeGid,variantId:record.variantGid,startsOn:record.startsOn,endsOn:record.endsOn,orderGid:record.orderGid,initialSelections:JSON.parse(record.selections)},menus:menus.map(m=>({block:m.block,revision:m.revision,state:m.state,selections:JSON.parse(m.inputSelections)}))},{headers:privateHeaders});
 }
 const draft=await db.mealPlanDraft.findUnique({where:{shop_customerGid:{shop,customerGid:customer}}});
 return Response.json({nonce:issueNonce(shop,customer,process.env.SHOPIFY_API_SECRET!),draft:draft?{programmeId:draft.programmeGid.split('/').pop(),variantId:draft.variantGid.split('/').pop(),sellingPlanId:draft.sellingPlanGid?.split('/').pop()||'',startMonday:draft.startsOn||'',selections:JSON.parse(draft.selections),revision:draft.revision}:null},{headers:privateHeaders});
 } catch(error) {
  if(error instanceof Response) throw error;
  return Response.json({error:"Your saved selections are temporarily unavailable. Please try again later."},{status:503,headers:privateHeaders});
 }
}
export async function action({request}:ActionFunctionArgs) {
 const {shop,customer,admin}=await context(request);
 if(request.method!=='POST'||!request.headers.get('content-type')?.startsWith('application/json')) throw new Response('Unsupported request',{status:415});
 const bytes=await request.text();if(bytes.length>65536) throw new Response('Selection payload too large',{status:413});
 let body;try {body=JSON.parse(bytes);}catch {throw new Response('Invalid JSON',{status:400});}
 if(!validateNonce(body.nonce,shop,customer,process.env.SHOPIFY_API_SECRET!)) throw new Response('Expired save session; reload',{status:403});
 try {
  if(body.intent==='save-programme-menu') {
   const menu=await saveProgrammeMenu(shop,customer,body.selectionId,body.block,body.input,body.revision,body.complete===true,admin);
   return Response.json({revision:menu.revision,state:menu.state,windows:JSON.parse(menu.selections)},{headers:privateHeaders});
  }
  if(body.intent==='save') {
   const record=await saveDraft(shop,customer,body.input,body.revision,admin);
   return Response.json({revision:record.revision},{headers:privateHeaders});
  }
  if(body.intent==='review') return Response.json(await reviewDraft(shop,customer,body.revision,admin),{headers:privateHeaders});
  throw new Response('Unknown operation',{status:400});
 } catch(error) {
  if(error instanceof Response) throw error;
  return Response.json({error:'Selections could not be saved. Check your programme, menu allocation and cutoff, then retry.'},{status:422,headers:privateHeaders});
 }
}
