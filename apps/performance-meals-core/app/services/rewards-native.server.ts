import db from '../db.server';
import {assertShop} from './security.server';
import {minorAmount} from './gift-card-native.server';
import {parseFundedAllocations} from './wallet-fifo';
import {allocateGiftCardFirstFood,rewardTimestamp,type OrderFunding,type RewardLine} from './rewards-policy';
import {earnVerifiedOrderRewards} from './rewards-ledger.server';
import {reconcileNativeWalletHistory} from './native-wallet-returns.server';

export const REWARDS_ORDER_QUERY=`#graphql
query RewardPaidOrder($id:ID!){shop{myshopifyDomain currencyCode} order(id:$id){
 id createdAt currencyCode taxesIncluded displayFinancialStatus cancelledAt customer{id} disputes{id}
 totalPriceSet{shopMoney{amount currencyCode}} totalReceivedSet{shopMoney{amount currencyCode}} totalRefundedSet{shopMoney{amount currencyCode}} totalTaxSet{shopMoney{amount currencyCode}}
 transactions(first:100){id status kind gateway processedAt amountSet{shopMoney{amount currencyCode}}}
 lineItems(first:250){nodes{id quantity currentQuantity isGiftCard priceAfterAllDiscountsBeforeTaxesSet{shopMoney{amount currencyCode}} taxLines{priceSet{shopMoney{amount currencyCode}}} product{id stream:metafield(namespace:"performance",key:"business_stream"){jsonValue}}}pageInfo{hasNextPage}}
 shippingLines(first:100){nodes{isRemoved discountedPriceSet{shopMoney{amount currencyCode}} taxLines{priceSet{shopMoney{amount currencyCode}}}}pageInfo{hasNextPage}}
}}`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
type Money={shopMoney:{amount:string;currencyCode:string}};
type TaxLine={priceSet:Money};
type NativeLine={id:string;quantity:number;currentQuantity:number;isGiftCard:boolean;priceAfterAllDiscountsBeforeTaxesSet:Money;taxLines:TaxLine[];product:null|{id:string;stream:null|{jsonValue:unknown}}};
type Payment={id:string;status:string;kind:string;gateway:string;processedAt:string|null;amountSet:Money};

// Read-only verification. A paid webhook or authenticated account read must not
// trust browser prices, source labels, or a native Store Credit total without
// the Core debit allocations identifying its original funding lots.
export async function readNativeRewardEvidence(admin:Admin,shop:string,orderGid:string){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Order\/\d+$/.test(orderGid))throw Error('Invalid Rewards order');
 const response=await admin.graphql(REWARDS_ORDER_QUERY,{variables:{id:orderGid}}),body=await response.json(),data=body.data,order=data?.order;
 if(!response.ok||body.errors||data?.shop?.myshopifyDomain!==shop||data.shop.currencyCode!=='SGD'||order?.id!==orderGid||order.currencyCode!=='SGD'||!/^gid:\/\/shopify\/Customer\/\d+$/.test(order.customer?.id)||order.lineItems.pageInfo.hasNextPage||order.transactions.length>=100||order.disputes.length||order.cancelledAt||order.displayFinancialStatus!=='PAID')throw Error('Native Rewards order evidence incomplete');
 const money=(value:Money)=>{if(value.shopMoney.currencyCode!=='SGD')throw Error('Rewards currency differs');return minorAmount(value.shopMoney.amount);};
 const policy=await db.commercePolicy.findUnique({where:{shop},select:{rewardsRules:true}});
 const rules=policy?.rewardsRules?JSON.parse(policy.rewardsRules):null;
 if(!rules||rules.qaOrderGid&&rules.qaOrderGid!==orderGid||rules.qaCustomerGid&&rules.qaCustomerGid!==order.customer.id)throw Error('Rewards order outside configured scope');
 const total=money(order.totalPriceSet);
 if(money(order.totalReceivedSet)!==total||money(order.totalRefundedSet)!==0)throw Error('Rewards payment is not complete');
 const taxes=(taxLines:TaxLine[])=>{
  if(!Array.isArray(taxLines))throw Error('Native tax evidence missing');
  return taxLines.reduce((sum,tax)=>sum+money(tax.priceSet),0);
 };
 if(typeof order.taxesIncluded!=='boolean'||!order.shippingLines||order.shippingLines.pageInfo.hasNextPage||order.shippingLines.nodes.some((line:{isRemoved:boolean})=>line.isRemoved))throw Error('Native shipping tax evidence incomplete');
 const itemTaxes=(order.lineItems.nodes as NativeLine[]).reduce((sum,line)=>sum+taxes(line.taxLines),0);
 const shippingTaxes=order.shippingLines.nodes.reduce((sum:number,line:{taxLines:TaxLine[]})=>sum+taxes(line.taxLines),0);
 if(itemTaxes+shippingTaxes!==money(order.totalTaxSet))throw Error('Native tax totals differ');
 const itemTotal=(order.lineItems.nodes as NativeLine[]).reduce((sum,line)=>sum+money(line.priceAfterAllDiscountsBeforeTaxesSet)+taxes(line.taxLines),0);
 const shippingTotal=order.shippingLines.nodes.reduce((sum:number,line:{discountedPriceSet:Money;taxLines:TaxLine[]})=>sum+money(line.discountedPriceSet)+(order.taxesIncluded?0:taxes(line.taxLines)),0);
 if(itemTotal+shippingTotal!==total)throw Error('Native food and delivery total incomplete');
 const payments=(order.transactions as Payment[]).filter(p=>p.status==='SUCCESS'&&['SALE','CAPTURE'].includes(p.kind));
 if(!payments.length||new Set(payments.map(p=>p.id)).size!==payments.length||payments.reduce((sum,p)=>sum+money(p.amountSet),0)!==total)throw Error('Native payment funding differs');
 const paymentTimes=payments.map(payment=>{try{return payment.processedAt?rewardTimestamp(payment.processedAt):NaN;}catch{return NaN;}});
 if(paymentTimes.some(time=>!Number.isFinite(time)))throw Error('Native payment completion time unavailable');
 const paidAt=new Date(Math.max(...paymentTimes)).toISOString();
 if(rules.earningStartsAt&&rewardTimestamp(paidAt)<rewardTimestamp(rules.earningStartsAt))throw Error('Payment predates Rewards activation');
 const funding:OrderFunding={direct_customer:0,customer_funded:0,gift_card_funded:0,reward_funded:0,bonus:0};
 for(const payment of payments){
  if(!/^gid:\/\/shopify\/OrderTransaction\/\d+$/.test(payment.id)||!payment.gateway)throw Error('Payment receipt missing');
  const amount=money(payment.amountSet);
  if(payment.gateway==='gift_card')funding.gift_card_funded+=amount;
  else if(payment.gateway==='shopify_store_credit'){
   const debit=await db.walletEntry.findUnique({where:{shop_nativeSourceTransactionGid:{shop,nativeSourceTransactionGid:payment.id}}});
   if(!debit||debit.customerGid!==order.customer.id||debit.sourceGid!==orderGid||debit.currency!=='SGD'||debit.fundedDelta!==-amount||debit.bonusDelta)throw Error('Native Wallet funding requires reconciliation');
   for(const part of parseFundedAllocations(debit.fundedAllocations,amount))funding[part.sourceKind as keyof OrderFunding]+=part.amountMinor;
  }else{
   // Require an explicitly verified native direct-payment gateway, including
   // test gateways only in the allowlisted development store.
   const approved=rules.directPaymentGateways;
   if(!Array.isArray(approved)||!approved.includes(payment.gateway))throw Error('Direct payment gateway not verified for Rewards');
   funding.direct_customer+=amount;
  }
 }
 const lines:Array<Omit<RewardLine,'funding'>>=[];
 let sharedValue=0;
 for(const line of order.lineItems.nodes as NativeLine[]){
  const net=money(line.priceAfterAllDiscountsBeforeTaxesSet)+taxes(line.taxLines);
  if(line.currentQuantity!==line.quantity)throw Error('Changed order lines require original earning evidence');
  const stream=line.product?.stream?.jsonValue;
  if(line.isGiftCard||stream==='shared'){sharedValue+=net;continue;}
  if(!line.product||!['ready_series','meal_plan'].includes(String(stream)))throw Error('Food stream evidence incomplete');
  const route=await db.operationalLine.findUnique({where:{shop_orderLineGid:{shop,orderLineGid:line.id}}});
  if(!route||route.orderGid!==orderGid||route.customerGid!==order.customer.id||route.productGid!==line.product.id||route.businessStream!==stream||route.validationStatus!=='VALIDATED')throw Error('Rewards operational stream snapshot differs');
  lines.push({productGid:line.product.id,stream:String(stream),netMinor:net,giftCard:false,walletTopUp:false});
 }
 if(sharedValue&&lines.length&&(funding.gift_card_funded||funding.reward_funded))throw Error('Shared-commerce credit allocation requires verification');
 return {shop,customerGid:order.customer.id,orderGid,paidAt,lines:allocateGiftCardFirstFood(lines,funding,total)};
}
export async function earnNativeOrderRewards(admin:Admin,shop:string,orderGid:string){
 assertShop(shop);
 const policy=await db.commercePolicy.findUnique({where:{shop},select:{rewardsEnabled:true}});
 if(!policy?.rewardsEnabled)return null;
 const existing=await db.rewardsEntry.findUnique({where:{shop_sourceEvent:{shop,sourceEvent:'rewards-earned:'+orderGid}}});
 if(existing)return existing; // Option A: approved refunds never claw back earning.
 // Reconcile source lots before using Store Credit payment evidence.
 const response=await admin.graphql('query RewardCustomer($id:ID!){shop{myshopifyDomain}order(id:$id){id customer{id}}}',{variables:{id:orderGid}}),body=await response.json();
 if(!response.ok||body.errors||body.data?.shop?.myshopifyDomain!==shop||body.data.order?.id!==orderGid||!body.data.order.customer?.id)throw Error('Rewards customer unavailable');
 await reconcileNativeWalletHistory(admin,shop,body.data.order.customer.id);
 return earnVerifiedOrderRewards(await readNativeRewardEvidence(admin,shop,orderGid));
}
