import db from '../db.server';
import {assertShop} from './security.server';
import {REFUND_FUNDING_QUERY} from './native-wallet-returns.server';
import {minorAmount} from './gift-card-native.server';
import {parseFundedAllocations,type FundedAllocation} from './wallet-fifo';
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
// Original paid funds, not current Wallet balances. Support sees Reward-funded
// value separately; a refund must never relabel it as customer-funded principal.
export async function readOriginalOrderFunding(admin:Admin,shop:string,customerGid:string,orderGid:string){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!/^gid:\/\/shopify\/Order\/\d+$/.test(orderGid))throw Error('Invalid order funding context');
 const response=await admin.graphql(REFUND_FUNDING_QUERY,{variables:{id:orderGid}}),body=await response.json(),order=body.data?.order;
 if(!response.ok||body.errors||body.data?.shop?.myshopifyDomain!==shop||order?.id!==orderGid||order.customer?.id!==customerGid||order.currencyCode!=='SGD'||order.transactions.length>=100||order.totalReceivedSet.shopMoney.currencyCode!=='SGD')throw Error('Original funding evidence incomplete');
 const paid=order.transactions.filter((p:{status:string;kind:string})=>p.status==='SUCCESS'&&['SALE','CAPTURE'].includes(p.kind)) as Array<{id:string;gateway:string;amountSet:{shopMoney:{amount:string;currencyCode:string}}}>;
 const allocations:FundedAllocation[]=[];
 if(!paid.length||new Set(paid.map(p=>p.id)).size!==paid.length)throw Error('Original payment receipts incomplete');
 for(const payment of paid){
  if(!/^gid:\/\/shopify\/OrderTransaction\/\d+$/.test(payment.id)||!payment.gateway||payment.amountSet.shopMoney.currencyCode!=='SGD')throw Error('Original receipt differs');
  const amount=minorAmount(payment.amountSet.shopMoney.amount);
  if(payment.gateway==='shopify_store_credit'){
   const debit=await db.walletEntry.findUnique({where:{shop_nativeSourceTransactionGid:{shop,nativeSourceTransactionGid:payment.id}}});
   if(!debit||debit.customerGid!==customerGid||debit.currency!=='SGD'||debit.sourceGid!==orderGid||debit.fundedDelta!==-amount||debit.bonusDelta)throw Error('Wallet attribution requires reconciliation');
   allocations.push(...parseFundedAllocations(debit.fundedAllocations,amount));
  }else allocations.push({creditEntryId:payment.id,sourceKind:payment.gateway==='gift_card'?'gift_card_funded':'customer_funded',amountMinor:amount});
 }
 const total=allocations.reduce((sum,part)=>sum+part.amountMinor,0);
 if(total!==minorAmount(order.totalReceivedSet.shopMoney.amount))throw Error('Original funding total differs');
 const sources={customer_funded:0,gift_card_funded:0,reward_funded:0};
 for(const part of allocations)sources[part.sourceKind as keyof typeof sources]+=part.amountMinor;
 return {currency:'SGD',totalMinor:total,sources,allocations};
}
