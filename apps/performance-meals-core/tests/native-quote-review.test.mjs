import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/native-quote-review.ts'],outdir:'.shopify/native-quote-review-test',bundle:true,format:'esm',platform:'node'});
const {reviewNativeQuote}=await import('../.shopify/native-quote-review-test/native-quote-review.js');
const money=amount=>({amount,currencyCode:'SGD'}),variant='gid://shopify/ProductVariant/1';
const expected={lines:[{variantGid:variant,quantity:1,unitPriceMinor:1190}],shippingFeeMinor:1000};
const fixture=()=>({taxesIncluded:false,presentmentCurrencyCode:'SGD',totalPriceSet:{shopMoney:money('11.9')},totalTaxSet:{shopMoney:money('0.0')},lineItems:[{quantity:1,taxable:true,variant:{id:variant},discountedTotalSet:{shopMoney:money('11.90')}}],availableShippingRates:[{handle:'rate',title:'Historical QA rate',price:money('5')}]});
test('a matching base price and zero tax cannot be mistaken for GST or delivery acceptance',()=>{
 const result=reviewNativeQuote(fixture(),expected);assert.equal(result.basePriceMatches,true);assert.equal(result.taxEvidence,'EXCLUSIVE_TAX_MODE');assert.equal(result.shippingEvidence,'EXPECTED_FEE_MISSING');assert.equal(result.checkoutAcceptance,false);assert.equal(result.subscriptionAcceptance,false);
 const inclusive=fixture();inclusive.taxesIncluded=true;assert.equal(reviewNativeQuote(inclusive,expected).taxEvidence,'ZERO_TAX_NOT_GST_PROOF');
 inclusive.totalTaxSet.shopMoney=money('0.98');assert.equal(reviewNativeQuote(inclusive,expected).taxEvidence,'INCLUSIVE_TAX_OBSERVED');
 inclusive.availableShippingRates[0].price=money('10');assert.equal(reviewNativeQuote(inclusive,expected).shippingEvidence,'EXPECTED_FEE_OFFERED');assert.equal(reviewNativeQuote(inclusive,expected).checkoutAcceptance,false);
 inclusive.availableShippingRates.push({handle:'incorrect-free',title:'Unrestricted free option',price:money('0')});assert.equal(reviewNativeQuote(inclusive,expected).shippingEvidence,'EXPECTED_FEE_WITH_OTHER_FEES');
});
test('wrong native lines, quantities, currencies or malformed money never produce a reviewed quote',()=>{
 for(const edit of [x=>x.lineItems[0].variant.id='gid://shopify/ProductVariant/2',x=>x.lineItems[0].quantity=2,x=>x.lineItems.push(x.lineItems[0]),x=>x.totalTaxSet.shopMoney.amount='NaN',x=>x.totalTaxSet.shopMoney.amount='12',x=>x.totalPriceSet.shopMoney.currencyCode='USD',x=>delete x.taxesIncluded,x=>x.availableShippingRates.push(x.availableShippingRates[0])]){const x=fixture();edit(x);assert.throws(()=>reviewNativeQuote(x,expected));}
 const changed=fixture();changed.lineItems[0].discountedTotalSet.shopMoney=money('10');assert.equal(reviewNativeQuote(changed,expected).basePriceMatches,false);
});
