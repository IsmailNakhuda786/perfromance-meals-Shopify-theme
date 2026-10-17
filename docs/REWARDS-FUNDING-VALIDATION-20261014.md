# Rewards funding checkpoint — 14 October 2026

Implemented the user's latest allocation decisions:

1. Gift Card credit covers eligible food first, distributed proportionally across food lines.
2. Reward-funded Wallet credit is allocated proportionally across the remaining food and delivery after Gift Card allocation.
3. Eligible food GST earns points only when funded by qualifying original customer money. Delivery and its tax do not earn points.
4. Native pre-tax line totals and tax evidence must reconcile with Shopify's actual paid order total. Unknown fees, incomplete shipping/tax evidence and unverified shared-commerce credit allocation hold earning instead of guessing.

Bonus allocation is not activated. Existing FIFO funding-source deduction remains unchanged. Product promotions still use completed payment time, override normal rates and never stack.

Validation: 110 Core tests pass; typecheck, lint, backend build and Shopify CLI native extension build pass. The updated Admin GraphQL query validates against API 2026-10. A read-only verification of the existing paid development meal order reconciles its SGD 12.90 qualifying food value without issuing additional points.

The official customer-account component validator cannot execute because its plugin directory lacks its required TypeScript dependency. The native CLI extension build succeeds. The account copy now describes qualifying food GST; a fresh rendered-copy check remains necessary.

Nonzero-GST cases are verified by focused reconciliation tests, not by a new paid Shopify tax order. No financial transfer, additional order, payment-setting change, deployment or theme publication was performed for this checkpoint. General Rewards and Wallet top-ups remain disabled pending their acceptance safeguards.
