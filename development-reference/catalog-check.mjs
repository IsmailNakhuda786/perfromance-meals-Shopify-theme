import assert from 'node:assert/strict';
import { chromium } from '../theme-tools/node_modules/playwright/index.mjs';
import { readFile } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
const js = await readFile(new URL('../theme/assets/catalog.js', import.meta.url), 'utf8');
const variants = [
  { id: 1, available: true, price: 'SGD $12.00', priceAmount: 1200, comparePrice: '', quantityMin: 2, quantityStep: 2, quantityMax: 8, plans: [{ id: 101, name: 'Every week', price: 'SGD $9.00', priceAmount: 900, comparePrice: 'SGD $12.00', description: 'Weekly recurring delivery' }] },
  { id: 2, available: true, price: 'SGD $15.00', priceAmount: 1500, comparePrice: '', quantityMin: 1, quantityStep: 1, quantityMax: null, plans: [{ id: 202, name: 'Every month', price: 'SGD $13.00', priceAmount: 1300, comparePrice: 'SGD $15.00', description: 'Monthly recurring delivery' }] },
  { id: 3, available: false, price: 'SGD $16.00', priceAmount: 1600, comparePrice: '', quantityMin: 1, quantityStep: 1, quantityMax: null, plans: [] },
  { id: 4, available: true, price: 'SGD $18.00', priceAmount: 1800, comparePrice: '', quantityMin: 1, quantityStep: 1, quantityMax: null, plans: [] },
];
function purchase(id, required, updateUrl = false) {
  return `<div id="${id}" data-product-purchase ${updateUrl ? 'data-update-url' : ''}><span data-price></span><s data-compare-price></s><form data-product-form><select name="id" data-variant-select>${variants.map(v => `<option value="${v.id}">${v.id}</option>`).join('')}</select><div data-selling-plan-wrapper><select name="selling_plan" data-selling-plan-select>${required ? '' : '<option value="">One-time purchase</option>'}<option value="101">Every week</option></select><p data-plan-description></p></div><input name="quantity" type="number" min="1" step="1" value="1"><button type="button" data-quantity-step="1">+</button><button type="submit" data-add-button data-add-label="Add to cart" data-unavailable-label="Unavailable">Add to cart</button></form><script type="application/json" data-variants>${JSON.stringify({requiresSellingPlan: required, oneTimeLabel:'One-time purchase', variants})}</script></div>`;
}
const html = `<!DOCTYPE html><html><body>${purchase('optional', false, true)}${purchase('required', true)}<a href="/products/meal" data-quick-view="quick">Quick view</a><dialog id="quick" data-quick-dialog><button data-dialog-close>Close</button></dialog><div data-product-tabs><nav><a data-product-tab="overview" href="#overview">Overview</a><a data-product-tab="nutrition" href="#nutrition">Nutrition</a><a data-product-tab="reviews" href="#ProductReviews">Reviews</a></nav><div id="overview" data-product-panel="overview">Overview content</div><div id="nutrition" data-product-panel="nutrition">Nutrition content</div><div id="ProductReviews" data-product-panel="reviews">Review content</div></div></body></html>`;
await page.route('http://theme.test/**', route => route.fulfill({ contentType: 'text/html', body: html }));
await page.goto('http://theme.test/products/meal');
await page.addScriptTag({ content: js });
assert.equal(await page.locator('#optional [data-price]').textContent(), 'SGD $12.00');
assert.equal(await page.locator('#optional input[name="quantity"]').inputValue(), '2');
await page.locator('#optional [data-quantity-step]').click();
assert.equal(await page.locator('#optional input[name="quantity"]').inputValue(), '4');
await page.locator('#optional [data-selling-plan-select]').selectOption('101');
assert.equal(await page.locator('#optional [data-price]').textContent(), 'SGD $9.00');
assert.equal(await page.locator('#optional [data-compare-price]').textContent(), 'SGD $12.00');
assert.equal(await page.locator('#optional [data-plan-description]').textContent(), 'Weekly recurring delivery');
assert.equal(new URL(page.url()).searchParams.get('selling_plan'), '101');
await page.locator('#optional [data-variant-select]').selectOption('2');
assert.equal(await page.locator('#optional [data-selling-plan-select]').inputValue(), '');
assert.equal(await page.locator('#optional [data-price]').textContent(), 'SGD $15.00');
assert.equal(new URL(page.url()).searchParams.has('selling_plan'), false);
assert.equal(await page.locator('#optional [data-selling-plan-select] option[value="101"]').count(), 0);
await page.locator('#optional [data-selling-plan-select]').selectOption('202');
assert.equal(await page.locator('#optional [data-price]').textContent(), 'SGD $13.00');
assert.equal(await page.locator('#optional [data-add-button]').isDisabled(), false);
await page.locator('#optional [data-variant-select]').selectOption('3');
assert.equal(await page.locator('#optional [data-add-button]').isDisabled(), true);
assert.equal(await page.locator('#required [data-price]').textContent(), 'SGD $9.00');
assert.equal(await page.locator('#required [data-selling-plan-select]').inputValue(), '101');
await page.locator('#required [data-variant-select]').selectOption('4');
assert.equal(await page.locator('#required [data-add-button]').isDisabled(), true);
assert.equal(await page.locator('#required [data-selling-plan-select]').isDisabled(), true);
assert.equal(await page.locator('#required [data-selling-plan-select] option').count(), 0);
await page.locator('#required [data-variant-select]').selectOption('2');
assert.equal(await page.locator('#required [data-add-button]').isDisabled(), false);
assert.equal(await page.locator('#required [data-selling-plan-select]').inputValue(), '202');
await page.locator('[data-product-tab="reviews"]').click();
assert.equal(await page.locator('[data-product-panel="reviews"]').isVisible(), true);
assert.equal(await page.locator('[data-product-panel="overview"]').isVisible(), false);
await page.locator('[data-product-tab="reviews"]').focus();
await page.keyboard.press('ArrowLeft');
assert.equal(await page.locator('[data-product-panel="nutrition"]').isVisible(), true);
assert.equal(await page.locator('[data-product-tab="nutrition"]').getAttribute('aria-selected'), 'true');
await page.locator('[data-quick-view]').click();
assert.equal(await page.locator('#quick').evaluate(el => el.open), true);
await page.keyboard.press('Escape');
assert.equal(await page.locator('#quick').evaluate(el => el.open), false);
assert.equal(await page.locator('[data-quick-view]').evaluate(el => el === document.activeElement), true);
await page.locator('[data-quick-view]').click();
await page.evaluate(() => document.dispatchEvent(new CustomEvent('pm:cart-updated')));
assert.equal(await page.locator('#quick').evaluate(el => el.open), false);
await browser.close();
console.log('PASS: native variant/plan/price consistency, required-plan safety, quantity constraints, tabs, dialog focus and cart update.');
