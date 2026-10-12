import test from 'node:test';
import assert from 'node:assert/strict';
import {mealPlanBilling} from '../meal-plan-billing.mjs';

test('both 60-day programmes charge upfront without renewal or a recurring cadence', () => {
  for (const key of ['6by60', '6by60plus']) {
    assert.deepEqual(mealPlanBilling(key), {recurring: false, billing: null, paymentMode: 'upfront', automaticRenewal: false, durationDays: 60});
  }
});

test('existing recurring programmes retain their approved cadence; unknown programmes fail closed', () => {
  for (const [key, interval, intervalCount] of [['bi-weekly', 'WEEK', 2], ['monthly', 'MONTH', 1], ['2-months', 'MONTH', 2]]) {
    assert.equal(mealPlanBilling(key).recurring, true);
    assert.deepEqual(mealPlanBilling(key).billing, {interval, intervalCount});
  }
  assert.throws(() => mealPlanBilling('invented-programme'), /Unknown approved/);
});
