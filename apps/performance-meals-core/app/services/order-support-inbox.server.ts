import db from '../db.server';
import {assertShop} from './security.server';

export const supportInboxEnabled=()=>process.env.NODE_ENV!=='production'&&process.env.CORE_SUPPORT_INBOX_ENABLED==='true';
const id=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(v);
function summary(raw:string){
 try{
  if(raw.length>65536)throw Error('Evidence too large');
  const e=JSON.parse(raw);
  if(!e||typeof e!=='object'||!['SGD'].includes(e.currency)||!Number.isSafeInteger(e.totalMinor)||e.totalMinor<0||typeof e.paid!=='boolean'||typeof e.alreadyCancelled!=='boolean'||typeof e.hasEverDispatched!=='boolean'||typeof e.observedAt!=='string'||!Number.isFinite(Date.parse(e.observedAt)))throw Error('Evidence unavailable');
  // Deliberately project only review facts. Raw funding evidence, identities and
  // arbitrary historical payload fields never enter the merchant-page response.
  return {available:true as const,currency:e.currency,totalMinor:e.totalMinor,paid:e.paid,cancelled:e.alreadyCancelled,dispatched:e.hasEverDispatched,observedAt:new Date(e.observedAt).toISOString(),fundingVerified:e.originalFundingMatchesCurrent===true&&e.walletAttributionComplete===true};
 }catch{return {available:false as const};}
}
export async function listOrderSupportInbox(shop:string,options:{after?:string;limit?:number}={}){
 assertShop(shop);if(!supportInboxEnabled())throw Error('Support inbox is not activated');
 const limit=options.limit??25;
 if(!Number.isSafeInteger(limit)||limit<1||limit>50||options.after!==undefined&&!id(options.after))throw Error('Invalid Support page');
 const cursor=options.after?await db.orderSupportRequest.findFirst({where:{shop,id:options.after},select:{id:true,createdAt:true}}):null;
 if(options.after&&!cursor)throw Error('Support page unavailable');
 const rows=await db.orderSupportRequest.findMany({where:{shop,...(cursor?{OR:[{createdAt:{lt:cursor.createdAt}},{createdAt:cursor.createdAt,id:{lt:cursor.id}}]}:{})},orderBy:[{createdAt:'desc'},{id:'desc'}],take:limit+1,select:{id:true,orderName:true,state:true,createdAt:true,evidence:true}});
 return {requests:rows.slice(0,limit).map(row=>({id:row.id,orderName:row.orderName,state:row.state,createdAt:row.createdAt.toISOString(),evidence:summary(row.evidence)})),nextCursor:rows.length>limit?rows[limit-1].id:null};
}
