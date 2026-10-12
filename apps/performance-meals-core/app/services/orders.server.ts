import db from '../db.server';
import {department,STREAMS} from './menu-validation';
import type { AdminApiContext } from '@shopify/shopify-app-react-router/server';
export const ORDER_QUERY=`#graphql
query OperationalOrder($id:ID!){order(id:$id){id createdAt customer{id}lineItems(first:250){nodes{id quantity customAttributes{key value}product{id isGiftCard stream:metafield(namespace:"performance",key:"business_stream"){jsonValue}}variant{id}sellingPlan{sellingPlanId}}pageInfo{hasNextPage}}}}
`;
type NativeOrder={id:string;createdAt:string;customer?:{id:string};lineItems:{pageInfo:{hasNextPage:boolean};nodes:Array<{id:string;quantity:number;customAttributes:Array<{key:string;value:string}>;product?:{id:string;isGiftCard:boolean;stream?:{jsonValue:unknown}};variant?:{id:string};sellingPlan?:{sellingPlanId:string}}>}};
export async function recordOrder(shop:string,orderGid:string,eventId:string,admin:AdminApiContext,topic='orders/create'){
 if(await db.webhookReceipt.findUnique({where:{id:`${shop}:${eventId}`}})) return;
 const response=await admin.graphql(ORDER_QUERY,{variables:{id:orderGid}});const result=await response.json() as {errors?:unknown;data?:{order?:NativeOrder}};
 if(result.errors||!result.data?.order||result.data.order.lineItems.pageInfo.hasNextPage) throw new Error('Order cannot be safely routed');
 const order=result.data.order;
 await db.$transaction(async tx=>{
  if(await tx.webhookReceipt.findUnique({where:{id:`${shop}:${eventId}`}})) return;
  for(const line of order.lineItems.nodes){
   if(await tx.operationalLine.findUnique({where:{shop_orderLineGid:{shop,orderLineGid:line.id}}})) continue;
   const props=Object.fromEntries(line.customAttributes.map((p:{key:string;value:string})=>[p.key,p.value]));
   const stream=line.product?.stream?.jsonValue;
   const valid=STREAMS.some(value=>value===stream)&&props._pm_business_stream===stream&&props._pm_stream_schema_version==='1';
   const workspace=department(typeof stream==='string'?stream:'',line.product?.isGiftCard||false);
   let reason=valid&&workspace?null:'Missing or conflicting native stream metadata';
   let selectionId:string|null=null;
   if(!reason&&stream==='meal_plan'){
    const selection=typeof props._pm_selection_id==='string'?await tx.mealPlanSelection.findUnique({where:{id:props._pm_selection_id}}):null;
    const matching=selection&&selection.shop===shop&&selection.customerGid===order.customer?.id&&selection.programmeGid===line.product?.id&&selection.variantGid===line.variant?.id&&selection.sellingPlanGid===(line.sellingPlan?.sellingPlanId||null)&&selection.selectionHash===props._pm_selection_hash&&(!selection.startsOn||(props['Programme start']===selection.startsOn&&props['Programme end']===selection.endsOn))&&line.quantity===1&&selection.status==='REVIEWED'&&selection.cutoffAt>new Date(order.createdAt)&&selection.reviewedAt<=new Date(order.createdAt);
    if(!matching) reason='Meal Plan selection missing, expired, already bound or mismatched';
    else {
     selectionId=selection.id;
     await tx.mealPlanSelection.update({where:{id:selection.id},data:{status:'ORDERED',orderGid:order.id,orderLineGid:line.id}});
    }
   }
   await tx.operationalLine.create({data:{shop,orderGid:order.id,orderLineGid:line.id,customerGid:order.customer?.id,productGid:line.product?.id,variantGid:line.variant?.id,businessStream:typeof stream==='string'?stream:null,department:reason?null:workspace,validationStatus:reason?'QUARANTINED':'VALIDATED',validationReason:reason,selectionId}});
  }
  await tx.webhookReceipt.create({data:{id:`${shop}:${eventId}`,shop,topic}});
 });
}
