# Exact prepaid pricing — Shopify Support, 23 October 2026

Written case **71363301**, advisor Dimple: https://help.shopify.com/en/inbox/14333996

Support describes the one-/two-cent prepaid differences as per-delivery rounding, and recommends the calculation API with manual line corrections for exact recurring amounts. Automatic checkout discounts are not guaranteed to transfer to every prepaid renewal. Support suggests showing the correct price in the selling-plan name/description where the recurring checkout summary cannot be customized.

These are Support statements, not completed integration acceptance. The existing calculation-only inspector proves the explicit manual projection, not a committed correction or automatic initial-checkout transfer. Exact merchant prices remain unchanged. Initial and renewal execution at those exact prices, complete policy preservation and accurate customer-facing disclosure still require verification. No contract correction or new charge was executed on this guidance.

Support directs formal developer confirmation of automatic discount transfer through the relevant Partner Organization. No Partner authentication or application submission has been performed. This case remains separate from Wallet case71332405.

Official calculation migration guidance: https://shopify.dev/docs/apps/build/purchase-options/subscriptions/contracts/migrate-to-subscription-calculation-api

That guide says omitted top-level update fields remain unchanged, while supplied list fields such as lines/manualDiscounts replace complete lists. Any future correction must preserve all unrelated state and discounts and must not commit from an incomplete snapshot. No live correction worker has been enabled.
