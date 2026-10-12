import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-ledger.server.ts'],outdir:'.shopify/wallet-ledger-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {readWalletLedger}=await import('../.shopify/wallet-ledger-test/wallet-ledger.server.js');
const db=new PrismaClient(),shop=`ledger-${randomUUID()}.myshopify.com`,customerGid='gid://shopify/Customer/201';
process.env.ALLOWED_SHOP=shop;
test.after(async()=>{await db.walletEntry.deleteMany({where:{shop}});await db.customerWallet.deleteMany({where:{shop}});await db.$disconnect();});

test('persisted history isolates customers/currencies and separates cash, Gift Card and bonus sources',async()=>{
 await db.customerWallet.create({data:{shop,customerGid,currency:'SGD',fundedBalance:300,bonusBalance:50}});
 for(const [sourceKind,fundedDelta,bonusDelta]of [['customer_funded',100,0],['gift_card_funded',200,0],['bonus',0,50]]){
  await db.walletEntry.create({data:{shop,customerGid,currency:'SGD',sourceEvent:randomUUID(),sourceKind,fundedDelta,bonusDelta}});
 }
 await db.walletEntry.create({data:{shop,customerGid:'gid://shopify/Customer/202',currency:'SGD',sourceEvent:randomUUID(),sourceKind:'bonus',fundedDelta:0,bonusDelta:999}});
 const result=await readWalletLedger(shop,customerGid,'SGD');
 assert.equal(result.history.length,3);assert.equal(result.balanceMatchesLedger,true);assert.equal(result.attributionComplete,true);assert.equal(result.settlementVerified,false);
 assert.deepEqual(result.sources.map(source=>source.sourceKind).sort(),['bonus','customer_funded','gift_card_funded']);
 assert.deepEqual((await readWalletLedger(shop,customerGid,'USD')).history,[]);
 const fresh=new PrismaClient();assert.equal(await fresh.walletEntry.count({where:{shop,customerGid,currency:'SGD'}}),3);await fresh.$disconnect();
});

test('balance drift and historical unknown attribution remain visibly unverified',async()=>{
 await db.customerWallet.update({where:{shop_customerGid_currency:{shop,customerGid,currency:'SGD'}},data:{fundedBalance:301}});
 await db.walletEntry.create({data:{shop,customerGid,currency:'SGD',sourceEvent:randomUUID(),fundedDelta:0,bonusDelta:0}});
 const result=await readWalletLedger(shop,customerGid,'SGD');
 assert.equal(result.balanceMatchesLedger,false);assert.equal(result.attributionComplete,false);
 assert.ok(result.history.some(entry=>entry.sourceKind==='legacy_unknown'));
});

test('large histories are explicitly truncated and invalid or unauthorized reads fail closed',async()=>{
 await db.walletEntry.createMany({data:Array.from({length:51},()=>({shop,customerGid,currency:'SGD',sourceEvent:randomUUID(),sourceKind:'bonus',fundedDelta:0,bonusDelta:0}))});
 const result=await readWalletLedger(shop,customerGid,'SGD');
 assert.equal(result.history.length,50);assert.equal(result.hasMore,true);
 const second=await readWalletLedger(shop,customerGid,'SGD',result.nextCursor);
 assert.equal(second.history.length,5);assert.equal(second.hasMore,false);assert.equal(second.nextCursor,null);
 assert.equal(new Set([...result.history,...second.history].map(entry=>entry.id)).size,55);
 const foreign=await db.walletEntry.findFirst({where:{shop,customerGid:'gid://shopify/Customer/202'}});
 await assert.rejects(()=>readWalletLedger(shop,customerGid,'SGD',foreign.id),/Invalid ledger cursor/);
 await assert.rejects(()=>readWalletLedger('unauthorized.myshopify.com',customerGid,'SGD'));
 await assert.rejects(()=>readWalletLedger(shop,'201','SGD'),/Invalid/);
 await assert.rejects(()=>readWalletLedger(shop,customerGid,'sgd'),/Invalid/);
});
