import test from 'node:test';
import assert from 'node:assert/strict';
import {readySeriesBilling, auditReadySeriesPlan} from '../ready-series-billing.mjs';
import {mealPlanBilling} from '../meal-plan-billing.mjs';

test('finite Ready Series terms reject monthly installments and unlimited renewal', () => {
  for (const months of [3, 6]) {
    const policy = readySeriesBilling(months);
    const valid = {billingPolicy: policy.billingPolicy.recurring, deliveryPolicy: policy.deliveryPolicy.recurring};
    assert.equal(auditReadySeriesPlan(valid, months).valid, true);
    assert.equal(auditReadySeriesPlan({...valid, billingPolicy: {...valid.billingPolicy, intervalCount: 1, minCycles: months, maxCycles: months}}, months).valid, false);
    assert.equal(auditReadySeriesPlan({...valid, billingPolicy: {...valid.billingPolicy, maxCycles: null}}, months).valid, false);
    assert.equal(auditReadySeriesPlan({...valid, deliveryPolicy: {interval: 'MONTH', intervalCount: months}}, months).valid, false);
  }
  assert.throws(() => readySeriesBilling(1), /3 or 6/);
  assert.equal(auditReadySeriesPlan(null, 3).valid, false);
});

test('Ready Series policy does not change Meal Plan renewal models', () => {
  for (const key of ['bi-weekly', 'monthly', '2-months']) assert.equal(mealPlanBilling(key).automaticRenewal, true);
  for (const key of ['6by60', '6by60plus']) assert.equal(mealPlanBilling(key).automaticRenewal, false);
});
