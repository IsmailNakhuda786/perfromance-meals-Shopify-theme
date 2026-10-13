import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/order-cancellation.server.ts'],outdir:'.shopify/cancellation-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {cancelCustomerOrder,reconcileCustomerCancellation}=await import('../.shopify/cancellation-test/order-cancellation.server.js');
const db=new PrismaClient(),shop=`cancel-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/901';
process.env.ALLOWED_SHOP=shop;
const order=id=>({id:`gid://shopify/Order/${id}`,customerGid:customer,createdAt:new Date(Date.now()-3600000).toISOString(),currency:'SGD',amountMinor:2290,paid:true,alreadyCancelled:false,hasEverDispatched:false,businessStreams:['ready_series'],contractGids:[],renewalsVerified:true});
const api=id=>({readOrder:async()=>order(id),stopRenewals:async()=>{},cancelToWallet:async()=>({jobGid:`gid://shopify/Job/job-${id}`}),reconcile:async()=>true});
test.after(async()=>{await db.orderCancellation.deleteMany({where:{shop}});await db.commercePolicy.deleteMany({where:{shop}});await db.$disconnect();});
test('stale activation cannot execute customer cancellation or any financial mutation',async()=>{
 await db.commercePolicy.create({data:{shop,orderCancellationsEnabled:true}});
 const gateway=api(902);
 for(const key of Object.keys(gateway))gateway[key]=async()=>assert.fail('Customer request must not reach native gateway');
 await assert.rejects(cancelCustomerOrder(shop,customer,order(902).id,gateway),/SUPPORT_APPROVAL_REQUIRED/);
 assert.equal(await db.orderCancellation.count({where:{shop}}),0);
});
test('historical reconciliation remains read-only and preserves existing QA evidence',async()=>{
 const gateway=api(950);
 gateway.stopRenewals=async()=>assert.fail('no renewal mutation');
 gateway.cancelToWallet=async()=>assert.fail('no cancellation mutation');
 await db.orderCancellation.create({data:{shop,customerGid:customer,orderGid:order(950).id,currency:'SGD',amountMinor:2290,contractGids:'[]',state:'AWAITING_NATIVE_REFUND'}});
 gateway.reconcile=async()=>false;
 assert.equal((await reconcileCustomerCancellation(shop,customer,order(950).id,gateway)).state,'AWAITING_NATIVE_REFUND');
 gateway.reconcile=async()=>true;
 assert.equal((await reconcileCustomerCancellation(shop,customer,order(950).id,gateway)).state,'COMPLETED');
});
