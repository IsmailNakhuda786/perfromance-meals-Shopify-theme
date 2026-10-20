import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/delivery-charge-audit.server.ts'],outdir:'.shopify/delivery-charge-audit-test',bundle:true,format:'esm',platform:'node'});
const {inspectNativeDeliveryCharge}=await import('../.shopify/delivery-charge-audit-test/delivery-charge-audit.server.js');
const shop='delivery-audit.myshopify.com',orderGid='gid://shopify/Order/1';process.env.ALLOWED_SHOP=shop;
const money=value=>({shopMoney:{amount:(value/100).toFixed(2),currencyCode:'SGD'}});
function food(n,value,extra={}){return {id:`gid://shopify/LineItem/${n}`,quantity:1,currentQuantity:1,isGiftCard:false,sellingPlan:null,priceAfterAllDiscountsBeforeTaxesSet:money(value),taxLines:[],product:{id:`gid://shopify/Product/${n}`,isGiftCard:false,stream:{jsonValue:'ready_series'},deliveryIncluded:null},...extra};}
function fixture(lines,fee){return {shop:{myshopifyDomain:shop,currencyCode:'SGD'},order:{id:orderGid,currencyCode:'SGD',taxesIncluded:false,cancelledAt:null,shippingAddress:{countryCodeV2:'SG'},totalPriceSet:money(lines.reduce((sum,line)=>sum+Number(line.priceAfterAllDiscountsBeforeTaxesSet.shopMoney.amount)*100,0)+fee),totalTaxSet:money(0),lineItems:{nodes:lines,pageInfo:{hasNextPage:false}},shippingLines:{nodes:[{id:'gid://shopify/ShippingLine/1',isRemoved:false,discountedPriceSet:money(fee),taxLines:[]}],pageInfo:{hasNextPage:false}}}};}
const admin=data=>({graphql:async query=>{assert.doesNotMatch(query,/\bmutation\b/);assert.match(query,/priceAfterAllDiscountsBeforeTaxesSet/);return Response.json({data});}});
const inspect=data=>inspectNativeDeliveryCharge(admin(data),shop,orderGid,undefined,{singleOrdinaryDeliveryVerified:true});
test('native all-discount food total catches the observed order-discount delivery undercharge',async()=>{
 const line=food(1,7000);line.discountedTotalSet=money(10000); // Older native field omits order discounts; must not use it.
 const result=await inspect(fixture([line],500));
 assert.equal(result.eligibleSubtotalMinor,7000);assert.equal(result.expectedFeeMinor,1000);assert.equal(result.observedFeeMinor,500);assert.equal(result.chargeMatches,false);assert.equal(result.checkoutEnforcementVerified,false);
 assert.equal((await inspect(fixture([line],1000))).chargeMatches,true);
});
test('ordinary-food boundaries exclude prepaid and Gift Card value and combine multiple food lines',async()=>{
 const prepaid=food(2,25520);prepaid.sellingPlan={sellingPlanId:'gid://shopify/SellingPlan/2'};
 const gift=food(3,25000);gift.isGiftCard=true;gift.product.isGiftCard=true;gift.product.stream.jsonValue='shared';
 for(const [value,fee]of [[7499,1000],[7500,500],[12499,500],[12500,0]])assert.equal((await inspect(fixture([food(1,value),prepaid,gift],fee))).chargeMatches,true);
 assert.equal((await inspect(fixture([prepaid],0))).chargeMatches,true);
 assert.equal((await inspect(fixture([food(1,2000),food(4,5500)],500))).eligibleSubtotalMinor,7500);
});
test('included food GST counts once, shipping GST is not added twice and line quantity is not multiplied twice',async()=>{
 const line=food(1,7000,{quantity:2,currentQuantity:2,taxLines:[{priceSet:money(630)}]});
 const data=fixture([line],500);data.order.taxesIncluded=true;data.order.shippingLines.nodes[0].taxLines=[{priceSet:money(41)}];data.order.totalTaxSet=money(671);data.order.totalPriceSet=money(8130);
 const result=await inspect(data);assert.equal(result.eligibleSubtotalMinor,7630);assert.equal(result.observedFeeMinor,500);assert.equal(result.chargeMatches,true);
});
test('shared top-up exclusion requires the actual configured native product identity',async()=>{
 const topup=food(5,87000);topup.product.stream.jsonValue='shared';const data=fixture([food(1,2000),topup],1000);
 await assert.rejects(inspect(data),/classification/);
 const result=await inspectNativeDeliveryCharge(admin(data),shop,orderGid,topup.product.id,{singleOrdinaryDeliveryVerified:true});assert.equal(result.eligibleSubtotalMinor,2000);assert.equal(result.chargeMatches,true);
});
test('foreign, changed, truncated, malformed and financially inconsistent evidence stays held',async()=>{
 for(const change of [d=>d.shop.myshopifyDomain='foreign.myshopify.com',d=>d.order.lineItems.pageInfo.hasNextPage=true,d=>d.order.shippingLines.pageInfo.hasNextPage=true,d=>d.order.lineItems.nodes[0].currentQuantity=0,d=>d.order.shippingLines.nodes[0].isRemoved=true,d=>d.order.shippingAddress.countryCodeV2='CA',d=>d.order.totalPriceSet=money(1),d=>d.order.totalTaxSet=money(1),d=>d.order.lineItems.nodes[0].product.deliveryIncluded={jsonValue:'true'},d=>d.order.lineItems.nodes.push(d.order.lineItems.nodes[0])]){
  const data=fixture([food(1,2000)],1000);change(data);await assert.rejects(inspect(data));
 }
 await assert.rejects(inspectNativeDeliveryCharge(admin(fixture([food(1,2000)],1000)),'foreign.myshopify.com',orderGid));
});


test('an aggregate shipping match cannot prove per-delivery fees without verified scheduling context',async()=>{
 const data=fixture([food(1,4000),food(2,4000)],500);
 const result=await inspectNativeDeliveryCharge(admin(data),shop,orderGid);
 assert.equal(result.observedFeeMinor,500);assert.equal(result.singleDeliveryEstimateMinor,500);
 assert.equal(result.chargeMatches,null);assert.equal(result.expectedFeeMinor,null);assert.equal(result.deliveryAllocationVerified,false);
 // Two native shipping lines do not establish two physical delivery dates.
 data.order.shippingLines.nodes.push({id:'gid://shopify/ShippingLine/2',isRemoved:false,discountedPriceSet:money(0),taxLines:[]});
 assert.equal((await inspectNativeDeliveryCharge(admin(data),shop,orderGid)).chargeMatches,null);
 const prepaid=food(3,30000);prepaid.sellingPlan={sellingPlanId:'gid://shopify/SellingPlan/3'};
 const included=await inspectNativeDeliveryCharge(admin(fixture([prepaid],0)),shop,orderGid);
 assert.equal(included.chargeMatches,true);assert.equal(included.deliveryAllocationVerified,true);
});
