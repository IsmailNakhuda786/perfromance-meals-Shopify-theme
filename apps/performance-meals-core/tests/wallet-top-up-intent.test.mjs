import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-top-up-intent.server.ts'],outdir:'.shopify/top-up-intent-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {createWalletTopUpCheckout,settleWalletTopUpCheckout}=await import('../.shopify/top-up-intent-test/wallet-top-up-intent.server.js');
const db=new PrismaClient(),shop=`intent-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/1301';
process.env.ALLOWED_SHOP=shop;process.env.WALLET_LEGACY_TOP_UP_QA_ENABLED='true';
const catalogue={productGid:'gid://shopify/Product/1302',variantGid:'gid://shopify/ProductVariant/1303'};
const admin={graphql:async()=>Response.json({data:{shop:{myshopifyDomain:shop},productVariant:{id:catalogue.variantGid,taxable:false,requiresComponents:false,inventoryItem:{requiresShipping:false},product:{id:catalogue.productGid,isGiftCard:false,requiresSellingPlan:false}}}})};
const receipt=id=>({id:`gid://shopify/DraftOrder/${id}`,customerGid:customer,...catalogue,currency:'SGD',amountMinor:2001,checkoutUrl:`https://${shop}/invoices/internal-${id}`,orderGid:null});
const request=(key,gateway,value='20.01')=>createWalletTopUpCheckout(admin,shop,customer,key,value,catalogue,gateway);
test.after(async()=>{await db.walletTopUpIntent.deleteMany({where:{shop}});await db.walletTopUpSettlement.deleteMany({where:{shop}});await db.walletEntry.deleteMany({where:{shop}});await db.customerWallet.deleteMany({where:{shop}});await db.commercePolicy.deleteMany({where:{shop}});await db.$disconnect();});

test('intents default closed; exact custom amount is immutable and duplicate checkout does not create another draft',async()=>{
 let creates=0,reference;
 const gateway={create:async input=>{creates++;assert.equal(input.lineItems[0].priceOverride.amount,'20.01');reference=input.customAttributes.find(attribute=>attribute.key==='_pm_wallet_top_up_intent').value;return receipt(1401);}};
 await assert.rejects(request('request-key-1401',gateway),/not activated/);
 await db.commercePolicy.create({data:{shop,walletTopUpsEnabled:true}}); // isolated fixture only
 const intent=await request('request-key-1401',gateway);
 assert.equal(intent.state,'DRAFT_READY');assert.equal(intent.amountMinor,2001);
 assert.equal(reference,intent.id); // Audit correlation only, never payment proof.
 assert.equal((await request('request-key-1401',gateway)).id,intent.id);assert.equal(creates,1);
 await assert.rejects(request('request-key-1401',gateway,'50'),/differs/);assert.equal(creates,1);
});

test('concurrent/lost draft responses never blindly create a second checkout',async()=>{
 let creates=0;
 const gateway={create:async()=>{creates++;await new Promise(resolve=>setTimeout(resolve,10));throw Error('Lost response');}};
 const results=await Promise.allSettled([request('request-key-1402',gateway),request('request-key-1402',gateway)]);
 assert.equal(results.every(result=>result.status==='rejected'),true);assert.equal(creates,1);
 await assert.rejects(request('request-key-1402',gateway),/reconciliation/);assert.equal(creates,1);
});

test('foreign customer, currency, amount, URL and already-paid draft receipts cannot establish a checkout',async()=>{
 let id=1500;
 for(const edit of [r=>r.customerGid='gid://shopify/Customer/999',r=>r.currency='USD',r=>r.amountMinor=5000,r=>r.checkoutUrl='https://foreign.example/checkout',r=>r.checkoutUrl=`http://${shop}/invoices/fixture`,r=>r.orderGid='gid://shopify/Order/999']){
  const current=++id,source=receipt(current);edit(source);
  await assert.rejects(request('request-key-'+current,{create:async()=>source}),/reconciliation/);
 }
});

const money=amount=>({shopMoney:{amount,currencyCode:'SGD'}});
const paidOrder=id=>({id:`gid://shopify/Order/${id}`,cancelledAt:null,disputes:[],displayFinancialStatus:'PAID',currencyCode:'SGD',customer:{id:customer},totalPriceSet:money('20.01'),totalReceivedSet:money('20.01'),totalRefundedSet:money('0'),totalDiscountsSet:money('0'),totalTaxSet:money('0'),totalShippingPriceSet:money('0'),lineItems:{pageInfo:{hasNextPage:false},nodes:[{quantity:1,requiresShipping:false,taxable:false,variant:{id:catalogue.variantGid},product:{id:catalogue.productGid,isGiftCard:false},originalTotalSet:money('20.01'),discountedTotalSet:money('20.01')}]},transactions:[{id:`gid://shopify/OrderTransaction/${id}`,status:'SUCCESS',kind:'SALE',gateway:'fixture_external',amountSet:money('20.01')}]});

test('fresh native draft-to-order binding and immutable custom amount settle exactly once',async()=>{
 const source=receipt(1601),intent=await request('request-key-1601',{create:async()=>source});
 const drafts={read:async id=>{assert.equal(id,source.id);return {...source,orderGid:'gid://shopify/Order/1601'};}};
 let credits=0;
 const payments={assertWalletReady:async()=>{},readOrder:async id=>{assert.equal(id,'gid://shopify/Order/1601');return paidOrder(1601);},credit:async(owner,amount)=>{credits++;assert.equal(amount,2001);return {id:'gid://shopify/StoreCreditAccountCreditTransaction/1601',ownerGid:owner,currency:'SGD',amountMinor:amount};}};
 const first=await settleWalletTopUpCheckout(shop,customer,intent.id,drafts,['fixture_external'],payments);
 const second=await settleWalletTopUpCheckout(shop,customer,intent.id,drafts,['fixture_external'],payments);
 assert.equal(first.id,second.id);assert.equal(first.state,'COMPLETED');assert.equal(credits,1);
 assert.equal((await db.walletTopUpIntent.findUnique({where:{id:intent.id}})).orderGid,'gid://shopify/Order/1601');
 assert.equal((await db.customerWallet.findUnique({where:{shop_customerGid_currency:{shop,customerGid:customer,currency:'SGD'}}})).fundedBalance,2001);
});

test('unpaid/foreign/changed draft, changed native total and Wallet funding cannot issue credit',async()=>{
 const source=receipt(1602),intent=await request('request-key-1602',{create:async()=>source});
 let credits=0;
 const payments={assertWalletReady:async()=>{},readOrder:async()=>paidOrder(1602),credit:async()=>{credits++;throw Error('Unexpected credit');}};
 for(const edit of [r=>r.productGid='gid://shopify/Product/999',r=>r.variantGid='gid://shopify/ProductVariant/999',r=>r.orderGid=null,r=>r.id=receipt(999).id,r=>r.customerGid='gid://shopify/Customer/999',r=>r.amountMinor=5000,r=>r.checkoutUrl=`https://${shop}/invoices/changed`]){
  const native={...source,orderGid:'gid://shopify/Order/1602'};edit(native);
  await assert.rejects(settleWalletTopUpCheckout(shop,customer,intent.id,{read:async()=>native},['fixture_external'],payments),/binding/);
 }
 const drafts={read:async()=>({...source,orderGid:'gid://shopify/Order/1602'})};
 for(const edit of [o=>o.totalReceivedSet=money('20'),o=>o.transactions[0].gateway='shopify_store_credit',o=>o.transactions[0].gateway='gift_card']){
  const native=paidOrder(1602);edit(native);
  await assert.rejects(settleWalletTopUpCheckout(shop,customer,intent.id,drafts,['fixture_external'],{...payments,readOrder:async()=>native}));
 }
 await assert.rejects(settleWalletTopUpCheckout(shop,'gid://shopify/Customer/999',intent.id,drafts,['fixture_external'],payments),/unavailable/);
 assert.equal(credits,0);
});


test('general activation cannot reopen retired custom-denomination checkout',async()=>{
 delete process.env.WALLET_LEGACY_TOP_UP_QA_ENABLED;let creates=0;
 try{await assert.rejects(request('retired-request-1234',{create:async()=>{creates++;throw Error('Must not create');}}),/Legacy top-up QA/);assert.equal(creates,0);}finally{process.env.WALLET_LEGACY_TOP_UP_QA_ENABLED='true';}
});

test('a valid total and owner cannot authorize a different top-up product or variant',async()=>{
 let n=1900;for(const field of ['productGid','variantGid']){const source=receipt(++n);source[field]='gid://shopify/'+(field==='productGid'?'Product':'ProductVariant')+'/999';await assert.rejects(request('catalogue-binding-'+n,{create:async()=>source}),/differs|reconciliation/);}
});
