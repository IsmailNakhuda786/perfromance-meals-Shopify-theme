import {calculateSingaporeDelivery,type DeliveryLine} from './delivery-policy';

type Money={amount:string;currencyCode:string};
type Field={jsonValue:unknown}|null;
type BooleanField={type:string;value:string}|null;
type CartLine={id:string;quantity:number;cost:{subtotalAmount:Money;totalAmount:Money};discountAllocations:{discountedAmount:Money}[];sellingPlanAllocation:null|{sellingPlan:{id:string}};merchandise:{__typename:string;id?:string;product?:{id:string;isGiftCard:boolean;stream:Field;deliveryIncluded:BooleanField}}};
type Group={id:string;cartLines:{id:string}[];deliveryAddress:{countryCode:string}|null;deliveryOptions:{handle:string;cost:Money}[]};
export type CoreDeliveryInput={cart:{lines:CartLine[];deliveryGroups:Group[]}};
export type CoreDeliveryConfiguration={pricesIncludeTaxVerified:boolean;topUpProductGid?:string;verifiedDeliveryAssignments?:{groupId:string;deliveryReference:string}[]};
const gid=(kind:string,value:unknown)=>typeof value==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(value);
const reference=(value:unknown)=>typeof value==='string'&&value.length>0&&value.length<=512&&!Array.from(value).some(character=>character.charCodeAt(0)<32||/\s/.test(character));
const sum=(values:number[])=>{const total=values.reduce((a,b)=>a+b,0);if(!Number.isSafeInteger(total)||total>2147483647)throw Error('Amount outside supported range');return total;};
function amount(value:Money){
 if(value?.currencyCode!=='SGD'||typeof value.amount!=='string'||!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(value.amount))throw Error('Invalid native SGD amount');
 const [whole,fraction='']=value.amount.split('.');const result=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(result>2147483647n)throw Error('Amount outside supported range');return Number(result);
}
// Core decision adapter for validated native Function input. The isolated
// development Function consumes a source-verified snapshot of this policy.
// HELD returns no decisions; the caller must not treat that as correct shipping.
// No rates are created here. Wider native tax/cart/distribution gates remain.
export function planCoreDeliveryOptions(input:CoreDeliveryInput,configuration:CoreDeliveryConfiguration){
 try{
  if(configuration?.pricesIncludeTaxVerified!==true)throw Error('GST-inclusive price evidence required');
  if(configuration.topUpProductGid!==undefined&&!gid('Product',configuration.topUpProductGid))throw Error('Invalid configured top-up identity');
  const cart=input?.cart;
  if(!Array.isArray(cart?.lines)||!cart.lines.length||cart.lines.length>250||!Array.isArray(cart.deliveryGroups)||cart.deliveryGroups.length>100)throw Error('Incomplete cart evidence');
  if(new Set(cart.lines.map(line=>line.id)).size!==cart.lines.length)throw Error('Duplicate cart line');
  const lines:DeliveryLine[]=cart.lines.map(line=>{
   const product=line.merchandise?.product;
   if(!reference(line.id)||!Number.isSafeInteger(line.quantity)||line.quantity<1||line.merchandise.__typename!=='ProductVariant'||!gid('ProductVariant',line.merchandise.id)||!product||!gid('Product',product.id)||typeof product.isGiftCard!=='boolean'||!Array.isArray(line.discountAllocations))throw Error('Incomplete native product evidence');
   const original=amount(line.cost?.subtotalAmount),discount=sum(line.discountAllocations.map(discount=>amount(discount.discountedAmount)));
   if(discount>original)throw Error('Discount exceeds original food value');
   const netMinor=original-discount;
   // Native checkout evidence (18 Oct): totalAmount can still be 100 when an
   // order allocation is 30. Derive net once from subtotal minus ALL allocations;
   // totalAmount is only a consistency bound, not a second discount deduction.
   const observedTotal=amount(line.cost.totalAmount);
   if(observedTotal<netMinor||observedTotal>original)throw Error('Native line totals and allocated discounts require verification');
   const stream=product.stream?.jsonValue,field=product.deliveryIncluded;
   // Native boolean false was returned as the string "false" by jsonValue.
   // Read the declared type and raw value instead of relying on truthiness.
   if(field!==null&&field!==undefined&&(field.type!=='boolean'||!['true','false'].includes(field.value)))throw Error('Invalid delivery metadata');
   const included=field?.value==='true';
   const sellingPlan=line.sellingPlanAllocation;
   if(sellingPlan!==null&&(!sellingPlan||!gid('SellingPlan',sellingPlan.sellingPlan?.id)))throw Error('Invalid native selling plan evidence');
   let kind:DeliveryLine['kind'];
   if(product.isGiftCard)kind='gift_card';
   else if(product.id===configuration.topUpProductGid)kind='wallet_top_up';
   else if(stream==='meal_plan'||stream==='ready_series'&&(included===true||sellingPlan!==null))kind='delivery_included';
   else if(stream==='ready_series')kind='ordinary_food';
   else throw Error('Unknown product delivery classification');
   return {id:line.id,kind,netMinor};
  });
  const expected=calculateSingaporeDelivery(lines);
  const seen=new Set<string>(),groupIds=new Set<string>(),handles=new Set<string>();
  const groups=cart.deliveryGroups.map(group=>{
   if(!reference(group.id)||groupIds.has(group.id)||!Array.isArray(group.cartLines)||!group.cartLines.length||!Array.isArray(group.deliveryOptions)||!group.deliveryOptions.length)throw Error('Incomplete delivery group');
   groupIds.add(group.id);
   const members=group.cartLines.map(item=>{
    const line=lines.find(line=>line.id===item.id);
    if(!line||seen.has(item.id))throw Error('Duplicate, split or foreign delivery line requires review');
    seen.add(item.id);return line;
   });
   if(members.some(line=>line.kind==='ordinary_food'||line.kind==='delivery_included')&&group.deliveryAddress?.countryCode!=='SG')throw Error('Singapore destination required');
   for(const option of group.deliveryOptions){if(!reference(option.handle)||handles.has(option.handle))throw Error('Duplicate or invalid delivery option');handles.add(option.handle);amount(option.cost);}
   return {group,members,ordinary:members.some(line=>line.kind==='ordinary_food')};
  });
  if(lines.some(line=>(line.kind==='ordinary_food'||line.kind==='delivery_included')&&!seen.has(line.id)))throw Error('Food delivery group missing');
  const ordinaryGroups=groups.filter(group=>group.ordinary);
  const assignments=configuration.verifiedDeliveryAssignments;
  // Shopify groups are not proof of separate physical deliveries. A trusted
  // caller must bind each ordinary group to its verified scheduled delivery.
  // The current checkout Function does not supply these assignments and keeps
  // ambiguous multi-group checkouts held until native binding is established.
  if(assignments!==undefined&&(!Array.isArray(assignments)||assignments.length!==ordinaryGroups.length||new Set(assignments.map(row=>row?.groupId)).size!==assignments.length||assignments.some(row=>!row||!reference(row.groupId)||!reference(row.deliveryReference)||!ordinaryGroups.some(({group})=>group.id===row.groupId))))throw Error('Complete verified delivery assignments required');
  if(ordinaryGroups.length>1&&assignments===undefined)throw Error('Multiple ordinary-food delivery groups require verified delivery assignments');
  const buckets=new Map<string,typeof ordinaryGroups>();
  for(const item of ordinaryGroups){
   const key=assignments?.find(row=>row.groupId===item.group.id)?.deliveryReference??item.group.id;
   const bucket=buckets.get(key)??[];bucket.push(item);buckets.set(key,bucket);
  }
  const fees=new Map<string,number>();
  const deliveryFees=[...buckets].sort(([a],[b])=>a.localeCompare(b)).map(([deliveryReference,items])=>{
   const groupIds=items.map(({group})=>group.id).sort();
   const price=calculateSingaporeDelivery(items.flatMap(item=>item.members));
   // One fee per physical delivery even if Shopify uses several groups.
   // Rate availability for every group is checked below before any decisions.
   for(const groupId of groupIds)fees.set(groupId,groupId===groupIds[0]?price.feeMinor:0);
   return {deliveryReference,groupIds,eligibleSubtotalMinor:price.eligibleSubtotalMinor,feeMinor:price.feeMinor};
  });
  const expectedFeeMinor=sum(deliveryFees.map(item=>item.feeMinor));
  const decisions=groups.map(({group})=>{
   const feeMinor=fees.get(group.id)??0;
   const keep=group.deliveryOptions.filter(option=>amount(option.cost)===feeMinor);
   if(!keep.length)throw Error('Required configured delivery rate unavailable');
   return {groupId:group.id,feeMinor,keepHandles:keep.map(option=>option.handle),hideHandles:group.deliveryOptions.filter(option=>amount(option.cost)!==feeMinor).map(option=>option.handle)};
  });
  return {state:'PLANNED' as const,currency:'SGD',eligibleSubtotalMinor:expected.eligibleSubtotalMinor,expectedFeeMinor,deliveryFees,decisions,checkoutEnforcementVerified:false};
 }catch(error){return {state:'HELD' as const,reason:error instanceof Error?error.message:'Delivery evidence unavailable',decisions:[],checkoutEnforcementVerified:false};}
}
