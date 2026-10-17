import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { createFixtures } from '../fixtures.mjs';
import { renderPage } from '../preview.mjs';

test('ordinary Ready Series food combines after discounts and excludes purchased Gift Cards', async () => {
  const fixtures = createFixtures();
  const line = (product, price, index) => ({ product, variant: product.variants[0], quantity: 1, key: `line-${index}`, index, url: product.url, original_line_price: price, final_line_price: price, properties: {} });
  for (const [ready, meal, expected] of [[6000, 6499, 12499], [6000, 6500, 12500], [6000, 7000, 13000]]) {
    const items = [line(fixtures.bundle, ready, 0), line(fixtures.meals[0], meal, 1), line(fixtures.gift, 10000, 2)];
    const $ = load(await renderPage('/cart', { fixtures, settings: {food_delivery_policy_verified:true}, cart: { items, item_count: 3, total_price: ready + meal + 10000, 'empty?': false, currency: { iso_code: 'SGD' }, cart_level_discount_applications: [] } }));
    const progress = $('main [data-delivery-eligible-total]');
    assert.equal(Number(progress.attr('data-delivery-eligible-total')), expected);
    assert.match(progress.text(), expected >= 12500 ? /You qualify for free delivery/ : /Add .* more for free delivery/);
    assert.ok(Number(progress.find('[role="progressbar"]').attr('aria-valuenow')) <= 100);
  }
});

test('Gift Card-only carts do not display food-delivery eligibility', async () => {
  const fixtures = createFixtures();
  const items = [{ product: fixtures.gift, variant: fixtures.gift.variants[0], quantity: 1, key: 'gift', index: 0, url: fixtures.gift.url, final_line_price: 20000, original_line_price: 20000, properties: {} }];
  const $ = load(await renderPage('/cart', { fixtures, settings: {food_delivery_policy_verified:true}, cart: { items, item_count: 1, total_price: 20000, 'empty?': false, currency: { iso_code: 'SGD' }, cart_level_discount_applications: [] } }));
  assert.equal($('main [data-delivery-eligible-total]').length, 0);
});

test('eligibility accounts for Shopify line and cart discount allocations once', async () => {
  const fixtures = createFixtures();
  const items = [{ product: fixtures.bundle, variant: fixtures.bundle.variants[0], quantity: 1, key: 'food', index: 0, url: fixtures.bundle.url, original_line_price: 13000, final_line_price: 12500, discount_allocations: [{ amount: 500 }, { amount: 1000 }], properties: {} }];
  const $ = load(await renderPage('/cart', { fixtures, settings: {food_delivery_policy_verified:true}, cart: { items, item_count: 1, total_price: 11500, 'empty?': false, currency: { iso_code: 'SGD' }, cart_level_discount_applications: [] } }));
  assert.equal($('main [data-delivery-eligible-total]').attr('data-delivery-eligible-total'), '11500');
  assert.doesNotMatch($('main [data-delivery-eligible-total]').text(), /You qualify/);
});

test('delivery-included packages cannot make ordinary food qualify for free delivery',async()=>{
 const fixtures=createFixtures();
 const line=(product,price,key,extra={})=>({product,variant:product.variants[0],quantity:1,key,index:0,url:product.url,original_line_price:price,final_line_price:price,properties:{},...extra});
 for(const included of [line(fixtures.recurring,30000,'plan'),line(fixtures.bundle,30000,'prepaid',{selling_plan_allocation:{selling_plan:{id:501}}})]){
  const items=[line(fixtures.meals[0],2000,'ordinary'),included];
  const $=load(await renderPage('/cart',{fixtures,settings:{food_delivery_policy_verified:true},cart:{items,item_count:2,total_price:32000,'empty?':false,currency:{iso_code:'SGD'},cart_level_discount_applications:[]}}));
  assert.equal($('main [data-delivery-eligible-total]').attr('data-delivery-eligible-total'),'2000');
  assert.doesNotMatch($('main [data-delivery-eligible-total]').text(),/You qualify/);
 }
});

test('unverified native checkout rates never show a free-delivery promise',async()=>{
 const fixtures=createFixtures(),product=fixtures.meals[0];
 const items=[{product,variant:product.variants[0],quantity:1,key:'food',index:0,url:product.url,original_line_price:20000,final_line_price:20000,properties:{}}];
 const $=load(await renderPage('/cart',{fixtures,cart:{items,item_count:1,total_price:20000,'empty?':false,currency:{iso_code:'SGD'},cart_level_discount_applications:[]}}));
 assert.equal($('main [data-delivery-eligible-total]').length,0);
 assert.match($('main').text(),/Delivery availability and charges are confirmed at checkout/);
});
