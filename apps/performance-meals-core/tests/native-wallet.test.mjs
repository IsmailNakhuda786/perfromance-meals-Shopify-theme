import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/native-wallet.server.ts'],outdir:'.shopify/native-wallet-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {readNativeWallet}=await import('../.shopify/native-wallet-test/native-wallet.server.js');
const shop='wallet-read-fixture.myshopify.com',customer='gid://shopify/Customer/123';
process.env.ALLOWED_SHOP=shop;
const data=()=>({shop:{myshopifyDomain:shop,currencyCode:'SGD'},customer:{id:customer,storeCreditAccounts:{nodes:[{balance:{amount:'25.00',currencyCode:'SGD'}}],pageInfo:{hasNextPage:false}}}});
const admin=value=>({graphql:async(_query,options)=>{assert.equal(options.variables.id,customer);return Response.json({data:value});}});
test('native Wallet reads exact customer balance and rejects foreign, truncated or ambiguous evidence',async()=>{
 assert.deepEqual(await readNativeWallet(admin(data()),shop,customer),{currency:'SGD',balanceMinor:2500});
 const empty=data();empty.customer.storeCreditAccounts.nodes=[];
 assert.deepEqual(await readNativeWallet(admin(empty),shop,customer),{currency:'SGD',balanceMinor:0});
 for(const mutate of [d=>d.customer.id='gid://shopify/Customer/999',d=>d.shop.myshopifyDomain='other.myshopify.com',d=>d.customer.storeCreditAccounts.pageInfo.hasNextPage=true,d=>d.customer.storeCreditAccounts.nodes.push(d.customer.storeCreditAccounts.nodes[0]),d=>d.customer.storeCreditAccounts.nodes[0].balance.amount='-25.00']){
  const invalid=data();mutate(invalid);await assert.rejects(readNativeWallet(admin(invalid),shop,customer));
 }
 await assert.rejects(readNativeWallet({graphql:async()=>Response.json({errors:[{message:'Denied'}]})},shop,customer));
});
