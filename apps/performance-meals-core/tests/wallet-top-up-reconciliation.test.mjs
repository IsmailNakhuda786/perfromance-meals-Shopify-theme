import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-top-up-reconciliation.server.ts'],outdir:'.shopify/top-up-reconciliation-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {auditWalletTopUps}=await import('../.shopify/top-up-reconciliation-test/wallet-top-up-reconciliation.server.js');
const db=new PrismaClient(),shop=`top-up-audit-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/901';
process.env.ALLOWED_SHOP=shop;
test.after(async()=>{await db.walletTopUpSettlement.deleteMany({where:{shop}});await db.$disconnect();});
const settlement=(id,owner=customer)=>({shop,orderGid:`gid://shopify/Order/${id}`,customerGid:owner,currency:'SGD',amountMinor:2000,paymentGid:`gid://shopify/OrderTransaction/${id}`,creditGid:`gid://shopify/StoreCreditAccountCreditTransaction/${id}`,state:'COMPLETED'});
test('account lifecycle audit isolates customers and marks refunds without issuing native financial operations',async()=>{
 const funded=await db.walletTopUpSettlement.create({data:settlement(920)});
 const foreign=await db.walletTopUpSettlement.create({data:settlement(921,'gid://shopify/Customer/999')});
 let reads=0;
 const admin={graphql:async(query,{variables})=>{
  assert.equal(query.trim().startsWith('#graphql\nquery'),true);assert.equal(variables.id,funded.orderGid);reads++;
  return Response.json({data:{shop:{myshopifyDomain:shop},order:{id:funded.orderGid,customer:{id:customer},currencyCode:'SGD',cancelledAt:null,displayFinancialStatus:'PARTIALLY_REFUNDED',disputes:[],totalRefundedSet:{shopMoney:{amount:'5',currencyCode:'SGD'}},transactions:[{id:funded.paymentGid,status:'SUCCESS',kind:'SALE',amountSet:{shopMoney:{amount:'20',currencyCode:'SGD'}}}]}}});
 }};
 assert.equal((await auditWalletTopUps(admin,shop,customer)).pending,true);
 assert.equal((await db.walletTopUpSettlement.findUnique({where:{id:funded.id}})).state,'RECONCILIATION_REQUIRED');
 assert.equal((await db.walletTopUpSettlement.findUnique({where:{id:foreign.id}})).state,'COMPLETED');
 assert.equal((await auditWalletTopUps(admin,shop,customer)).pending,true);assert.equal(reads,1);
});
test('no funding means no native reads; uncertain credit stays pending and truncated history is explicit',async()=>{
 const owner='gid://shopify/Customer/902',admin={graphql:async()=>{throw Error('No native request expected');}};
 assert.deepEqual(await auditWalletTopUps(admin,shop,owner),{pending:false});
 await db.walletTopUpSettlement.create({data:{...settlement(922,owner),creditGid:null,state:'CREDIT_PENDING'}});
 assert.deepEqual(await auditWalletTopUps(admin,shop,owner),{pending:true});
 await db.walletTopUpSettlement.createMany({data:Array.from({length:50},(_,i)=>({...settlement(930+i,owner),creditGid:null,state:'PREPARED'}))});
 await assert.rejects(auditWalletTopUps(admin,shop,owner),/paginated/);
});
