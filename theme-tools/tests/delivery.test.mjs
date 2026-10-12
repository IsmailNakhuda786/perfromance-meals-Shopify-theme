import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { createFixtures } from '../fixtures.mjs';
import { renderPage } from '../preview.mjs';

test('delivery threshold combines both food streams and excludes purchased Gift Cards', async () => {
  const fixtures = createFixtures();
  const line = (product, price, index) => ({ product, variant: product.variants[0], quantity: 1, key: `line-${index}`, index, url: product.url, original_line_price: price, final_line_price: price, properties: {} });
  for (const [ready, meal, expected] of [[6000, 5999, 11999], [6000, 6000, 12000], [6000, 7000, 13000]]) {
    const items = [line(fixtures.bundle, ready, 0), line(fixtures.recurring, meal, 1), line(fixtures.gift, 10000, 2)];
    const $ = load(await renderPage('/cart', { fixtures, cart: { items, item_count: 3, total_price: ready + meal + 10000, 'empty?': false, currency: { iso_code: 'SGD' }, cart_level_discount_applications: [] } }));
    const progress = $('main [data-delivery-eligible-total]');
    assert.equal(Number(progress.attr('data-delivery-eligible-total')), expected);
    assert.match(progress.text(), expected >= 12000 ? /You qualify for free delivery/ : /Add .* more for free delivery/);
    assert.ok(Number(progress.find('[role="progressbar"]').attr('aria-valuenow')) <= 100);
  }
});

test('Gift Card-only carts do not display food-delivery eligibility', async () => {
  const fixtures = createFixtures();
  const items = [{ product: fixtures.gift, variant: fixtures.gift.variants[0], quantity: 1, key: 'gift', index: 0, url: fixtures.gift.url, final_line_price: 20000, original_line_price: 20000, properties: {} }];
  const $ = load(await renderPage('/cart', { fixtures, cart: { items, item_count: 1, total_price: 20000, 'empty?': false, currency: { iso_code: 'SGD' }, cart_level_discount_applications: [] } }));
  assert.equal($('main [data-delivery-eligible-total]').length, 0);
});

test('eligibility accounts for Shopify line and cart discount allocations once', async () => {
  const fixtures = createFixtures();
  const items = [{ product: fixtures.bundle, variant: fixtures.bundle.variants[0], quantity: 1, key: 'food', index: 0, url: fixtures.bundle.url, original_line_price: 13000, final_line_price: 12500, discount_allocations: [{ amount: 500 }, { amount: 1000 }], properties: {} }];
  const $ = load(await renderPage('/cart', { fixtures, cart: { items, item_count: 1, total_price: 11500, 'empty?': false, currency: { iso_code: 'SGD' }, cart_level_discount_applications: [] } }));
  assert.equal($('main [data-delivery-eligible-total]').attr('data-delivery-eligible-total'), '11500');
  assert.doesNotMatch($('main [data-delivery-eligible-total]').text(), /You qualify/);
});
