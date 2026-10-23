import {createHash} from 'node:crypto';
import db from '../db.server';
import {assertShop} from './security.server';
import {validSubscriptionLineGid} from './subscription-reference';

export const RENEWAL_STOP_READ=`#graphql
query CoreRenewalStopContext($id:ID!){shop{myshopifyDomain currencyCode}currentAppInstallation{app{id}}subscriptionContract(id:$id){id status currencyCode app{id}customer{id}originOrder{id customer{id}}lines(first:100){nodes{id productId variantId sellingPlanId quantity}pageInfo{hasNextPage}}}}
`;
export const RENEWAL_STOP_MUTATION=`#graphql
mutation CoreStopFutureRenewals($id:ID!){subscriptionContractCancel(subscriptionContractId:$id,actor:CUSTOMER){contract{id status}userErrors{field message}}}
`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
type Line={id:string;productId:string;variantId:string;sellingPlanId:string;quantity:number};
const ref=(kind:string,value:unknown)=>typeof value==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(value);
const uuid=(value:unknown)=>typeof value==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
export class RenewalStopError extends Error {}
function context(shop:string,customerGid:string,contractGid:string,requestKey:string){
 assertShop(shop);
 if(process.env.NODE_ENV==='production'||process.env.CORE_SUBSCRIPTION_RENEWAL_STOPS_ENABLED!=='true')throw new RenewalStopError('Future-renewal management is not activated');
 if(!ref('Customer',customerGid)||!ref('SubscriptionContract',contractGid)||!uuid(requestKey))throw new RenewalStopError('Invalid renewal-stop context');
 const allowed=(process.env.CORE_SUBSCRIPTION_RENEWAL_STOP_QA_CONTRACTS||'').split(',');
 if(customerGid!==process.env.CORE_SUBSCRIPTION_RENEWAL_STOP_QA_CUSTOMER||!allowed.includes(contractGid))throw new RenewalStopError('Outside the approved subscription QA scope');
}
async function readBinding(admin:Admin,shop:string,customerGid:string,id:string){
 const response=await admin.graphql(RENEWAL_STOP_READ,{variables:{id}}),body=await response.json(),d=body.data,c=d?.subscriptionContract;
 if(!response.ok||body.errors||d?.shop?.myshopifyDomain!==shop||d.shop.currencyCode!=='SGD'||!ref('App',d.currentAppInstallation?.app?.id)||c?.id!==id||c.app?.id!==d.currentAppInstallation.app.id||c.customer?.id!==customerGid||c.originOrder?.customer?.id!==customerGid||!ref('Order',c.originOrder?.id)||c.currencyCode!=='SGD'||!['ACTIVE','PAUSED','CANCELLED'].includes(c.status)||c.lines?.pageInfo?.hasNextPage!==false||!Array.isArray(c.lines.nodes)||!c.lines.nodes.length)throw new RenewalStopError('Fresh subscription ownership is unavailable');
 const lines=c.lines.nodes as Line[];
 if(new Set(lines.map(l=>l.id)).size!==lines.length||lines.some(l=>!validSubscriptionLineGid(l.id)||!ref('Product',l.productId)||!ref('ProductVariant',l.variantId)||!ref('SellingPlan',l.sellingPlanId)||!Number.isSafeInteger(l.quantity)||l.quantity<1))throw new RenewalStopError('Complete subscription lines are required');
 const rows=await db.operationalLine.findMany({where:{shop,customerGid,contractGid:id,orderGid:c.originOrder.id},take:101});
 if(!rows.length||rows.length>100||rows.some(r=>r.validationStatus!=='VALIDATED'||!['meal_plan','ready_series'].includes(r.businessStream||''))||lines.some(l=>rows.filter(r=>r.productGid===l.productId&&r.variantGid===l.variantId).length!==1)||rows.some(r=>lines.filter(l=>l.productId===r.productGid&&l.variantId===r.variantGid).length!==1))throw new RenewalStopError('Validated original subscription mapping is required');
 for(const row of rows){
  if(row.businessStream==='ready_series'&&row.selectionId||row.businessStream==='meal_plan'&&!row.selectionId)throw new RenewalStopError('Original subscription selection differs');
  if(row.selectionId){const selection=await db.mealPlanSelection.findFirst({where:{id:row.selectionId,shop,customerGid,contractGid:id,orderGid:c.originOrder.id,orderLineGid:row.orderLineGid,programmeGid:row.productGid!,variantGid:row.variantGid!,status:'ORDERED',businessStream:'meal_plan'}});if(!selection||!lines.some(l=>l.productId===row.productGid&&l.variantId===row.variantGid&&l.sellingPlanId===selection.sellingPlanGid))throw new RenewalStopError('Paid programme entitlement requires review');}
 }
 const bindingHash=createHash('sha256').update(JSON.stringify({shop,customerGid,id,app:c.app.id,origin:c.originOrder.id,lines:lines.map(l=>[l.id,l.productId,l.variantId,l.sellingPlanId,l.quantity]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))})).digest('hex');
 return {status:c.status as 'ACTIVE'|'PAUSED'|'CANCELLED',originOrderGid:c.originOrder.id as string,bindingHash};
}
// Read-only account capability: unavailable/uncertain evidence hides the action.
// Default-off means an unapplied audit-table migration cannot break account reads.
export async function readRenewalStopAvailability(admin:Admin,shop:string,customerGid:string,contractGid:string){
 try{
  context(shop,customerGid,contractGid,'00000000-0000-4000-8000-000000000000');
  const binding=await readBinding(admin,shop,customerGid,contractGid);
  const operation=await db.subscriptionRenewalStop.findUnique({where:{shop_contractGid:{shop,contractGid}}});
  if(operation&&(operation.customerGid!==customerGid||operation.originOrderGid!==binding.originOrderGid||operation.bindingHash!==binding.bindingHash))return {canStop:false,reviewRequired:true};
  if(binding.status==='CANCELLED')return {canStop:false,reviewRequired:false};
  return {canStop:!operation,reviewRequired:!!operation};
 }catch{return {canStop:false,reviewRequired:false};}
}

// Internal development seam, not a public customer endpoint. Never refunds,
// cancels paid orders, changes selections, releases entitlements or pauses billing.
// Save intent before native submission; unknown outcomes are read-reconciled,
// never blindly re-submitted. The QA scope is independent of general sales.
export async function stopFutureSubscriptionRenewals(admin:Admin,shop:string,customerGid:string,contractGid:string,requestKey:string){
 context(shop,customerGid,contractGid,requestKey);
 const binding=await readBinding(admin,shop,customerGid,contractGid),where={shop_contractGid:{shop,contractGid}};
 let operation=await db.subscriptionRenewalStop.findUnique({where}),claimed=false;
 if(!operation){try{operation=await db.subscriptionRenewalStop.create({data:{shop,customerGid,contractGid,originOrderGid:binding.originOrderGid,bindingHash:binding.bindingHash,requestKey,state:'REQUESTING'}});claimed=true;}catch(error){if(!(error&&typeof error==='object'&&'code'in error&&error.code==='P2002'))throw error;operation=await db.subscriptionRenewalStop.findUnique({where});}}
 if(!operation||!['REQUESTING','UNKNOWN','REVIEW','COMPLETED'].includes(operation.state)||operation.customerGid!==customerGid||operation.originOrderGid!==binding.originOrderGid||operation.bindingHash!==binding.bindingHash)throw new RenewalStopError('Recorded renewal-stop identity differs');
 const output=(state:string)=>({id:operation!.id,contractGid,state,futureRenewalsStopped:state==='COMPLETED',paidEntitlementsUnchanged:true as const,refundIssued:false as const});
 const complete=async()=>{
  await db.subscriptionRenewalStop.updateMany({where:{id:operation!.id,shop,customerGid,bindingHash:binding.bindingHash,state:{in:['REQUESTING','UNKNOWN','REVIEW']}},data:{state:'COMPLETED',confirmedAt:new Date()}});
  const saved=await db.subscriptionRenewalStop.findUnique({where});
  if(!saved||saved.id!==operation!.id||saved.customerGid!==customerGid||saved.bindingHash!==binding.bindingHash||saved.state!=='COMPLETED'||saved.confirmedAt===null)throw new RenewalStopError('Renewal-stop audit confirmation unavailable');
  return output('COMPLETED');
 };
 if(binding.status==='CANCELLED')return complete();
 if(operation.state==='COMPLETED'){const latest=await readBinding(admin,shop,customerGid,contractGid);if(latest.status==='CANCELLED'&&latest.bindingHash===binding.bindingHash)return complete();throw new RenewalStopError('Previously stopped contract changed; Support review required');}
 if(!claimed)return output(operation.state);
 try{
  const fresh=await readBinding(admin,shop,customerGid,contractGid);
  if(fresh.bindingHash!==binding.bindingHash||fresh.status!==binding.status){await db.subscriptionRenewalStop.updateMany({where:{id:operation.id,shop,state:'REQUESTING'},data:{state:'REVIEW'}});return output('REVIEW');}
  const response=await admin.graphql(RENEWAL_STOP_MUTATION,{variables:{id:contractGid}}),body=await response.json(),result=body.data?.subscriptionContractCancel;
  if(!response.ok||body.errors||!result||!Array.isArray(result.userErrors))throw Error('Native cancellation outcome unconfirmed');
  if(result.userErrors.length){await db.subscriptionRenewalStop.updateMany({where:{id:operation.id,shop,state:'REQUESTING'},data:{state:'REVIEW'}});return output('REVIEW');}
  if(result.contract?.id!==contractGid||result.contract.status!=='CANCELLED')throw Error('Native cancellation outcome unconfirmed');
  const after=await readBinding(admin,shop,customerGid,contractGid);
  if(after.bindingHash!==binding.bindingHash||after.status!=='CANCELLED')throw Error('Native final state requires reconciliation');
  return await complete();
 }catch{
  await db.subscriptionRenewalStop.updateMany({where:{id:operation.id,shop,customerGid,state:'REQUESTING'},data:{state:'UNKNOWN'}});
  return output('UNKNOWN');
 }
}
