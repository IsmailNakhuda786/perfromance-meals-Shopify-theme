import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/native-wallet-credit-ready.server.ts'],outdir:'.shopify/credit-ready-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {assertNativeWalletCreditReady}=await import('../.shopify/credit-ready-test/native-wallet-credit-ready.server.js');
const db=new PrismaClient(),shop=`credit-ready-${randomUUID()}.myshopify.com`,customerGid='gid://shopify/Customer/940';
process.env.ALLOWED_SHOP=shop;
const admin=(amount='0.00',owner=customerGid)=>({graphql:async(query)=>Response.json({data:{shop:{myshopifyDomain:shop,currencyCode:'SGD'},customer:{id:owner,storeCreditAccounts:{nodes:query.includes('CustomerWalletBalance')?[{balance:{amount,currencyCode:'SGD'}}]:[],pageInfo:{hasNextPage:false,endCursor:null}}}}})});
test.after(async()=>{for(const table of ['giftCardWalletClaim','rewardRedemption','walletTopUpSettlement','orderCancellation','walletEntry','customerWallet'])await db[table].deleteMany({where:{shop}});await db.$disconnect();});

test('fresh native balance must match both the Wallet cache and its ledger before new credit',async()=>{
 await assertNativeWalletCreditReady(admin(),shop,customerGid);
 await assert.rejects(assertNativeWalletCreditReady(admin('1.00'),shop,customerGid),/reconciliation/);
 await db.customerWallet.create({data:{shop,customerGid,currency:'SGD',fundedBalance:100}});
 await assert.rejects(assertNativeWalletCreditReady(admin('1.00'),shop,customerGid),/reconciliation/);
 await db.walletEntry.create({data:{shop,customerGid,currency:'SGD',sourceEvent:'fixture-credit',sourceKind:'customer_funded',fundedDelta:100,bonusDelta:0}});
 await assertNativeWalletCreditReady(admin('1.00'),shop,customerGid);
 await assert.rejects(assertNativeWalletCreditReady(admin('1.00','gid://shopify/Customer/941'),shop,customerGid),/owner differs/);
 assert.equal(await db.walletEntry.count({where:{shop}}),1);
 assert.equal((await db.customerWallet.findFirst({where:{shop}})).fundedBalance,100);
});

test('an unresolved prior Gift Card, Rewards or top-up credit blocks another operation',async()=>{
 const records=[
  ['giftCardWalletClaim',{shop,customerGid,giftCardGid:'gid://shopify/GiftCard/942',currency:'SGD',amountMinor:100,state:'RECONCILIATION_REQUIRED'}],
  ['rewardRedemption',{shop,customerGid,requestKey:'credit-ready-fixture',rulesVersion:'fixture',points:10,amountMinor:100,state:'CREDIT_PENDING'}],
  ['walletTopUpSettlement',{shop,customerGid,orderGid:'gid://shopify/Order/943',paymentGid:'gid://shopify/OrderTransaction/944',currency:'SGD',amountMinor:500,state:'AWAITING_LEDGER'}],
  ['orderCancellation',{shop,customerGid,orderGid:'gid://shopify/Order/945',contractGids:'[]',currency:'SGD',amountMinor:500,state:'AWAITING_NATIVE_REFUND'}],
 ];
 for(const [table,data]of records){
  const record=await db[table].create({data});let nativeReads=0;
  await assert.rejects(assertNativeWalletCreditReady({graphql:async()=>{nativeReads++;throw Error('Unexpected native read');}},shop,customerGid),/before new credit/);
  assert.equal(nativeReads,0);
  await db[table].delete({where:{id:record.id}});
 }
 const own=await db.rewardRedemption.create({data:{shop,customerGid,requestKey:'credit-ready-own-fixture',rulesVersion:'fixture',points:10,amountMinor:100,state:'PREPARED'}});
 await assertNativeWalletCreditReady(admin('1.00'),shop,customerGid,{rewardRedemptionId:own.id});
 await assert.rejects(assertNativeWalletCreditReady(admin('1.00'),shop,customerGid),/before new credit/);
 await db.rewardRedemption.delete({where:{id:own.id}});
});
