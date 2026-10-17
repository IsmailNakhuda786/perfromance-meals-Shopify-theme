import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-core-expiry.server.ts','app/services/wallet-ledger.server.ts','app/services/native-wallet-credit-ready.server.ts','app/services/wallet-expiry.server.ts','app/services/wallet-expiry-batch.server.ts','app/services/wallet-reminder-batch.server.ts'],outdir:'.shopify/core-expiry-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {registerCoreManagedWalletCredit,expireCoreManagedWalletCredit,nativeCoreExpiryGateway,syncCoreManagedWalletCredits}=await import('../.shopify/core-expiry-test/wallet-core-expiry.server.js');
const {readWalletLedger}=await import('../.shopify/core-expiry-test/wallet-ledger.server.js');
const {assertNativeWalletCreditReady,hasPendingNativeWalletCredit}=await import('../.shopify/core-expiry-test/native-wallet-credit-ready.server.js');
const {prepareWalletExpiryReminder}=await import('../.shopify/core-expiry-test/wallet-expiry.server.js');
const {runCoreWalletExpiryBatch}=await import('../.shopify/core-expiry-test/wallet-expiry-batch.server.js');
const {runWalletReminderBatch}=await import('../.shopify/core-expiry-test/wallet-reminder-batch.server.js');
const db=new PrismaClient(),shop=`core-expiry-${randomUUID()}.myshopify.com`;
process.env.ALLOWED_SHOP=shop;process.env.WALLET_CORE_EXPIRY_ENABLED='true';process.env.WALLET_CORE_EXPIRY_STARTS_AT='2026-10-15T00:00:00Z';
let sequence=0;
const due=new Date('2027-10-15T16:00:00Z');
async function seed(){
 const n=++sequence,customer=`gid://shopify/Customer/${9400+n}`,account='gid://shopify/StoreCreditAccount/9399',creditGid=`gid://shopify/StoreCreditAccountCreditTransaction/${9500+n}`;
 const entry=await db.walletEntry.create({data:{shop,customerGid:customer,currency:'SGD',sourceEvent:'core-expiry-'+n,sourceKind:'gift_card_funded',sourceGid:`gid://shopify/GiftCard/${9700+n}`,nativeTransactionGid:creditGid,fundedDelta:2500,bonusDelta:0,createdAt:new Date('2026-10-15T08:00:01Z')}});
 await db.giftCardWalletClaim.create({data:{shop,customerGid:customer,giftCardGid:entry.sourceGid,currency:'SGD',amountMinor:2500,giftCardExpiresOn:'2027-10-15',state:'COMPLETED',debitGid:`gid://shopify/GiftCardDebitTransaction/${9700+n}`,creditGid,ledgerEntryId:entry.id}});
 await db.customerWallet.create({data:{shop,customerGid:customer,currency:'SGD',fundedBalance:2500}});
 const credit={id:creditGid,createdAt:'2026-10-15T08:00:00Z',expiresAt:null,amount:{amount:'25.00',currencyCode:'SGD'},remainingAmount:{amount:'5.00',currencyCode:'SGD'},account:{id:account,owner:{id:customer}}};
 const admin={graphql:async()=>Response.json({data:{shop:{myshopifyDomain:shop,currencyCode:'SGD'},node:credit}})};
 const proof={credit,amountMinor:2500,remainingMinor:500,issuedAt:new Date(credit.createdAt),expiresAt:null};
 const calls={ready:0,debit:0};
 const gateway={assertWalletReady:async()=>{calls.ready++;},readCredit:async()=>proof,debit:async(owner,id,amount)=>{calls.debit++;return {id:`gid://shopify/StoreCreditAccountDebitTransaction/${9600+n}`,ownerGid:owner,accountGid:id,amountMinor:amount,currency:'SGD'};}};
 return {entry,customer,account,credit,proof,admin,gateway,calls};
}
const register=async(f)=>registerCoreManagedWalletCredit(f.admin,shop,f.customer,f.entry.id);
test.after(async()=>{for(const table of ['giftCardWalletClaim','walletCreditExpiry','walletEntry','customerWallet'])await db[table].deleteMany({where:{shop}});await db.$disconnect();});

test('new verified credits get independent one-year Core terms; historical or native-expiring credits are held',async()=>{
 const f=await seed(),record=await register(f);
 assert.equal(record.enforcementMode,'CORE_MANAGED');assert.equal(record.remainingMinor,2500,'Core lot, not native physical credit remainder');
 assert.equal(record.expiresAt.toISOString(),'2027-10-15T15:59:59.999Z');assert.equal(record.reminderAt.toISOString(),'2027-09-14T16:00:00.000Z');
 assert.equal((await register(f)).id,record.id);
 const old=await seed();old.credit.createdAt='2026-10-14T08:00:00Z';
 await assert.rejects(register(old),/Historical/);
 const native=await seed();native.credit.expiresAt='2027-10-15T15:59:59Z';
 await assert.rejects(register(native),/source differs/);
 assert.equal(await db.walletCreditExpiry.count({where:{shop}}),1);
});

test('Gift Card registration retains an earlier original expiry and holds missing historical evidence',async()=>{
 const f=await seed();
 await db.giftCardWalletClaim.updateMany({where:{shop,ledgerEntryId:f.entry.id},data:{giftCardExpiresOn:'2027-02-28'}});
 const record=await register(f);
 assert.equal(record.expiresAt.toISOString(),'2027-02-28T15:59:59.999Z');
 assert.equal(record.reminderAt.toISOString(),'2027-01-27T16:00:00.000Z');
 const held=await seed();await db.giftCardWalletClaim.updateMany({where:{shop,ledgerEntryId:held.entry.id},data:{giftCardExpiresOn:null}});
 await assert.rejects(register(held),/original expiry requires reconciliation/);
 assert.equal(held.calls.debit,0);
 const expired=await expireCoreManagedWalletCredit(shop,f.customer,record.id,f.gateway,new Date('2027-02-28T16:00:00Z'));
 assert.equal(expired.expiredMinor,2500);assert.equal(f.calls.debit,1);
 await expireCoreManagedWalletCredit(shop,f.customer,record.id,f.gateway,due);assert.equal(f.calls.debit,1);
});

test('expiry removes only unspent source value once and preserves correct source attribution',async()=>{
 const f=await seed(),record=await register(f);
 await db.walletEntry.create({data:{shop,customerGid:f.customer,currency:'SGD',createdAt:new Date('2026-10-15T09:00:00Z'),sourceEvent:'partial-spend',sourceKind:'gift_card_funded',fundedDelta:-1000,bonusDelta:0,fundedAllocations:JSON.stringify([{creditEntryId:f.entry.id,sourceKind:'gift_card_funded',amountMinor:1000}])}});
 await db.customerWallet.updateMany({where:{shop,customerGid:f.customer},data:{fundedBalance:1500}});
 const expired=await expireCoreManagedWalletCredit(shop,f.customer,record.id,f.gateway,due);
 assert.equal(expired.expiryState,'COMPLETED');assert.equal(expired.expiredMinor,1500);assert.equal(f.calls.debit,1);
 const wallet=await db.customerWallet.findFirst({where:{shop,customerGid:f.customer}});
 assert.equal(wallet.fundedBalance,0);assert.equal(wallet.fundedReserved,0);
 const ledger=await readWalletLedger(shop,f.customer,'SGD');
 assert.equal(ledger.balanceMatchesLedger,true);assert.equal(ledger.attributionComplete,true);
 assert.equal(ledger.sources.find(s=>s.sourceKind==='gift_card_funded').fundedDelta,0);
 assert.ok(ledger.history.some(e=>e.sourceKind==='funded_expiry'&&e.fundedDelta===-1500));
 await expireCoreManagedWalletCredit(shop,f.customer,record.id,f.gateway,due);assert.equal(f.calls.debit,1);
});

test('lost native response is held with reserved value and cannot issue a second debit',async()=>{
 const f=await seed(),record=await register(f);f.gateway.debit=async()=>{f.calls.debit++;throw Error('Lost response');};
 await assert.rejects(expireCoreManagedWalletCredit(shop,f.customer,record.id,f.gateway,due),/no financial retry/);
 assert.equal((await db.walletCreditExpiry.findUnique({where:{id:record.id}})).expiryState,'UNKNOWN');
 assert.equal((await db.customerWallet.findFirst({where:{shop,customerGid:f.customer}})).fundedBalance,2500);
 await assert.rejects(expireCoreManagedWalletCredit(shop,f.customer,record.id,f.gateway,due),/no financial retry/);assert.equal(f.calls.debit,1);
 let reads=0;
 await assert.rejects(assertNativeWalletCreditReady({graphql:async()=>{reads++;throw Error('Unexpected read');}},shop,f.customer),/before new credit/);
 assert.equal(reads,0);
});

test('bookkeeping failure retains native debit receipt and recovers without another financial call',async()=>{
 const f=await seed(),record=await register(f),original=f.gateway.debit;
 f.gateway.debit=async(...args)=>{const receipt=await original(...args);await db.customerWallet.updateMany({where:{shop,customerGid:f.customer},data:{fundedBalance:2499}});return receipt;};
 await assert.rejects(expireCoreManagedWalletCredit(shop,f.customer,record.id,f.gateway,due),/ledger requires reconciliation/);
 assert.equal((await db.walletCreditExpiry.findUnique({where:{id:record.id}})).expiryState,'AWAITING_LEDGER');
 await db.customerWallet.updateMany({where:{shop,customerGid:f.customer},data:{fundedBalance:2500}});
 const fixed=await expireCoreManagedWalletCredit(shop,f.customer,record.id,f.gateway,due);
 assert.equal(fixed.expiryState,'COMPLETED');assert.equal(f.calls.debit,1);
});

test('not-yet-due, reserved, foreign and fully spent credits do not debit',async()=>{
 const f=await seed(),record=await register(f);
 await assert.rejects(expireCoreManagedWalletCredit(shop,f.customer,record.id,f.gateway,new Date('2027-10-15T15:59:59Z')),/not expired/);
 await assert.rejects(expireCoreManagedWalletCredit('foreign.myshopify.com',f.customer,record.id,f.gateway,due));
 await db.customerWallet.updateMany({where:{shop,customerGid:f.customer},data:{fundedReserved:100}});
 await assert.rejects(expireCoreManagedWalletCredit(shop,f.customer,record.id,f.gateway,due),/reservation/);
 await db.customerWallet.updateMany({where:{shop,customerGid:f.customer},data:{fundedReserved:0,fundedBalance:0}});
 await db.walletEntry.create({data:{shop,customerGid:f.customer,currency:'SGD',createdAt:new Date('2026-10-15T09:00:00Z'),sourceEvent:'spent-all',sourceKind:'gift_card_funded',fundedDelta:-2500,bonusDelta:0,fundedAllocations:JSON.stringify([{creditEntryId:f.entry.id,sourceKind:'gift_card_funded',amountMinor:2500}])}});
 assert.equal((await expireCoreManagedWalletCredit(shop,f.customer,record.id,f.gateway,due)).expiredMinor,0);assert.equal(f.calls.debit,0);
});

test('concurrent expiry workers have at most one native debit',async()=>{
 const f=await seed(),record=await register(f);
 await Promise.allSettled([1,2].map(()=>expireCoreManagedWalletCredit(shop,f.customer,record.id,f.gateway,due)));
 assert.equal(f.calls.debit,1);assert.equal((await db.walletCreditExpiry.findUnique({where:{id:record.id}})).expiryState,'COMPLETED');
 assert.equal(await db.walletEntry.count({where:{shop,customerGid:f.customer,sourceKind:'funded_expiry'}}),1);
});

test('new unregistered credits hold further financial issuance until receipt registration',async()=>{
 const f=await seed();
 assert.equal(await hasPendingNativeWalletCredit(shop,f.customer),true);
 let reads=0;
 await assert.rejects(assertNativeWalletCreditReady({graphql:async()=>{reads++;throw Error('No native issuance read');}},shop,f.customer),/before new credit/);
 assert.equal(reads,0);
 await register(f);
 assert.equal(await hasPendingNativeWalletCredit(shop,f.customer),false);
});

test('registration reconciliation is customer-scoped, repeatable and creates no debit or email',async()=>{
 const f=await seed();
 const first=await syncCoreManagedWalletCredits(f.admin,shop,f.customer);
 assert.deepEqual(first,{state:'VERIFIED',registered:1});
 assert.deepEqual(await syncCoreManagedWalletCredits({graphql:async()=>{throw Error('Verified immutable registration must not repeat');}},shop,f.customer),{state:'VERIFIED',registered:0});
 assert.equal(await db.walletCreditExpiry.count({where:{shop,customerGid:f.customer}}),1);
 assert.equal(f.calls.debit,0);
 assert.equal(await db.walletCreditExpiry.count({where:{shop,customerGid:f.customer,reminderState:'SENT'}}),0);
 const old=await seed();await db.walletEntry.update({where:{id:old.entry.id},data:{createdAt:new Date('2026-10-14T00:00:00Z')}});
 assert.deepEqual(await syncCoreManagedWalletCredits({graphql:async()=>{throw Error('Historical read not expected');}},shop,old.customer),{state:'VERIFIED',registered:0});
 await assert.rejects(syncCoreManagedWalletCredits(f.admin,'foreign.myshopify.com',f.customer));
});

test('registration continues beyond one page without rereading settled registrations',async()=>{
 const f=await seed();
 await db.walletEntry.createMany({data:Array.from({length:100},(_,index)=>({shop,customerGid:f.customer,currency:'SGD',sourceEvent:'registry-page-'+index,sourceKind:'customer_funded',fundedDelta:2500,bonusDelta:0,nativeTransactionGid:`gid://shopify/StoreCreditAccountCreditTransaction/${20000+index}`,createdAt:new Date('2026-10-15T08:00:02Z')}))});
 await db.customerWallet.updateMany({where:{shop,customerGid:f.customer},data:{fundedBalance:252500}});
 let reads=0;
 const admin={graphql:async(query,{variables})=>{reads++;return Response.json({data:{shop:{myshopifyDomain:shop,currencyCode:'SGD'},node:{...f.credit,id:variables.id}}});}};
 assert.deepEqual(await syncCoreManagedWalletCredits(admin,shop,f.customer),{state:'PENDING',registered:100});
 assert.equal(await hasPendingNativeWalletCredit(shop,f.customer),true);
 assert.deepEqual(await syncCoreManagedWalletCredits(admin,shop,f.customer),{state:'VERIFIED',registered:1});
 assert.equal(await hasPendingNativeWalletCredit(shop,f.customer),false);
 assert.equal(reads,101);assert.equal(f.calls.debit,0);
});

test('Core reminders use source lots instead of native physical remainder and hold drift',async()=>{
 const f=await seed(),record=await register(f);
 process.env.WALLET_EXPIRY_REMINDERS_ENABLED='true';
 const admin={graphql:async(query)=>query.includes('WalletCreditExpiryEvidence')?f.admin.graphql():Response.json({data:{shop:{myshopifyDomain:shop,currencyCode:'SGD'},customer:{id:f.customer,storeCreditAccounts:{nodes:[{balance:{amount:'25.00',currencyCode:'SGD'}}],pageInfo:{hasNextPage:false}}}}})};
 await db.customerWallet.updateMany({where:{shop,customerGid:f.customer},data:{fundedReserved:1}});
 await assert.rejects(prepareWalletExpiryReminder(admin,shop,f.customer,record.id,new Date('2027-09-15T00:00:00Z')),/reconciliation/);
 await db.customerWallet.updateMany({where:{shop,customerGid:f.customer},data:{fundedReserved:0}});
 const claim=await prepareWalletExpiryReminder(admin,shop,f.customer,record.id,new Date('2027-09-15T00:00:00Z'));
 assert.equal(claim.state,'DELIVERING');assert.equal(claim.remainingMinor,2500);
 assert.equal(f.calls.debit,0);
});

test('bounded batch completes due work and excludes unknown outcomes from later attempts',async()=>{
 const f=await seed(),record=await register(f);
 const held=await seed(),heldRecord=await register(held);
 await db.walletCreditExpiry.update({where:{id:heldRecord.id},data:{expiryState:'UNKNOWN'}});
 // Limit this batch to these fixtures; prior completed and held tests stay intact.
 await db.walletCreditExpiry.updateMany({where:{shop,expiryState:'PENDING',id:{notIn:[record.id,heldRecord.id]}},data:{expiresAt:new Date('2028-01-01T00:00:00Z')}});
 const factories=[];
 const result=await runCoreWalletExpiryBatch(shop,customer=>{factories.push(customer);assert.equal(customer,f.customer);return f.gateway;},{now:due,limit:1});
 assert.equal(result.processed,1);assert.equal(result.results[0].state,'COMPLETED');assert.deepEqual(factories,[f.customer]);assert.equal(f.calls.debit,1);
 assert.equal((await runCoreWalletExpiryBatch(shop,()=>{throw Error('No further native attempt');},{now:due,limit:1})).processed,0);
 assert.equal((await db.walletCreditExpiry.findUnique({where:{id:heldRecord.id}})).expiryState,'UNKNOWN');
 for(const limit of [0,101,1.5])await assert.rejects(runCoreWalletExpiryBatch(shop,()=>f.gateway,{now:due,limit}),/bounds/);
});

test('batch continuation reaches later credits after the cursor record completes',async()=>{
 const first=await seed(),second=await seed();await register(first);await register(second);
 const gateways=new Map([[first.customer,first.gateway],[second.customer,second.gateway]]);
 const page=await runCoreWalletExpiryBatch(shop,customer=>gateways.get(customer),{now:due,limit:1});
 assert.equal(page.hasMore,true);assert.ok(page.nextCursor);assert.equal(page.results[0].state,'COMPLETED');
 const next=await runCoreWalletExpiryBatch(shop,customer=>gateways.get(customer),{now:due,limit:1,after:page.nextCursor});
 assert.equal(next.hasMore,false);assert.equal(next.processed,1);assert.equal(next.results[0].state,'COMPLETED');
 assert.equal(first.calls.debit,1);assert.equal(second.calls.debit,1);
 await assert.rejects(runCoreWalletExpiryBatch(shop,()=>first.gateway,{now:due,after:'foreign-cursor'}),/cursor/);
});

test('native debit adapter checks exact account, negative amount and SG currency; activation is default off',async()=>{
 const f=await seed();let calls=0;
 const gateway=nativeCoreExpiryGateway({graphql:async(query,{variables})=>{calls++;assert.match(query,/mutation CoreWalletExpiryDebit/);assert.equal(variables.id,f.account);assert.deepEqual(variables.debitInput,{debitAmount:{amount:'1.25',currencyCode:'SGD'}});return Response.json({data:{storeCreditAccountDebit:{userErrors:[],storeCreditAccountTransaction:{id:'gid://shopify/StoreCreditAccountDebitTransaction/9999',amount:{amount:'-1.25',currencyCode:'SGD'},account:{id:f.account,owner:{id:f.customer}}}}}});}},shop);
 assert.equal((await gateway.debit(f.customer,f.account,125)).amountMinor,125);assert.equal(calls,1);
 delete process.env.WALLET_CORE_EXPIRY_ENABLED;
 assert.deepEqual(await syncCoreManagedWalletCredits({graphql:async()=>{throw Error('Must not read while disabled');}},shop,f.customer),{state:'DISABLED',registered:0});
 await assert.rejects(register(f),/not activated/);
 await assert.rejects(gateway.debit(f.customer,f.account,125),/not activated/);assert.equal(calls,1);
});


test('reminder batch holds uncertain sends and never retries a delivered or unknown notice',async()=>{
 process.env.WALLET_EXPIRY_REMINDERS_ENABLED='true';process.env.WALLET_CORE_EXPIRY_ENABLED='true';process.env.WALLET_CORE_EXPIRY_STARTS_AT='2026-10-15T00:00:00Z';
 const f=await seed(),record=await register(f);
 // Fresh native account proof for the exact source lot.
 const admin={graphql:async(query)=>query.includes('WalletCreditExpiryEvidence')?f.admin.graphql():Response.json({data:{shop:{myshopifyDomain:shop,currencyCode:'SGD'},customer:{id:f.customer,storeCreditAccounts:{nodes:[{id:f.account,balance:{amount:'25.00',currencyCode:'SGD'}}],pageInfo:{hasNextPage:false}}}}})};
 let sends=0;
 const gateway={adminFor:()=>admin,send:async delivery=>{sends++;assert.equal(delivery.customerGid,f.customer);assert.equal(delivery.remainingMinor,2500);assert.ok(delivery.idempotencyKey);throw Error('Provider response lost');}};
 const now=new Date(record.reminderAt.getTime()+1);
 const drain=async g=>{let after;for(let page=0;page<10;page++){const result=await runWalletReminderBatch(shop,g,{now,limit:100,...(after?{after}:{})});if(!result.hasMore)return;after=result.nextCursor;}throw Error('Reminder test pagination did not terminate');};
 await drain(gateway);
 assert.equal((await db.walletCreditExpiry.findUnique({where:{id:record.id}})).reminderState,'UNKNOWN');
 assert.equal(sends,1);
 await drain(gateway);assert.equal(sends,1);
 const successful=await seed(),successfulRecord=await register(successful);
 const successfulAdmin={graphql:async(query)=>query.includes('WalletCreditExpiryEvidence')?successful.admin.graphql():Response.json({data:{shop:{myshopifyDomain:shop,currencyCode:'SGD'},customer:{id:successful.customer,storeCreditAccounts:{nodes:[{id:successful.account,balance:{amount:'25.00',currencyCode:'SGD'}}],pageInfo:{hasNextPage:false}}}}})};
 let confirmedSends=0;
 const confirmedGateway={adminFor:()=>successfulAdmin,send:async()=>{confirmedSends++;return {reference:'test-provider-receipt'};}};
 await drain(confirmedGateway);
 assert.equal((await db.walletCreditExpiry.findUnique({where:{id:successfulRecord.id}})).reminderState,'SENT');
 await drain(confirmedGateway);assert.equal(confirmedSends,1);
 await assert.rejects(runWalletReminderBatch(shop,confirmedGateway,{limit:101}),/bounds/);
 await assert.rejects(runWalletReminderBatch(shop,confirmedGateway,{after:'foreign-cursor'}),/cursor/);
 process.env.WALLET_EXPIRY_REMINDERS_ENABLED='false';
 await assert.rejects(runWalletReminderBatch(shop,gateway),/not activated/);
});
