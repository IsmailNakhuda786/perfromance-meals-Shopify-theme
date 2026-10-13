import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/native-wallet-returns.server.ts','app/services/native-wallet-debits.server.ts','app/services/wallet-fifo.ts','app/services/wallet-ledger.server.ts'],outdir:'.shopify/wallet-return-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {recordNativeWalletReturn}=await import('../.shopify/wallet-return-test/native-wallet-returns.server.js');
const {allocateFundedFifo}=await import('../.shopify/wallet-return-test/wallet-fifo.js');
const {readWalletLedger}=await import('../.shopify/wallet-return-test/wallet-ledger.server.js');
const {recordNativeWalletDebit}=await import('../.shopify/wallet-return-test/native-wallet-debits.server.js');
const db=new PrismaClient(),shop=`return-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/951',order='gid://shopify/Order/952';
process.env.ALLOWED_SHOP=shop;
const origin={id:'gid://shopify/OrderTransaction/953',status:'SUCCESS',kind:'REFUND',gateway:'shopify_store_credit',amountSet:{shopMoney:{amount:'22.90',currencyCode:'SGD'}},order:{id:order,currencyCode:'SGD',customer:{id:customer}},parentTransaction:{id:'gid://shopify/OrderTransaction/954',gateway:'fixture_card'}};
const credit=()=>({id:'gid://shopify/StoreCreditAccountCreditTransaction/955',createdAt:new Date().toISOString(),amount:{amount:'22.90',currencyCode:'SGD'},event:'ORDER_REFUND',origin});
test.after(async()=>{await db.walletEntry.deleteMany({where:{shop}});await db.customerWallet.deleteMany({where:{shop}});await db.$disconnect();});
test('native card refund records full amount once and remains spendable with clear funding attribution',async()=>{
 const first=await recordNativeWalletReturn(shop,customer,credit());
 assert.equal((await recordNativeWalletReturn(shop,customer,credit())).id,first.id);
 assert.equal((await db.customerWallet.findFirst({where:{shop}})).fundedBalance,2290);
 const entries=await db.walletEntry.findMany({where:{shop},orderBy:{createdAt:'asc'}});
 assert.equal(allocateFundedFifo(entries,2290)[0].sourceKind,'customer_funded');
 const ledger=await readWalletLedger(shop,customer,'SGD');
 assert.equal(ledger.balanceMatchesLedger,true);assert.equal(ledger.attributionComplete,true);
 assert.equal(ledger.sources[0].fundedDelta,2290);
 await assert.rejects(recordNativeWalletReturn(shop,'gid://shopify/Customer/999',credit()));
});
test('Gift Card refund and Wallet debit revert retain their original funding sources',async()=>{
 const gift={...credit(),id:'gid://shopify/StoreCreditAccountCreditTransaction/956',origin:{...origin,parentTransaction:{id:'gid://shopify/OrderTransaction/957',gateway:'gift_card'}}};
 assert.equal(JSON.parse((await recordNativeWalletReturn(shop,customer,gift)).fundedAllocations)[0].sourceKind,'gift_card_funded');
 const debit=await db.walletEntry.create({data:{shop,customerGid:customer,currency:'SGD',sourceEvent:'fixture-wallet-payment',sourceGid:order,sourceKind:'gift_card_funded',fundedDelta:-2290,bonusDelta:0,nativeTransactionGid:'gid://shopify/StoreCreditAccountDebitTransaction/958',fundedAllocations:JSON.stringify([{creditEntryId:'original-gift-funding',sourceKind:'gift_card_funded',amountMinor:2290}])}});
 await db.customerWallet.updateMany({where:{shop},data:{fundedBalance:{decrement:2290}}});
 const receipt={...credit(),id:'gid://shopify/StoreCreditAccountDebitRevertTransaction/959',debitTransaction:{id:debit.nativeTransactionGid}};
 const entry=await recordNativeWalletReturn(shop,customer,receipt);
 assert.equal(JSON.parse(entry.fundedAllocations)[0].sourceKind,'gift_card_funded');
 await recordNativeWalletReturn(shop,customer,receipt);
 assert.equal(await db.walletEntry.count({where:{shop,nativeTransactionGid:receipt.id}}),1);
 await assert.rejects(recordNativeWalletReturn(shop,customer,{...receipt,id:'gid://shopify/StoreCreditAccountDebitRevertTransaction/960'}),/already restored/);
});
test('unknown/partial reversals and incompatible evidence never invent Wallet credit',async()=>{
 await assert.rejects(recordNativeWalletReturn(shop,customer,{...credit(),id:'gid://shopify/StoreCreditAccountCreditTransaction/961',amount:{amount:'1.00',currencyCode:'SGD'}}));
 await assert.rejects(recordNativeWalletReturn(shop,customer,{...credit(),event:'ADJUSTMENT'}));
 await assert.rejects(recordNativeWalletReturn(shop,customer,{...credit(),origin:{...origin,status:'FAILURE'}}));
});
test('legacy allocation-free debit restores only proven single-source funding; ambiguous mixed history stays pending',async()=>{
 for(const [index,mixed] of [false,true].entries()){
  const owner=`gid://shopify/Customer/${980+index}`,debitId=`gid://shopify/StoreCreditAccountDebitTransaction/${982+index}`;
  await db.customerWallet.create({data:{shop,customerGid:owner,currency:'SGD'}});
  const context={shop,customerGid:owner,currency:'SGD',bonusDelta:0};
  await db.walletEntry.create({data:{...context,sourceEvent:'legacy-credit-'+index,sourceKind:'gift_card_funded',fundedDelta:mixed?500:1000,createdAt:new Date('2026-10-10T00:00:00Z')}});
  if(mixed)await db.walletEntry.create({data:{...context,sourceEvent:'legacy-cash-'+index,sourceKind:'customer_funded',fundedDelta:500,createdAt:new Date('2026-10-10T01:00:00Z')}});
  await db.walletEntry.create({data:{...context,sourceEvent:'legacy-debit-'+index,sourceGid:order,sourceKind:'gift_card_funded',fundedDelta:-1000,nativeTransactionGid:debitId,createdAt:new Date('2026-10-11T00:00:00Z')}});
  const receipt={...credit(),id:`gid://shopify/StoreCreditAccountDebitRevertTransaction/${984+index}`,amount:{amount:'10.00',currencyCode:'SGD'},debitTransaction:{id:debitId},origin:{...origin,order:{...origin.order,customer:{id:owner}}}};
  if(mixed){await assert.rejects(recordNativeWalletReturn(shop,owner,receipt),/Legacy/);assert.equal((await db.customerWallet.findFirst({where:{shop,customerGid:owner}})).fundedBalance,0);}
  else{const entry=await recordNativeWalletReturn(shop,owner,receipt);assert.equal(JSON.parse(entry.fundedAllocations)[0].sourceKind,'gift_card_funded');await recordNativeWalletReturn(shop,owner,receipt);assert.equal((await db.customerWallet.findFirst({where:{shop,customerGid:owner}})).fundedBalance,1000);}
 }
});
test('Shopify credit-transaction refund links to its original Wallet payment and restores Gift Card funds once',async()=>{
 const owner='gid://shopify/Customer/990',payment='gid://shopify/OrderTransaction/991';
 await db.customerWallet.create({data:{shop,customerGid:owner,currency:'SGD',fundedBalance:1200}});
 await db.walletEntry.create({data:{shop,customerGid:owner,currency:'SGD',sourceEvent:'linked-gift-funding',sourceKind:'gift_card_funded',fundedDelta:1200,bonusDelta:0}});
 const paymentOrigin={...origin,id:payment,kind:'SALE',gateway:'shopify_store_credit',amountSet:{shopMoney:{amount:'10.00',currencyCode:'SGD'}},order:{...origin.order,customer:{id:owner}}};
 await recordNativeWalletDebit(shop,owner,{id:'gid://shopify/StoreCreditAccountDebitTransaction/992',createdAt:new Date().toISOString(),amount:{amount:'-10.00',currencyCode:'SGD'},event:'ORDER_PAYMENT',origin:paymentOrigin});
 const refund={...credit(),id:'gid://shopify/StoreCreditAccountCreditTransaction/993',amount:{amount:'10.00',currencyCode:'SGD'},origin:{...paymentOrigin,id:'gid://shopify/OrderTransaction/994',kind:'REFUND',parentTransaction:{id:payment,gateway:'shopify_store_credit'}}};
 const entry=await recordNativeWalletReturn(shop,owner,refund);await recordNativeWalletReturn(shop,owner,refund);
 assert.equal(JSON.parse(entry.fundedAllocations)[0].sourceKind,'gift_card_funded');
 assert.equal((await db.customerWallet.findFirst({where:{shop,customerGid:owner}})).fundedBalance,1200);
 await assert.rejects(recordNativeWalletReturn(shop,owner,{...refund,id:'gid://shopify/StoreCreditAccountCreditTransaction/995'}),/already restored/);
});
test('parentless full-order refund reconciles native payment evidence, including mixed Wallet/card funding',async()=>{
 const owner='gid://shopify/Customer/1001',payment='gid://shopify/OrderTransaction/1002';
 await db.customerWallet.create({data:{shop,customerGid:owner,currency:'SGD',fundedBalance:1200}});
 await db.walletEntry.create({data:{shop,customerGid:owner,currency:'SGD',sourceEvent:'parentless-gift',sourceKind:'gift_card_funded',fundedDelta:1200,bonusDelta:0}});
 const paid={...origin,id:payment,kind:'SALE',gateway:'shopify_store_credit',amountSet:{shopMoney:{amount:'10.00',currencyCode:'SGD'}},order:{...origin.order,customer:{id:owner}}};
 await recordNativeWalletDebit(shop,owner,{id:'gid://shopify/StoreCreditAccountDebitTransaction/1003',createdAt:new Date().toISOString(),amount:{amount:'-10.00',currencyCode:'SGD'},event:'ORDER_PAYMENT',origin:paid});
 const refund={...credit(),id:'gid://shopify/StoreCreditAccountCreditTransaction/1004',amount:{amount:'20.00',currencyCode:'SGD'},origin:{...paid,id:'gid://shopify/OrderTransaction/1005',kind:'REFUND',parentTransaction:null,amountSet:{shopMoney:{amount:'20.00',currencyCode:'SGD'}}}};
 const funding={id:order,customer:{id:owner},currencyCode:'SGD',totalReceivedSet:{shopMoney:{amount:'20.00',currencyCode:'SGD'}},totalRefundedSet:{shopMoney:{amount:'20.00',currencyCode:'SGD'}},transactions:[paid,{...paid,id:'gid://shopify/OrderTransaction/1006',gateway:'fixture_card'},refund.origin]};
 await assert.rejects(recordNativeWalletReturn(shop,owner,refund),/funding evidence/);
 const entry=await recordNativeWalletReturn(shop,owner,refund,funding);await recordNativeWalletReturn(shop,owner,refund,funding);
 const parts=JSON.parse(entry.fundedAllocations);assert.equal(parts.find(a=>a.sourceKind==='gift_card_funded').amountMinor,1000);assert.equal(parts.find(a=>a.sourceKind==='customer_funded').amountMinor,1000);
 assert.equal((await db.customerWallet.findFirst({where:{shop,customerGid:owner}})).fundedBalance,2200);
 await assert.rejects(recordNativeWalletReturn(shop,owner,{...refund,id:'gid://shopify/StoreCreditAccountCreditTransaction/1007'},funding),/conflict/);
});
