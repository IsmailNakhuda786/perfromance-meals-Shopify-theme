# Exact prepaid pricing — Shopify Support, 23 October 2026

Written case **71363301**, advisor Dimple: https://help.shopify.com/en/inbox/14333996

Support describes the one-/two-cent prepaid differences as per-delivery rounding, and recommends the calculation API with manual line corrections for exact recurring amounts. Automatic checkout discounts are not guaranteed to transfer to every prepaid renewal. Support suggests showing the correct price in the selling-plan name/description where the recurring checkout summary cannot be customized.

These are Support statements, not completed integration acceptance. The existing calculation-only inspector proves the explicit manual projection, not a committed correction or automatic initial-checkout transfer. Exact merchant prices remain unchanged. Initial and renewal execution at those exact prices, complete policy preservation and accurate customer-facing disclosure still require verification. No contract correction or new charge was executed on this guidance.

Support directs formal developer confirmation of automatic discount transfer through the relevant Partner Organization. No Partner authentication or application submission has been performed. This case remains separate from Wallet case71332405.

Official calculation migration guidance: https://shopify.dev/docs/apps/build/purchase-options/subscriptions/contracts/migrate-to-subscription-calculation-api

That guide says omitted top-level update fields remain unchanged, while supplied list fields such as lines/manualDiscounts replace complete lists. Any future correction must preserve all unrelated state and discounts and must not commit from an incomplete snapshot. No live correction worker has been enabled.


## Approved no-charge persisted-correction QA

The user separately approved committing two temporary development subscription records without any payment method: the three-delivery SGD 255.20 and six-delivery SGD 493.60 examples. Fresh read-only checks first reconfirmed both immutable calculations, exact net totals, unlimited manual correction and absence of payment methods. The operations were validated against the authenticated Admin 2026-10 schema; the bundled Toolkit schema omits the documented calculation-commit mutation and is not counted as a validation pass for it.

Both calculations were committed and independently read back. Their single line retained the expected base price (255.21 / 493.62), manual line-scoped correction (0.01 / 0.02), unlimited recurring duration, correct customer/app/product/variant, zero delivery charge, three-/six-month billing and monthly delivery. Both records had no payment method and no original order. Both were immediately cancelled and freshly verified CANCELLED. No billing-attempt/order mutation was called, no checkout was submitted and no existing subscription was modified.

This verifies persistence of the exact-price correction only. It does not prove automatic checkout propagation, exact first checkout price, a real test renewal charge, or the checkout recurring-price display. These remain explicit release holds. The approved catalogue prices remain unchanged.
