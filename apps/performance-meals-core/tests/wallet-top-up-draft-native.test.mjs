import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-top-up-draft-native.server.ts'],outdir:'.shopify/top-up-draft-native-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {nativeTopUpDraftGateway}=await import('../.shopify/top-up-draft-native-test/wallet-top-up-draft-native.server.js');
const shop='draft-native-fixture.myshopify.com',id='gid://shopify/DraftOrder/1701';process.env.ALLOWED_SHOP=shop;
const money=amount=>({shopMoney:{amount,currencyCode:'SGD'}});
const draft=()=>({id,invoiceUrl:`https://${shop}/invoices/fixture`,currencyCode:'SGD',customer:{id:'gid://shopify/Customer/1702'},order:null,totalPriceSet:money('20.01'),totalTaxSet:money('0'),totalShippingPriceSet:money('0'),totalDiscountsSet:money('0'),lineItems:{pageInfo:{hasNextPage:false},nodes:[{quantity:1,requiresShipping:false,taxable:false}]}});
test('native adapter reads exact cents and the linked order without completing or paying it',async()=>{
 const input={purchasingEntity:{customerId:'gid://shopify/Customer/1702'},lineItems:[]};
 let creates=0,reads=0;
 const api={graphql:async(query,{variables})=>{
  const native=draft();
  if(query.includes('mutation WalletTopUpDraftCreate')){creates++;assert.deepEqual(variables,{input});return Response.json({data:{draftOrderCreate:{draftOrder:native,userErrors:[]}}});}
  assert.equal(query.includes('query WalletTopUpDraftRead'),true);reads++;assert.deepEqual(variables,{id});native.order={id:'gid://shopify/Order/1703'};return Response.json({data:{shop:{myshopifyDomain:shop},draftOrder:native}});
 }};
 const gateway=nativeTopUpDraftGateway(api,shop);
 assert.equal((await gateway.create(input)).amountMinor,2001);assert.equal((await gateway.read(id)).orderGid,'gid://shopify/Order/1703');
 assert.equal(creates,1);assert.equal(reads,1);
});
test('foreign stores, API failures, missing or adjusted draft evidence cannot establish a receipt',async()=>{
 for(const edit of [d=>d.currencyCode='USD',d=>d.customer=null,d=>d.totalTaxSet=money('1'),d=>d.totalDiscountsSet=money('1'),d=>d.totalShippingPriceSet=money('10'),d=>d.lineItems.pageInfo.hasNextPage=true,d=>d.lineItems.nodes[0].requiresShipping=true,d=>d.lineItems.nodes[0].taxable=true,d=>d.lineItems.nodes[0].quantity=2,d=>d.lineItems.nodes.push(d.lineItems.nodes[0])]){
  const source=draft();edit(source);
  const gateway=nativeTopUpDraftGateway({graphql:async()=>Response.json({data:{shop:{myshopifyDomain:shop},draftOrder:source}})},shop);
  await assert.rejects(gateway.read(id));
 }
 for(const body of [{errors:[{message:'Denied'}]},{data:{shop:{myshopifyDomain:'foreign.myshopify.com'},draftOrder:draft()}},{data:{shop:{myshopifyDomain:shop},draftOrder:null}}])await assert.rejects(nativeTopUpDraftGateway({graphql:async()=>Response.json(body)},shop).read(id));
 await assert.rejects(nativeTopUpDraftGateway({graphql:async()=>Response.json({},{status:403})},shop).create({}));
 await assert.rejects(nativeTopUpDraftGateway({graphql:async()=>Response.json({data:{draftOrderCreate:{draftOrder:null,userErrors:[{message:'Rejected'}]}}})},shop).create({}));
});
