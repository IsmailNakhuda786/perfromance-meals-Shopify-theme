import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-expiry.server.ts'],outdir:'.shopify/expiry-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {registerWalletCreditExpiry,prepareWalletExpiryReminder,finishWalletExpiryReminder,nativeExpiryReminderAt}=await import('../.shopify/expiry-test/wallet-expiry.server.js');
const db=new PrismaClient(),shop=`expiry-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/930';
process.env.ALLOWED_SHOP=shop;
process.env.WALLET_EXPIRY_REMINDERS_ENABLED='true';
let sequence=0;
const money=amount=>({amount,currencyCode:'SGD'});
const native=(creditId)=>({id:creditId,createdAt:'2026-10-15T08:00:00.000Z',expiresAt:'2027-10-15T15:59:59.999Z',amount:money('25.00'),remainingAmount:money('12.50'),account:{id:'gid://shopify/StoreCreditAccount/931',owner:{id:customer}}});
const admin=(credit,edit=()=>{})=>({graphql:async(query)=>{
 assert.match(query,/query WalletCreditExpiryEvidence/);assert.doesNotMatch(query,/mutation/);
 const data={shop:{myshopifyDomain:shop,currencyCode:'SGD'},node:structuredClone(credit)};edit(data);return Response.json({data});
}});
async function settled(sourceKind='gift_card_funded'){
 const n=++sequence,id=`gid://shopify/StoreCreditAccountCreditTransaction/${1000+n}`;
 const entry=await db.walletEntry.create({data:{shop,customerGid:customer,currency:'SGD',sourceEvent:'fixture-expiry-'+n,sourceKind,fundedDelta:2500,bonusDelta:0,nativeTransactionGid:id}});
 return {entry,credit:native(id)};
}
test.after(async()=>{await db.walletCreditExpiry.deleteMany({where:{shop}});await db.walletEntry.deleteMany({where:{shop}});await db.$disconnect();});

test('expiry metadata requires native ownership and exact settled credit; does not alter Wallet ledger',async()=>{
 const {entry,credit}=await settled();
 const record=await registerWalletCreditExpiry(admin(credit),shop,customer,entry.id);
 assert.equal(record.amountMinor,2500);assert.equal(record.remainingMinor,1250);
 assert.equal(record.reminderAt.toISOString(),'2027-09-14T16:00:00.000Z');
 assert.equal(record.expiresAt.toISOString(),credit.expiresAt);
 assert.equal((await registerWalletCreditExpiry(admin(credit),shop,customer,entry.id)).id,record.id);
 assert.equal(await db.walletCreditExpiry.count({where:{shop,walletEntryId:entry.id}}),1);
 assert.equal((await db.walletEntry.findUnique({where:{id:entry.id}})).fundedDelta,2500);
 assert.equal(await db.customerWallet.count({where:{shop}}),0);
 for(const edit of [d=>d.node.account.owner.id='gid://shopify/Customer/999',d=>d.shop.myshopifyDomain='foreign.myshopify.com',d=>d.node.remainingAmount=money('25.01'),d=>d.node.amount=money('24.99'),d=>d.node.amount.currencyCode='USD',d=>d.node.expiresAt='2026-10-01T00:00:00Z',d=>d.node.expiresAt='2027-02-30T00:00:00Z']){
  await assert.rejects(registerWalletCreditExpiry(admin(credit,edit),shop,customer,entry.id));
 }
 await assert.rejects(registerWalletCreditExpiry(admin(credit),'foreign.myshopify.com',customer,entry.id));
 assert.equal(await db.walletCreditExpiry.count({where:{shop,walletEntryId:entry.id}}),1);
});

test('no native expiry is not replaced with an invented date; native date change is held',async()=>{
 const {entry,credit}=await settled('customer_funded');
 assert.deepEqual(await registerWalletCreditExpiry(admin({...credit,expiresAt:null}),shop,customer,entry.id),{state:'NO_NATIVE_EXPIRY'});
 assert.equal(await db.walletCreditExpiry.count({where:{shop,walletEntryId:entry.id}}),0);
 await registerWalletCreditExpiry(admin(credit),shop,customer,entry.id);
 await assert.rejects(registerWalletCreditExpiry(admin({...credit,expiresAt:'2027-10-16T15:59:59.999Z'}),shop,customer,entry.id),/changed/);
});

test('reminder claim is due-only, fresh, single-use and cannot retry unknown delivery',async()=>{
 const {entry,credit}=await settled('reward_funded');
 const record=await registerWalletCreditExpiry(admin(credit),shop,customer,entry.id);
 let reads=0;
 const counted={graphql:async(...args)=>{reads++;return admin(credit).graphql(...args);}};
 assert.deepEqual(await prepareWalletExpiryReminder(counted,shop,customer,record.id,new Date('2027-09-14T15:59:59Z')),{state:'NOT_DUE'});
 assert.equal(reads,0);
 const claim=await prepareWalletExpiryReminder(counted,shop,customer,record.id,new Date('2027-09-14T16:00:00Z'));
 assert.equal(claim.state,'DELIVERING');assert.equal(claim.remainingMinor,1250);assert.ok(claim.deliveryKey);
 assert.deepEqual(await prepareWalletExpiryReminder(counted,shop,customer,record.id,new Date('2027-09-15T00:00:00Z')),{state:'DELIVERING'});
 assert.equal(reads,1);
 await assert.rejects(finishWalletExpiryReminder(shop,customer,record.id,'wrong-key',{reference:'fixture-mail-1'}));
 await finishWalletExpiryReminder(shop,customer,record.id,claim.deliveryKey,{unknown:true});
 assert.deepEqual(await prepareWalletExpiryReminder(counted,shop,customer,record.id,new Date('2027-09-15T00:00:00Z')),{state:'UNKNOWN'});
 await assert.rejects(finishWalletExpiryReminder(shop,customer,record.id,claim.deliveryKey,{reference:'fixture-mail-1'}),/held/);
 assert.equal((await db.walletEntry.findUnique({where:{id:entry.id}})).fundedDelta,2500);
});

test('spent or expired credit suppresses notification; successful completion is idempotent',async()=>{
 for(const [remaining,now,state] of [['0.00','2027-09-15T00:00:00Z','SPENT'],['12.50','2027-10-15T16:00:00Z','EXPIRED'],['12.50','2027-09-15T00:00:00Z','DELIVERING']]){
  const {entry,credit}=await settled();credit.remainingAmount=money(remaining);
  const record=await registerWalletCreditExpiry(admin(credit),shop,customer,entry.id);
  const claim=await prepareWalletExpiryReminder(admin(credit),shop,customer,record.id,new Date(now));
  assert.equal(claim.state,state);
  if(state==='DELIVERING'){
   const sent=await finishWalletExpiryReminder(shop,customer,record.id,claim.deliveryKey,{reference:'fixture-provider-'+entry.id});
   assert.equal(sent.reminderState,'SENT');assert.ok(sent.notifiedAt);
   assert.equal((await finishWalletExpiryReminder(shop,customer,record.id,claim.deliveryKey,{reference:'fixture-provider-'+entry.id})).id,record.id);
  }else assert.equal(claim.deliveryKey,undefined);
 }
});

test('reminder month clamps to valid calendar date in Singapore and activation stays default off',async()=>{
 assert.equal(nativeExpiryReminderAt('2028-03-31T15:59:59.999Z').toISOString(),'2028-02-28T16:00:00.000Z');
 assert.equal(nativeExpiryReminderAt('2027-01-01T15:59:59.999Z').toISOString(),'2026-11-30T16:00:00.000Z');
 assert.throws(()=>nativeExpiryReminderAt('2027-02-30T00:00:00Z'));
 delete process.env.WALLET_EXPIRY_REMINDERS_ENABLED;
 await assert.rejects(prepareWalletExpiryReminder(admin(null),shop,customer,'unused'),/not activated/);
});

test('two reminder workers cannot claim the same delivery and stale proof cannot send',async()=>{
 process.env.WALLET_EXPIRY_REMINDERS_ENABLED='true';
 const {entry,credit}=await settled();
 const record=await registerWalletCreditExpiry(admin(credit),shop,customer,entry.id);
 await assert.rejects(prepareWalletExpiryReminder(admin(credit,d=>d.node.account.owner.id='gid://shopify/Customer/999'),shop,customer,record.id,new Date('2027-09-15T00:00:00Z')));
 assert.equal((await db.walletCreditExpiry.findUnique({where:{id:record.id}})).reminderState,'PENDING');
 const attempts=await Promise.allSettled([1,2].map(()=>prepareWalletExpiryReminder(admin(credit),shop,customer,record.id,new Date('2027-09-15T00:00:00Z'))));
 const keys=attempts.filter(r=>r.status==='fulfilled'&&r.value.deliveryKey).map(r=>r.value.deliveryKey);
 assert.equal(keys.length,1);
 assert.equal((await db.walletCreditExpiry.findUnique({where:{id:record.id}})).deliveryKey,keys[0]);
 assert.equal(await db.walletEntry.count({where:{shop,sourceEvent:{startsWith:'native-wallet'}}}),0);
});
