import db from '../db.server';
import {assertShop} from './security.server';
import {nativeSubscriptionOrderQuantity} from './subscription-quantity';
export const SUBSCRIPTION_LINK_QUERY=`#graphql
query SubscriptionOriginLink($id:ID!){shop{myshopifyDomain}currentAppInstallation{app{id}}subscriptionContract(id:$id){id billingPolicy{interval intervalCount}deliveryPolicy{interval intervalCount}app{id}customer{id}originOrder{id customer{id}lineItems(first:250){nodes{id quantity product{id}variant{id}sellingPlan{sellingPlanId}}pageInfo{hasNextPage}}}lines(first:100){nodes{id productId variantId sellingPlanId quantity}pageInfo{hasNextPage}}}}
`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
const valid=(type:string,value:unknown)=>typeof value==='string'&&new RegExp('^gid://shopify/'+type+'/\\d+$').test(value);
type ContractLine={id:string;productId:string;variantId:string;sellingPlanId:string;quantity:number};
type OrderLine={id:string;quantity:number;product:{id:string}|null;variant:{id:string}|null;sellingPlan:{sellingPlanId:string}|null};
// A notification is only a trigger. Bind native app/customer/original-line
// evidence to an existing validated operational row without recreating orders.
export async function linkSubscriptionOrigin(admin:Admin,shop:string,contractGid:string){
 assertShop(shop);if(!valid('SubscriptionContract',contractGid))throw Error('Invalid subscription reference');
 const response=await admin.graphql(SUBSCRIPTION_LINK_QUERY,{variables:{id:contractGid}}),body=await response.json(),d=body.data,c=d?.subscriptionContract,o=c?.originOrder;
 if(!response.ok||body.errors||d?.shop?.myshopifyDomain!==shop||!valid('App',d.currentAppInstallation?.app?.id)||c?.id!==contractGid||c.app?.id!==d.currentAppInstallation.app.id||!valid('Customer',c.customer?.id)||o?.customer?.id!==c.customer.id||!valid('Order',o?.id)||o.lineItems?.pageInfo?.hasNextPage!==false||c.lines?.pageInfo?.hasNextPage!==false||!Array.isArray(o.lineItems.nodes)||!Array.isArray(c.lines.nodes)||!c.lines.nodes.length)throw Error('Subscription origin evidence unavailable');
 const contractLines=c.lines.nodes as ContractLine[],orderLines=o.lineItems.nodes as OrderLine[];
 if(new Set(contractLines.map(line=>line.id)).size!==contractLines.length||new Set(orderLines.map(line=>line.id)).size!==orderLines.length)throw Error('Duplicate subscription origin evidence');
 const mappings=contractLines.map(line=>{
  if(!valid('SubscriptionLine',line.id)||!valid('Product',line.productId)||!valid('ProductVariant',line.variantId)||!valid('SellingPlan',line.sellingPlanId)||!Number.isSafeInteger(line.quantity)||line.quantity<1)throw Error('Contract line unavailable');
  const candidates=orderLines.filter(original=>original.product?.id===line.productId&&original.variant?.id===line.variantId&&original.sellingPlan?.sellingPlanId===line.sellingPlanId&&original.quantity===nativeSubscriptionOrderQuantity(line.quantity,c.billingPolicy,c.deliveryPolicy));
  if(candidates.length!==1||!valid('LineItem',candidates[0].id))throw Error('Original subscription line is ambiguous');
  return {contract:line,original:candidates[0]};
 });
 if(new Set(mappings.map(row=>row.original.id)).size!==mappings.length)throw Error('Contract lines reuse an order line');
 return db.$transaction(async tx=>{
  const rows=[];
  for(const mapping of mappings){
   const row=await tx.operationalLine.findUnique({where:{shop_orderLineGid:{shop,orderLineGid:mapping.original.id}}});
   if(!row||row.validationStatus!=='VALIDATED'||!['ready_series','meal_plan'].includes(row.businessStream??'')||row.customerGid!==c.customer.id||row.orderGid!==o.id||row.productGid!==mapping.contract.productId||row.variantGid!==mapping.contract.variantId||row.contractGid&&row.contractGid!==contractGid)throw Error('Validated original order required before contract linking');
   if(row.businessStream==='meal_plan'&&!row.selectionId||row.businessStream==='ready_series'&&row.selectionId)throw Error('Subscription selection routing differs');
   if(row.selectionId){const selection=await tx.mealPlanSelection.findUnique({where:{id:row.selectionId}});if(!selection||selection.shop!==shop||selection.customerGid!==c.customer.id||selection.orderGid!==o.id||selection.orderLineGid!==row.orderLineGid||selection.programmeGid!==row.productGid||selection.variantGid!==row.variantGid||selection.businessStream!=='meal_plan'||selection.status!=='ORDERED'||selection.sellingPlanGid!==mapping.contract.sellingPlanId||selection.contractGid&&selection.contractGid!==contractGid)throw Error('Saved subscription selection differs');}
   rows.push(row);
  }
  for(const row of rows){
   if(!row.contractGid){const changed=await tx.operationalLine.updateMany({where:{id:row.id,shop,customerGid:c.customer.id,orderGid:o.id,validationStatus:'VALIDATED',productGid:row.productGid,variantGid:row.variantGid,contractGid:null},data:{contractGid}});if(changed.count!==1)throw Error('Subscription link changed concurrently');}
   if(row.selectionId){const changed=await tx.mealPlanSelection.updateMany({where:{id:row.selectionId,shop,customerGid:c.customer.id,orderGid:o.id,OR:[{contractGid:null},{contractGid}]},data:{contractGid}});if(changed.count!==1)throw Error('Saved subscription changed concurrently');}
  }
  return {linked:rows.length,contractGid};
 });
}
