import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-top-up-native.server.ts'],outdir:'.shopify/top-up-native-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {readPaidTopUp}=await import('../.shopify/top-up-native-test/wallet-top-up-native.server.js');
const shop='top-up-proof.myshopify.com',customer='gid://shopify/Customer/801',orderId='gid://shopify/Order/804';
process.env.ALLOWED_SHOP=shop;
const config={productGid:'gid://shopify/Product/802',variants:{'gid://shopify/ProductVariant/803':2000},paymentGateways:['fixture_external_gateway']};
const money=amount=>({shopMoney:{amount,currencyCode:'SGD'}});
const payload=()=>({data:{shop:{myshopifyDomain:shop},order:{id:orderId,cancelledAt:null,disputes:[],displayFinancialStatus:'PAID',currencyCode:'SGD',customer:{id:customer},totalPriceSet:money('20'),totalReceivedSet:money('20'),totalRefundedSet:money('0'),totalDiscountsSet:money('0'),totalTaxSet:money('0'),totalShippingPriceSet:money('0'),lineItems:{pageInfo:{hasNextPage:false},nodes:[{quantity:1,requiresShipping:false,taxable:false,variant:{id:'gid://shopify/ProductVariant/803'},product:{id:config.productGid,isGiftCard:false},originalTotalSet:money('20'),discountedTotalSet:money('20')}]},transactions:[{id:'gid://shopify/OrderTransaction/805',status:'SUCCESS',kind:'SALE',gateway:'fixture_external_gateway',amountSet:money('20')}]}}});
test('fresh native proof fails closed for cross-store, partial, absent and failed API responses',async()=>{
 const admin=body=>({graphql:async(_query,{variables})=>{assert.equal(variables.id,orderId);return Response.json(body);}});
 assert.equal((await readPaidTopUp(admin(payload()),shop,customer,orderId,config)).amountMinor,2000);
 for(const edit of [p=>p.data.shop.myshopifyDomain='other.myshopify.com',p=>p.data.order=null,p=>p.errors=[{message:'Denied'}],p=>p.data.order.transactions=Array(100).fill(p.data.order.transactions[0])]){
  const invalid=payload();edit(invalid);await assert.rejects(readPaidTopUp(admin(invalid),shop,customer,orderId,config));
 }
 await assert.rejects(readPaidTopUp({graphql:async()=>Response.json(payload(),{status:403})},shop,customer,orderId,config));
 await assert.rejects(readPaidTopUp(admin(payload()),'other.myshopify.com',customer,orderId,config));
});
