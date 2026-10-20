import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/core-delivery-options.ts'],outdir:'.shopify/core-delivery-options-test',bundle:true,format:'esm',platform:'node'});
const {planCoreDeliveryOptions:plan}=await import('../.shopify/core-delivery-options-test/core-delivery-options.js');
const money=n=>({amount:(n/100).toFixed(2),currencyCode:'SGD'});
const line=(id,original,discount=0,kind='ordinary')=>({id:'gid://shopify/CartLine/'+id,quantity:1,cost:{subtotalAmount:money(original),totalAmount:money(original-discount)},discountAllocations:discount?[{discountedAmount:money(discount)}]:[],sellingPlanAllocation:null,merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/'+id,product:{id:'gid://shopify/Product/'+id,isGiftCard:kind==='gift',stream:{jsonValue:kind==='gift'||kind==='topup'?'shared':'ready_series'},deliveryIncluded:{type:'boolean',value:kind==='prepaid'?'true':'false'}}}});
const group=(id,lines)=>({id:'gid://shopify/CartDeliveryGroup/'+id,cartLines:lines.map(line=>({id:line.id})),deliveryAddress:{countryCode:'SG'},deliveryOptions:[0,500,1000].map(cost=>({handle:`rate-${id}-${cost}`,cost:money(cost)}))});
const fixture=lines=>({cart:{lines,deliveryGroups:[group(1,lines)]}});
const config={pricesIncludeTaxVerified:true,topUpProductGid:'gid://shopify/Product/9'};
test('Core uses allocated order discounts for shipping: 100 minus 30 selects 10, not 5',()=>{
 const result=plan(fixture([line(1,10000,3000)]),config);
 assert.equal(result.state,'PLANNED');assert.equal(result.eligibleSubtotalMinor,7000);
 assert.deepEqual(result.decisions[0].keepHandles,['rate-1-1000']);assert.equal(result.checkoutEnforcementVerified,false);
});
test('ordinary food tiers include exact75/125 boundaries while prepaid price never qualifies',()=>{
 for(const [subtotal,fee]of [[7499,1000],[7500,500],[12499,500],[12500,0]]){
  const result=plan(fixture([line(1,subtotal),line(2,30000,0,'prepaid')]),config);
  assert.equal(result.state,'PLANNED');assert.equal(result.eligibleSubtotalMinor,subtotal);assert.equal(result.expectedFeeMinor,fee);
 }
 assert.equal(plan(fixture([line(2,30000,0,'prepaid')]),config).expectedFeeMinor,0);
});
test('food plus prepaid in separate groups charges ordinary food once and preserves included delivery',()=>{
 const food=line(1,2000),prepaid=line(2,30000,0,'prepaid');
 const result=plan({cart:{lines:[food,prepaid],deliveryGroups:[group(1,[food]),group(2,[prepaid])]}},config);
 assert.equal(result.state,'PLANNED');assert.deepEqual(result.decisions.map(group=>group.feeMinor),[1000,0]);
});
test('quantities use native line totals once and multiple allocations are summed exactly',()=>{
 const meal=line(1,10000,3000);meal.quantity=2;meal.discountAllocations=[{discountedAmount:money(2000)},{discountedAmount:money(1000)}];
 const result=plan(fixture([meal]),config);assert.equal(result.eligibleSubtotalMinor,7000);
 const original=JSON.stringify(meal);plan(fixture([meal]),config);assert.equal(JSON.stringify(meal),original);
});
test('Gift Cards and configured top-ups cannot inflate free delivery threshold',()=>{
 const result=plan(fixture([line(1,2000),line(8,50000,0,'gift'),line(9,87000,0,'topup')]),config);
 assert.equal(result.eligibleSubtotalMinor,2000);assert.equal(result.expectedFeeMinor,1000);
 assert.equal(plan(fixture([line(9,87000,0,'topup')]),{pricesIncludeTaxVerified:true}).state,'HELD');
});
test('unknown tax basis, stale/contradictory money, wrong currency and product evidence produce no decisions',()=>{
 assert.equal(plan(fixture([line(1,2000)]),{pricesIncludeTaxVerified:false}).state,'HELD');
 for(const change of [d=>d.cart.lines[0].cost.totalAmount=money(3000),d=>d.cart.lines[0].cost.totalAmount.currencyCode='USD',d=>d.cart.lines[0].quantity=0,d=>d.cart.lines[0].merchandise.product.stream.jsonValue='unknown',d=>d.cart.lines[0].discountAllocations=[{discountedAmount:money(99999)}],d=>d.cart.lines[0].cost.subtotalAmount.amount='NaN',d=>d.cart.lines[0].merchandise.product.deliveryIncluded.value='TRUE',d=>d.cart.lines[0].sellingPlanAllocation=undefined]){
  const input=fixture([line(1,2000)]);change(input);const result=plan(input,config);assert.equal(result.state,'HELD');assert.deepEqual(result.decisions,[]);
 }
});
test('split ordinary-food groups, duplicates, missing food groups/rates and foreign destination stay held',()=>{
 const first=line(1,2000),second=line(2,3000);
 assert.equal(plan({cart:{lines:[first,second],deliveryGroups:[group(1,[first]),group(2,[second])]}},config).state,'HELD');
 for(const change of [d=>d.cart.lines.push(d.cart.lines[0]),d=>d.cart.deliveryGroups[0].cartLines.push(d.cart.deliveryGroups[0].cartLines[0]),d=>d.cart.deliveryGroups=[],d=>d.cart.deliveryGroups[0].deliveryOptions.pop(),d=>d.cart.deliveryGroups[0].deliveryAddress.countryCode='MY']){
  const input=fixture([line(1,2000)]);change(input);assert.equal(plan(input,config).state,'HELD');
 }
});

test('native order discounts can leave totalAmount before order discounts; allocations are subtracted once',()=>{
 for(const total of [7000,9000,10000]){const input=fixture([line(1,10000,3000)]);input.cart.lines[0].cost.totalAmount=money(total);const r=plan(input,config);assert.equal(r.state,'PLANNED');assert.equal(r.eligibleSubtotalMinor,7000);assert.equal(r.expectedFeeMinor,1000);}
 for(const total of [6999,10001]){const input=fixture([line(1,10000,3000)]);input.cart.lines[0].cost.totalAmount=money(total);assert.equal(plan(input,config).state,'HELD');}
});


test('confirmed separate deliveries each use their own discounted food subtotal',()=>{
 const a=line(1,4000),b=line(2,4000),prepaid=line(3,30000,0,'prepaid');
 const input={cart:{lines:[a,b,prepaid],deliveryGroups:[group(1,[a]),group(2,[b]),group(3,[prepaid])]}};
 const verifiedDeliveryAssignments=[{groupId:group(1,[]).id,deliveryReference:'monday-slot'},{groupId:group(2,[]).id,deliveryReference:'thursday-slot'}];
 const result=plan(input,{...config,verifiedDeliveryAssignments});
 assert.equal(result.state,'PLANNED');assert.equal(result.eligibleSubtotalMinor,8000);assert.equal(result.expectedFeeMinor,2000);
 assert.deepEqual(result.decisions.map(x=>x.feeMinor),[1000,1000,0]);
 assert.equal(result.checkoutEnforcementVerified,false);
});

test('each separate delivery observes exact75/125 boundaries and discounts independently',()=>{
 const a=line(1,10000,2500),b=line(2,12500),c=line(3,7500,1);
 const deliveryGroups=[group(1,[a]),group(2,[b]),group(3,[c])];
 const result=plan({cart:{lines:[a,b,c],deliveryGroups}},{...config,verifiedDeliveryAssignments:deliveryGroups.map(g=>({groupId:g.id,deliveryReference:g.id}))});
 assert.equal(result.state,'PLANNED');assert.deepEqual(result.decisions.map(x=>x.feeMinor),[500,0,1000]);assert.equal(result.expectedFeeMinor,1500);
});

test('multiple technical groups for the same delivery share one fee without relying on input order',()=>{
 const a=line(1,4000),b=line(2,4000),deliveryGroups=[group(2,[b]),group(1,[a])];
 const verifiedDeliveryAssignments=deliveryGroups.map(g=>({groupId:g.id,deliveryReference:'same-delivery'}));
 const input={cart:{lines:[a,b],deliveryGroups}},before=JSON.stringify(input);
 const result=plan(input,{...config,verifiedDeliveryAssignments});
 assert.equal(result.state,'PLANNED');assert.equal(result.expectedFeeMinor,500);assert.equal(result.deliveryFees.length,1);
 assert.deepEqual(result.decisions.map(x=>x.feeMinor),[0,500]);assert.equal(JSON.stringify(input),before);
 const reordered=plan({cart:{...input.cart,deliveryGroups:[...deliveryGroups].reverse()}},{...config,verifiedDeliveryAssignments:[...verifiedDeliveryAssignments].reverse()});
 assert.deepEqual(reordered.deliveryFees,result.deliveryFees);
});

test('missing, duplicate, foreign and malformed delivery bindings or absent required rates hold every decision',()=>{
 const a=line(1,4000),b=line(2,4000),deliveryGroups=[group(1,[a]),group(2,[b])];
 const input={cart:{lines:[a,b],deliveryGroups}},bindings=deliveryGroups.map(g=>({groupId:g.id,deliveryReference:g.id}));
 for(const verifiedDeliveryAssignments of [[],bindings.slice(0,1),[bindings[0],bindings[0]],[bindings[0],{...bindings[1],groupId:'foreign'}],[bindings[0],{...bindings[1],deliveryReference:'bad delivery'}],null]){
  const result=plan(input,{...config,verifiedDeliveryAssignments});assert.equal(result.state,'HELD');assert.deepEqual(result.decisions,[]);
 }
 const unavailable=structuredClone(input);unavailable.cart.deliveryGroups[1].deliveryOptions.pop();
 assert.equal(plan(unavailable,{...config,verifiedDeliveryAssignments:bindings}).state,'HELD');
});
