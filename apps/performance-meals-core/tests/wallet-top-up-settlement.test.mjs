import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-top-up-settlement.server.ts'],outdir:'.shopify/top-up-settlement-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {settleWalletTopUp}=await import('../.shopify/top-up-settlement-test/wallet-top-up-settlement.server.js');
const db=new PrismaClient(),shop=`top-up-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/801';
process.env.ALLOWED_SHOP=shop;
const config={productGid:'gid://shopify/Product/802',variants:{'gid://shopify/ProductVariant/803':2000},paymentGateways:['fixture_external_gateway']};
const money=amount=>({shopMoney:{amount,currencyCode:'SGD'}});
const order=id=>({id:`gid://shopify/Order/${id}`,cancelledAt:null,disputes:[],displayFinancialStatus:'PAID',currencyCode:'SGD',customer:{id:customer},totalPriceSet:money('20'),totalReceivedSet:money('20'),totalRefundedSet:money('0'),totalDiscountsSet:money('0'),totalTaxSet:money('0'),totalShippingPriceSet:money('0'),lineItems:{pageInfo:{hasNextPage:false},nodes:[{quantity:1,variant:{id:'gid://shopify/ProductVariant/803'},product:{id:config.productGid,isGiftCard:false},originalTotalSet:money('20'),discountedTotalSet:money('20')}]},transactions:[{id:`gid://shopify/OrderTransaction/${id}`,status:'SUCCESS',kind:'SALE',gateway:'fixture_external_gateway',amountSet:money('20')}]});
const gateway=id=>({readOrder:async()=>order(id),credit:async owner=>({id:`gid://shopify/StoreCreditAccountCreditTransaction/${id}`,ownerGid:owner,amountMinor:2000,currency:'SGD'})});
test.after(async()=>{await db.walletTopUpSettlement.deleteMany({where:{shop}});await db.walletEntry.deleteMany({where:{shop}});await db.customerWallet.deleteMany({where:{shop}});await db.commercePolicy.deleteMany({where:{shop}});await db.$disconnect();});

test('top-ups remain closed by default; paid settlement and duplicate delivery credit exactly once',async()=>{
 const api=gateway(810);let credits=0;const credit=api.credit;api.credit=async(...args)=>{credits++;return credit(...args);};
 await assert.rejects(settleWalletTopUp(shop,customer,order(810).id,config,api),/not activated/);
 assert.equal(credits,0);
 await db.commercePolicy.create({data:{shop,walletTopUpsEnabled:true}}); // isolated fixture only
 const first=await settleWalletTopUp(shop,customer,order(810).id,config,api);
 const repeated=await settleWalletTopUp(shop,customer,order(810).id,config,api);
 assert.equal(first.id,repeated.id);assert.equal(first.state,'COMPLETED');assert.equal(credits,1);
 const ledger=await db.walletEntry.findUnique({where:{id:first.ledgerEntryId}});
 assert.equal(ledger.sourceKind,'customer_funded');assert.equal(ledger.fundedDelta,2000);
 assert.equal(ledger.nativeSourceTransactionGid,'gid://shopify/OrderTransaction/810');
 assert.equal((await db.customerWallet.findFirst({where:{shop}})).fundedBalance,2000);
 await assert.rejects(settleWalletTopUp(shop,'gid://shopify/Customer/999',order(810).id,config,api));
 assert.equal(credits,1);
});

test('lost or mismatched native credit response cannot cause an automatic second financial transfer',async()=>{
 for(const id of [811,812]){
  const api=gateway(id);let credits=0;
  api.credit=async()=>{credits++;if(id===811)throw Error('Simulated lost response');return {id:`gid://shopify/StoreCreditAccountCreditTransaction/${id}`,ownerGid:customer,amountMinor:1,currency:'SGD'};};
  await assert.rejects(settleWalletTopUp(shop,customer,order(id).id,config,api),/reconciliation/);
  await assert.rejects(settleWalletTopUp(shop,customer,order(id).id,config,api),/reconciliation/);
  assert.equal(credits,1);
  assert.equal((await db.walletTopUpSettlement.findUnique({where:{shop_orderGid:{shop,orderGid:order(id).id}}})).state,'RECONCILIATION_REQUIRED');
 }
 assert.equal(await db.walletEntry.count({where:{shop}}),1);
});

test('concurrent settlement attempts cannot duplicate native credit',async()=>{
 const api=gateway(813);let credits=0;const credit=api.credit;
 api.credit=async(...args)=>{credits++;await new Promise(resolve=>setTimeout(resolve,20));return credit(...args);};
 const results=await Promise.allSettled([settleWalletTopUp(shop,customer,order(813).id,config,api),settleWalletTopUp(shop,customer,order(813).id,config,api)]);
 assert.equal(results.filter(result=>result.status==='fulfilled').length>=1,true);
 assert.equal(credits,1);
 assert.equal(await db.walletEntry.count({where:{shop,sourceGid:order(813).id}}),1);
});

test('ledger failure preserves native evidence and can recover without issuing credit again',async()=>{
 const api=gateway(814);let credits=0;const credit=api.credit;
 api.credit=async(...args)=>{credits++;return credit(...args);};
 // A conflicting native transaction key simulates a bookkeeping failure after
 // Shopify already confirmed the credit. This record is isolated test data.
 const conflict=await db.walletEntry.create({data:{shop,customerGid:'gid://shopify/Customer/999',currency:'SGD',sourceEvent:'fixture-conflict',sourceKind:'customer_funded',nativeTransactionGid:'gid://shopify/StoreCreditAccountCreditTransaction/814',fundedDelta:2000,bonusDelta:0}});
 const before=(await db.customerWallet.findFirst({where:{shop,customerGid:customer}})).fundedBalance;
 await assert.rejects(settleWalletTopUp(shop,customer,order(814).id,config,api));
 const pending=await db.walletTopUpSettlement.findUnique({where:{shop_orderGid:{shop,orderGid:order(814).id}}});
 assert.equal(pending.state,'AWAITING_LEDGER');assert.equal(pending.creditGid,'gid://shopify/StoreCreditAccountCreditTransaction/814');
 assert.equal((await db.customerWallet.findFirst({where:{shop,customerGid:customer}})).fundedBalance,before);
 await db.walletEntry.delete({where:{id:conflict.id}});
 assert.equal((await settleWalletTopUp(shop,customer,order(814).id,config,api)).state,'COMPLETED');
 assert.equal(credits,1);
 assert.equal((await db.customerWallet.findFirst({where:{shop,customerGid:customer}})).fundedBalance,before+2000);
});
