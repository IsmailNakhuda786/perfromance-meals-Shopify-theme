import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('setup inventory cannot reintroduce recurring 60-day programmes or obsolete plan options', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pm-manifest-'));
  const checkedIn = new URL('../../docs/MERCHANT-SETUP-MANIFEST.json', import.meta.url);
  const original = readFileSync(checkedIn, 'utf8');
  try {
    const output = path.join(dir, 'manifest.json');
    execFileSync(process.execPath, [new URL('../merchant-manifest.mjs', import.meta.url).pathname, output]);
    const manifest = JSON.parse(readFileSync(output, 'utf8'));
    const preserved = JSON.parse(original);
    for (const key of ['mealPlan', 'sellingPlans', 'authoritativeMerchantCatalogue']) {
      assert.deepEqual(preserved[key], manifest[key], `checked-in ${key} must match current billing rules`);
    }
    assert.equal(readFileSync(checkedIn, 'utf8'), original, 'review generation must preserve the checked-in inventory');
    assert.equal(manifest.mealPlan.products.length, 5);
    for (const key of ['6by60', '6by60plus']) {
      const product = manifest.mealPlan.products.find(item => item.key === key);
      assert.equal(product.kind, 'period');
      assert.equal(product.recurring, false);
      assert.equal(product.automaticRenewal, false);
      assert.equal(product.billing, null);
      assert.equal(product.paymentMode, 'upfront');
      assert.equal(product.durationDays, 60);
      assert.equal(product.weekdayMeals + product.frozenMeals, product.totalMeals);
      assert.equal(product.totalMeals, 120);
      assert.deepEqual(product.mealFrequencies, ['Lunch & Dinner']);
    }
    for (const key of ['bi-weekly', 'monthly', '2-months']) {
      const product = manifest.mealPlan.products.find(item => item.key === key);
      assert.equal(product.recurring, true);
      assert.equal(product.automaticRenewal, true);
    }
    assert.deepEqual(manifest.mealPlan.variantOptions, ['Balanced Regular', 'Weight Loss Regular', 'Weight Loss Petite']);
    assert.equal(manifest.sellingPlans.readySeries.length, 2);
    assert.match(manifest.sellingPlans.readySeries[0], /3-month/);
    assert.match(manifest.sellingPlans.readySeries[1], /6-month/);
    assert.match(manifest.authoritativeMerchantCatalogue.note, /calendar remains pending/);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});
