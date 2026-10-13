import db from '../db.server';
import {assertShop} from './security.server';
import type {CancellationGateway} from './order-cancellation.server';
import {parseFundedAllocations} from './wallet-fifo';
import type {readOriginalOrderFunding} from './order-funding.server';
import {commencementStatus} from './commencement';
// This customer action records a request only. It cannot cancel an order,
// change a contract, grant credit, authorize Support, or reverse Rewards.
export async function requestOrderSupport(shop:string,customerGid:string,orderGid:string,gateway:Pick<CancellationGateway,'readOrder'>,funding?:Awaited<ReturnType<typeof readOriginalOrderFunding>>){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!/^gid:\/\/shopify\/Order\/\d+$/.test(orderGid))throw Error('Invalid Support request');
 const order=await gateway.readOrder(orderGid);
 if(order.id!==orderGid||order.customerGid!==customerGid)throw Error('Order unavailable');
 const debits=await db.walletEntry.findMany({where:{shop,customerGid,sourceGid:orderGid,fundedDelta:{lt:0}},select:{fundedDelta:true,fundedAllocations:true}});
 const sources={customer_funded:0,gift_card_funded:0,reward_funded:0};
 let walletAttributionComplete=true;
 for(const debit of debits){
  try{for(const allocation of parseFundedAllocations(debit.fundedAllocations,-debit.fundedDelta))sources[allocation.sourceKind as keyof typeof sources]+=allocation.amountMinor;}
  catch{walletAttributionComplete=false;}
 }
 // An edited order can differ from its original payment. Preserve both facts
 // for Support review rather than preventing the customer from requesting it.
 const originalFundingMatchesCurrent=!!funding&&funding.currency===order.currency&&funding.totalMinor===order.amountMinor;
 const evidence=JSON.stringify({currency:order.currency,totalMinor:order.amountMinor,paid:order.paid,alreadyCancelled:order.alreadyCancelled,hasEverDispatched:order.hasEverDispatched,commencementStartsOn:order.commencementStartsOn||null,commencement:commencementStatus(order.commencementStartsOn),businessStreams:order.businessStreams,walletSources:sources,walletAttributionComplete,originalPaidFunding:funding||null,originalFundingMatchesCurrent,directPaymentAttributionPending:!originalFundingMatchesCurrent,observedAt:new Date().toISOString()});
 const existing=await db.orderSupportRequest.findUnique({where:{shop_orderGid:{shop,orderGid}}});
 if(existing&&existing.customerGid!==customerGid)throw Error('Support request ownership differs');
 return db.orderSupportRequest.upsert({where:{shop_orderGid:{shop,orderGid}},create:{shop,customerGid,orderGid,orderName:order.name||orderGid,state:'REQUESTED',evidence},update:{}});
}
