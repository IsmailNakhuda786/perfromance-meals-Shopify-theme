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
const ref=(kind:string,value:unknown)=>typeof value==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(value);
const amount=(value:{amount:string;currencyCode:string})=>{
 if(value?.currencyCode!=='SGD'||typeof value.amount!=='string')throw Error('Calculation money unavailable');
 return minorAmount(value.amount);
};

// Development read-only evidence. No calculation creation, commit, billing,
// payment method, entitlement or message mutation is present in this service.
// A verified projection never authorizes fulfilment or replaces paid-order proof.
export async function inspectPrepaidCalculation(admin:Admin,shop:string,id:string,expected:Expected){
 assertShop(shop);
 if(process.env.NODE_ENV==='production')throw Error('Development calculation inspection only');
 if(!ref('SubscriptionContractCalculation',id)||![3,6].includes(expected.months)||!Number.isSafeInteger(expected.upfrontMinor)||expected.upfrontMinor<1||expected.upfrontMinor>2147483647)throw Error('Approved calculation context required');
 for(const [key,kind]of [['appGid','App'],['customerGid','Customer'],['productGid','Product'],['variantGid','ProductVariant']]as const)if(!ref(kind,expected[key]))throw Error('Invalid expected calculation reference');
 const response=await admin.graphql(PREPAID_CALCULATION_QUERY,{variables:{id}}),body=await response.json(),data=body.data,result=data?.subscriptionContractCalculation;
 if(!response.ok||body.errors||data?.shop?.myshopifyDomain!==shop||data.shop.currencyCode!=='SGD'||data.shop.taxesIncluded!==true||data.currentAppInstallation?.app?.id!==expected.appGid||result?.id!==id)throw Error('Native calculation evidence unavailable');
 const limits={calculationOnly:true as const,paymentVerified:false as const,renewalVerified:false as const,deliveryCalendarVerified:false as const};
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
 const totals=result.projectedOrderTotals;
 const projectedTotalMinor=amount(totals?.total),subtotalMinor=amount(totals?.subtotal),taxMinor=amount(totals?.totalTax),unitPriceMinor=amount(line.currentPrice);
 const deliveryMinor=amount(totals?.totalDelivery),merchandiseDiscountMinor=amount(totals?.totalMerchandiseDiscounts),deliveryDiscountMinor=amount(totals?.totalDeliveryDiscounts),contractDeliveryMinor=amount(contract.deliveryPrice);
 if(projectedTotalMinor!==expected.upfrontMinor||unitPriceMinor!==expected.upfrontMinor||subtotalMinor>projectedTotalMinor||taxMinor>projectedTotalMinor||(subtotalMinor!==projectedTotalMinor&&subtotalMinor+taxMinor!==projectedTotalMinor))issues.push('Calculated GST-inclusive package amount differs');
 if(deliveryMinor!==0||contractDeliveryMinor!==0||merchandiseDiscountMinor!==0||deliveryDiscountMinor!==0)issues.push('Calculated package has an unexpected delivery charge or discount');
 return {...limits,id,state:issues.length?'REVIEW' as const:'VERIFIED_CALCULATION' as const,calculationMatches:issues.length===0,months:expected.months,projectedTotalMinor,nativeUnitPriceMinor:unitPriceMinor,taxMinor,issues};
}
