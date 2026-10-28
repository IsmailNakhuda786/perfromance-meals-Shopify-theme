import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:{'wallet-policy':'app/services/wallet-policy.ts','wallet.server':'app/services/wallet.server.ts','runtime-config.server':'app/services/runtime-config.server.ts','health':'app/routes/health.tsx'},outdir:'.shopify/readiness-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {allocateWallet,bonusEligible}=await import('../.shopify/readiness-test/wallet-policy.js');
const {reserveWallet,releaseWalletReservation,recordSettledWalletCredit}=await import('../.shopify/readiness-test/wallet.server.js');
const {productionConfigIssues}=await import('../.shopify/readiness-test/runtime-config.server.js');
const {loader:health}=await import('../.shopify/readiness-test/health.js');
const db=new PrismaClient(),shop='wallet-fixture.myshopify.com',customerGid='gid://shopify/Customer/123';
process.env.ALLOWED_SHOP=shop;
const line=(stream,purchaseMode,sellingPlanGid=null,isGiftCard=false)=>({stream,purchaseMode,sellingPlanGid,isGiftCard,amountMinor:1000});
const lines=[line('ready_series','single'),line('ready_series','bundle'),line('ready_series','subscription','gid://shopify/SellingPlan/1'),line('meal_plan','subscription','gid://shopify/SellingPlan/2'),line('shared','single',null,true)];
test('funded money covers all supported lines; bonus only RS single/bundle, never subscriptions/gift cards',()=>{
 assert.deepEqual(lines.map(bonusEligible),[true,true,false,false,false]);
 const all=allocateWallet(lines,5000,0);assert.deepEqual(all.allocations.map(l=>l.remainderMinor),[0,0,0,0,0]);
 const mixed=allocateWallet(lines,1000,5000);assert.deepEqual(mixed.allocations.map(l=>l.bonusMinor),[1000,1000,0,0,0]);assert.deepEqual(mixed.allocations.map(l=>l.fundedMinor),[0,0,1000,0,0]);
 assert.equal(bonusEligible(line('ready_series','bundle','gid://shopify/SellingPlan/99')),false);
 assert.throws(()=>allocateWallet(lines,-1,0));assert.throws(()=>allocateWallet([{...lines[0],amountMinor:1.5}],0,0));
});
test('wallet defaults closed; durable reservations are idempotent, isolated and cannot overspend',async()=>{
 await db.customerWallet.create({data:{shop,customerGid,currency:'SGD',fundedBalance:1000,bonusBalance:2000}});
 await assert.rejects(()=>reserveWallet(shop,customerGid,'SGD','closed',lines),/not activated/);
 await db.commercePolicy.create({data:{shop,walletEnabled:true}}); // fixture-only; no dev-customer funds credited
 const reserved=await reserveWallet(shop,customerGid,'SGD','checkout',lines);
 assert.equal(reserved.fundedMinor,1000);assert.equal(reserved.bonusMinor,2000);
 assert.equal((await reserveWallet(shop,customerGid,'SGD','checkout',lines)).id,reserved.id);
 await assert.rejects(()=>reserveWallet(shop,'gid://shopify/Customer/999','SGD','checkout',lines),/conflict/);
 assert.equal((await reserveWallet(shop,customerGid,'SGD','second',lines)).fundedMinor,0);
 const fresh=new PrismaClient();assert.equal((await fresh.customerWallet.findUnique({where:{shop_customerGid_currency:{shop,customerGid,currency:'SGD'}}})).fundedReserved,1000);await fresh.$disconnect();
 await releaseWalletReservation(shop,reserved.id);await releaseWalletReservation(shop,reserved.id);
 assert.equal((await db.customerWallet.findUnique({where:{shop_customerGid_currency:{shop,customerGid,currency:'SGD'}}})).fundedReserved,0);
});
test('Core-managed policy cannot activate the historical aggregate reservation rules',async()=>{
 process.env.WALLET_CORE_EXPIRY_ENABLED='true';
 try{await assert.rejects(reserveWallet(shop,customerGid,'SGD','new-policy',lines),/Legacy Wallet reservation/);}
 finally{delete process.env.WALLET_CORE_EXPIRY_ENABLED;}
 assert.equal(await db.walletReservation.count({where:{shop,checkoutReference:'new-policy'}}),0);
});
test('production rejects ephemeral storage/tunnels/missing secrets; health response exposes no internals',async()=>{
 assert.ok(productionConfigIssues({DATABASE_URL:'file:dev.sqlite',SHOPIFY_APP_URL:'https://example.com'}).length);
 const env={SHOPIFY_API_KEY:'fixture',SHOPIFY_API_SECRET:'fixture',DATABASE_URL:'postgresql://fixture',DIRECT_DATABASE_URL:'postgresql://fixture',SHOPIFY_APP_URL:'https://core.example.org',PERFORMANCE_MEALS_APP_URL:'https://core.example.org',ALLOWED_SHOP:'fixture.myshopify.com',SCOPES:'read_products'};
 assert.deepEqual(productionConfigIssues(env),[]);
 assert.ok(productionConfigIssues({...env,SIXTY_DAY_BATCHES_ENABLED:'true'}).some(issue=>issue.includes('development acceptance')));
 assert.ok(productionConfigIssues({...env,WALLET_CORE_EXPIRY_ENABLED:'true'}).some(issue=>issue.includes('checkout protection')));
 assert.ok(productionConfigIssues({...env,WALLET_EXPIRY_REMINDERS_ENABLED:'true'}).some(issue=>issue.includes('provider receipts')));
 assert.ok(productionConfigIssues({...env,GIFT_CARD_EXPIRY_REMINDERS_ENABLED:'true'}).some(issue=>issue.includes('Gift Card reminders')));
 assert.ok(productionConfigIssues({...env,SHOPIFY_APP_URL:'https://fixture.trycloudflare.com'}).length);
 const response=await health();assert.equal(response.status,200);assert.deepEqual(await response.json(),{status:'ok'});assert.equal(response.headers.get('cache-control'),'no-store');
});
test.after(async()=>{await db.$transaction([db.walletReservation.deleteMany({where:{shop}}),db.walletEntry.deleteMany({where:{shop}}),db.customerWallet.deleteMany({where:{shop}}),db.commercePolicy.deleteMany({where:{shop}})]);await db.$disconnect();});

test('settled cash/Gift Card monetary sources retain attribution; bonus stays separate and retry conflicts reject',async()=>{
 const context={shop,customerGid,currency:'SGD'};
 for(const [index,sourceKind]of ['customer_funded','gift_card_funded','reward_funded'].entries()){
  const credit={...context,sourceEvent:'settled-'+index,sourceKind,amountMinor:500,sourceGid:'fixture-origin-'+index,nativeTransactionGid:'gid://shopify/StoreCreditAccountCreditTransaction/'+(700+index),nativeSourceTransactionGid:sourceKind==='gift_card_funded'?'gid://shopify/GiftCardDebitTransaction/'+(800+index):undefined};
  const first=await recordSettledWalletCredit(credit);
  assert.equal((await recordSettledWalletCredit(credit)).id,first.id);
  await assert.rejects(()=>recordSettledWalletCredit({...credit,sourceEvent:credit.sourceEvent+'-duplicate'}));
  assert.equal(first.fundedDelta,500);
  assert.equal(first.bonusDelta,0);
  await assert.rejects(()=>recordSettledWalletCredit({...credit,customerGid:'gid://shopify/Customer/999'}),/conflict/);
  await assert.rejects(()=>recordSettledWalletCredit({...credit,amountMinor:501}),/conflict/);
 }
 await assert.rejects(()=>recordSettledWalletCredit({...context,sourceEvent:'unconfirmed',sourceKind:'gift_card_funded',amountMinor:500,sourceGid:'fixture',nativeTransactionGid:''}),/Invalid/);
});

test('Wallet settlement rejects foreign stores and invalid native receipts before changing balances',async()=>{
 const credit={shop,customerGid,currency:'SGD',sourceEvent:'invalid-receipt',sourceKind:'gift_card_funded',amountMinor:500,sourceGid:'gid://shopify/GiftCard/901',nativeTransactionGid:'gid://shopify/StoreCreditAccountCreditTransaction/902',nativeSourceTransactionGid:'gid://shopify/GiftCardDebitTransaction/903'};
 const before=await db.customerWallet.findUnique({where:{shop_customerGid_currency:{shop,customerGid,currency:'SGD'}}});
 for(const nativeTransactionGid of ['fixture-native','gid://shopify/StoreCreditAccountDebitTransaction/902'])await assert.rejects(()=>recordSettledWalletCredit({...credit,nativeTransactionGid}),/Invalid/);
 await assert.rejects(()=>recordSettledWalletCredit({...credit,nativeSourceTransactionGid:'gid://shopify/GiftCardCreditTransaction/903'}),/Invalid/);
 await assert.rejects(()=>recordSettledWalletCredit({...credit,shop:'foreign.myshopify.com'}),error=>error instanceof Response&&error.status===403);
 await assert.rejects(()=>reserveWallet('foreign.myshopify.com',customerGid,'SGD','foreign',lines),error=>error instanceof Response&&error.status===403);
 await assert.rejects(()=>releaseWalletReservation('foreign.myshopify.com','foreign'),error=>error instanceof Response&&error.status===403);
 assert.deepEqual(await db.customerWallet.findUnique({where:{shop_customerGid_currency:{shop,customerGid,currency:'SGD'}}}),before);
 assert.equal(await db.walletEntry.count({where:{shop,sourceEvent:credit.sourceEvent}}),0);
});


test('food-only bonus cannot be recorded through unrestricted native Store Credit settlement',async()=>{
 const context={shop,customerGid,currency:'SGD'};
 const before=await db.customerWallet.findUnique({where:{shop_customerGid_currency:context}});
 await assert.rejects(recordSettledWalletCredit({...context,sourceEvent:'invalid-native-bonus',sourceKind:'bonus',amountMinor:8500,sourceGid:'gid://shopify/Order/1',nativeTransactionGid:'gid://shopify/StoreCreditAccountCreditTransaction/99999'}),/Food-only bonus/);
 assert.deepEqual(await db.customerWallet.findUnique({where:{shop_customerGid_currency:context}}),before);
 assert.equal(await db.walletEntry.count({where:{shop,sourceEvent:'invalid-native-bonus'}}),0);
});


test('production preflight rejects unaccepted Gift Card expiry activation',()=>{
 assert.ok(productionConfigIssues({GIFT_CARD_EXPIRY_WRITES_ENABLED:'true'}).some(issue=>issue.includes('Gift Card expiry writes')));
});

test('production cannot activate unverified customer future-renewal execution',()=>{
 assert.ok(productionConfigIssues({CORE_SUBSCRIPTION_RENEWAL_STOPS_ENABLED:'true'}).some(issue=>issue.includes('future-renewal stops')));
});

test('production cannot enable unaccepted automatic prepaid renewal linking',()=>{
 assert.ok(productionConfigIssues({CORE_PREPAID_RENEWAL_LINKS_ENABLED:'true'}).some(issue=>issue.includes('Automatic prepaid renewal linking')));
});
test('automatic purchase intake cannot be enabled by production configuration',()=>{
 assert.ok(productionConfigIssues({CORE_PREPAID_PURCHASE_INTAKE_ENABLED:'true'}).some(issue=>issue.includes('Automatic prepaid purchase intake')));
});
