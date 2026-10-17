import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/gift-card-claim.server.ts','app/services/gift-card-native.server.ts'],outdir:'.shopify/gift-card-claim-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {claimGiftCard,assertClaimCardAvailable}=await import('../.shopify/gift-card-claim-test/gift-card-claim.server.js');
const {minorAmount,nativeGiftCardGateway}=await import('../.shopify/gift-card-claim-test/gift-card-native.server.js');
const db=new PrismaClient(),shop=`gift-${randomUUID()}.myshopify.com`,customerGid='gid://shopify/Customer/301',code='internalfixture1';
process.env.ALLOWED_SHOP=shop;
const card=id=>({id:`gid://shopify/GiftCard/${id}`,recipientGid:customerGid,enabled:true,expiresOn:'2099-11-01',amountMinor:1000,currency:'SGD'});
const gateway=(source)=>({assertWalletReady:async()=>{},resolve:async()=>source,debit:async(id,value)=>({id:`gid://shopify/GiftCardDebitTransaction/${id.split('/').pop()}`,ownerGid:id,amountMinor:value,currency:'SGD'}),credit:async(owner,value)=>({id:`gid://shopify/StoreCreditAccountCreditTransaction/${source.id.split('/').pop()}`,ownerGid:owner,amountMinor:value,currency:'SGD'})});
test.after(async()=>{await db.giftCardWalletClaim.deleteMany({where:{shop}});await db.walletEntry.deleteMany({where:{shop}});await db.customerWallet.deleteMany({where:{shop}});await db.commercePolicy.deleteMany({where:{shop}});await db.$disconnect();});

test('claim defaults closed, then credits only the recipient after both native receipts, once',async()=>{
 await assert.rejects(()=>claimGiftCard(shop,customerGid,code,gateway(card(1))),/not activated/);
 await db.commercePolicy.create({data:{shop,giftCardClaimsEnabled:true}}); // isolated fixture, never a dev-store policy
 const source=card(1),api=gateway(source);let debits=0,credits=0;
 const wrapped={...api,debit:async(...args)=>{debits++;return api.debit(...args);},credit:async(...args)=>{credits++;return api.credit(...args);}};
 const first=await claimGiftCard(shop,customerGid,code,wrapped);
 source.amountMinor=0;
 const second=await claimGiftCard(shop,customerGid,code,wrapped);
 assert.equal(first.id,second.id);assert.equal(first.state,'COMPLETED');assert.equal(debits,1);assert.equal(credits,1);
 assert.equal(first.giftCardExpiresOn,'2099-11-01');assert.equal(first.alreadyCompleted,false);assert.equal(second.alreadyCompleted,true);
 const entry=await db.walletEntry.findUnique({where:{id:first.ledgerEntryId}});
 assert.equal(entry.sourceKind,'gift_card_funded');assert.equal(entry.fundedDelta,1000);assert.equal(entry.bonusDelta,0);
 assert.equal(JSON.stringify(first).includes(code),false);
});

test('purchaser/other account, missing recipient, disabled or empty cards cannot receive Wallet value',async()=>{
 for(const source of [{...card(2),recipientGid:'gid://shopify/Customer/999'},{...card(3),recipientGid:null},{...card(4),enabled:false},{...card(5),amountMinor:0}])await assert.rejects(()=>claimGiftCard(shop,customerGid,code,gateway(source)));
 assert.equal(await db.giftCardWalletClaim.count({where:{shop}}),1);
});

test('ambiguous debit/credit failures stop retries and cannot produce a ledger credit',async()=>{
 for(const [id,phase]of [[6,'debit'],[7,'credit']]){
  const api=gateway(card(id));let calls=0;
  api[phase]=async()=>{calls++;throw new Error('simulated lost response');};
  await assert.rejects(()=>claimGiftCard(shop,customerGid,code,api),/reconciliation/);
  await assert.rejects(()=>claimGiftCard(shop,customerGid,code,api),/reconciliation/);
  assert.equal(calls,1);
  const claim=await db.giftCardWalletClaim.findUnique({where:{shop_giftCardGid:{shop,giftCardGid:card(id).id}}});
  assert.equal(claim.state,'RECONCILIATION_REQUIRED');assert.equal(claim.ledgerEntryId,null);
 }
 assert.equal(await db.walletEntry.count({where:{shop}}),1);
});

test('native adapter parses exact cents and normalizes Shopify negative debit receipts',async()=>{
 assert.equal(minorAmount('10.01'),1001);assert.throws(()=>minorAmount('10.001'));assert.throws(()=>minorAmount('-10'));
 const admin={graphql:async(_query,{variables})=>{assert.equal(variables.debitInput.debitAmount.amount,'10.01');return Response.json({data:{giftCardDebit:{giftCardDebitTransaction:{id:'gid://shopify/GiftCardDebitTransaction/8',giftCard:{id:card(8).id},amount:{amount:'-10.01',currencyCode:'SGD'}},userErrors:[]}}});}};
 const result=await nativeGiftCardGateway(admin,shop).debit(card(8).id,1001,'fixture');
 assert.equal(result.amountMinor,1001);
});

test('unreconciled Wallet cannot debit a Gift Card or create a new claim',async()=>{
 const api=gateway(card(20));let financialCalls=0;api.assertWalletReady=async()=>{throw Error('Wallet requires reconciliation before new credit');};api.debit=async()=>{financialCalls++;throw Error('Must not debit');};api.credit=async()=>{financialCalls++;throw Error('Must not credit');};
 const before=await db.giftCardWalletClaim.count({where:{shop}});
 await assert.rejects(claimGiftCard(shop,customerGid,code,api),/before new credit/);assert.equal(financialCalls,0);assert.equal(await db.giftCardWalletClaim.count({where:{shop}}),before);
});

test('invalid expiry or availability evidence never creates a claim or moves money',async()=>{
 const before=await db.giftCardWalletClaim.count({where:{shop}});let calls=0;
 for(const [index,change]of [g=>g.expiresOn='',g=>g.expiresOn=undefined,g=>g.expiresOn='2027-02-30',g=>g.expiresOn='not-a-date',g=>g.enabled='true'].entries()){
  const source=card(100+index);change(source);const api=gateway(source);
  api.debit=async()=>{calls++;throw Error('Must not debit');};api.credit=async()=>{calls++;throw Error('Must not credit');};
  await assert.rejects(claimGiftCard(shop,customerGid,code,api));
 }
 assert.equal(calls,0);assert.equal(await db.giftCardWalletClaim.count({where:{shop}}),before);
});

test('Gift Card expiry uses Singapore midnight and accepts a real leap day only',()=>{
 const source={...card(110),expiresOn:'2028-02-29'};
 assert.doesNotThrow(()=>assertClaimCardAvailable(source,new Date('2028-02-29T15:59:59Z')));
 assert.throws(()=>assertClaimCardAvailable(source,new Date('2028-02-29T16:00:00Z')),/unavailable/);
 assert.throws(()=>assertClaimCardAvailable({...source,expiresOn:'2027-02-29'},new Date('2027-02-28T00:00:00Z')),/invalid/);
 assert.throws(()=>assertClaimCardAvailable(source,new Date('invalid')),/unavailable/);
});

test('a partially spent card transfers its complete remaining value once',async()=>{
 const source={...card(120),amountMinor:235},api=gateway(source);let debited=0,credited=0;
 const result=await claimGiftCard(shop,customerGid,code,{...api,debit:async(id,value,reference)=>{debited+=value;return api.debit(id,value,reference);},credit:async(owner,value)=>{credited+=value;return api.credit(owner,value);}});
 assert.equal(result.state,'COMPLETED');assert.equal(debited,235);assert.equal(credited,235);
 const entry=await db.walletEntry.findUnique({where:{id:result.ledgerEntryId}});assert.equal(entry.fundedDelta,235);
});

test('concurrent recipient claims permit only one native debit and credit',async()=>{
 const source=card(121),api=gateway(source);let debits=0,credits=0;
 const wrapped={...api,debit:async(...args)=>{debits++;return api.debit(...args);},credit:async(...args)=>{credits++;return api.credit(...args);}};
 const attempts=await Promise.allSettled([claimGiftCard(shop,customerGid,code,wrapped),claimGiftCard(shop,customerGid,code,wrapped)]);
 assert.ok(attempts.some(result=>result.status==='fulfilled'&&result.value.state==='COMPLETED'));
 assert.equal(debits,1);assert.equal(credits,1);
 const claim=await db.giftCardWalletClaim.findUnique({where:{shop_giftCardGid:{shop,giftCardGid:source.id}}});
 assert.equal(await db.walletEntry.count({where:{shop,sourceEvent:'gift-card-claim:'+claim.id}}),1);
});

test('receipt-backed bookkeeping recovery never repeats the financial transfer',async()=>{
 const source=card(122),api=gateway(source);let financialCalls=0;
 const claim=await db.giftCardWalletClaim.create({data:{shop,giftCardGid:source.id,customerGid,currency:'SGD',giftCardExpiresOn:source.expiresOn,amountMinor:source.amountMinor,state:'AWAITING_LEDGER',debitGid:'gid://shopify/GiftCardDebitTransaction/122',creditGid:'gid://shopify/StoreCreditAccountCreditTransaction/122'}});
 api.debit=async()=>{financialCalls++;throw Error('Must not debit');};api.credit=async()=>{financialCalls++;throw Error('Must not credit');};
 source.amountMinor=0;
 const recovered=await claimGiftCard(shop,customerGid,code,api);assert.equal(recovered.state,'COMPLETED');
 await claimGiftCard(shop,customerGid,code,api);assert.equal(financialCalls,0);
 assert.equal(await db.walletEntry.count({where:{shop,sourceEvent:'gift-card-claim:'+claim.id}}),1);
});


test('new claims without original expiry and prepared claims with changed expiry never transfer',async()=>{
 const missing={...card(130),expiresOn:null},api=gateway(missing);let calls=0;
 api.debit=async()=>{calls++;throw Error('Must not debit');};
 await assert.rejects(claimGiftCard(shop,customerGid,code,api));
 assert.equal(await db.giftCardWalletClaim.count({where:{shop,giftCardGid:missing.id}}),0);
 const changed=card(131);
 await db.giftCardWalletClaim.create({data:{shop,giftCardGid:changed.id,customerGid,currency:'SGD',amountMinor:1000,giftCardExpiresOn:'2099-10-01'}});
 const changedApi={...gateway(changed),debit:api.debit};
 await assert.rejects(claimGiftCard(shop,customerGid,code,changedApi),/expiry changed/);
 assert.equal(calls,0);
});
test('historical completed claims replay without assigning a new expiry',async()=>{
 const source=card(132);
 const claim=await db.giftCardWalletClaim.create({data:{shop,giftCardGid:source.id,customerGid,currency:'SGD',amountMinor:1000,state:'COMPLETED'}});
 const result=await claimGiftCard(shop,customerGid,code,gateway(source));
 assert.equal(result.id,claim.id);assert.equal(result.alreadyCompleted,true);assert.equal(result.giftCardExpiresOn,null);
});
