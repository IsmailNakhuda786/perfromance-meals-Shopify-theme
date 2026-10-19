import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PrismaClient,buildServices} from './support/database.mjs';
globalThis.privacyWebhookFixture={failAuth:false,shop:'',topic:'CUSTOMERS_REDACT',payload:null};
await buildServices({entryPoints:['app/services/privacy.server.ts','app/services/wallet.server.ts','app/routes/webhooks.privacy.tsx'],outdir:'.shopify/privacy-test',outbase:'app',bundle:true,packages:'external',format:'esm',platform:'node',plugins:[{name:'privacy-auth-boundary',setup(b){
 b.onResolve({filter:/shopify\.server$/},args=>({path:args.path,namespace:'privacy-auth'}));
 b.onLoad({filter:/.*/,namespace:'privacy-auth'},()=>({loader:'js',contents:'export const authenticate={webhook:async()=>{const s=globalThis.privacyWebhookFixture;if(s.failAuth)throw new Response(null,{status:401});return {shop:s.shop,topic:s.topic,payload:s.payload};}};'}));
}}]});
const {queuePrivacyRequest,inspectCustomerPrivacyData,readPrivacyReviewQueue,privacyCustomerModels,privacyShopOnlyModels,privacyIndirectModels}=await import('../.shopify/privacy-test/services/privacy.server.js');
const {recordSettledWalletCredit}=await import('../.shopify/privacy-test/services/wallet.server.js');
const {action}=await import('../.shopify/privacy-test/routes/webhooks.privacy.js');
const db=new PrismaClient(),shop=`privacy-${randomUUID()}.myshopify.com`,otherShop=`other-${randomUUID()}.myshopify.com`;
const customerGid='gid://shopify/Customer/901',otherCustomer='gid://shopify/Customer/902';
process.env.ALLOWED_SHOP=shop;
const payload={shop_domain:shop,customer:{id:901,email:'do-not-store@example.invalid',phone:'do-not-store'},orders_to_redact:[901]};
test.after(async()=>{
 for(const target of [shop,otherShop])for(const model of [...privacyCustomerModels,...privacyShopOnlyModels,...privacyIndirectModels])await db[model].deleteMany({where:{shop:target}});
 await db.$disconnect();
});

test('every persistent model has an explicit privacy classification',async()=>{
 const schema=await readFile('prisma/schema.prisma','utf8');
 const models=[...schema.matchAll(/^model (\w+)\s*\{/gm)].map(m=>m[1][0].toLowerCase()+m[1].slice(1));
 const classified=[...privacyCustomerModels,...privacyShopOnlyModels,...privacyIndirectModels];
 assert.equal(new Set(classified).size,classified.length);
 assert.deepEqual([...classified].sort(),models.sort());
 for(const name of privacyCustomerModels){
  const sourceName=name[0].toUpperCase()+name.slice(1);
  assert.match(schema.match(new RegExp(`model ${sourceName} \\{([\\s\\S]*?)^\\}`,'m'))[1],/customerGid String/);
 }
});

test('duplicate customer erasure requests queue exactly once without deleting payment replay evidence',async()=>{
 const credit={shop,customerGid,currency:'SGD',sourceEvent:'privacy-fixture-credit',sourceKind:'customer_funded',amountMinor:100,sourceGid:'gid://shopify/Order/901',nativeTransactionGid:'gid://shopify/StoreCreditAccountCreditTransaction/901'};
 const entry=await recordSettledWalletCredit(credit);
 const before=await db.customerWallet.findUnique({where:{shop_customerGid_currency:{shop,customerGid,currency:'SGD'}}});
 const first=await queuePrivacyRequest(shop,'CUSTOMERS_REDACT',payload,'erase-event');
 const repeated=await queuePrivacyRequest(shop,'CUSTOMERS_REDACT',payload,'erase-event');
 assert.equal(first.id,repeated.id);assert.equal(first.state,'PENDING_REVIEW');
 assert.equal(await db.planOperation.count({where:{shop,kind:'PRIVACY_CUSTOMER_REDACTION'}}),1);
 assert.equal((await recordSettledWalletCredit(credit)).id,entry.id);
 assert.deepEqual(await db.customerWallet.findUnique({where:{id:before.id}}),before);
 assert.equal(await db.walletEntry.count({where:{shop,customerGid}}),1);
 assert.ok(!JSON.stringify(first).includes('do-not-store'));
});

test('data exports and whole-shop erasure requests are durable intake, never a deletion or completed export',async()=>{
 const request=await queuePrivacyRequest(shop,'CUSTOMERS_DATA_REQUEST',payload,'export-event');
 assert.equal(request.kind,'PRIVACY_DATA_REQUEST');assert.equal(request.state,'PENDING_REVIEW');
 const removal=await queuePrivacyRequest(shop,'SHOP_REDACT',{shop_domain:shop},'shop-event');
 assert.equal(removal.kind,'PRIVACY_SHOP_REDACTION');assert.equal(removal.selectionId,'shop');
 assert.equal(await db.walletEntry.count({where:{shop,customerGid}}),1);
 assert.equal((await queuePrivacyRequest(shop,'SHOP_REDACT',{shop_domain:shop},'shop-event')).id,removal.id);
});

test('changed customer or topic cannot reuse an existing authenticated delivery identifier',async()=>{
 await assert.rejects(queuePrivacyRequest(shop,'CUSTOMERS_REDACT',{customer:{id:902}},'erase-event'),/identity differs/);
 await assert.rejects(queuePrivacyRequest(shop,'CUSTOMERS_DATA_REQUEST',payload,'erase-event'),/identity differs/);
});

test('invalid or foreign contexts cannot create requests or receipts',async()=>{
 const before=await db.planOperation.count({where:{shop}}),receipts=await db.webhookReceipt.count({where:{shop}});
 for(const id of [undefined,null,0,-1,1.5,Number.MAX_SAFE_INTEGER+1,'undefined','901 OR 1=1','gid://shopify/Customer/901','']){
  await assert.rejects(queuePrivacyRequest(shop,'CUSTOMERS_REDACT',{customer:{id}},'invalid-id'),/Invalid privacy/);
 }
 for(const [topic,data,event]of [['UNKNOWN',payload,'x'],['CUSTOMERS_REDACT',payload,null],['CUSTOMERS_REDACT',payload,'\n'],['CUSTOMERS_REDACT',{...payload,shop_domain:otherShop},'x']])await assert.rejects(queuePrivacyRequest(shop,topic,data,event));
 await assert.rejects(queuePrivacyRequest(otherShop,'CUSTOMERS_REDACT',payload,'x'));
 assert.equal(await db.planOperation.count({where:{shop}}),before);assert.equal(await db.webhookReceipt.count({where:{shop}}),receipts);
});

test('inventory includes newer menu, reminder and credit records without exposing their contents or other owners',async()=>{
 for(const [owner,cust]of [[shop,customerGid],[shop,otherCustomer],[otherShop,customerGid]]){
  await db.readyDeliveryDraft.create({data:{shop:owner,customerGid:cust,operationalLineId:randomUUID(),occurrence:1,deliveryAt:new Date('2027-01-04T01:00:00Z')}});
  await db.giftCardExpiryReminder.create({data:{shop:owner,customerGid:cust,giftCardGid:`gid://shopify/GiftCard/${cust.endsWith('/901')?'901':'902'}`,expiresOn:'2027-01-04',reminderAt:new Date('2026-12-04T00:00:00Z'),remainingMinor:100}});
  await db.mealPlanMenuRevision.create({data:{shop:owner,customerGid:cust,selectionId:randomUUID(),block:1,revision:1,state:'SAVED',inputSelections:'private-menu',selections:'private-menu',cutoffAt:new Date('2027-01-01T00:00:00Z')}});
 }
 const inventory=await inspectCustomerPrivacyData(shop,901);
 assert.equal(inventory.counts.readyDeliveryDraft,1);assert.equal(inventory.counts.giftCardExpiryReminder,1);assert.equal(inventory.counts.mealPlanMenuRevision,1);
 assert.equal(inventory.counts.walletEntry,1);assert.equal(inventory.financialAuditRequired,true);assert.equal(inventory.executionReady,false);
 assert.ok(!JSON.stringify(inventory).includes('private-menu'));
 await assert.rejects(inspectCustomerPrivacyData(otherShop,901));
});

test('concurrent duplicate deliveries cannot leave duplicate review tasks',async()=>{
 const outcomes=await Promise.allSettled([1,2,3].map(()=>queuePrivacyRequest(shop,'CUSTOMERS_REDACT',payload,'concurrent-event')));
 assert.ok(outcomes.some(row=>row.status==='fulfilled'));
 assert.equal(await db.planOperation.count({where:{shop,cycleReference:`privacy:${shop}:concurrent-event`}}),1);
 assert.equal(await db.webhookReceipt.count({where:{shop,id:`privacy:${shop}:concurrent-event`}}),1);
 const replay=await queuePrivacyRequest(shop,'CUSTOMERS_REDACT',payload,'concurrent-event');assert.equal(replay.state,'PENDING_REVIEW');
});

test('webhook authentication failure prevents persistence; fallback delivery header works only after authentication',async()=>{
 const state=globalThis.privacyWebhookFixture;Object.assign(state,{shop,topic:'CUSTOMERS_REDACT',payload,failAuth:true});
 const request=()=>new Request('https://fixture.invalid/webhooks/privacy',{method:'POST',headers:{'X-Shopify-Webhook-Id':'route-event'}});
 const before=await db.planOperation.count({where:{shop}});
 await assert.rejects(action({request:request()}),error=>error instanceof Response&&error.status===401);
 assert.equal(await db.planOperation.count({where:{shop}}),before);
 state.failAuth=false;assert.equal((await action({request:request()})).status,200);
 assert.equal(await db.planOperation.count({where:{shop}}),before+1);
 assert.equal((await action({request:request()})).status,200);assert.equal(await db.planOperation.count({where:{shop}}),before+1);
 state.shop=otherShop;await assert.rejects(action({request:request()}));state.shop=shop;
 assert.equal((await action({request:new Request('https://fixture.invalid/webhooks/privacy',{method:'POST'})})).status,400);
});

test('the bounded review backlog reports deadlines without customer details and duplicate delivery cannot move them',async()=>{
 const first=await queuePrivacyRequest(shop,'CUSTOMERS_REDACT',payload,'deadline-event');
 const received=new Date('2026-10-01T08:00:00Z');await db.planOperation.update({where:{id:first.id},data:{createdAt:received}});
 const duplicate=await queuePrivacyRequest(shop,'CUSTOMERS_REDACT',payload,'deadline-event');assert.equal(duplicate.createdAt.toISOString(),received.toISOString());
 const before=await readPrivacyReviewQueue(shop,{now:new Date('2026-10-31T07:59:59Z'),limit:1});
 assert.equal(before.requests[0].requestId,first.id);assert.equal(before.requests[0].reviewDueAt,'2026-10-31T08:00:00.000Z');assert.equal(before.overdue,0);
 const at=await readPrivacyReviewQueue(shop,{now:new Date('2026-10-31T08:00:00Z'),limit:1});assert.equal(at.overdue,1);assert.equal(at.requests[0].overdue,true);assert.equal(at.hasMore,true);
 assert.ok(!JSON.stringify(at).includes('customer:901'));assert.ok(!JSON.stringify(at).includes('do-not-store'));
 const second=await readPrivacyReviewQueue(shop,{now:new Date('2026-10-31T08:00:00Z'),limit:1,after:at.nextCursor});assert.notEqual(second.requests[0].requestId,first.id);assert.equal(second.pending,at.pending);
});

test('review pagination excludes non-privacy/finished work and rejects foreign cursors and unsafe bounds',async()=>{
 const unrelated=await db.planOperation.create({data:{shop,selectionId:'fixture',kind:'NATIVE_DISPATCH_OBSERVED',state:'PENDING_REVIEW'}});
 const done=await db.planOperation.create({data:{shop,selectionId:'fixture',kind:'PRIVACY_DATA_REQUEST',state:'COMPLETED'}});
 const foreign=await db.planOperation.create({data:{shop:otherShop,selectionId:'fixture',kind:'PRIVACY_CUSTOMER_REDACTION',state:'PENDING_REVIEW'}});
 const queue=await readPrivacyReviewQueue(shop,{limit:100});assert.ok(queue.requests.every(row=>![unrelated.id,done.id,foreign.id].includes(row.requestId)));
 for(const after of [unrelated.id,done.id,foreign.id,'missing'])await assert.rejects(readPrivacyReviewQueue(shop,{after}),/cursor/);
 for(const limit of [0,101,1.5])await assert.rejects(readPrivacyReviewQueue(shop,{limit}),/bounds/);
 await assert.rejects(readPrivacyReviewQueue(shop,{now:new Date('invalid')}),/bounds/);
 await assert.rejects(readPrivacyReviewQueue(otherShop));
});
