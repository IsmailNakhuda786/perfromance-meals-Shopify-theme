import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-top-up-checkout.server.ts'],outdir:'.shopify/top-up-checkout-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {prepareWalletTopUpDraft}=await import('../.shopify/top-up-checkout-test/wallet-top-up-checkout.server.js');
const shop='top-up-checkout-fixture.myshopify.com',customer='gid://shopify/Customer/1201';
process.env.ALLOWED_SHOP=shop;
const catalogue={productGid:'gid://shopify/Product/1202',variantGid:'gid://shopify/ProductVariant/1203'};
const data=()=>({shop:{myshopifyDomain:shop},productVariant:{id:catalogue.variantGid,taxable:false,requiresComponents:false,inventoryItem:{requiresShipping:false},product:{id:catalogue.productGid,isGiftCard:false,requiresSellingPlan:false}}});
const admin=(edit=()=>{})=>({graphql:async(query,{variables})=>{assert.equal(query.trim().startsWith('#graphql\nquery'),true);assert.deepEqual(variables,{id:catalogue.variantGid});const native=data();edit(native);return Response.json({data:native});}});

test('approved presets and exact custom cents prepare one isolated native draft input without creating it',async()=>{
 for(const value of ['20','50','100','200','5.01','500']){
  const prepared=await prepareWalletTopUpDraft(admin(),shop,customer,value,catalogue);
  assert.equal(prepared.input.lineItems.length,1);assert.equal(prepared.input.lineItems[0].quantity,1);
  assert.equal(prepared.input.purchasingEntity.customerId,customer);
  assert.equal(prepared.input.presentmentCurrencyCode,'SGD');
  assert.equal(prepared.input.acceptAutomaticDiscounts,false);assert.equal(prepared.input.allowDiscountCodesInCheckout,false);
  assert.deepEqual(prepared.input.discountCodes,[]);
  assert.equal(prepared.input.lineItems[0].priceOverride.amount,(prepared.amountMinor/100).toFixed(2));
  assert.equal('shippingLine' in prepared.input,false);assert.equal('requiresShipping' in prepared.input.lineItems[0],false);
 }
});

test('shipping, tax, bundle, subscription, Gift Card and foreign catalogue evidence fail closed',async()=>{
 for(const edit of [d=>d.shop.myshopifyDomain='foreign.myshopify.com',d=>d.productVariant.id='gid://shopify/ProductVariant/999',d=>d.productVariant.product.id='gid://shopify/Product/999',d=>d.productVariant.taxable=true,d=>d.productVariant.inventoryItem.requiresShipping=true,d=>d.productVariant.requiresComponents=true,d=>d.productVariant.product.requiresSellingPlan=true,d=>d.productVariant.product.isGiftCard=true,d=>delete d.productVariant.inventoryItem,d=>delete d.productVariant.taxable]){
  await assert.rejects(prepareWalletTopUpDraft(admin(edit),shop,customer,'20',catalogue));
 }
 await assert.rejects(prepareWalletTopUpDraft({graphql:async()=>Response.json({errors:[{message:'denied'}]})},shop,customer,'20',catalogue));
});

test('invalid amounts and customer/configuration identifiers cannot trigger even a native read',async()=>{
 const noRead={graphql:async()=>{throw Error('Unexpected native read');}};
 for(const value of ['4.99','500.01','1e2','20.001',20,{amount:'20'}])await assert.rejects(prepareWalletTopUpDraft(noRead,shop,customer,value,catalogue),/amount/);
 await assert.rejects(prepareWalletTopUpDraft(noRead,shop,'customer supplied email','20',catalogue),/configuration/);
 await assert.rejects(prepareWalletTopUpDraft(noRead,shop,customer,'20',{...catalogue,variantGid:'other'}),/configuration/);
});
