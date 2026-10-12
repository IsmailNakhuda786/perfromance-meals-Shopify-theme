// Latest merchant decision: finite prepaid terms, not automatically renewed.
export function readySeriesBilling(months) {
  if (months !== 3 && months !== 6) throw new Error('Ready Series term must be 3 or 6 months');
  return {
    paymentMode: 'upfront', automaticRenewal: false, deliveries: months,
    billingPolicy: {recurring: {interval: 'MONTH', intervalCount: months, minCycles: 1, maxCycles: 1}},
    deliveryPolicy: {recurring: {interval: 'MONTH', intervalCount: 1}},
  };
}

// This checks configuration, not payment, pricing, or fulfillment execution.
export function auditReadySeriesPlan(plan, months) {
  const expected = readySeriesBilling(months);
  const billing = plan?.billingPolicy;
  const delivery = plan?.deliveryPolicy;
  const issues = [];
  if (!billing || billing.interval !== 'MONTH' || billing.intervalCount !== months) {
    issues.push('Billing must cover the full selected term upfront');
  }
  if (!billing || billing.minCycles !== 1 || billing.maxCycles !== 1) {
    issues.push('Only one billing cycle is allowed; automatic recharge is prohibited');
  }
  if (!delivery || delivery.interval !== 'MONTH' || delivery.intervalCount !== 1) {
    issues.push('Deliveries must be monthly');
  }
  return {valid: issues.length === 0, issues, expected};
}
