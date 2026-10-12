import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { renderPage } from '../preview.mjs';
import { createFixtures } from '../fixtures.mjs';
import { recurringPlans, resolvePurchase } from '../../theme/assets/catalog-purchase.js';
const routes = ['/', '/collections/ready-series','/collections/ready-series-bundles','/collections/ready-series-subscriptions','/pages/meal-plan','/pages/meal-plan-builder','/pages/about','/pages/rewards','/pages/gift-card','/products/grilled-chicken','/products/protein-bundle','/search?q=chicken','/cart'];
test('all approved theme routes render together with complete translations, unique ids and valid purchase JSON', async () => {
  for (const route of routes) {
    const html = await renderPage(route); const $ = load(html);
    assert.equal($('main').length,1,route);
    assert.ok($('main').text().trim().length > 20,route);
    assert.doesNotMatch(html,/translation missing|ReactDOM|vite\/client|Download HTML|QA handoff|build.a.box/i,route);
    const ids = $('[id]').map((_,element)=>$(element).attr('id')).get();
    assert.equal(new Set(ids).size,ids.length,`duplicate ids: ${route}`);
    for (const element of $('script[type="application/json"]').toArray()) assert.doesNotThrow(()=>JSON.parse($(element).text()),route);
  }
});
test('one-time modes never render selling plan inputs; subscription requires recurring allocation and bundle contents', async () => {
  for (const route of ['/collections/ready-series','/collections/ready-series-bundles']) {
    const $ = load(await renderPage(route)); assert.equal($('[name="selling_plan"]').length,0); assert.ok($('[data-product-card]').length > 0);
  }
  const $ = load(await renderPage('/collections/ready-series-subscriptions',{loggedIn:true}));
  assert.equal($('[data-product-card]').length,2);
  assert.equal($('[data-product-card]').first().find('[name="selling_plan"] option').length,2);
  assert.ok($('[data-product-card]').last().find('[data-add-button]').is('[disabled]'));
  assert.match($('[data-product-card]').first().find('a').first().attr('href'),/selling_plan=501/);
});
test('subscription context survives the product details route', async () => {
  const $ = load(await renderPage('/products/protein-bundle?variant=2010&selling_plan=501',{loggedIn:true}));
  assert.equal($('[data-product-purchase]').first().attr('data-purchase-mode'),'subscription');
  assert.ok($('[name="selling_plan"]').length > 0);
});
test('purchase resolver cannot fall back to one-time price for missing recurring allocations', () => {
  const model = {purchaseMode:'subscription',hasContents:true,unavailablePrice:'Unavailable'};
  const variant = {available:true,price:'S$59.90',plans:[{id:1,recurring:false,price:'S$49.90'},{id:2,recurring:true,price:'S$54.90'}]};
  assert.equal(recurringPlans(variant).length,1);
  assert.equal(resolvePurchase(model,variant,1).canSubmit,false);
  assert.equal(resolvePurchase(model,variant,1).price,'Unavailable');
  assert.equal(resolvePurchase(model,variant,2).canSubmit,true);
  assert.equal(resolvePurchase({...model,hasContents:false},variant,2).canSubmit,false);
  assert.equal(resolvePurchase({...model,requireAccount:true,loggedIn:false},variant,2).canSubmit,false);
  assert.equal(resolvePurchase({purchaseMode:'single'}, {...variant,requiresSellingPlan:true},2).canSubmit,false);
});
test('Meal Plan data uses variant IDs, allocation prices, actual metaobject windows and fails closed without configuration', async () => {
  const $ = load(await renderPage('/pages/meal-plan-builder',{loggedIn:true}));
  const config = JSON.parse($('[data-meal-plan-config]').text());
  assert.equal(config.programmes.length,2); assert.equal(config.programmes[0].variants[0].id,3010);
  assert.equal(config.programmes[0].variants[0].plans[0].id,601);
  assert.equal(config.weeks[0].windows[0].days,3);
  assert.equal(config.weeks[0].windows[0].meals[0].id,101);
  const empty = load(await renderPage('/pages/meal-plan-builder',{emptyFixtures:true}));
  assert.equal(JSON.parse(empty('[data-meal-plan-config]').text()).programmes.length,0);
  assert.equal(JSON.parse(empty('[data-meal-plan-config]').text()).weeks.length,0);
});
test('gift card uses native variants and Shopify recipient properties', async () => {
  const $ = load(await renderPage('/pages/gift-card'));
  assert.equal($('[name="id"][type="radio"]').length,4);
  for(const name of ['Recipient email','Recipient name','Message','Send on','__shopify_send_gift_card_to_recipient']) assert.ok($(`[name="properties[${name}]"]`).length,name);
  assert.equal($('form[data-product-form]').attr('action'),'/cart/add');
  const redemption=load(await renderPage('/gift_cards/review'));
  assert.match(redemption('main').text(),/S\$100.00 SGD/);
  assert.ok(redemption('code').text().replaceAll(' ','').includes('REVIEWNOTVALID'));
});
test('cart shows actual selling plan and hides private line properties', async () => {
  const fixtures=createFixtures(); const variant=fixtures.bundle.variants[0];
  const item={key:'2010:501',index:1,product:fixtures.bundle,variant,quantity:1,url:fixtures.bundle.url,image:fixtures.bundle.featured_image,original_line_price:5490,final_line_price:5490,selling_plan_allocation:variant.selling_plan_allocations[0],properties:{Programme:'Protein Bundle',_secret:'hidden'},line_level_discount_allocations:[]};
  const $=load(await renderPage('/cart',{fixtures,cart:{items:[item],item_count:1,total_price:5490,'empty?':false,currency:{iso_code:'SGD'},cart_level_discount_applications:[]}}));
  assert.match($('main').text(),/Monthly delivery/); assert.doesNotMatch($('main').text(),/_secret|hidden/);
  assert.equal($('main [data-cart-quantity]').attr('data-key'),'2010:501');
});

test('Gift Card denominations use native price order and preserve explicitly selected variants',async()=>{
 const fixtures=createFixtures(),gift=fixtures.gift;
 gift.variants.reverse();gift.selected_or_first_available_variant=gift.variants[0];
 let page=load(await renderPage('/pages/gift-card',{fixtures}));
 assert.deepEqual(page('[data-gift-variant]').map((i,e)=>Number(page(e).attr('value'))).get(),[4010,4011,4012,4013]);
 assert.equal(page('[data-gift-variant]:checked').attr('value'),'4011');
 gift.selected_variant=gift.variants.find(v=>v.price===10000);gift.selected_or_first_available_variant=gift.selected_variant;
 page=load(await renderPage('/pages/gift-card',{fixtures}));
 assert.equal(page('[data-gift-variant]:checked').attr('value'),'4012');
});
