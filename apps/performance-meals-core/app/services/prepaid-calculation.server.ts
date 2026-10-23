import {assertShop} from './security.server';
import {minorAmount} from './gift-card-native.server';
import {validSubscriptionLineGid} from './subscription-reference';

export const PREPAID_CALCULATION_QUERY=`#graphql
query CorePrepaidCalculation($id:ID!){
 shop{myshopifyDomain currencyCode taxesIncluded}
 currentAppInstallation{app{id}}
 subscriptionContractCalculation(id:$id){
  __typename
  ... on SubscriptionContractCalculationPending{id}
  ... on SubscriptionContractCalculationFailure{id errors{code}}
  ... on SubscriptionContractCalculationSuccess{
   id warnings{code}
   calculatedContract{
    currencyCode customer{id} customerPaymentMethod{id} deliveryPrice{amount currencyCode}
    billingPolicy{interval intervalCount minCycles maxCycles}
    deliveryPolicy{interval intervalCount multiFulfillment{cadence{unit count}numberOfFulfillments}}
    lines(first:100){nodes{id productId variantId quantity currentPrice{amount currencyCode}}pageInfo{hasNextPage}}
   }
   projectedOrderTotals{subtotal{amount currencyCode}total{amount currencyCode}totalDelivery{amount currencyCode}totalTax{amount currencyCode}totalMerchandiseDiscounts{amount currencyCode}totalDeliveryDiscounts{amount currencyCode}}
  }
 }
}`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
type Expected={appGid:string;customerGid:string;productGid:string;variantGid:string;months:3|6;upfrontMinor:number};
type Correction={baseMinor:number;discountMinor:number;title:string};
const CORRECTION_FIELDS=`discounts(first:10){nodes{id title recurringCycleLimit rejectionReason targetType type usageCount value{__typename ...on SubscriptionDiscountFixedAmountValue{amount{amount currencyCode}appliesOnEachItem}}entitledLines{all lines(first:10){nodes{id}pageInfo{hasNextPage}}}}pageInfo{hasNextPage}}`;
export const PREPAID_CORRECTION_CALCULATION_QUERY=PREPAID_CALCULATION_QUERY
 .replace('query CorePrepaidCalculation','query CorePrepaidCorrectionCalculation')
 .replace('calculatedContract{',`calculatedContract{${CORRECTION_FIELDS}`);
const ref=(kind:string,value:unknown)=>typeof value==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(value);
const amount=(value:{amount:string;currencyCode:string})=>{
 if(value?.currencyCode!=='SGD'||typeof value.amount!=='string')throw Error('Calculation money unavailable');
 return minorAmount(value.amount);
};

// Development read-only evidence. No calculation creation, commit, billing,
// payment method, entitlement or message mutation is present in this service.
// A verified projection never authorizes fulfilment or replaces paid-order proof.
export async function inspectPrepaidCalculation(admin:Admin,shop:string,id:string,expected:Expected){
 return inspectCalculation(admin,shop,id,expected,null);
}

// Separate development diagnostic: an explicit manual correction can explain
// a projection, but never proves checkout propagation or a recurring charge.
// The original undiscounted inspector keeps its stricter default behaviour.
export async function inspectPrepaidCorrectionCalculation(admin:Admin,shop:string,id:string,expected:Expected,correction:Correction){
 if(!correction||!Number.isSafeInteger(correction.baseMinor)||correction.baseMinor>2147483647||!Number.isSafeInteger(correction.discountMinor)||correction.discountMinor<1||correction.baseMinor!==expected.upfrontMinor+correction.discountMinor||typeof correction.title!=='string'||!correction.title.trim()||correction.title.length>255)throw Error('Approved calculation correction required');
 return inspectCalculation(admin,shop,id,expected,correction);
}

async function inspectCalculation(admin:Admin,shop:string,id:string,expected:Expected,correction:Correction|null){
 assertShop(shop);
 if(process.env.NODE_ENV==='production')throw Error('Development calculation inspection only');
 if(!ref('SubscriptionContractCalculation',id)||![3,6].includes(expected.months)||!Number.isSafeInteger(expected.upfrontMinor)||expected.upfrontMinor<1||expected.upfrontMinor>2147483647)throw Error('Approved calculation context required');
 for(const [key,kind]of [['appGid','App'],['customerGid','Customer'],['productGid','Product'],['variantGid','ProductVariant']]as const)if(!ref(kind,expected[key]))throw Error('Invalid expected calculation reference');
 const response=await admin.graphql(correction?PREPAID_CORRECTION_CALCULATION_QUERY:PREPAID_CALCULATION_QUERY,{variables:{id}}),body=await response.json(),data=body.data,result=data?.subscriptionContractCalculation;
 if(!response.ok||body.errors||data?.shop?.myshopifyDomain!==shop||data.shop.currencyCode!=='SGD'||data.shop.taxesIncluded!==true||data.currentAppInstallation?.app?.id!==expected.appGid||result?.id!==id)throw Error('Native calculation evidence unavailable');
 const limits={calculationOnly:true as const,paymentVerified:false as const,renewalVerified:false as const,deliveryCalendarVerified:false as const,explicitCorrection:!!correction,checkoutPropagationVerified:false as const};
 if(result.__typename==='SubscriptionContractCalculationPending')return {...limits,id,state:'PENDING' as const,calculationMatches:false,issues:['Calculation has not finished']};
 if(result.__typename==='SubscriptionContractCalculationFailure'){
  if(!Array.isArray(result.errors)||result.errors.some((error:{code:unknown})=>typeof error?.code!=='string'))throw Error('Calculation failure evidence unavailable');
  return {...limits,id,state:'FAILED' as const,calculationMatches:false,issues:['Native calculation failed or was voided']};
 }
 if(result.__typename!=='SubscriptionContractCalculationSuccess'||!Array.isArray(result.warnings))throw Error('Calculation result unavailable');
 const contract=result.calculatedContract,lines=contract?.lines;
 if(contract?.customer?.id!==expected.customerGid||contract.currencyCode!=='SGD'||contract.customerPaymentMethod!==null||lines?.pageInfo?.hasNextPage!==false||!Array.isArray(lines.nodes)||lines.nodes.length!==1)throw Error('Calculation customer, payment method or line coverage differs');
 const line=lines.nodes[0];
 // Calculated (uncommitted) line IDs are UUID GIDs, unlike numeric order lines.
 if(!validSubscriptionLineGid(line?.id)||line.productId!==expected.productGid||line.variantId!==expected.variantGid||line.quantity!==1)throw Error('Approved calculation product differs');
 const issues:string[]=[],billing=contract.billingPolicy,delivery=contract.deliveryPolicy,multi=delivery?.multiFulfillment;
 if(billing?.interval!=='MONTH'||billing.intervalCount!==expected.months||billing.minCycles!==1||billing.maxCycles!==null)issues.push('Calculated billing policy differs from the approved renewing term');
 if(delivery?.interval!=='MONTH'||delivery.intervalCount!==1||multi?.cadence?.unit!=='MONTH'||multi.cadence.count!==1||multi.numberOfFulfillments!==expected.months)issues.push('Calculated delivery cadence or count differs');
 if(result.warnings.length)issues.push('Native calculation warnings require review');
 if(correction){
  const discounts=contract.discounts,discount=discounts?.nodes?.[0];
  // A missing/extra discount, limited duration or different entitled line must
  // not be accepted just because today's aggregate total happens to match.
  if(discounts?.pageInfo?.hasNextPage!==false||!Array.isArray(discounts.nodes)||discounts.nodes.length!==1||typeof discount?.id!=='string'||!/^gid:\/\/shopify\/SubscriptionManualDiscount\/(?:\d+|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i.test(discount.id)||discount.title!==correction.title||![null,0].includes(discount.recurringCycleLimit)||discount.rejectionReason!==null||discount.targetType!=='LINE_ITEM'||discount.type!=='MANUAL'||discount.usageCount!==0||discount.value?.__typename!=='SubscriptionDiscountFixedAmountValue'||discount.value.appliesOnEachItem!==false||discount.entitledLines?.all!==false||discount.entitledLines.lines?.pageInfo?.hasNextPage!==false||!Array.isArray(discount.entitledLines.lines.nodes)||discount.entitledLines.lines.nodes.length!==1||discount.entitledLines.lines.nodes[0]?.id!==line.id)throw Error('Explicit recurring correction evidence differs');
  if(amount(discount.value.amount)!==correction.discountMinor)issues.push('Native correction amount differs');
 }
 const totals=result.projectedOrderTotals;
 const projectedTotalMinor=amount(totals?.total),subtotalMinor=amount(totals?.subtotal),taxMinor=amount(totals?.totalTax),unitPriceMinor=amount(line.currentPrice);
 const deliveryMinor=amount(totals?.totalDelivery),merchandiseDiscountMinor=amount(totals?.totalMerchandiseDiscounts),deliveryDiscountMinor=amount(totals?.totalDeliveryDiscounts),contractDeliveryMinor=amount(contract.deliveryPrice);
 if(projectedTotalMinor!==expected.upfrontMinor||unitPriceMinor!==(correction?.baseMinor??expected.upfrontMinor)||subtotalMinor>projectedTotalMinor||taxMinor>projectedTotalMinor||(subtotalMinor!==projectedTotalMinor&&subtotalMinor+taxMinor!==projectedTotalMinor))issues.push('Calculated GST-inclusive package amount differs');
 if(deliveryMinor!==0||contractDeliveryMinor!==0||merchandiseDiscountMinor!==(correction?.discountMinor??0)||deliveryDiscountMinor!==0)issues.push('Calculated package has an unexpected delivery charge or discount');
 return {...limits,id,state:issues.length?'REVIEW' as const:'VERIFIED_CALCULATION' as const,calculationMatches:issues.length===0,months:expected.months,projectedTotalMinor,nativeUnitPriceMinor:unitPriceMinor,taxMinor,issues};
}
