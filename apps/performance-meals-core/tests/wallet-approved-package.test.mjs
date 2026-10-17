import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-top-up-checkout.server.ts'],outdir:'.shopify/approved-top-up-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {prepareApprovedWalletTopUpDraft}=await import('../.shopify/approved-top-up-test/wallet-top-up-checkout.server.js');
const shop='approved-package.myshopify.com',customer='gid://shopify/Customer/1',catalogue={productGid:'gid://shopify/Product/2',variantGid:'gid://shopify/ProductVariant/3'};
process.env.ALLOWED_SHOP=shop;
const admin=(change={})=>({graphql:async()=>Response.json({data:{shop:{myshopifyDomain:shop},productVariant:{id:catalogue.variantGid,taxable:false,requiresComponents:false,inventoryItem:{requiresShipping:false},product:{id:catalogue.productGid,isGiftCard:false,requiresSellingPlan:false},...change}}})});
test('current packages prepare exact paid native checkout amount, separate approved bonus and no shipping/discounts',async()=>{
 const result=await prepareApprovedWalletTopUpDraft(admin(),shop,customer,87000,catalogue);
 assert.equal(result.input.lineItems[0].priceOverride.amount,'870.00');
 assert.deepEqual(result.creditPlan,{policyVersion:'merchant-20261015',packageId:'regular',customerFundedMinor:87000,foodOnlyBonusMinor:8500,totalMinor:95500,expiryYears:1,reminderMonthsBefore:1});
 assert.equal(result.input.allowDiscountCodesInCheckout,false);assert.equal(result.input.acceptAutomaticDiscounts,false);
 assert.equal((await prepareApprovedWalletTopUpDraft(admin(),shop,customer,269000,catalogue)).input.lineItems[0].priceOverride.amount,'2690.00');
});
test('old tiers, browser-selected bonuses, native shipping/tax and live-store access cannot prepare a current package',async()=>{
 await assert.rejects(prepareApprovedWalletTopUpDraft(admin(),shop,customer,2000,catalogue),/approved/);
 await assert.rejects(prepareApprovedWalletTopUpDraft(admin(),shop,customer,{paidMinor:87000,bonusMinor:999999},catalogue),/approved/);
 await assert.rejects(prepareApprovedWalletTopUpDraft(admin({taxable:true}),shop,customer,87000,catalogue),/verified/);
 await assert.rejects(prepareApprovedWalletTopUpDraft(admin({inventoryItem:{requiresShipping:true}}),shop,customer,87000,catalogue),/verified/);
 await assert.rejects(prepareApprovedWalletTopUpDraft(admin(),'unapproved.myshopify.com',customer,87000,catalogue));
});
