import db from '../db.server';
import {assertShop} from './security.server';

export type CancellationOrder = {
 id:string; name?:string; customerGid:string; createdAt:string; currency:string; amountMinor:number;
 paid:boolean; alreadyCancelled:boolean; hasEverDispatched:boolean|null;
 businessStreams:string[]; contractGids:string[]; renewalsVerified:boolean;
 commencementStartsOn?:string|null;
};
export type CancellationGateway = {
 readOrder:(orderGid:string)=>Promise<CancellationOrder>;
 stopRenewals:(contractGids:string[],customerGid:string,orderGid:string)=>Promise<void>;
 cancelToWallet:(orderGid:string)=>Promise<{jobGid:string}>;
 reconcile:(orderGid:string,customerGid:string,amountMinor:number,contractGids:string[])=>Promise<boolean>;
};

// Customer requests must never execute cancellation or Wallet refunds.
// Keep the exported guard to reject stale clients and internal callers alike.
export async function cancelCustomerOrder(_shop:string,_customerGid:string,_orderGid:string,_gateway:CancellationGateway,_now?:Date):Promise<never>{
 void _shop;void _customerGid;void _orderGid;void _gateway;void _now;
 throw Error('SUPPORT_APPROVAL_REQUIRED');
}

// Read-only native reconciliation after a crash/lost response. It never retries
// a cancellation, renewal mutation or Wallet transfer. All native proof is needed.
export async function reconcileCustomerCancellation(shop:string,customerGid:string,orderGid:string,gateway:CancellationGateway){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!/^gid:\/\/shopify\/Order\/\d+$/.test(orderGid))throw Error('Invalid cancellation context');
 const operation=await db.orderCancellation.findUnique({where:{shop_orderGid:{shop,orderGid}}});
 if(!operation||operation.customerGid!==customerGid)throw Error('Order unavailable');
 if(operation.state==='COMPLETED')return operation;
 if(!['CANCEL_PENDING','AWAITING_NATIVE_REFUND','RECONCILIATION_REQUIRED'].includes(operation.state))return operation;
 if(!await gateway.reconcile(orderGid,customerGid,operation.amountMinor,JSON.parse(operation.contractGids)))return operation;
 return db.$transaction(async tx=>{
  await tx.mealPlanSelection.updateMany({where:{shop,customerGid,orderGid},data:{status:'CANCELLED'}});
  await tx.operationalLine.updateMany({where:{shop,customerGid,orderGid,fulfillmentState:{notIn:['DISPATCHED','DISPATCH_REVIEW']}},data:{fulfillmentState:'CANCELLED'}});
  return tx.orderCancellation.update({where:{id:operation.id},data:{state:'COMPLETED'}});
 });
}
