import db from '../db.server';
import {assertShop} from './security.server';
import {nativeCancellationGateway} from './order-cancellation-native.server';
import {assessOrderCancellation} from './order-cancellation-policy';
import {reconcileCustomerCancellation} from './order-cancellation.server';
export const ACCOUNT_ORDERS_QUERY=`#graphql
query AccountFoodOrders($id:ID!){shop{myshopifyDomain} customer(id:$id){id orders(first:10,sortKey:PROCESSED_AT,reverse:true){nodes{id name}pageInfo{hasNextPage}}}}`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
export async function readAccountCancellations(admin:Admin,shop:string,customerGid:string){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid))throw Error('Invalid customer');
 const response=await admin.graphql(ACCOUNT_ORDERS_QUERY,{variables:{id:customerGid}}),body=await response.json(),data=body.data;
 if(!response.ok||body.errors||data?.shop?.myshopifyDomain!==shop||data.customer?.id!==customerGid)throw Error('Order history unavailable');
 const gateway=nativeCancellationGateway(admin,shop);
 const orders=[];
 for(const reference of data.customer.orders.nodes as Array<{id:string;name:string}>){
  let operation=await db.orderCancellation.findUnique({where:{shop_orderGid:{shop,orderGid:reference.id}}});
  if(operation&&operation.customerGid!==customerGid)throw Error('Order ownership differs');
  try{
   if(operation&&['CANCEL_PENDING','AWAITING_NATIVE_REFUND','RECONCILIATION_REQUIRED'].includes(operation.state))operation=await reconcileCustomerCancellation(shop,customerGid,reference.id,gateway);
   const native=await gateway.readOrder(reference.id);
   if(native.customerGid!==customerGid)throw Error('Order ownership differs');
   const assessment=assessOrderCancellation(native);
   const support=await db.orderSupportRequest.findUnique({where:{shop_orderGid:{shop,orderGid:reference.id}},select:{state:true,customerGid:true}});
   if(support&&support.customerGid!==customerGid)throw Error('Order ownership differs');
   orders.push({id:reference.id,name:reference.name,currency:native.currency,amountMinor:native.amountMinor,eligible:assessment.eligible&&native.renewalsVerified&&!operation,reason:assessment.reason,state:operation?.state||null,supportState:support?.state||null});
  }catch{orders.push({id:reference.id,name:reference.name,eligible:false,reason:'ORDER_REVIEW_REQUIRED',state:operation?.state||null});}
 }
 return {enabled:true,orders,hasMore:data.customer.orders.pageInfo.hasNextPage};
}
