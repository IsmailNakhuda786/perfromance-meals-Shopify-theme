import {planCoreDeliveryOptions,type CoreDeliveryInput} from './core-delivery-options';
import type {CartDeliveryOptionsTransformRunResult} from '../generated/api';
type Input=CoreDeliveryInput & {deliveryCustomization?:{metafield?:{jsonValue?:unknown}|null}};
// Offline candidate only. Configuration defaults off; HELD never hides rates.
export function cartDeliveryOptionsTransformRun(input:Input):CartDeliveryOptionsTransformRunResult {
 const raw=input?.deliveryCustomization?.metafield?.jsonValue;
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return {operations:[]};
 const config=raw as Record<string,unknown>;
 if(config.enabled!==true||config.policyVersion!=="sg-delivery-20261018"||config.pricesIncludeTaxVerified!==true)return {operations:[]};
 // Mandatory exact-product allowlist isolates any future development QA rule.
 const allowed=config.allowedProductGids;
 if(!Array.isArray(allowed)||!allowed.length||allowed.length>250||new Set(allowed).size!==allowed.length||allowed.some(id=>typeof id!=="string"||!/^gid:\/\/shopify\/Product\/\d+$/.test(id)))return {operations:[]};
 if(!Array.isArray(input?.cart?.lines)||input.cart.lines.some(line=>!allowed.includes(line?.merchandise?.product?.id)))return {operations:[]};
 if(config.topUpProductGid!==undefined&&typeof config.topUpProductGid!=="string")return {operations:[]};
 const result=planCoreDeliveryOptions(input,{pricesIncludeTaxVerified:true,topUpProductGid:config.topUpProductGid as string|undefined});
 const operations:CartDeliveryOptionsTransformRunResult["operations"]=result.state==="PLANNED"?result.decisions.flatMap(group=>group.hideHandles.map(handle=>({deliveryOptionHide:{deliveryOptionHandle:handle}}))):[];
 // Explicit QA-only diagnostics. No customer data, prices or eligibility are changed.
 // Exact product allowlist above remains mandatory, even in diagnostic mode.
 if(config.diagnostics===true){
  const observed=input.cart.lines.map(line=>({subtotal:line.cost?.subtotalAmount?.amount,total:line.cost?.totalAmount?.amount,discounts:line.discountAllocations?.map(d=>d.discountedAmount?.amount)}));
  const label=result.state==="HELD"?"HELD "+JSON.stringify(observed):"food "+result.eligibleSubtotalMinor+" cents";
  for(const group of input.cart.deliveryGroups)for(const option of group.deliveryOptions)operations.push({deliveryOptionRename:{deliveryOptionHandle:option.handle,title:("PM Core QA — "+label).slice(0,200)}});
 }
 return {operations};
}
