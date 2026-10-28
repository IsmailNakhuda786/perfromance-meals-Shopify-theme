import {readyBookingGroups, type readOwnedReadyBookingEvidence} from './ready-booking-native.server';
import {assertShop} from './security.server';
type Evidence=Awaited<ReturnType<typeof readOwnedReadyBookingEvidence>>;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
export const READY_OCCURRENCE_DISPATCH_QUERY=`#graphql
query CoreReadyOccurrenceDispatch($id:ID!){
 shop{myshopifyDomain}currentAppInstallation{app{id}}
 fulfillmentOrder(id:$id){id status order{id}
  lineItems(first:250){nodes{id totalQuantity remainingQuantity lineItem{id}}pageInfo{hasNextPage}}
  fulfillments(first:25){nodes{id status
   fulfillmentOrders(first:2){nodes{id}pageInfo{hasNextPage}}
   fulfillmentLineItems(first:250){nodes{id quantity lineItem{id}}pageInfo{hasNextPage}}
  }pageInfo{hasNextPage}}
 }
}`;
const ref=(kind:string,v:unknown)=>typeof v==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(v);
type Group=ReturnType<typeof readyBookingGroups>[number];
type NativeParent={id:string;status:string;lineItems:{nodes:Array<{id:string;totalQuantity:number;remainingQuantity:number;lineItem:{id:string}}>};fulfillments?:{nodes:Array<{id:string;status:string}>;pageInfo:{hasNextPage:boolean}}};
const lineFacts=(rows:NativeParent['lineItems']['nodes'])=>rows.map(l=>[l.id,l.totalQuantity,l.remainingQuantity,l.lineItem?.id]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
export function readyOccurrenceDispatch(group:Group,parent:NativeParent,proof:unknown){
 const value=proof as {id:string;status:string;order:{id:string};lineItems:{nodes:NativeParent['lineItems']['nodes'];pageInfo:{hasNextPage:boolean}};fulfillments:{nodes:Array<{id:string;status:string;fulfillmentOrders:{nodes:Array<{id:string}>;pageInfo:{hasNextPage:boolean}};fulfillmentLineItems:{nodes:Array<{id:string;quantity:number;lineItem:{id:string}}>;pageInfo:{hasNextPage:boolean}}}>;pageInfo:{hasNextPage:boolean}}};
 if(!value||value.id!==parent.id||value.id!==group.fulfillmentOrderGid||value.order?.id!==group.orderGid||value.status!==parent.status||value.lineItems?.pageInfo?.hasNextPage!==false||!Array.isArray(value.lineItems.nodes)||JSON.stringify(lineFacts(value.lineItems.nodes))!==JSON.stringify(lineFacts(parent.lineItems.nodes))||value.fulfillments?.pageInfo?.hasNextPage!==false||!Array.isArray(value.fulfillments.nodes)||value.fulfillments.nodes.length>25||new Set(value.fulfillments.nodes.map(f=>f.id)).size!==value.fulfillments.nodes.length)throw Error('Complete current shipment evidence required');
 const shipped=new Map(group.members.map(m=>[m.orderLineGid,0]));
 for(const f of value.fulfillments.nodes){
  if(!ref('Fulfillment',f.id)||f.fulfillmentOrders?.pageInfo?.hasNextPage!==false||!Array.isArray(f.fulfillmentOrders.nodes)||f.fulfillmentOrders.nodes.length!==1||f.fulfillmentOrders.nodes[0].id!==parent.id||f.fulfillmentLineItems?.pageInfo?.hasNextPage!==false||!Array.isArray(f.fulfillmentLineItems.nodes)||!f.fulfillmentLineItems.nodes.length||f.fulfillmentLineItems.nodes.length>250||new Set(f.fulfillmentLineItems.nodes.map(l=>l.id)).size!==f.fulfillmentLineItems.nodes.length||new Set(f.fulfillmentLineItems.nodes.map(l=>l.lineItem?.id)).size!==f.fulfillmentLineItems.nodes.length)throw Error('Shipment occurrence association requires review');
  // A cancelled/failing/pending shipment is not evidence that its meals arrived,
  // nor permission to silently book the same paid occurrence again.
  if(f.status!=='SUCCESS')throw Error('Shipment status requires review');
  for(const item of f.fulfillmentLineItems.nodes){if(!ref('FulfillmentLineItem',item.id)||!ref('LineItem',item.lineItem?.id)||!Number.isSafeInteger(item.quantity)||item.quantity<1||!shipped.has(item.lineItem.id))throw Error('Shipment quantity requires review');shipped.set(item.lineItem.id,shipped.get(item.lineItem.id)!+item.quantity);}
 }
 let dispatchedPackages=0,totalPackages=0;
 for(const member of group.members){const row=parent.lineItems.nodes.find(l=>l.lineItem.id===member.orderLineGid),quantity=shipped.get(member.orderLineGid)!;if(!row||row.totalQuantity!==member.packages||quantity>member.packages||quantity+row.remainingQuantity!==member.packages)throw Error('Native dispatched and remaining quantities differ');dispatchedPackages+=quantity;totalPackages+=member.packages;}
 return {state:dispatchedPackages===totalPackages?'DISPATCHED' as const:dispatchedPackages>0?'PARTIALLY_DISPATCHED' as const:'REVIEW' as const,dispatchedPackages,totalPackages};
}
// Read only. SUCCESS means dispatched, not carrier-confirmed arrival. Ambiguous
// multi-occurrence shipments, truncated history or changed quantities show review.
export async function readReadyDeliveryProgress(admin:Admin,shop:string,customerGid:string,orderGid:string,evidence:Evidence){
 assertShop(shop);const groups=readyBookingGroups(evidence.native,shop,customerGid,orderGid,evidence.paid,true),rows=[];
 for(const group of groups){
  const parent=evidence.native.fulfillments.find((p:NativeParent)=>p.id===group.fulfillmentOrderGid) as NativeParent,totalPackages=group.members.reduce((sum,m)=>sum+m.packages,0);
  if(evidence.groups.some(g=>g.key===group.key)){rows.push({sourceKey:group.key,state:'AWAITING_DISPATCH',totalPackages,dispatchedPackages:0});continue;}
  try{const response=await admin.graphql(READY_OCCURRENCE_DISPATCH_QUERY,{variables:{id:parent.id}}),body=await response.json();if(!response.ok||body.errors||body.data?.shop?.myshopifyDomain!==shop||body.data.currentAppInstallation?.app?.id!==evidence.appGid)throw Error();rows.push({sourceKey:group.key,...readyOccurrenceDispatch(group,parent,body.data.fulfillmentOrder)});}catch{rows.push({sourceKey:group.key,state:'REVIEW',totalPackages,dispatchedPackages:0});}
 }
 if(!rows.length)throw Error('Paid delivery progress unavailable');
 return {rows,totalPackageDeliveries:rows.reduce((sum,r)=>sum+r.totalPackages,0),dispatchedPackageDeliveries:rows.reduce((sum,r)=>sum+r.dispatchedPackages,0),reviewRequired:rows.some(r=>r.state==='REVIEW'),physicalOccurrenceGroups:rows.length};
}
