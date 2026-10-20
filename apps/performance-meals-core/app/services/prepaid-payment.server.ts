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
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
export type PrepaidPaymentExpectation={customerGid:string;orderGid:string;orderLineGid:string;productGid:string;variantGid:string;sellingPlanGid:string;upfrontMinor:number};
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
 assertShop(shop);
 for(const [key,kind]of [['customerGid','Customer'],['orderGid','Order'],['orderLineGid','LineItem'],['productGid','Product'],['variantGid','ProductVariant'],['sellingPlanGid','SellingPlan']] as const){
  if(!reference(kind,expected[key]))throw Error('Invalid prepaid payment reference');
 }
 if(!Number.isSafeInteger(expected.upfrontMinor)||expected.upfrontMinor<1||expected.upfrontMinor>2147483647)throw Error('Approved upfront amount required');
 const response=await admin.graphql(PREPAID_PAYMENT_QUERY,{variables:{id:expected.orderGid}}),body=await response.json(),data=body.data,order=data?.order;
 if(!response.ok||body.errors||data?.shop?.myshopifyDomain!==shop||data.shop.currencyCode!=='SGD'||order?.id!==expected.orderGid||order.customer?.id!==expected.customerGid||order.test!==true||order.currencyCode!=='SGD'||order.taxesIncluded!==true||order.cancelledAt!==null||order.displayFinancialStatus!=='PAID'||!Array.isArray(order.disputes)||order.disputes.length||order.lineItems?.pageInfo?.hasNextPage!==false||!Array.isArray(order.lineItems.nodes)||order.lineItems.nodes.length!==1||!Array.isArray(order.transactions)||!order.transactions.length||order.transactions.length>=100)throw Error('Original prepaid payment evidence unavailable');
 const line=order.lineItems.nodes[0];
 if(line?.id!==expected.orderLineGid||line.quantity!==1||line.currentQuantity!==1||line.isGiftCard!==false||line.product?.id!==expected.productGid||line.variant?.id!==expected.variantGid||line.sellingPlan?.sellingPlanId!==expected.sellingPlanGid)throw Error('Original prepaid package differs');
 if([order.totalPriceSet,order.currentTotalPriceSet,order.totalReceivedSet].some(value=>money(value)!==expected.upfrontMinor)||[order.totalRefundedSet,order.totalShippingPriceSet,order.totalDiscountsSet].some(value=>money(value)!==0))throw Error('Prepaid total, delivery or payment differs');
 const createdAt=rewardTimestamp(order.createdAt);
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
  if(amountMinor<1||time<createdAt)throw Error('Prepaid receipt amount or time differs');
  payments.push({id:payment.id,gateway:payment.gateway,amountMinor,processedAt:new Date(time).toISOString()});
 }
 const total=payments.reduce((sum,payment)=>sum+payment.amountMinor,0);
 if(!payments.length||!Number.isSafeInteger(total)||total!==expected.upfrontMinor)throw Error('Prepaid captured funding differs');
 return {orderGid:expected.orderGid,orderLineGid:expected.orderLineGid,customerGid:expected.customerGid,currency:'SGD' as const,upfrontMinor:total,paidAt:new Date(Math.max(...payments.map(payment=>Date.parse(payment.processedAt)))).toISOString(),payments};
}
