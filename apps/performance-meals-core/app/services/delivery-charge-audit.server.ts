import {assertShop} from './security.server';
import {minorAmount} from './gift-card-native.server';
import {calculateSingaporeDelivery,type DeliveryLine} from './delivery-policy';

export const DELIVERY_CHARGE_QUERY=`#graphql
query DeliveryChargeAudit($id:ID!){shop{myshopifyDomain currencyCode}order(id:$id){
 id currencyCode taxesIncluded cancelledAt shippingAddress{countryCodeV2}
 totalPriceSet{shopMoney{amount currencyCode}} totalTaxSet{shopMoney{amount currencyCode}}
 lineItems(first:250){nodes{id quantity currentQuantity isGiftCard sellingPlan{sellingPlanId}
 priceAfterAllDiscountsBeforeTaxesSet{shopMoney{amount currencyCode}} taxLines{priceSet{shopMoney{amount currencyCode}}}
 product{id isGiftCard stream:metafield(namespace:"performance",key:"business_stream"){jsonValue} deliveryIncluded:metafield(namespace:"performance",key:"delivery_included"){jsonValue}}}pageInfo{hasNextPage}}
 shippingLines(first:100){nodes{id isRemoved discountedPriceSet{shopMoney{amount currencyCode}} taxLines{priceSet{shopMoney{amount currencyCode}}}}pageInfo{hasNextPage}}
}}`;
type Money={shopMoney:{amount:string;currencyCode:string}};
type Tax={priceSet:Money};
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
const valid=(kind:string,id:unknown)=>typeof id==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(id);
const money=(bag:Money)=>{if(bag?.shopMoney?.currencyCode!=='SGD')throw Error('Delivery audit currency differs');return minorAmount(bag.shopMoney.amount);};
const sum=(values:number[])=>{const total=values.reduce((a,b)=>a+b,0);if(!Number.isSafeInteger(total)||total>2147483647)throw Error('Delivery audit total exceeds supported range');return total;};
function taxes(lines:Tax[]){if(!Array.isArray(lines))throw Error('Delivery audit tax evidence missing');return sum(lines.map(line=>money(line.priceSet)));}
type Line={id:string;quantity:number;currentQuantity:number;isGiftCard:boolean;sellingPlan:null|{sellingPlanId:string};priceAfterAllDiscountsBeforeTaxesSet:Money;taxLines:Tax[];product:null|{id:string;isGiftCard:boolean;stream:null|{jsonValue:unknown};deliveryIncluded:null|{jsonValue:unknown}}};
type Shipping={id:string;isRemoved:boolean;discountedPriceSet:Money;taxLines:Tax[]};
// Read-only detection, not checkout enforcement, a fee adjustment or acceptance.
// Use all-discounts native totals, never browser labels or discountedTotalSet
// (which omits order-level discounts). Do not guess unknown shared products.
export async function inspectNativeDeliveryCharge(admin:Admin,shop:string,orderGid:string,topUpProductGid?:string,context:{singleOrdinaryDeliveryVerified?:boolean}={}){
 assertShop(shop);
 if(!valid('Order',orderGid)||topUpProductGid!==undefined&&!valid('Product',topUpProductGid))throw Error('Invalid delivery audit reference');
 const response=await admin.graphql(DELIVERY_CHARGE_QUERY,{variables:{id:orderGid}}),body=await response.json(),data=body.data,order=data?.order;
 if(!response.ok||body.errors||data?.shop?.myshopifyDomain!==shop||data.shop.currencyCode!=='SGD'||order?.id!==orderGid||order.currencyCode!=='SGD'||typeof order.taxesIncluded!=='boolean'||order.cancelledAt||order.lineItems?.pageInfo?.hasNextPage!==false||order.shippingLines?.pageInfo?.hasNextPage!==false||!Array.isArray(order.lineItems.nodes)||!order.lineItems.nodes.length||!Array.isArray(order.shippingLines.nodes))throw Error('Native delivery audit evidence incomplete');
 const items=order.lineItems.nodes as Line[],shipping=order.shippingLines.nodes as Shipping[];
 if(new Set(items.map(line=>line.id)).size!==items.length||new Set(shipping.map(line=>line.id)).size!==shipping.length)throw Error('Duplicate delivery audit evidence');
 const lines:DeliveryLine[]=items.map(line=>{
  if(!valid('LineItem',line.id)||!Number.isSafeInteger(line.quantity)||line.quantity<1||line.currentQuantity!==line.quantity||typeof line.isGiftCard!=='boolean'||!line.product||!valid('Product',line.product.id)||line.product.isGiftCard!==line.isGiftCard||line.sellingPlan&&!valid('SellingPlan',line.sellingPlan.sellingPlanId))throw Error('Delivery audit line identity differs');
  const netMinor=sum([money(line.priceAfterAllDiscountsBeforeTaxesSet),taxes(line.taxLines)]);
  const stream=line.product.stream?.jsonValue,included=line.product.deliveryIncluded?.jsonValue;
  if(included!==undefined&&included!==null&&typeof included!=='boolean')throw Error('Delivery inclusion metadata invalid');
  let kind:DeliveryLine['kind'];
  if(line.isGiftCard&&stream==='shared')kind='gift_card';
  else if(line.product.id===topUpProductGid&&stream==='shared'&&!line.isGiftCard)kind='wallet_top_up';
  else if(!line.isGiftCard&&(stream==='ready_series'||stream==='meal_plan'))kind=stream==='meal_plan'||included===true||line.sellingPlan?'delivery_included':'ordinary_food';
  else throw Error('Unknown delivery classification requires review');
  return {id:line.id,kind,netMinor};
 });
 if(lines.some(line=>line.kind==='ordinary_food'||line.kind==='delivery_included')&&order.shippingAddress?.countryCodeV2!=='SG')throw Error('Singapore delivery destination required');
 const shippingTax=sum(shipping.map(line=>taxes(line.taxLines)));
 for(const line of shipping)if(!valid('ShippingLine',line.id)||line.isRemoved!==false)throw Error('Changed shipping lines require review');
 const observedFeeMinor=sum(shipping.map(line=>sum([money(line.discountedPriceSet),order.taxesIncluded?0:taxes(line.taxLines)])));
 if(sum([sum(items.map(line=>taxes(line.taxLines))),shippingTax])!==money(order.totalTaxSet)||sum([sum(lines.map(line=>line.netMinor)),observedFeeMinor])!==money(order.totalPriceSet))throw Error('Delivery audit totals require reconciliation');
 const expected=calculateSingaporeDelivery(lines);
 // Native shipping-line count is not a count of physical deliveries. Without
 // verified scheduling context, a whole-order tier cannot prove the new
 // per-delivery policy, even when its aggregate amount happens to match.
 const deliveryAllocationVerified=!expected.hasOrdinaryFood||context.singleOrdinaryDeliveryVerified===true;
 return {currency:'SGD',eligibleSubtotalMinor:expected.eligibleSubtotalMinor,expectedFeeMinor:deliveryAllocationVerified?expected.feeMinor:null,singleDeliveryEstimateMinor:expected.feeMinor,observedFeeMinor,chargeMatches:deliveryAllocationVerified?expected.feeMinor===observedFeeMinor:null,deliveryAllocationVerified,checkoutEnforcementVerified:false};
}
