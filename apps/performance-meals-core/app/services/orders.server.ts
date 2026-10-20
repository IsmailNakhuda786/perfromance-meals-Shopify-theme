import db from '../db.server';
import {bindBundleReview,BundleBindingError,readNativeBundleSnapshot} from './bundle-reviews.server';
import {bundleUnitPrice,type BundleSnapshot} from './bundle-snapshot';
import {department,STREAMS} from './menu-validation';
import type { AdminApiContext } from '@shopify/shopify-app-react-router/server';
import {assertShop} from './security.server';
export const ORDER_QUERY=`#graphql
query OperationalOrder($id:ID!){shop{myshopifyDomain}order(id:$id){id createdAt customer{id}lineItems(first:250){nodes{id quantity originalUnitPriceSet{shopMoney{amount currencyCode}} customAttributes{key value}product{id isGiftCard stream:metafield(namespace:"performance",key:"business_stream"){jsonValue}}variant{id}sellingPlan{sellingPlanId}}pageInfo{hasNextPage}}}}
`;
type NativeOrder={id:string;createdAt:string;customer?:{id:string};lineItems:{pageInfo:{hasNextPage:boolean};nodes:Array<{id:string;quantity:number;originalUnitPriceSet?:{shopMoney:{amount:string;currencyCode:string}};customAttributes:Array<{key:string;value:string}>;product?:{id:string;isGiftCard:boolean;stream?:{jsonValue:unknown}};variant?:{id:string};sellingPlan?:{sellingPlanId:string}}>}};
const nativeReference=(type:string,value:unknown)=>typeof value==='string'&&new RegExp('^gid://shopify/'+type+'/\\d+$').test(value);
export async function recordOrder(shop:string,orderGid:string,eventId:string,admin:AdminApiContext,topic='orders/create'){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Order\/\d+$/.test(orderGid)||typeof eventId!=='string'||!eventId.trim()||eventId.length>512)throw Error('Invalid order routing context');
 if(await db.webhookReceipt.findUnique({where:{id:`${shop}:${eventId}`}})) return;
 const response=await admin.graphql(ORDER_QUERY,{variables:{id:orderGid}});const result=await response.json() as {errors?:unknown;data?:{shop?:{myshopifyDomain:string};order?:NativeOrder}};
 if(!response.ok||result.errors||result.data?.shop?.myshopifyDomain!==shop||!result.data?.order||result.data.order.lineItems.pageInfo.hasNextPage!==false) throw new Error('Order cannot be safely routed');
 const order=result.data.order;
 const created=new Date(order.createdAt);
 if(order.id!==orderGid||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(order.createdAt)||!Number.isFinite(created.getTime())||created.toISOString().slice(0,19)!==order.createdAt.slice(0,19)||!Array.isArray(order.lineItems.nodes)||order.lineItems.nodes.length>250||new Set(order.lineItems.nodes.map(line=>line?.id)).size!==order.lineItems.nodes.length||order.customer!=null&&!nativeReference('Customer',order.customer.id))throw Error('Order identity or line evidence differs');
 for(const line of order.lineItems.nodes){
  if(!line||!nativeReference('LineItem',line.id)||!Number.isSafeInteger(line.quantity)||line.quantity<1||!Array.isArray(line.customAttributes)||line.customAttributes.some(attribute=>!attribute||typeof attribute.key!=='string'||typeof attribute.value!=='string')||line.product!=null&&(!nativeReference('Product',line.product.id)||typeof line.product.isGiftCard!=='boolean')||line.variant!=null&&!nativeReference('ProductVariant',line.variant.id)||line.sellingPlan!=null&&!nativeReference('SellingPlan',line.sellingPlan.sellingPlanId))throw Error('Order line evidence unavailable');
 }
 // Resolve native catalogue evidence before the transaction, only for opt-in
 // bundle reviews. Transient API/database failures must remain retryable.
 const bundleEvidence=new Map<string,BundleSnapshot>();
 for(const line of order.lineItems.nodes){
  if(!line.customAttributes.some(a=>a.key==='_pm_bundle_review_id'||a.key==='_pm_bundle_review_hash'))continue;
  if(await db.operationalLine.findUnique({where:{shop_orderLineGid:{shop,orderLineGid:line.id}}}))continue;
  if(line.product&&line.variant)bundleEvidence.set(line.id,await readNativeBundleSnapshot(admin,shop,line.product.id,line.variant.id));
 }
 const persist=()=>db.$transaction(async tx=>{
  if(await tx.webhookReceipt.findUnique({where:{id:`${shop}:${eventId}`}})) return;
  for(const line of order.lineItems.nodes){
   const props=Object.fromEntries(line.customAttributes.map((p:{key:string;value:string})=>[p.key,p.value]));
   const stream=line.product?.stream?.jsonValue;
   const duplicateProperties=new Set(line.customAttributes.map(attribute=>attribute.key)).size!==line.customAttributes.length;
   const existing=await tx.operationalLine.findUnique({where:{shop_orderLineGid:{shop,orderLineGid:line.id}}});
   if(existing){
    const purchasedBundle=existing.bundleReviewId?await tx.bundlePurchaseReview.findUnique({where:{id:existing.bundleReviewId}}):null;
    const bundleChanged=existing.bundleReviewId!==null&&(!purchasedBundle||purchasedBundle.shop!==shop||purchasedBundle.customerGid!==order.customer?.id||purchasedBundle.orderGid!==order.id||purchasedBundle.orderLineGid!==line.id||purchasedBundle.snapshotHash!==props._pm_bundle_review_hash||purchasedBundle.quantity!==line.quantity);
    if(existing.orderGid!==order.id)throw Error('Operational line belongs to another original order');
    if(existing.customerGid!==(order.customer?.id??null)||existing.productGid!==(line.product?.id??null)||existing.variantGid!==(line.variant?.id??null)||existing.businessStream!==(typeof stream==='string'?stream:null)||props._pm_business_stream!==stream||props._pm_stream_schema_version!=='1'||duplicateProperties||bundleChanged||existing.bundleReviewId!==null&&existing.bundleReviewId!==props._pm_bundle_review_id){
     // Preserve the purchased identity and selection; do not silently reassign
     // an existing programme after an admin edit or conflicting notification.
     await tx.operationalLine.update({where:{id:existing.id},data:{validationStatus:'QUARANTINED',department:null,validationReason:'Native identity or stream metadata differs from the original operational snapshot'}});
    }
    continue;
   }
   const valid=STREAMS.some(value=>value===stream)&&props._pm_business_stream===stream&&props._pm_stream_schema_version==='1';
   const workspace=department(typeof stream==='string'?stream:'',line.product?.isGiftCard||false);
   let reason=valid&&workspace&&!duplicateProperties?null:'Missing or conflicting native stream metadata';
   if(!line.product||!line.variant)reason='Native product or variant is unavailable; original routing requires review';
   let selectionId:string|null=null;
   let bundleReviewId:string|null=null;
   const hasBundleReview=Object.hasOwn(props,'_pm_bundle_review_id')||Object.hasOwn(props,'_pm_bundle_review_hash');
   if(!reason&&hasBundleReview){
    if(stream!=='ready_series'||!order.customer||!bundleEvidence.has(line.id)||line.originalUnitPriceSet?.shopMoney.currencyCode!=='SGD')reason='Bundle review evidence unavailable';
    else {
     let unitPriceMinor:number;try{unitPriceMinor=bundleUnitPrice(line.originalUnitPriceSet.shopMoney.amount);}catch{reason='Bundle native price unavailable';}
     if(!reason)try{const bound=await bindBundleReview(tx,{shop,customerGid:order.customer.id,reviewId:props._pm_bundle_review_id,reviewHash:props._pm_bundle_review_hash,orderGid:order.id,orderLineGid:line.id,productGid:line.product!.id,variantGid:line.variant!.id,quantity:line.quantity,unitPriceMinor:unitPriceMinor!,createdAt:order.createdAt,currentSnapshot:bundleEvidence.get(line.id)!});bundleReviewId=bound.id;}catch(error){if(!(error instanceof BundleBindingError))throw error;reason='Bundle review does not match the original purchase';}
    }
   }
   if(!reason&&stream==='meal_plan'){
    const selection=typeof props._pm_selection_id==='string'?await tx.mealPlanSelection.findUnique({where:{id:props._pm_selection_id}}):null;
    const matching=selection&&selection.shop===shop&&selection.customerGid===order.customer?.id&&selection.programmeGid===line.product?.id&&selection.variantGid===line.variant?.id&&selection.sellingPlanGid===(line.sellingPlan?.sellingPlanId||null)&&selection.selectionHash===props._pm_selection_hash&&(!selection.startsOn||(props['Programme start']===selection.startsOn&&props['Programme end']===selection.endsOn))&&line.quantity===1&&selection.status==='REVIEWED'&&selection.cutoffAt>new Date(order.createdAt)&&selection.reviewedAt<=new Date(order.createdAt);
    if(!matching) reason='Meal Plan selection missing, expired, already bound or mismatched';
    else {
     // Two checkouts can reference the same reviewed selection. Claim its
     // unchanged snapshot atomically; never overwrite another order binding.
     const bound=await tx.mealPlanSelection.updateMany({where:{id:selection.id,shop,customerGid:order.customer!.id,status:'REVIEWED',orderGid:null,orderLineGid:null,updatedAt:selection.updatedAt},data:{status:'ORDERED',orderGid:order.id,orderLineGid:line.id}});
     if(bound.count===1)selectionId=selection.id;
     else reason='Meal Plan selection changed before order binding';
    }
   }
   await tx.operationalLine.create({data:{shop,orderGid:order.id,orderLineGid:line.id,customerGid:order.customer?.id,productGid:line.product?.id,variantGid:line.variant?.id,businessStream:typeof stream==='string'?stream:null,department:reason?null:workspace,validationStatus:reason?'QUARANTINED':'VALIDATED',validationReason:reason,selectionId,bundleReviewId}});
  }
  await tx.webhookReceipt.create({data:{id:`${shop}:${eventId}`,shop,topic}});
 });
 try{await persist();}catch(error){
  // Created/paid/updated notifications can race for the same original line.
  // A unique-insert loser has rolled back. Re-read and verify the winner in
  // one new transaction; never repeat a payment, credit or Shopify mutation.
  const conflict=error as {code?:string;meta?:{modelName?:string}};
  if(conflict?.code!=='P2002'||!['OperationalLine','WebhookReceipt'].includes(conflict.meta?.modelName??''))throw error;
  await persist();
 }
}
