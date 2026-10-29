import db from '../db.server';
import {assertPrepaidPurchaseIntakeScope,receivePrepaidPurchaseTrigger,processPrepaidPurchaseTrigger} from './prepaid-purchase-intake.server';

type Admin=Parameters<typeof processPrepaidPurchaseTrigger>[0];
export const PREPAID_PURCHASE_DISCOVERY_QUERY=`#graphql
query CorePrepaidPurchaseDiscovery($first:Int!,$after:String,$query:String!){
 shop{myshopifyDomain currencyCode plan{partnerDevelopment}}
 currentAppInstallation{app{id}}
 subscriptionContracts(first:$first,after:$after,query:$query){
  nodes{id app{id} customer{id} originOrder{id}
   lines(first:100){nodes{id productId variantId sellingPlanId}pageInfo{hasNextPage}}
  }pageInfo{hasNextPage endCursor}
 }
}`;
const ref=(kind:string,value:unknown):value is string=>typeof value==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(value);
const subscriptionLine=(value:unknown)=>typeof value==='string'&&/^gid:\/\/shopify\/SubscriptionLine\/[A-Za-z0-9_-]{1,128}$/.test(value);
type Discovery={contractGid:string;orderGid:string|null;state:'APPROVED_CANDIDATE'|'PRICING_REVIEW'|'NATIVE_REVIEW'|'COMPLETED'};
// A missing webhook is recoverable from Shopify's authoritative contract list.
// Discovery is read-only, bounded and owner-scoped; it never asserts payment.
export async function discoverPrepaidPurchases(admin:Admin,shop:string,options:{limit?:number;after?:string}={}){
 const customer=assertPrepaidPurchaseIntakeScope(shop),limit=options.limit??10;
 if(!Number.isSafeInteger(limit)||limit<1||limit>50||options.after!==undefined&&(typeof options.after!=='string'||!options.after.length||options.after.length>2048))throw Error('Bounded native purchase page required');
 const response=await admin.graphql(PREPAID_PURCHASE_DISCOVERY_QUERY,{variables:{first:limit,after:options.after??null,query:'customer_id:'+customer.split('/').at(-1)}}),body=await response.json(),d=body.data,page=d?.subscriptionContracts;
 if(!response.ok||body.errors||d?.shop?.myshopifyDomain!==shop||d.shop.currencyCode!=='SGD'||d.shop.plan?.partnerDevelopment!==true||!ref('App',d.currentAppInstallation?.app?.id)||!page||!Array.isArray(page.nodes)||page.nodes.length>limit||typeof page.pageInfo?.hasNextPage!=='boolean')throw Error('Complete native purchase discovery unavailable');
 const seen=new Set<string>(),candidates:Discovery[]=[];
 // Validate the whole page before returning candidates to any writer.
 for(const c of page.nodes){
  if(!ref('SubscriptionContract',c?.id)||seen.has(c.id)||c.customer?.id!==customer||c.app?.id!==d.currentAppInstallation.app.id)throw Error('Native purchase ownership or complete lines differ');
  seen.add(c.id);
  const previous=await db.prepaidPurchaseInbox.findUnique({where:{shop_contractGid:{shop,contractGid:c.id}}});
  if(previous&&previous.customerGid!==customer)throw Error('Purchase inbox ownership differs');
  if(!ref('Order',c.originOrder?.id)||c.lines?.pageInfo?.hasNextPage!==false||!Array.isArray(c.lines.nodes)||!c.lines.nodes.length||c.lines.nodes.length>100||new Set(c.lines.nodes.map((l:{id:string})=>l?.id)).size!==c.lines.nodes.length||c.lines.nodes.some((l:{id:string;productId:string;variantId:string;sellingPlanId:string})=>!subscriptionLine(l?.id)||!ref('Product',l?.productId)||!ref('ProductVariant',l?.variantId)||!ref('SellingPlan',l?.sellingPlanId))){
   candidates.push({contractGid:c.id,orderGid:ref('Order',c.originOrder?.id)?c.originOrder.id:null,state:'NATIVE_REVIEW'});continue;
  }
  let approved=true;
  for(const line of c.lines.nodes){
   if(!subscriptionLine(line?.id)||!ref('Product',line.productId)||!ref('ProductVariant',line.variantId)||!ref('SellingPlan',line.sellingPlanId))throw Error('Complete native product identity required');
   const pricing=await db.prepaidPricingApproval.findUnique({where:{shop_variantGid_sellingPlanGid:{shop,variantGid:line.variantId,sellingPlanGid:line.sellingPlanId}}});
   if(!pricing||pricing.customerGid!==customer)approved=false;
  }
  candidates.push({contractGid:c.id,orderGid:c.originOrder.id,state:previous?.state==='COMPLETED'&&previous.completedAt?'COMPLETED':approved?'APPROVED_CANDIDATE':'PRICING_REVIEW'});
 }
 const more=page.pageInfo.hasNextPage,next=page.pageInfo.endCursor;
 if(more&&(!page.nodes.length||typeof next!=='string'||!next.length||next.length>2048||next===options.after))throw Error('Native discovery cursor did not advance');
 return {candidates,hasMore:more,nextCursor:more?next as string:null};
}
// Explicit internal recovery job, behind the same disabled development gates.
// Stable trigger identity converges with concurrent/replayed provider delivery.
// Discovery never bypasses the existing exact payment/economics verifier.
export async function recoverPrepaidPurchasePage(admin:Admin,shop:string,options:{limit?:number;after?:string}={}){
 const page=await discoverPrepaidPurchases(admin,shop,options),results=[];
 for(const candidate of page.candidates){
  if(candidate.state!=='APPROVED_CANDIDATE'){results.push({...candidate,state:candidate.state==='COMPLETED'?'ALREADY_COMPLETED' as const:candidate.state});continue;}
  try{
   const received=await receivePrepaidPurchaseTrigger(shop,candidate.contractGid,'native-recovery:'+candidate.contractGid.split('/').at(-1));
   await processPrepaidPurchaseTrigger(admin,shop,received.inboxId);
   results.push({...candidate,state:'COMPLETED' as const});
  }catch{results.push({...candidate,state:'HELD' as const});}
 }
 return {results,hasMore:page.hasMore,nextCursor:page.nextCursor};
}
