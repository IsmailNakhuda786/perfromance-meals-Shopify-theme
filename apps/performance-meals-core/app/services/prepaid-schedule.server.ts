import {assertShop} from './security.server';
import {prepaidPackageQuantity} from './prepaid-package-quantity';
import {verifyReadySeriesFulfillments} from './prepaid-fulfillment';

export const PREPAID_SCHEDULE_QUERY=`#graphql
query ReadySeriesNativeSchedule($id:ID!,$after:String){
 shop{myshopifyDomain}
 currentAppInstallation{app{id}accessScopes{handle}}
 order(id:$id){
  id name test cancelledAt displayFinancialStatus customer{id}
  lineItems(first:250){nodes{id quantity currentQuantity variant{id product{id}}}pageInfo{hasNextPage}}
  fulfillmentOrders(first:5,after:$after){nodes{
   id status fulfillAt order{id} deliveryMethod{methodType} destination{id address1 address2 city company countryCode province zip}
   fulfillments(first:5){nodes{id status}pageInfo{hasNextPage}}
   lineItems(first:20){nodes{id totalQuantity remainingQuantity lineItem{id}}pageInfo{hasNextPage endCursor}}
  }pageInfo{hasNextPage endCursor}}
 }
}`;
export const PREPAID_SCHEDULE_ITEMS_QUERY=`#graphql
query ReadySeriesNativeScheduleItems($id:ID!,$after:String!){
 shop{myshopifyDomain}currentAppInstallation{app{id}}
 fulfillmentOrder(id:$id){id order{id}lineItems(first:100,after:$after){nodes{id totalQuantity remainingQuantity lineItem{id}}pageInfo{hasNextPage endCursor}}}
}`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
type Expected={packageQuantity?:number;appGid:string;customerGid:string;orderGid:string;orderLineGid:string;months:3|6;deliveryDates:string[]};
const ref=(kind:string,value:unknown)=>typeof value==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(value);

// Read-only scheduled work, not actual shipment evidence. Native fulfillAt means
// work should begin; it does not prove the customer's chosen delivery time slot.
// Both location visibility scopes are required to avoid treating hidden work as
// absent. No fulfillment is opened, moved, cancelled or marked dispatched here.
export async function readPrepaidSchedule(admin:Admin,shop:string,expected:Expected){
 assertShop(shop);
 for(const [key,kind]of [['appGid','App'],['customerGid','Customer'],['orderGid','Order'],['orderLineGid','LineItem']] as const)if(!ref(kind,expected[key]))throw Error('Invalid native schedule reference');
 const quantity=prepaidPackageQuantity(expected.months,expected.packageQuantity);
 // Reuse the approved calendar validator before any native request.
 verifyReadySeriesFulfillments([],{deliveries:expected.months,deliveryDates:expected.deliveryDates,orderGid:expected.orderGid,lineGid:expected.orderLineGid,quantityPerDelivery:quantity.packages});
 const {order,fulfillments:collected}=await readPrepaidScheduleSource(admin,shop,expected);
 const lines=order.lineItems.nodes as Array<{id:string;quantity:number;currentQuantity:number}>;
 if(lines.some(line=>!ref('LineItem',line?.id))||new Set(lines.map(line=>line.id)).size!==lines.length)throw Error('Ambiguous native schedule lines');
 const original=lines.filter(line=>line.id===expected.orderLineGid);
 if(original.length!==1||original[0].quantity!==quantity.nativeOrderQuantity||original[0].currentQuantity!==quantity.nativeOrderQuantity)throw Error('Native prepaid delivery quantity differs');
 const fulfillments=collected as Array<{id:string;status:string;fulfillAt:string|null;order:{id:string};lineItems:{nodes:Array<{id:string;totalQuantity:number;remainingQuantity:number;lineItem:{id:string}}>;pageInfo:{hasNextPage:boolean}}}>;
 if(new Set(fulfillments.map(row=>row?.id)).size!==fulfillments.length)throw Error('Duplicate native fulfillment orders');
 const evidence:Array<{id:string;orderGid:string;lineGid:string;fulfillAt:string|null;status:string;quantity:number}>=[];
 for(const fulfillment of fulfillments){
  if(!ref('FulfillmentOrder',fulfillment?.id)||fulfillment.order?.id!==expected.orderGid||typeof fulfillment.status!=='string'||fulfillment.lineItems?.pageInfo?.hasNextPage!==false||!Array.isArray(fulfillment.lineItems.nodes)||fulfillment.lineItems.nodes.length>250)throw Error('Native fulfillment coverage incomplete');
  const items=fulfillment.lineItems.nodes;
  if(new Set(items.map(item=>item?.id)).size!==items.length||new Set(items.map(item=>item?.lineItem?.id)).size!==items.length)throw Error('Duplicate native fulfillment item');
  for(const item of items){
   if(!ref('FulfillmentOrderLineItem',item?.id)||!ref('LineItem',item.lineItem?.id)||!Number.isSafeInteger(item.totalQuantity)||item.totalQuantity<1||!Number.isSafeInteger(item.remainingQuantity)||item.remainingQuantity<0||item.remainingQuantity>item.totalQuantity)throw Error('Native scheduled quantity unavailable');
   if(item.lineItem.id!==expected.orderLineGid)continue;
   if(item.remainingQuantity!==item.totalQuantity||!['OPEN','SCHEDULED'].includes(fulfillment.status))throw Error('Prepaid scheduled work already processed or requires review');
   evidence.push({id:fulfillment.id,orderGid:fulfillment.order.id,lineGid:item.lineItem.id,fulfillAt:fulfillment.fulfillAt,status:fulfillment.status,quantity:item.totalQuantity});
  }
 }
 const result=verifyReadySeriesFulfillments(evidence,{deliveries:expected.months,deliveryDates:expected.deliveryDates,orderGid:expected.orderGid,lineGid:expected.orderLineGid,quantityPerDelivery:quantity.packages});
 return {...result,orderGid:expected.orderGid,orderLineGid:expected.orderLineGid,visibleScheduleComplete:true as const,evidence,deliveryTimeSlotVerified:false as const};
}

// Complete bounded native source used by both schedule auditing and customer
// booking. A fulfilAt value is a work-start date, not a promised delivery slot.
export async function readPrepaidScheduleSource(admin:Admin,shop:string,expected:Pick<Expected,'appGid'|'customerGid'|'orderGid'>){
 assertShop(shop);
 for(const [key,kind]of [['appGid','App'],['customerGid','Customer'],['orderGid','Order']] as const)if(!ref(kind,expected[key]))throw Error('Invalid native schedule reference');
 const fetchPage=async(after:string|null)=>{
 const response=await admin.graphql(PREPAID_SCHEDULE_QUERY,{variables:{id:expected.orderGid,after}}),body=await response.json(),data=body.data,order=data?.order,installation=data?.currentAppInstallation;
 if(!response.ok||body.errors||data?.shop?.myshopifyDomain!==shop||installation?.app?.id!==expected.appGid||!Array.isArray(installation.accessScopes)||order?.id!==expected.orderGid||order.test!==true||order.cancelledAt!==null||order.customer?.id!==expected.customerGid||order.lineItems?.pageInfo?.hasNextPage!==false||!Array.isArray(order.lineItems.nodes)||order.lineItems.nodes.length>250||typeof order.fulfillmentOrders?.pageInfo?.hasNextPage!=='boolean'||!Array.isArray(order.fulfillmentOrders.nodes)||order.fulfillmentOrders.nodes.length>100)throw Error('Complete native schedule evidence unavailable');
 const scopes=new Set(installation.accessScopes.map((scope:{handle:string})=>scope?.handle));
 for(const scope of ['merchant_managed_fulfillment_orders','third_party_fulfillment_orders'])if(!scopes.has('read_'+scope)&&!scopes.has('write_'+scope))throw Error('Native schedule visibility requires additional read access');
 return order;
 };
 const order=await fetchPage(null),fingerprint=JSON.stringify([order.lineItems,order.displayFinancialStatus]),parentCursors=new Set<string>();
 let page=order.fulfillmentOrders;const collected=[...page.nodes];
 // Cost-bounded pages preserve the existing 100-parent/250-item coverage caps.
 // A missing/repeated cursor or a changing order is a hold, not partial proof.
 const cursor=(info:{hasNextPage:boolean;endCursor?:unknown},seen:Set<string>)=>{
  if(typeof info.endCursor!=='string'||!info.endCursor||info.endCursor.length>2048||seen.has(info.endCursor))throw Error('Native fulfillment coverage incomplete: invalid page cursor');
  seen.add(info.endCursor);return info.endCursor;
 };
 while(page.pageInfo.hasNextPage){
  if(collected.length>=100||parentCursors.size>=20||!page.nodes.length)throw Error('Native fulfillment coverage incomplete');
  const next=await fetchPage(cursor(page.pageInfo,parentCursors));
  if(JSON.stringify([next.lineItems,next.displayFinancialStatus])!==fingerprint)throw Error('Native original order changed during schedule read');
  page=next.fulfillmentOrders;collected.push(...page.nodes);
 }
 if(collected.length>100)throw Error('Native fulfillment coverage incomplete');
 for(const parent of collected){
  if(!ref('FulfillmentOrder',parent?.id)||parent.order?.id!==expected.orderGid||typeof parent.lineItems?.pageInfo?.hasNextPage!=='boolean'||!Array.isArray(parent.lineItems.nodes))throw Error('Native fulfillment coverage incomplete');
  let items=parent.lineItems;const itemCursors=new Set<string>(),allItems=[...items.nodes];
  while(items.pageInfo.hasNextPage){
   if(allItems.length>=250||itemCursors.size>=13||!items.nodes.length)throw Error('Native fulfillment coverage incomplete');
   const response=await admin.graphql(PREPAID_SCHEDULE_ITEMS_QUERY,{variables:{id:parent.id,after:cursor(items.pageInfo,itemCursors)}}),body=await response.json(),data=body.data,native=data?.fulfillmentOrder;
   if(!response.ok||body.errors||data?.shop?.myshopifyDomain!==shop||data.currentAppInstallation?.app?.id!==expected.appGid||native?.id!==parent.id||native.order?.id!==expected.orderGid||typeof native.lineItems?.pageInfo?.hasNextPage!=='boolean'||!Array.isArray(native.lineItems.nodes))throw Error('Native fulfillment coverage incomplete');
   items=native.lineItems;allItems.push(...items.nodes);
  }
  if(allItems.length>250)throw Error('Native fulfillment coverage incomplete');
  parent.lineItems={nodes:allItems,pageInfo:{hasNextPage:false}};
 }
 return {order,fulfillments:collected};
}
