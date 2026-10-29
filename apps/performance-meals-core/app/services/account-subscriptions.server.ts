import {readAccountPrepaidPricing} from './account-prepaid-pricing.server';
import {assertShop} from './security.server';
import {validSubscriptionLineGid} from './subscription-reference';
export const ACCOUNT_CONTRACT_QUERY=`#graphql
query AccountLinkedContract($id:ID!){shop{myshopifyDomain currencyCode}currentAppInstallation{app{id}}subscriptionContract(id:$id){id status currencyCode app{id}customer{id}originOrder{id customer{id}}nextBillingDate billingPolicy{interval intervalCount}deliveryPrice{amount currencyCode} discounts(first:100){nodes{id title type targetType recurringCycleLimit rejectionReason value{__typename ... on SubscriptionDiscountFixedAmountValue{amount{amount currencyCode}appliesOnEachItem}}entitledLines{all lines(first:100){nodes{id}pageInfo{hasNextPage}}}}pageInfo{hasNextPage}}lines(first:100){nodes{id title quantity productId variantId sellingPlanId currentPrice{amount currencyCode}}pageInfo{hasNextPage}}}}
`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
export type AccountContractBinding={contractGid:string;orderGid:string;businessStream:string;productGid:string;variantGid:string};
const valid=(kind:string,id:string)=>kind==='SubscriptionLine'?validSubscriptionLineGid(id):new RegExp('^gid://shopify/'+kind+'/\\d+$').test(id);
// Read only: linked records are not proof of current ownership or active status.
// Verify every contract freshly; no mutation, inferred calendar or customer URL.
export async function readAccountSubscriptions(admin:Admin,shop:string,customerGid:string,bindings:AccountContractBinding[]){
 assertShop(shop);if(!valid('Customer',customerGid)||!Array.isArray(bindings)||bindings.length>100)throw Error('Invalid subscription context');
 const groups=new Map<string,AccountContractBinding[]>();
 for(const row of bindings){
  if(!valid('SubscriptionContract',row.contractGid)||!valid('Order',row.orderGid)||!valid('Product',row.productGid)||!valid('ProductVariant',row.variantGid)||!['ready_series','meal_plan'].includes(row.businessStream))throw Error('Unverified subscription binding');
  groups.set(row.contractGid,[...(groups.get(row.contractGid)||[]),row]);
 }
 if(groups.size>25)throw Error('Linked subscriptions require pagination');
 const results=[];
 for(const [id,expected]of groups){
  const response=await admin.graphql(ACCOUNT_CONTRACT_QUERY,{variables:{id}}),body=await response.json(),data=body.data,c=data?.subscriptionContract;
  if(!response.ok||body.errors||data?.shop?.myshopifyDomain!==shop||data.shop.currencyCode!=='SGD'||!valid('App',data.currentAppInstallation?.app?.id)||!c||c.id!==id||c.currencyCode!=='SGD'||c.app?.id!==data.currentAppInstallation.app.id||c.customer?.id!==customerGid||c.originOrder?.customer?.id!==customerGid||!expected.some(row=>row.orderGid===c.originOrder.id)||!['ACTIVE','PAUSED','CANCELLED','EXPIRED','FAILED'].includes(c.status)||c.lines?.pageInfo?.hasNextPage!==false||!Array.isArray(c.lines.nodes)||!c.lines.nodes.length)throw Error('Native subscription evidence unavailable');
  const lines=c.lines.nodes as Array<{id:string;title:string;quantity:number;productId:string;variantId:string}>;
  if(new Set(lines.map(line=>line.id)).size!==lines.length||lines.some(line=>!valid('SubscriptionLine',line.id)||typeof line.title!=='string'||!line.title.trim()||!Number.isSafeInteger(line.quantity)||line.quantity<1)||expected.some(row=>lines.filter(line=>line.productId===row.productGid&&line.variantId===row.variantGid).length!==1))throw Error('Linked subscription lines differ');
  // Return only mapped lines; unrelated items on a shared contract are omitted.
  const pricing=expected.every(row=>row.businessStream==='ready_series')?await readAccountPrepaidPricing(c,{shop,customerGid,contractGid:id,appGid:data.currentAppInstallation.app.id}):null;
  results.push({...(pricing?{pricing}:{}),id,status:c.status,orderGid:c.originOrder.id,streams:[...new Set(expected.map(row=>row.businessStream))],lines:lines.filter(line=>expected.some(row=>row.productGid===line.productId&&row.variantGid===line.variantId)).map(line=>({id:line.id,title:line.title,quantity:line.quantity}))});
 }
 return results;
}
