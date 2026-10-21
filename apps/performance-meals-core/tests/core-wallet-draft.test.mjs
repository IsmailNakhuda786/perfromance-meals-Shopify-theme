import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/core-wallet-draft.server.ts','app/services/privacy.server.ts','app/services/runtime-config.server.ts'],outdir:'.shopify/core-wallet-draft-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {saveCoreWalletDraft:save,readCoreWalletDraft:read,transitionCoreWalletDraft:transition}=await import('../.shopify/core-wallet-draft-test/core-wallet-draft.server.js');
const {inspectCustomerPrivacyData}=await import('../.shopify/core-wallet-draft-test/privacy.server.js');
const {productionConfigIssues}=await import('../.shopify/core-wallet-draft-test/runtime-config.server.js');
const db=new PrismaClient(),shop=`wallet-draft-${randomUUID()}.myshopify.com`,customerGid='gid://shopify/Customer/1',scope={shop,customerGid,currency:'SGD'};
process.env.ALLOWED_SHOP=shop;let sequence=0;
const now='2026-10-21T00:00:00Z',later='2026-10-21T00:01:00Z';
function input(){return{id:`attempt-${++sequence}`,quote:{...scope,cartReference:'cart-1',cartRevision:'v1',ledgerRevision:1,lines:[{id:'food',kind:'food',amountMinor:10000},{id:'delivery',kind:'delivery',amountMinor:1000}]},credits:[{...scope,id:'principal',sourceKind:'customer_funded',remainingMinor:10000,issuedAt:'2026-10-01T00:00:00Z',expiresAt:'2027-10-01T15:59:59.999Z'},{...scope,id:'bonus',sourceKind:'bonus',remainingMinor:2000,issuedAt:'2026-10-01T00:00:00Z',expiresAt:'2027-10-01T15:59:59.999Z'}],now,reservationDeadline:'2026-10-21T00:10:00Z'};}
const submit=(i,revision=0)=>transition(shop,customerGid,i.id,revision,{type:'SUBMIT',at:now,quote:i.quote});
const receipt=d=>({...scope,id:'provider-fixture-receipt',attemptId:d.id,cartDigest:d.digest,amountMinor:d.amountMinor,occurredAt:later});
test.after(async()=>{await db.coreWalletRedemptionDraft.deleteMany({where:{shop}});await db.customerWallet.deleteMany({where:{shop}});await db.$disconnect();});
test('draft persistence is off by default and forbidden by production preflight',async()=>{
 delete process.env.CORE_WALLET_DRAFTS_ENABLED;const i=input();await assert.rejects(save(i),/not activated/);assert.equal(await read(shop,customerGid,i.id),null);
 assert.ok(productionConfigIssues({CORE_WALLET_DRAFTS_ENABLED:'true'}).some(x=>x.includes('not payment authorization')));process.env.CORE_WALLET_DRAFTS_ENABLED='true';
});
test('a saved draft can be loaded by a fresh database client without modifying a Wallet',async()=>{
 const wallet=await db.customerWallet.create({data:{...scope,fundedBalance:10000,bonusBalance:2000}}),i=input(),draft=await save(i);
 const fresh=new PrismaClient();try{const raw=await fresh.coreWalletRedemptionDraft.findUnique({where:{shop_attemptId:{shop,attemptId:i.id}}});assert.deepEqual(JSON.parse(raw.payload),draft);}finally{await fresh.$disconnect();}
 assert.deepEqual(await read(shop,customerGid,i.id),draft);assert.deepEqual(await db.customerWallet.findUnique({where:{id:wallet.id}}),wallet);
 assert.equal(await db.walletEntry.count({where:{shop}}),0);assert.equal(await db.walletReservation.count({where:{shop}}),0);
});
test('concurrent duplicate creation saves one plan and conflicting reuse cannot overwrite it',async()=>{
 const i=input(),results=await Promise.all([save(i),save(i)]);assert.deepEqual(results[0],results[1]);assert.equal(await db.coreWalletRedemptionDraft.count({where:{shop,attemptId:i.id}}),1);
 const changed=structuredClone(i);changed.quote.cartRevision='changed';await assert.rejects(save(changed),/another plan/);
 const foreign=structuredClone(i);foreign.quote.customerGid='gid://shopify/Customer/2';foreign.credits.forEach(c=>c.customerGid=foreign.quote.customerGid);await assert.rejects(save(foreign),/another plan/);
 assert.deepEqual(await read(shop,customerGid,i.id),results[0]);
});
test('only one competing draft transition wins and stale or foreign updates cannot write',async()=>{
 const i=input();await save(i);const results=await Promise.allSettled([submit(i),transition(shop,customerGid,i.id,0,{type:'RELEASE_UNSUBMITTED',at:now})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const current=await read(shop,customerGid,i.id);assert.equal(current.revision,1);await assert.rejects(submit(i),/changed/);
 await assert.rejects(transition(shop,'gid://shopify/Customer/9',i.id,1,{type:'TIMEOUT',at:later}),/unavailable/);
 await assert.rejects(read('other.myshopify.com',customerGid,i.id));assert.deepEqual(await read(shop,customerGid,i.id),current);
});
test('unknown submitted outcomes survive reload and cannot be released by an expiry timer',async()=>{
 const i=input();await save(i);await submit(i);const held=await transition(shop,customerGid,i.id,1,{type:'TIMEOUT',at:later});assert.equal(held.state,'UNKNOWN');
 await assert.rejects(transition(shop,customerGid,i.id,2,{type:'RELEASE_UNSUBMITTED',at:'2026-10-22T00:00:00Z'}),/cannot be released/);assert.deepEqual(await read(shop,customerGid,i.id),held);
});
test('duplicate receipt persists one simulated outcome without any financial ledger write',async()=>{
 const i=input();await save(i);const sent=await submit(i),proof=receipt(sent);const settled=await transition(shop,customerGid,i.id,1,{type:'CONFIRMED',at:later,receipt:proof});
 assert.equal(settled.state,'SETTLED');assert.deepEqual(await transition(shop,customerGid,i.id,2,{type:'CONFIRMED',at:later,receipt:proof}),settled);
 assert.deepEqual(await save(i),settled); // A repeated preparation cannot reopen a finished attempt.
 await assert.rejects(transition(shop,customerGid,i.id,2,{type:'CONFIRMED',at:later,receipt:{...proof,id:'other'}}),/Terminal/);
 assert.equal(await db.walletEntry.count({where:{shop}}),0);assert.equal(await db.walletReservation.count({where:{shop}}),0);
 const wallet=await db.customerWallet.findUnique({where:{shop_customerGid_currency:{shop,customerGid,currency:'SGD'}}});assert.equal(wallet.fundedBalance,10000);assert.equal(wallet.fundedReserved,0);assert.equal(wallet.bonusReserved,0);
});
test('corrupted JSON, columns or stored outcomes are held instead of reconstructed',async()=>{
 for(const change of [r=>r.payload='not-json',r=>r.state='SETTLED',r=>r.currency='USD',r=>{const p=JSON.parse(r.payload);p.state='SETTLED';r.state='SETTLED';r.payload=JSON.stringify(p);},r=>{const p=JSON.parse(r.payload);p.allocations[0].amountMinor=1;r.payload=JSON.stringify(p);}]){
  const i=input();await save(i);const r=await db.coreWalletRedemptionDraft.findUnique({where:{shop_attemptId:{shop,attemptId:i.id}}});change(r);await db.coreWalletRedemptionDraft.update({where:{id:r.id},data:{payload:r.payload,state:r.state,currency:r.currency}});await assert.rejects(read(shop,customerGid,i.id));
 }
});
test('draft rows are included in customer privacy inventory without exposing their contents',async()=>{
 const report=await inspectCustomerPrivacyData(shop,'1');assert.ok(report.counts.coreWalletRedemptionDraft>0);assert.equal(report.executionReady,false);assert.equal(JSON.stringify(report).includes('provider-fixture-receipt'),false);
});
