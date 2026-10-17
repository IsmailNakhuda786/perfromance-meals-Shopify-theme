// Confirmed17October: full term upfront,monthly delivery, calendar-month renewal.
// Configuration intent only; native multi-fulfilment/checkout support remains unverified.
export function readySeriesBilling(months) {
  if (months !== 3 && months !== 6) throw new Error('Ready Series term must be 3 or 6 months');
  return {
    paymentMode: 'upfront', automaticRenewal: true, deliveriesPerTerm: months,
    billingPolicy: {recurring: {interval: 'MONTH', intervalCount: months, minCycles: 1, maxCycles: null}},
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
  if (!billing || billing.minCycles !== 1 || billing.maxCycles !== null) {
    issues.push('The prepaid term must renew automatically without a fixed billing-cycle cap');
  }
  if (!delivery || !(delivery.interval === 'MONTH' && delivery.intervalCount === 1)) {
    issues.push('Deliveries must repeat monthly independently of calendar-month billing');
  }
  return {valid: issues.length === 0, issues, expected, nativeAcceptance: false};
}
