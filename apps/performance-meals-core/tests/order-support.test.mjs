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
 assert.equal(first.state,'REQUESTED');assert.equal(JSON.parse(first.evidence).hasEverDispatched,true);
 assert.equal((await requestOrderSupport(shop,customer,orderGid,gateway)).id,first.id);
 assert.equal(await db.walletEntry.count({where:{shop}}),0);
 await assert.rejects(requestOrderSupport(shop,'gid://shopify/Customer/999',orderGid,gateway),/unavailable/);
});
