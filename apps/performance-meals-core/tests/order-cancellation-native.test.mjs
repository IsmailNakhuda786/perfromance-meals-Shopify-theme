import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/order-cancellation-native.server.ts'],outdir:'.shopify/cancellation-native-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {nativeCancellationGateway,CANCELLATION_ORDER_QUERY,CANCELLATION_CONTRACT_QUERY,CANCEL_CONTRACT_MUTATION}=await import('../.shopify/cancellation-native-test/order-cancellation-native.server.js');
const db=new PrismaClient(),shop=`cancel-native-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/981',id='gid://shopify/Order/982';
process.env.ALLOWED_SHOP=shop;
const money=amount=>({shopMoney:{amount,currencyCode:'SGD'}});
const order=()=>({id,customer:{id:customer},createdAt:new Date().toISOString(),cancelledAt:null,currencyCode:'SGD',displayFinancialStatus:'PAID',disputes:[],totalPriceSet:money('22.90'),totalReceivedSet:money('22.90'),totalRefundedSet:money('0'),fulfillments:[],lineItems:{nodes:[{id:'gid://shopify/LineItem/983',product:{isGiftCard:false,stream:{jsonValue:'ready_series'}}}],pageInfo:{hasNextPage:false}}});
const response=data=>new Response(JSON.stringify({data}),{headers:{'Content-Type':'application/json'}});
test.after(async()=>{await db.operationalLine.deleteMany({where:{shop}});await db.$disconnect();});
test('native price includes delivery; Gift Cards, missing data, dispute and historical dispatch cannot bypass checks',async()=>{
 let current=order();
 const admin={graphql:async query=>{assert.equal(query,CANCELLATION_ORDER_QUERY);return response({shop:{myshopifyDomain:shop},order:current});}};
 const gateway=nativeCancellationGateway(admin,shop);
 assert.equal((await gateway.readOrder(id)).amountMinor,2290);
 current.disputes=[{id:'gid://shopify/Dispute/1'}];assert.equal((await gateway.readOrder(id)).paid,false);
 current=order();current.lineItems.nodes[0].product.isGiftCard=true;assert.deepEqual((await gateway.readOrder(id)).businessStreams,['shared']);
 current=order();current.fulfillments=[{id:'gid://shopify/Fulfillment/1',status:'CANCELLED'}];assert.equal((await gateway.readOrder(id)).hasEverDispatched,null);
 current=order();current.lineItems.pageInfo.hasNextPage=true;await assert.rejects(gateway.readOrder(id),/incomplete/);
});
test('renewal shutdown requires native customer, app and original-order ownership; one-time orders need no contract',async()=>{
 let contract={id:'gid://shopify/SubscriptionContract/984',status:'ACTIVE',app:{id:'gid://shopify/App/985'},customer:{id:customer},originOrder:{id}},mutations=0;
 const admin={graphql:async query=>{
  if(query===CANCELLATION_CONTRACT_QUERY)return response({currentAppInstallation:{app:{id:'gid://shopify/App/985'}},subscriptionContract:contract});
  assert.equal(query,CANCEL_CONTRACT_MUTATION);mutations++;return response({subscriptionContractCancel:{contract:{id:contract.id,status:'CANCELLED'},userErrors:[]}});
 }};
 const gateway=nativeCancellationGateway(admin,shop);
 await gateway.stopRenewals([],customer,id);assert.equal(mutations,0);
 contract={...contract,app:{id:'gid://shopify/App/999'}};await assert.rejects(gateway.stopRenewals([contract.id],customer,id),/owning app/);assert.equal(mutations,0);
 contract={...contract,app:{id:'gid://shopify/App/985'},originOrder:{id:'gid://shopify/Order/999'}};await assert.rejects(gateway.stopRenewals([contract.id],customer,id));assert.equal(mutations,0);
 contract={...contract,originOrder:{id}};await gateway.stopRenewals([contract.id],customer,id);assert.equal(mutations,1);
});
test('retired native cancellation adapter cannot issue an automatic Wallet refund',async()=>{
 const admin={graphql:async()=>assert.fail('No native cancellation or financial mutation')};
 await assert.rejects(nativeCancellationGateway(admin,shop).cancelToWallet(id),/SUPPORT_APPROVAL_REQUIRED/);
});
