import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/order-funding.server.ts'],outdir:'.shopify/order-funding-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {readOriginalOrderFunding}=await import('../.shopify/order-funding-test/order-funding.server.js');
const db=new PrismaClient(),shop=`funding-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/880',id='gid://shopify/Order/881';process.env.ALLOWED_SHOP=shop;
const money=amount=>({shopMoney:{amount,currencyCode:'SGD'}});
const payments=[{id:'gid://shopify/OrderTransaction/882',status:'SUCCESS',kind:'SALE',gateway:'shopify_store_credit',amountSet:money('10')},{id:'gid://shopify/OrderTransaction/883',status:'SUCCESS',kind:'SALE',gateway:'gift_card',amountSet:money('5')},{id:'gid://shopify/OrderTransaction/884',status:'SUCCESS',kind:'SALE',gateway:'fixture_direct',amountSet:money('20')}];
let owner=customer,total='35';
const admin={graphql:async()=>new Response(JSON.stringify({data:{shop:{myshopifyDomain:shop},order:{id,customer:{id:owner},currencyCode:'SGD',totalReceivedSet:money(total),transactions:payments}}}))};
test.after(async()=>{await db.walletEntry.deleteMany({where:{shop}});await db.$disconnect();});
test('Support funding separates Reward money from Gift Card and original customer principal',async()=>{
 await db.walletEntry.create({data:{shop,customerGid:customer,currency:'SGD',sourceEvent:'fixture-debit',sourceGid:id,sourceKind:'funded_spend',fundedDelta:-1000,bonusDelta:0,nativeSourceTransactionGid:payments[0].id,fundedAllocations:JSON.stringify([{creditEntryId:'fixture-reward',sourceKind:'reward_funded',amountMinor:400},{creditEntryId:'fixture-customer',sourceKind:'customer_funded',amountMinor:600}])}});
 const result=await readOriginalOrderFunding(admin,shop,customer,id);
 assert.deepEqual(result.sources,{customer_funded:2600,gift_card_funded:500,reward_funded:400});
 assert.equal(result.totalMinor,3500);
});
test('foreign ownership and incomplete native payment totals cannot authorize attribution',async()=>{
 owner='gid://shopify/Customer/999';await assert.rejects(readOriginalOrderFunding(admin,shop,customer,id));owner=customer;
 total='36';await assert.rejects(readOriginalOrderFunding(admin,shop,customer,id),/differs/);
});
