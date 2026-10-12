import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/gift-card-claim.server.ts','app/services/gift-card-native.server.ts'],outdir:'.shopify/gift-card-claim-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {claimGiftCard}=await import('../.shopify/gift-card-claim-test/gift-card-claim.server.js');
const {minorAmount,nativeGiftCardGateway}=await import('../.shopify/gift-card-claim-test/gift-card-native.server.js');
const db=new PrismaClient(),shop=`gift-${randomUUID()}.myshopify.com`,customerGid='gid://shopify/Customer/301',code='internalfixture1';
process.env.ALLOWED_SHOP=shop;
const card=id=>({id:`gid://shopify/GiftCard/${id}`,recipientGid:customerGid,enabled:true,expiresOn:null,amountMinor:1000,currency:'SGD'});
const gateway=(source)=>({resolve:async()=>source,debit:async(id,value)=>({id:`gid://shopify/GiftCardDebitTransaction/${id.split('/').pop()}`,ownerGid:id,amountMinor:value,currency:'SGD'}),credit:async(owner,value)=>({id:`gid://shopify/StoreCreditAccountCreditTransaction/${source.id.split('/').pop()}`,ownerGid:owner,amountMinor:value,currency:'SGD'})});
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
