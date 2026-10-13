import db from '../db.server';
import {assertShop} from './security.server';
import {minorAmount} from './gift-card-native.server';
import {nativeDispatchEvidence} from './order-cancellation-policy';
import {reconcileNativeWalletHistory} from './native-wallet-returns.server';
import type {CancellationGateway} from './order-cancellation.server';

export const CANCELLATION_ORDER_QUERY=`#graphql
query CancellationOrder($id:ID!){
 shop{myshopifyDomain} order(id:$id){
  id name createdAt cancelledAt currencyCode displayFinancialStatus customer{id} disputes{id}
  totalPriceSet{shopMoney{amount currencyCode}} totalReceivedSet{shopMoney{amount currencyCode}} totalRefundedSet{shopMoney{amount currencyCode}}
  fulfillments(first:250){id status}
  lineItems(first:250){nodes{id product{isGiftCard stream:metafield(namespace:"performance",key:"business_stream"){jsonValue}} sellingPlan{sellingPlanId}}pageInfo{hasNextPage}}
 }
}`;
export const CANCELLATION_CONTRACT_QUERY=`#graphql
query CancellationContract($id:ID!){currentAppInstallation{app{id}} subscriptionContract(id:$id){id status app{id} customer{id} originOrder{id}}}`;
export const CANCEL_CONTRACT_MUTATION=`#graphql
mutation StopMealPlanRenewal($id:ID!){subscriptionContractCancel(subscriptionContractId:$id,actor:CUSTOMER){contract{id status} userErrors{field message}}}`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
export function nativeCancellationGateway(admin:Admin,shop:string):CancellationGateway{
 assertShop(shop);
 const request=async(query:string,id:string)=>{
  const response=await admin.graphql(query,{variables:{id}});const body=await response.json();
  if(!response.ok||body.errors||!body.data)throw Error('Native cancellation unavailable');
  return body.data;
 };
 const read=async(id:string)=>{
  const data=await request(CANCELLATION_ORDER_QUERY,id);
  if(data.shop?.myshopifyDomain!==shop||data.order?.id!==id||data.order.lineItems.pageInfo.hasNextPage||data.order.fulfillments.length>=250)throw Error('Cancellation order proof incomplete');
  return data.order;
 };
 return {
  async readOrder(id){
   const order=await read(id);
   const lines=order.lineItems.nodes as Array<{id:string;product?:{isGiftCard:boolean;stream?:{jsonValue:unknown}};sellingPlan?:{sellingPlanId:string}}>; 
   const operational=await db.operationalLine.findMany({where:{shop,orderGid:id}});
   const selectionIds=operational.filter(line=>line.customerGid===order.customer?.id&&line.validationStatus==='VALIDATED'&&line.selectionId).map(line=>line.selectionId!);
   const selections=await db.mealPlanSelection.findMany({where:{id:{in:selectionIds},shop,customerGid:order.customer?.id||'',orderGid:id},select:{id:true,orderLineGid:true,startsOn:true}});
   const foodLines=lines.filter(line=>!line.product?.isGiftCard);
   const dates=foodLines.map(line=>{
    const route=operational.find(record=>record.orderLineGid===line.id&&record.customerGid===order.customer?.id&&record.validationStatus==='VALIDATED');
    return selections.find(selection=>selection.id===route?.selectionId&&selection.orderLineGid===line.id)?.startsOn||null;
   });
   // Unknown or mixed dates must not inherit today's merchant availability.
   const commencementStartsOn=dates.length&&dates.every(date=>date&&date===dates[0])?dates[0]:null;
   if(order.fulfillments.some((f:{status:string})=>f.status==='SUCCESS'))await db.operationalLine.updateMany({where:{shop,orderGid:id},data:{fulfillmentState:'DISPATCHED'}});
   const recurring=lines.filter(line=>line.sellingPlan);
   const contracts=recurring.map(line=>operational.find(record=>record.orderLineGid===line.id&&record.customerGid===order.customer?.id&&record.validationStatus==='VALIDATED')?.contractGid);
   const money=[order.totalPriceSet,order.totalReceivedSet,order.totalRefundedSet].map(value=>value.shopMoney);
   if(money.some(value=>value.currencyCode!=='SGD'))throw Error('Cancellation currency differs');
   const total=minorAmount(money[0].amount);
   return {id,name:order.name,customerGid:order.customer?.id||'',createdAt:order.createdAt,currency:order.currencyCode,amountMinor:total,
    paid:order.displayFinancialStatus==='PAID'&&minorAmount(money[1].amount)===total&&minorAmount(money[2].amount)===0&&order.disputes.length===0,
    alreadyCancelled:!!order.cancelledAt,
    commencementStartsOn,
    // A cancelled native fulfillment is unknown history and fails closed.
    hasEverDispatched:nativeDispatchEvidence(order.fulfillments.map((f:{status:string})=>f.status),operational.some(line=>line.fulfillmentState==='DISPATCHED')?true:false,true),
    businessStreams:lines.map(line=>line.product?.isGiftCard?'shared':typeof line.product?.stream?.jsonValue==='string'?line.product.stream.jsonValue:'unknown'),
    contractGids:contracts.filter((id):id is string=>!!id),renewalsVerified:contracts.every(Boolean)};
  },
  async stopRenewals(ids,customerGid,orderGid){
   // Verify ownership/customer of every contract before changing any contract.
   const contracts=await Promise.all(ids.map(async id=>{
    const data=await request(CANCELLATION_CONTRACT_QUERY,id),contract=data.subscriptionContract;
    if(contract?.id!==id||contract.customer?.id!==customerGid||contract.originOrder?.id!==orderGid||!data.currentAppInstallation?.app?.id||contract.app?.id!==data.currentAppInstallation.app.id)throw Error('Subscription must be handled by its owning app');
    return contract;
   }));
   for(const contract of contracts){
    if(contract.status==='CANCELLED')continue;
    const data=await request(CANCEL_CONTRACT_MUTATION,contract.id),result=data.subscriptionContractCancel;
    if(result.userErrors.length||result.contract?.id!==contract.id||result.contract.status!=='CANCELLED')throw Error('Renewal shutdown unconfirmed');
   }
  },
  async cancelToWallet(){
   throw Error('SUPPORT_APPROVAL_REQUIRED');
  },
  async reconcile(id,customerGid,amountMinor,contractGids){
   const order=await read(id);
   if(order.customer?.id!==customerGid||!order.cancelledAt)return false;
   if(order.totalRefundedSet.shopMoney.currencyCode!=='SGD'||minorAmount(order.totalRefundedSet.shopMoney.amount)!==amountMinor)return false;
   for(const contractGid of contractGids){
    const data=await request(CANCELLATION_CONTRACT_QUERY,contractGid),contract=data.subscriptionContract;
    if(contract?.id!==contractGid||contract.customer?.id!==customerGid||contract.originOrder?.id!==id||contract.status!=='CANCELLED'||!data.currentAppInstallation?.app?.id||contract.app?.id!==data.currentAppInstallation.app.id)return false;
   }
   await reconcileNativeWalletHistory(admin,shop,customerGid);
   const entries=await db.walletEntry.findMany({where:{shop,customerGid,currency:'SGD',sourceGid:id,sourceKind:'funded_return'}});
   // Native transaction IDs are unique in the ledger. The complete paid total,
   // including shipping and tax, must be backed by native Wallet receipts.
   return entries.reduce((sum,entry)=>sum+entry.fundedDelta,0)===amountMinor;
  },
 };
}
