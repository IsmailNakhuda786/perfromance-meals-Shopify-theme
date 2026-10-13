import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/order-support.server.ts'],outdir:'.shopify/order-support-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {requestOrderSupport}=await import('../.shopify/order-support-test/order-support.server.js');
const db=new PrismaClient(),shop=`support-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/850',orderGid='gid://shopify/Order/851';process.env.ALLOWED_SHOP=shop;
const gateway={readOrder:async()=>({id:orderGid,name:'#fixture',customerGid:customer,currency:'SGD',amountMinor:2290,paid:true,alreadyCancelled:false,hasEverDispatched:true,businessStreams:['ready_series'],contractGids:[],renewalsVerified:true}),cancelToWallet:async()=>assert.fail('no financial mutation'),stopRenewals:async()=>assert.fail('no contract mutation')};
test.after(async()=>{for(const table of ['orderSupportRequest','walletEntry'])await db[table].deleteMany({where:{shop}});await db.$disconnect();});
test('Support request is persisted once even after dispatch and never cancels or credits',async()=>{
 const first=await requestOrderSupport(shop,customer,orderGid,gateway);
 assert.equal(first.state,'REQUESTED');assert.equal(JSON.parse(first.evidence).hasEverDispatched,true);assert.equal(JSON.parse(first.evidence).commencement,'unknown');
 assert.equal((await requestOrderSupport(shop,customer,orderGid,gateway)).id,first.id);
 assert.equal(await db.walletEntry.count({where:{shop}}),0);
 await assert.rejects(requestOrderSupport(shop,'gid://shopify/Customer/999',orderGid,gateway),/unavailable/);
});
test('changed order totals retain original funding evidence without blocking Support',async()=>{
 const changedId='gid://shopify/Order/852';
 const changed={readOrder:async()=>({...await gateway.readOrder(),id:changedId,amountMinor:1800})};
 const funding={currency:'SGD',totalMinor:2290,sources:{customer_funded:2290,gift_card_funded:0,reward_funded:0}};
 const result=await requestOrderSupport(shop,customer,changedId,changed,funding);
 const evidence=JSON.parse(result.evidence);
 assert.equal(evidence.originalPaidFunding.totalMinor,2290);
 assert.equal(evidence.totalMinor,1800);
 assert.equal(evidence.originalFundingMatchesCurrent,false);
 assert.equal(evidence.directPaymentAttributionPending,true);
 assert.equal(await db.walletEntry.count({where:{shop}}),0);
});

test('saved commencement is independent of dispatch and never authorizes a refund',async()=>{
 const changedId='gid://shopify/Order/853';
 const dated={readOrder:async()=>({...await gateway.readOrder(),id:changedId,commencementStartsOn:'2099-10-19'})};
 const result=await requestOrderSupport(shop,customer,changedId,dated);const evidence=JSON.parse(result.evidence);
 assert.equal(evidence.commencement,'before_start');assert.equal(evidence.commencementStartsOn,'2099-10-19');assert.equal(evidence.hasEverDispatched,true);
 assert.equal(await db.walletEntry.count({where:{shop}}),0);
});
