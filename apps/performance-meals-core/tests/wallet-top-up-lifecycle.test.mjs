import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-top-up-lifecycle.ts'],outdir:'.shopify/top-up-lifecycle-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {assessTopUpLifecycle}=await import('../.shopify/top-up-lifecycle-test/wallet-top-up-lifecycle.js');
const settlement={orderGid:'gid://shopify/Order/900',customerGid:'gid://shopify/Customer/901',currency:'SGD',amountMinor:2000,paymentGid:'gid://shopify/OrderTransaction/902',creditGid:'gid://shopify/StoreCreditAccountCreditTransaction/903',state:'COMPLETED'};
const order=()=>({id:settlement.orderGid,customer:{id:settlement.customerGid},currencyCode:'SGD',cancelledAt:null,displayFinancialStatus:'PAID',disputes:[],totalRefundedSet:{shopMoney:{amount:'0',currencyCode:'SGD'}},transactions:[{id:settlement.paymentGid,status:'SUCCESS',kind:'SALE',amountSet:{shopMoney:{amount:'20',currencyCode:'SGD'}}}]});
test('post-credit refund, cancellation and dispute demand reconciliation rather than synthetic Wallet reversal',()=>{
 assert.equal(assessTopUpLifecycle(order(),settlement).state,'CLEAR');
 for(const edit of [o=>o.totalRefundedSet.shopMoney.amount='5',o=>o.cancelledAt=new Date().toISOString(),o=>o.disputes.push({id:'fixture',status:'LOST'})]){
  const native=order();edit(native);const result=assessTopUpLifecycle(native,settlement);
  assert.equal(result.state,'RECONCILIATION_REQUIRED');assert.equal(result.nativeWalletReversalVerified,false);
  assert.equal(assessTopUpLifecycle(native,{...settlement,creditGid:null,state:'PREPARED'}).state,'DO_NOT_CREDIT');
 }
 assert.equal(settlement.amountMinor,2000);assert.equal(settlement.state,'COMPLETED');
});
test('foreign ownership, changed captures, missing dispute data and over-refunds cannot prove a lifecycle result',()=>{
 for(const edit of [o=>o.customer.id='gid://shopify/Customer/999',o=>o.transactions[0].amountSet.shopMoney.amount='19',o=>o.totalRefundedSet.shopMoney.currencyCode='USD',o=>o.totalRefundedSet.shopMoney.amount='20.01',o=>delete o.disputes]){
  const native=order();edit(native);assert.throws(()=>assessTopUpLifecycle(native,settlement));
 }
});
