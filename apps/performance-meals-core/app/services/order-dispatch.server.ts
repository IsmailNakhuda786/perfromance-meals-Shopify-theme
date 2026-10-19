import db from '../db.server';
import {assertShop} from './security.server';
import {nativeDispatchEvidence} from './order-cancellation-policy';

export const ORDER_DISPATCH_QUERY=`#graphql
query CoreOrderDispatch($id:ID!){
 shop{myshopifyDomain}
 order(id:$id){
  id cancelledAt customer{id}
  fulfillmentsCount{count precision}
  fulfillments(first:250){id status fulfillmentLineItems(first:250){nodes{id quantity lineItem{id}}pageInfo{hasNextPage}}}
 }
}`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
const reference=(type:string,value:unknown)=>typeof value==='string'&&new RegExp('^gid://shopify/'+type+'/\\d+$').test(value);
type Fulfillment={id:string;status:string;fulfillmentLineItems:{nodes:Array<{id:string;quantity:number;lineItem:{id:string}}>;pageInfo:{hasNextPage:boolean}}};
type NativeOrder={id:string;cancelledAt:string|null;customer:{id:string}|null;fulfillmentsCount:{count:number;precision:string}|null;fulfillments:Fulfillment[]};

// Native read only: no fulfillment, cancellation, refund, credit or billing API.
// A bounded/truncated response can prove a visible dispatch, but cannot prove
// the absence of one. Missing history therefore requires review.
export async function readOrderDispatch(admin:Admin,shop:string,orderGid:string){
 assertShop(shop);if(!reference('Order',orderGid))throw Error('Invalid dispatch order');
 const response=await admin.graphql(ORDER_DISPATCH_QUERY,{variables:{id:orderGid}});
 const body=await response.json() as {errors?:unknown;data?:{shop:{myshopifyDomain:string};order:NativeOrder|null}};
 const order=body.data?.order;
 if(!response.ok||body.errors||body.data?.shop?.myshopifyDomain!==shop||order?.id!==orderGid||!Array.isArray(order.fulfillments)||order.fulfillments.length>250||order.customer!=null&&!reference('Customer',order.customer.id)||order.cancelledAt!==null&&(typeof order.cancelledAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(order.cancelledAt)||!Number.isFinite(Date.parse(order.cancelledAt))||new Date(order.cancelledAt).toISOString().slice(0,19)!==order.cancelledAt.slice(0,19)))throw Error('Native dispatch evidence unavailable');
 if(new Set(order.fulfillments.map(row=>row?.id)).size!==order.fulfillments.length)throw Error('Duplicate native fulfillment evidence');
 let complete=order.fulfillmentsCount?.precision==='EXACT'&&Number.isSafeInteger(order.fulfillmentsCount.count)&&order.fulfillmentsCount.count===order.fulfillments.length;
 const byLine=new Map<string,Array<{status:string;fulfillmentGid:string}>>();
 for(const fulfillment of order.fulfillments){
  if(!fulfillment||!reference('Fulfillment',fulfillment.id)||typeof fulfillment.status!=='string'||!Array.isArray(fulfillment.fulfillmentLineItems?.nodes)||fulfillment.fulfillmentLineItems.nodes.length>250)throw Error('Invalid native fulfillment evidence');
  if(fulfillment.fulfillmentLineItems.pageInfo?.hasNextPage!==false)complete=false;
  const items=fulfillment.fulfillmentLineItems.nodes;
  if(!items.length)complete=false; // A shipment without line coverage proves no negative fact.
  if(new Set(items.map(row=>row?.id)).size!==items.length||new Set(items.map(row=>row?.lineItem?.id)).size!==items.length)throw Error('Duplicate native fulfillment line evidence');
  for(const item of items){
   if(!item||!reference('FulfillmentLineItem',item.id)||!reference('LineItem',item.lineItem?.id)||!Number.isSafeInteger(item.quantity)||item.quantity<1)throw Error('Invalid native fulfilled quantity');
   const evidence=byLine.get(item.lineItem.id)||[];
   evidence.push({status:fulfillment.status,fulfillmentGid:fulfillment.id});byLine.set(item.lineItem.id,evidence);
  }
 }
 return {orderGid,customerGid:order.customer?.id??null,cancelled:order.cancelledAt!==null,complete,byLine};
}

// Persist observed facts against existing original routing only. Dispatch is
// monotonic: once observed it survives later cancellation/removal of fulfillment.
// These rows are not delivery-occurrence scheduling or permission to refund.
export async function syncOrderDispatch(admin:Admin,shop:string,orderGid:string){
 const proof=await readOrderDispatch(admin,shop,orderGid);
 return db.$transaction(async tx=>{
  const lines=await tx.operationalLine.findMany({where:{shop,orderGid}});
  if(!lines.length)throw Error('Original operational order required before dispatch sync');
  const results:Array<{id:string;state:string}>=[];
  const knownLines=new Set(lines.map(line=>line.orderLineGid));
  const coverageComplete=proof.complete&&[...proof.byLine.keys()].every(id=>knownLines.has(id));
  for(const line of lines){
   const evidence=proof.byLine.get(line.orderLineGid)||[];
   const positive=evidence.find(item=>item.status==='SUCCESS');
   const observed=nativeDispatchEvidence(evidence.map(item=>item.status),line.fulfillmentState==='DISPATCHED',coverageComplete&&line.customerGid===proof.customerGid);
   const state=observed===true?'DISPATCHED':line.fulfillmentState==='DISPATCH_REVIEW'||observed===null?'DISPATCH_REVIEW':line.fulfillmentState==='CANCELLED'||proof.cancelled?'CANCELLED':'UNASSIGNED';
   if(state===line.fulfillmentState){results.push({id:line.id,state});continue;}
   const changed=await tx.operationalLine.updateMany({where:{id:line.id,shop,orderGid,fulfillmentState:line.fulfillmentState,updatedAt:line.updatedAt},data:{fulfillmentState:state}});
   if(changed.count!==1)throw Error('Dispatch evidence changed concurrently; reload');
   if(state==='DISPATCHED'){
    await tx.planOperation.create({data:{shop,selectionId:line.selectionId??(line.customerGid?`customer:${line.customerGid.split('/').at(-1)}`:`order:${orderGid}`),kind:'NATIVE_DISPATCH_OBSERVED',state:'COMPLETED',cycleReference:line.orderLineGid,fulfillmentGid:positive?.fulfillmentGid}});
   }
   results.push({id:line.id,state});
  }
  return {orderGid,complete:coverageComplete,lines:results};
 });
}
