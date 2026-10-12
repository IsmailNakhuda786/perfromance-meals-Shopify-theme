export function recurringPlans(variant) {
  return (variant?.plans || []).filter((plan) => plan.recurring === true);
}

export function resolvePurchase(model, variant, selectedPlanId) {
  const mode = model.purchaseMode || 'single';
  const subscription = mode === 'subscription';
  const plan = subscription ? recurringPlans(variant).find((item) => String(item.id) === String(selectedPlanId)) : null;
  const oneTimeAllowed = !(variant?.requiresSellingPlan ?? model.requiresSellingPlan);
  const available = Boolean(variant?.available && (subscription ? plan && model.hasContents : oneTimeAllowed));
  const price = subscription ? plan?.price || model.unavailablePrice : variant?.price || '';
  const comparePrice = subscription ? plan?.comparePrice || '' : variant?.comparePrice || '';
  const perMealPrice = subscription ? plan?.perMealPrice || null : variant?.perMealPrice || null;
  const accountBlocked = Boolean(subscription && model.requireAccount && !model.loggedIn);
  return { mode, subscription, plan, available, accountBlocked, canSubmit: available && !accountBlocked, price, comparePrice, perMealPrice };
}
