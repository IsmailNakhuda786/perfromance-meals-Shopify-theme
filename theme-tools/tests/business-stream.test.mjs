import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { renderPage } from '../preview.mjs';

test('all Ready Series native purchase forms snapshot canonical product metadata', async () => {
  for (const route of ['/products/grilled-chicken', '/collections/ready-series', '/collections/ready-series-bundles', '/collections/ready-series-subscriptions']) {
    const $ = load(await renderPage(route, { loggedIn: true }));
    const forms = $('[data-product-form]');
    assert.ok(forms.length > 0, route);
    for (const form of forms.toArray()) {
      assert.equal($(form).find('[name="properties[_pm_business_stream]"]').val(), 'ready_series', route);
      assert.equal($(form).find('[name="properties[_pm_stream_schema_version]"]').val(), '1', route);
    }
  }
});

test('Meal Plan programmes and menu windows retain explicit stream context', async () => {
  const $ = load(await renderPage('/pages/meal-plan-builder', { loggedIn: true }));
  const model = JSON.parse($('script[data-meal-plan-config]').text());
  assert.ok(model.programmes.length);
  assert.ok(model.weeks.length);
  for (const product of model.programmes) assert.equal(product.businessStream, 'meal_plan');
  for (const week of model.weeks) {
    assert.equal(week.businessStream, 'meal_plan');
    for (const window of week.windows) assert.equal(window.businessStream, 'meal_plan');
  }
});


test('native Gift Card form carries shared stream metadata', async () => {
  const $ = load(await renderPage('/pages/gift-card', { loggedIn: true }));
  assert.equal($('[name="properties[_pm_business_stream]"]').val(), 'shared');
  assert.equal($('[name="properties[_pm_stream_schema_version]"]').val(), '1');
});
