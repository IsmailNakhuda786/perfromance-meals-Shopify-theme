import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/native-wallet-debits.server.ts','app/services/wallet.server.ts','app/services/wallet-ledger.server.ts'],outdir:'.shopify/native-debit-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {recordNativeWalletDebit}=await import('../.shopify/native-debit-test/native-wallet-debits.server.js');
const {recordSettledWalletCredit}=await import('../.shopify/native-debit-test/wallet.server.js');
const {readWalletLedger}=await import('../.shopify/native-debit-test/wallet-ledger.server.js');
const db=new PrismaClient(),shop=`debit-${randomUUID()}.myshopify.com`,customerGid='gid://shopify/Customer/401';
process.env.ALLOWED_SHOP=shop;
test.after(async()=>{await db.walletEntry.deleteMany({where:{shop}});await db.customerWallet.deleteMany({where:{shop}});await db.$disconnect();});
const debit=()=>({id:'gid://shopify/StoreCreditAccountDebitTransaction/801',createdAt:new Date().toISOString(),event:'ORDER_PAYMENT',amount:{amount:'-22.90',currencyCode:'SGD'},origin:{status:'SUCCESS',kind:'SALE',gateway:'shopify_store_credit',amountSet:{shopMoney:{amount:'22.90',currencyCode:'SGD'}},order:{id:'gid://shopify/Order/901',currencyCode:'SGD',customer:{id:customerGid}}}});
test('native paid-order debit persists once, keeps attribution and rejects mismatched payment or overdraw',async()=>{
 await recordSettledWalletCredit({shop,customerGid,currency:'SGD',sourceEvent:'credit',sourceKind:'gift_card_funded',amountMinor:2500,sourceGid:'gid://shopify/GiftCard/701',nativeTransactionGid:'gid://shopify/StoreCreditAccountCreditTransaction/702',nativeSourceTransactionGid:'gid://shopify/GiftCardDebitTransaction/703'});
 for(const change of [d=>d.origin.status='FAILURE',d=>d.origin.order.customer.id='gid://shopify/Customer/999',d=>d.origin.amountSet.shopMoney.amount='20.00']){const invalid=debit();change(invalid);await assert.rejects(recordNativeWalletDebit(shop,customerGid,invalid));}
 const first=await recordNativeWalletDebit(shop,customerGid,debit());
 const repeated=await recordNativeWalletDebit(shop,customerGid,debit());
 assert.equal(repeated.id,first.id);assert.equal(first.sourceKind,'gift_card_funded');
 assert.equal((await db.customerWallet.findFirst({where:{shop,customerGid}})).fundedBalance,210);
 assert.equal(await db.walletEntry.count({where:{shop,fundedDelta:{lt:0}}}),1);
 const excess=debit();excess.id='gid://shopify/StoreCreditAccountDebitTransaction/802';
 await assert.rejects(recordNativeWalletDebit(shop,customerGid,excess));
 await recordSettledWalletCredit({shop,customerGid,currency:'SGD',sourceEvent:'cash',sourceKind:'customer_funded',amountMinor:1000,sourceGid:'gid://shopify/Order/905',nativeTransactionGid:'gid://shopify/StoreCreditAccountCreditTransaction/704'});
 const mixed=debit();mixed.id='gid://shopify/StoreCreditAccountDebitTransaction/807';mixed.amount.amount='-5.00';mixed.origin.amountSet.shopMoney.amount='5.00';mixed.origin.order.id='gid://shopify/Order/902';
 const purchase=await recordNativeWalletDebit(shop,customerGid,mixed);
 assert.equal(purchase.sourceKind,'funded_spend');
 assert.deepEqual(JSON.parse(purchase.fundedAllocations).map(p=>[p.sourceKind,p.amountMinor]),[['gift_card_funded',210],['customer_funded',290]]);
 const audit=await readWalletLedger(shop,customerGid,'SGD');
 assert.equal(audit.attributionComplete,true);assert.equal(audit.balanceMatchesLedger,true);
 assert.equal(audit.sources.find(s=>s.sourceKind==='gift_card_funded').fundedDelta,0);
 assert.equal(audit.sources.find(s=>s.sourceKind==='customer_funded').fundedDelta,710);

});
