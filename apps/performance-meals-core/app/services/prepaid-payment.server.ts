import {assertShop} from './security.server';
import {minorAmount} from './gift-card-native.server';
import {rewardTimestamp} from './rewards-policy';

export const PREPAID_PAYMENT_QUERY=`#graphql
query ReadySeriesOriginalPayment($id:ID!){
 shop{myshopifyDomain currencyCode}
 order(id:$id){
  id test createdAt cancelledAt currencyCode taxesIncluded displayFinancialStatus customer{id} disputes{id}
  totalPriceSet{shopMoney{amount currencyCode}}
  currentTotalPriceSet{shopMoney{amount currencyCode}}
  totalReceivedSet{shopMoney{amount currencyCode}}
  totalRefundedSet{shopMoney{amount currencyCode}}
  totalShippingPriceSet{shopMoney{amount currencyCode}}
  totalDiscountsSet{shopMoney{amount currencyCode}}
  transactions(first:100){id test status kind gateway manualPaymentGateway processedAt amountSet{shopMoney{amount currencyCode}}}
  lineItems(first:100){nodes{id quantity currentQuantity isGiftCard product{id} variant{id} sellingPlan{sellingPlanId}}pageInfo{hasNextPage}}
 }
}`;
export const PREPAID_CORRECTED_PAYMENT_QUERY=PREPAID_PAYMENT_QUERY
 .replace('query ReadySeriesOriginalPayment','query ReadySeriesCorrectedPayment')
 .replace('totalDiscountsSet{shopMoney{amount currencyCode}}','totalDiscountsSet{shopMoney{amount currencyCode}} totalTaxSet{shopMoney{amount currencyCode}} currentTotalTaxSet{shopMoney{amount currencyCode}}')
 .replace('nodes{id quantity currentQuantity isGiftCard','nodes{originalTotalSet{shopMoney{amount currencyCode}} discountAllocations{allocatedAmountSet{shopMoney{amount currencyCode}}discountApplication{__typename ...on AutomaticDiscountApplication{title} ...on ManualDiscountApplication{title}}} id quantity currentQuantity isGiftCard');
export type PrepaidPriceCorrection={baseMinor:number;discountMinor:number;applicationKind:'AUTOMATIC'|'MANUAL';title:string;taxMinor:number};
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
export type PrepaidPaymentExpectation={months:3|6;customerGid:string;orderGid:string;orderLineGid:string;productGid:string;variantGid:string;sellingPlanGid:string;upfrontMinor:number};
const reference=(kind:string,value:unknown)=>typeof value==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(value);
type Money={shopMoney:{amount:string;currencyCode:string}};
const money=(value:Money)=>{
 if(value?.shopMoney?.currencyCode!=='SGD'||typeof value.shopMoney.amount!=='string')throw Error('Prepaid payment money unavailable');
 return minorAmount(value.shopMoney.amount);
};

// Development evidence only, never a charge or activation. The caller supplies
// an immutable server-approved package snapshot, not current browser/catalogue
// prices. This first gate covers isolated prepaid-only orders; mixed, edited or
// discounted orders remain held until their final line allocation is verified.
export async function readPrepaidPayment(admin:Admin,shop:string,expected:PrepaidPaymentExpectation){
 return readPayment(admin,shop,expected,null);
}

// Explicit server-approved cent corrections only. Default payment verification
// still refuses all discounts. Allocations, not approximate unit prices or
// discountedTotalSet (which omits order discounts), prove the actual food net.
// No purchase, price update, charge or activation occurs here.
export async function readCorrectedPrepaidPayment(admin:Admin,shop:string,expected:PrepaidPaymentExpectation,correction:PrepaidPriceCorrection){
 if(!correction||!Number.isSafeInteger(correction.baseMinor)||correction.baseMinor>2147483647||!Number.isSafeInteger(correction.discountMinor)||correction.discountMinor<1||correction.discountMinor>=expected.months||correction.baseMinor!==expected.upfrontMinor+correction.discountMinor||!['AUTOMATIC','MANUAL'].includes(correction.applicationKind)||typeof correction.title!=='string'||!correction.title.trim()||correction.title.length>255||!Number.isSafeInteger(correction.taxMinor)||correction.taxMinor<0||correction.taxMinor>expected.upfrontMinor)throw Error('Explicit approved prepaid correction required');
 return readPayment(admin,shop,expected,correction);
}
async function readPayment(admin:Admin,shop:string,expected:PrepaidPaymentExpectation,correction:PrepaidPriceCorrection|null){
 assertShop(shop);
 for(const [key,kind]of [['customerGid','Customer'],['orderGid','Order'],['orderLineGid','LineItem'],['productGid','Product'],['variantGid','ProductVariant'],['sellingPlanGid','SellingPlan']] as const){
  if(!reference(kind,expected[key]))throw Error('Invalid prepaid payment reference');
 }
 if(![3,6].includes(expected.months))throw Error('Approved prepaid delivery count required');
 if(!Number.isSafeInteger(expected.upfrontMinor)||expected.upfrontMinor<1||expected.upfrontMinor>2147483647)throw Error('Approved upfront amount required');
 const response=await admin.graphql(correction?PREPAID_CORRECTED_PAYMENT_QUERY:PREPAID_PAYMENT_QUERY,{variables:{id:expected.orderGid}}),body=await response.json(),data=body.data,order=data?.order;
 if(!response.ok||body.errors||data?.shop?.myshopifyDomain!==shop||data.shop.currencyCode!=='SGD'||order?.id!==expected.orderGid||order.customer?.id!==expected.customerGid||order.test!==true||order.currencyCode!=='SGD'||order.taxesIncluded!==true||order.cancelledAt!==null||order.displayFinancialStatus!=='PAID'||!Array.isArray(order.disputes)||order.disputes.length||order.lineItems?.pageInfo?.hasNextPage!==false||!Array.isArray(order.lineItems.nodes)||order.lineItems.nodes.length!==1||!Array.isArray(order.transactions)||!order.transactions.length||order.transactions.length>=100)throw Error('Original prepaid payment evidence unavailable');
 const line=order.lineItems.nodes[0];
 if(line?.id!==expected.orderLineGid||line.quantity!==expected.months||line.currentQuantity!==expected.months||line.isGiftCard!==false||line.product?.id!==expected.productGid||line.variant?.id!==expected.variantGid||line.sellingPlan?.sellingPlanId!==expected.sellingPlanGid)throw Error('Original prepaid package differs');
 if([order.totalPriceSet,order.currentTotalPriceSet,order.totalReceivedSet].some(value=>money(value)!==expected.upfrontMinor)||[order.totalRefundedSet,order.totalShippingPriceSet].some(value=>money(value)!==0)||money(order.totalDiscountsSet)!==(correction?.discountMinor??0))throw Error('Prepaid total, delivery or payment differs');
 if(correction){
  const allocations=line.discountAllocations,allocation=allocations?.[0],application=allocation?.discountApplication;
  const type=correction.applicationKind==='AUTOMATIC'?'AutomaticDiscountApplication':'ManualDiscountApplication';
  if(money(line.originalTotalSet)!==correction.baseMinor||!Array.isArray(allocations)||allocations.length!==1||money(allocation.allocatedAmountSet)!==correction.discountMinor||application?.__typename!==type||application.title!==correction.title||money(order.totalTaxSet)!==correction.taxMinor||money(order.currentTotalTaxSet)!==correction.taxMinor)throw Error('Native prepaid correction allocation or GST differs');
 }
 // Shopify can capture payment before it creates the order. Association is
 // established by this order's native transaction list, not timestamp ordering.
 rewardTimestamp(order.createdAt);
 const payments:Array<{id:string;gateway:string;amountMinor:number;processedAt:string}>=[];
 const ids=new Set<string>();
 for(const payment of order.transactions){
  if(!payment||!reference('OrderTransaction',payment.id)||ids.has(payment.id)||typeof payment.gateway!=='string'||!payment.gateway.trim()||payment.test!==true||!['SUCCESS','FAILURE','ERROR'].includes(payment.status)||!['SALE','CAPTURE','AUTHORIZATION','VOID','REFUND'].includes(payment.kind))throw Error('Prepaid receipt is ambiguous');
  ids.add(payment.id);
  // Failed attempts are not money received; successful reversals/unsupported
  // adjustments cannot be hidden behind an aggregate PAID label.
  if(payment.status!=='SUCCESS')continue;
  if(payment.manualPaymentGateway!==false)throw Error('Manual or unverified prepaid gateway requires review');
  if(payment.kind==='AUTHORIZATION')continue;
  if(!['SALE','CAPTURE'].includes(payment.kind))throw Error('Prepaid receipt requires reconciliation');
  const amountMinor=money(payment.amountSet),time=rewardTimestamp(payment.processedAt);
  if(amountMinor<1)throw Error('Prepaid receipt amount or time differs');
  payments.push({id:payment.id,gateway:payment.gateway,amountMinor,processedAt:new Date(time).toISOString()});
 }
 const total=payments.reduce((sum,payment)=>sum+payment.amountMinor,0);
 if(!payments.length||!Number.isSafeInteger(total)||total!==expected.upfrontMinor)throw Error('Prepaid captured funding differs');
 return {orderGid:expected.orderGid,orderLineGid:expected.orderLineGid,customerGid:expected.customerGid,currency:'SGD' as const,upfrontMinor:total,paidAt:new Date(Math.max(...payments.map(payment=>Date.parse(payment.processedAt)))).toISOString(),payments,...(correction?{correction:{baseMinor:correction.baseMinor,discountMinor:correction.discountMinor,applicationKind:correction.applicationKind,title:correction.title,taxMinor:correction.taxMinor},checkoutPropagationVerified:false as const,futureRenewalVerified:false as const}:{} )};
}
