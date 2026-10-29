import db from '../db.server';
import {assertShop} from './security.server';
import {readRegisteredPrepaidPurchase} from './prepaid-renewal-evidence.server';
import {minorAmount} from './gift-card-native.server';
import {validSubscriptionLineGid} from './subscription-reference';
type Purchase=Parameters<typeof readRegisteredPrepaidPurchase>[0];
type NativeLine={id:string;productId:string;variantId:string;sellingPlanId:string;quantity:number;currentPrice:{amount:string;currencyCode:string}};
type Discount={id:string;title:string;type:string;targetType:string;recurringCycleLimit:number|null;rejectionReason:string|null;value:{__typename:string;amount:{amount:string;currencyCode:string};appliesOnEachItem:boolean};entitledLines:{all:boolean;lines:{nodes:{id:string}[];pageInfo:{hasNextPage:boolean}}}};
type Contract={id:string;status:string;currencyCode:string;app:{id:string};customer:{id:string};originOrder:{id:string};nextBillingDate:string|null;billingPolicy:{interval:string;intervalCount:number};deliveryPrice:{amount:string;currencyCode:string};lines:{nodes:NativeLine[];pageInfo:{hasNextPage:boolean}};discounts:{nodes:Discount[];pageInfo:{hasNextPage:boolean}}};
const bounded=(n:number)=>Number.isSafeInteger(n)&&n>=0&&n<=2147483647;
// The account must never describe Shopify's gross recurring subtotal as the
// amount to be charged. Disclose net pricing only from complete native terms
// matching the immutable, actually-paid purchase proof.
export function accountPrepaidPricing(value:unknown,purchases:Purchase[],scope:{shop:string;customerGid:string;contractGid:string;appGid:string}){
 try{
  const c=value as Contract;
  if(!c||c.id!==scope.contractGid||c.customer?.id!==scope.customerGid||c.app?.id!==scope.appGid||c.currencyCode!=='SGD'||!['ACTIVE','PAUSED','CANCELLED','EXPIRED','FAILED'].includes(c.status)||c.deliveryPrice?.currencyCode!=='SGD'||minorAmount(c.deliveryPrice.amount)!==0||c.billingPolicy?.interval!=='MONTH'||![3,6].includes(c.billingPolicy.intervalCount)||c.lines?.pageInfo?.hasNextPage!==false||!Array.isArray(c.lines.nodes)||!c.lines.nodes.length||c.lines.nodes.length>100||c.discounts?.pageInfo?.hasNextPage!==false||!Array.isArray(c.discounts.nodes)||c.discounts.nodes.length>100||purchases.length!==c.lines.nodes.length)throw Error();
  const consumed=new Set<Discount>(),seen=new Set<string>(),used=new Set<string>();let grossMinor=0,adjustmentMinor=0,netMinor=0,packages=0;
  if(new Set(c.discounts.nodes.map(d=>d.id)).size!==c.discounts.nodes.length)throw Error();
  for(const line of c.lines.nodes){
   if(!validSubscriptionLineGid(line.id)||seen.has(line.id)||!Number.isSafeInteger(line.quantity)||line.quantity<1||line.currentPrice?.currencyCode!=='SGD')throw Error();seen.add(line.id);
   const matches=purchases.filter(p=>{const s=readRegisteredPrepaidPurchase(p);return s.expected.productGid===line.productId&&s.expected.variantGid===line.variantId&&s.expected.sellingPlanGid===line.sellingPlanId;});
   if(matches.length!==1||used.has(matches[0].id))throw Error();const row=matches[0];used.add(row.id);const saved=readRegisteredPrepaidPurchase(row),e=saved.expected;
   if(row.shop!==scope.shop||row.customerGid!==scope.customerGid||row.contractGid!==c.id||row.originalOrderGid!==c.originOrder?.id||e.appGid!==scope.appGid||e.customerGid!==scope.customerGid||e.months!==c.billingPolicy.intervalCount||(e.packageQuantity??1)!==line.quantity||!bounded(e.upfrontMinor))throw Error();
   const gross=minorAmount(line.currentPrice.amount)*line.quantity;let adjustment=0;
   if(!bounded(gross))throw Error();
   if(saved.correction){
    const correction=saved.correction,discounts=c.discounts.nodes.filter(d=>d.title===correction.title),d=discounts[0];
    if(discounts.length!==1||consumed.has(d)||!d.id||d.type!=='AUTOMATIC_DISCOUNT'||d.targetType!=='LINE_ITEM'||d.recurringCycleLimit!==null||d.rejectionReason!==null||d.value?.__typename!=='SubscriptionDiscountFixedAmountValue'||d.value.amount?.currencyCode!=='SGD'||typeof d.value.appliesOnEachItem!=='boolean'||!d.entitledLines||typeof d.entitledLines.all!=='boolean'||(d.entitledLines.all?c.lines.nodes.length!==1:d.entitledLines.lines?.pageInfo?.hasNextPage!==false||d.entitledLines.lines.nodes.length!==1||d.entitledLines.lines.nodes[0].id!==line.id))throw Error();
    adjustment=minorAmount(d.value.amount.amount)*(d.value.appliesOnEachItem?line.quantity:1);
    if(!bounded(adjustment)||adjustment!==correction.discountMinor||gross!==correction.baseMinor||correction.applicationKind!=='AUTOMATIC')throw Error();consumed.add(d);
   }
   if(gross-adjustment!==e.upfrontMinor)throw Error();grossMinor+=gross;adjustmentMinor+=adjustment;netMinor+=e.upfrontMinor;packages+=line.quantity;
   if(![grossMinor,adjustmentMinor,netMinor,packages].every(bounded))throw Error();
  }
  if(consumed.size!==c.discounts.nodes.length)throw Error();
  const next=c.status==='ACTIVE'?c.nextBillingDate:null;
  if(next!==null&&(typeof next!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(next)||!Number.isFinite(Date.parse(next))))throw Error();
  return {available:true as const,currency:'SGD',grossMinor,adjustmentMinor,netMinor,packages,months:c.billingPolicy.intervalCount,nextBillingAt:next};
 }catch{return {available:false as const};}
}
export async function readAccountPrepaidPricing(value:unknown,scope:{shop:string;customerGid:string;contractGid:string;appGid:string}){
 try{assertShop(scope.shop);if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(scope.customerGid)||!/^gid:\/\/shopify\/SubscriptionContract\/\d+$/.test(scope.contractGid))throw Error();const purchases=await db.prepaidPurchaseEvidence.findMany({where:{shop:scope.shop,customerGid:scope.customerGid,contractGid:scope.contractGid},take:101});return accountPrepaidPricing(value,purchases,scope);}catch{return {available:false as const};}
}
