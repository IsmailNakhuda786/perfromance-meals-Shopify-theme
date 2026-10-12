const cadence = {
  'bi-weekly': {interval: 'WEEK', intervalCount: 2},
  monthly: {interval: 'MONTH', intervalCount: 1},
  '2-months': {interval: 'MONTH', intervalCount: 2},
};

export function mealPlanBilling(key) {
  if (key === '6by60' || key === '6by60plus') {
    return {recurring: false, billing: null, paymentMode: 'upfront', automaticRenewal: false, durationDays: 60};
  }
  if (!cadence[key]) throw new Error(`Unknown approved Meal Plan programme: ${key}`);
  return {recurring: true, billing: {...cadence[key]}, paymentMode: 'subscription', automaticRenewal: true};
}
