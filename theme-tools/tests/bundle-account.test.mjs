import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {renderPage} from '../preview.mjs';
import {resolvePurchase} from '../../theme/assets/catalog-purchase.js';
test('guest bundle purchase offers sign-in while individual food remains purchasable',async()=>{
 const bundle=load(await renderPage('/collections/ready-series-bundles'));
 assert.ok(bundle('[data-product-form]').length>0);
 bundle('[data-product-form]').each((_,form)=>{const node=bundle(form);assert.equal(node.find('[data-subscription-login]').text().trim(),'Sign in to buy this bundle →');assert.ok(node.find('[data-add-button]').is('[disabled][hidden]'));});
 const individual=load(await renderPage('/collections/ready-series'));assert.equal(individual('[data-subscription-login]').length,0);
 const model={purchaseMode:'bundles',requireAccount:true,loggedIn:false};const variant={available:true,requiresSellingPlan:false};assert.equal(resolvePurchase(model,variant).canSubmit,false);assert.equal(resolvePurchase({...model,loggedIn:true},variant).canSubmit,true);
});
test('signed-in bundle forms retain native purchase fields',async()=>{const page=load(await renderPage('/collections/ready-series-bundles',{loggedIn:true}));assert.equal(page('[data-subscription-login]').length,0);assert.ok(page('[data-product-form] [name="id"]').length>0);assert.equal(page('[name="selling_plan"]').length,0);assert.ok(page('[data-product-form] [data-add-button]:not([hidden])').length>0);});
