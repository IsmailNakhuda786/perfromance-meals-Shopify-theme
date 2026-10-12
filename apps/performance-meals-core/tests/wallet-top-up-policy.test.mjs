import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-top-up-policy.ts'],outdir:'.shopify/top-up-policy-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {verifyPaidTopUp}=await import('../.shopify/top-up-policy-test/wallet-top-up-policy.js');
const customer='gid://shopify/Customer/801',product='gid://shopify/Product/802',variant='gid://shopify/ProductVariant/803';
const money=amount=>({shopMoney:{amount,currencyCode:'SGD'}});
const config={productGid:product,variants:{[variant]:2000},paymentGateways:['fixture_external_gateway']};
const order=()=>({id:'gid://shopify/Order/804',cancelledAt:null,disputes:[],displayFinancialStatus:'PAID',currencyCode:'SGD',customer:{id:customer},totalPriceSet:money('20.00'),totalReceivedSet:money('20.00'),totalRefundedSet:money('0'),totalDiscountsSet:money('0'),totalTaxSet:money('0'),totalShippingPriceSet:money('0'),lineItems:{pageInfo:{hasNextPage:false},nodes:[{quantity:1,variant:{id:variant},product:{id:product,isGiftCard:false},originalTotalSet:money('20.00'),discountedTotalSet:money('20.00')}]},transactions:[{id:'gid://shopify/OrderTransaction/805',status:'SUCCESS',kind:'SALE',gateway:'fixture_external_gateway',amountSet:money('20.00')}]});

test('only exact native paid top-up evidence establishes customer funding',()=>{
 assert.deepEqual(verifyPaidTopUp(order(),customer,config),{orderGid:'gid://shopify/Order/804',customerGid:customer,currency:'SGD',amountMinor:2000,paymentGid:'gid://shopify/OrderTransaction/805'});
 for(const edit of [o=>o.disputes=[{id:'gid://shopify/OrderDisputeSummary/808',status:'NEEDS_RESPONSE'}],o=>delete o.disputes,o=>o.displayFinancialStatus='PENDING',o=>o.customer.id='gid://shopify/Customer/999',o=>o.cancelledAt=new Date().toISOString(),o=>o.lineItems.pageInfo.hasNextPage=true,o=>o.lineItems.nodes[0].quantity=2,o=>o.lineItems.nodes[0].variant.id='gid://shopify/ProductVariant/999',o=>o.lineItems.nodes[0].product.isGiftCard=true,o=>o.lineItems.nodes.push(o.lineItems.nodes[0]),o=>o.totalDiscountsSet=money('1'),o=>o.totalShippingPriceSet=money('10'),o=>o.totalTaxSet=money('1'),o=>o.totalRefundedSet=money('1'),o=>o.totalReceivedSet=money('19.99'),o=>o.transactions[0].status='FAILURE',o=>o.transactions[0].kind='AUTHORIZATION',o=>o.transactions[0].amountSet=money('19'),o=>o.transactions[0].amountSet.shopMoney.currencyCode='USD',o=>o.transactions.push({...o.transactions[0],id:'gid://shopify/OrderTransaction/806'})]){
  const invalid=order();edit(invalid);assert.throws(()=>verifyPaidTopUp(invalid,customer,config));
 }
});

test('Wallet, Gift Card and unapproved payments cannot be relabelled customer cash',()=>{
 for(const gateway of ['shopify_store_credit','gift_card','manual','unapproved_gateway']){
  const invalid=order();invalid.transactions[0].gateway=gateway;
  assert.throws(()=>verifyPaidTopUp(invalid,customer,{...config,paymentGateways:gateway==='unapproved_gateway'?[]:[gateway]}));
 }
 const refunded=order();refunded.transactions.push({...refunded.transactions[0],kind:'REFUND',id:'gid://shopify/OrderTransaction/807'});
 assert.throws(()=>verifyPaidTopUp(refunded,customer,config));
 assert.throws(()=>verifyPaidTopUp(order(),customer,{...config,variants:{[variant]:2000.1}}));
});
