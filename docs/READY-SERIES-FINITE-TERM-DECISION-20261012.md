# Ready Series finite prepaid terms — historical decision

**Superseded by Jerome’s confirmed monthly-delivery and automatic term-renewal policy. See READY-SERIES-MERCHANT-POLICY-20261014.md. This document preserves prior QA context and must not govern new selling-plan configuration.**

Authority: customer's 12 October clarification overrides earlier source wording and term-boundary renewal instructions. Ready Series retains its approved Subscription display label.

| Purchase | Charge | Delivery | Renewal |
| --- | --- | --- | --- |
| Ready Series 3 months | Entire approved term price upfront | 3 monthly deliveries | None |
| Ready Series 6 months | Entire approved term price upfront | 6 monthly deliveries | None |
| Meal Plan Biweekly | Upfront every 2 weeks | Existing approved coverage | Automatic |
| Meal Plan Monthly | Upfront every month | Existing approved coverage | Automatic |
| Meal Plan 2 Months | Entire 2 months upfront | Existing approved coverage | Automatic after 2 months |
| Meal Plan 6 by 60 / Plus | Entire programme upfront | 60 days from selected Monday, 88 weekday meals and 32 frozen meals | None |

## Implementation and evidence

- `theme-tools/ready-series-billing.mjs` defines a finite prepaid policy candidate: billing MONTH × 3/6 with exactly one billing cycle, delivery MONTH × 1. Shopify calls this a recurring policy because delivery repeats; that API terminology does not authorize a second charge.
- The policy auditor rejects monthly installment billing, missing/unlimited billing caps, and nonmonthly delivery. It is configuration validation, not proof of a native contract or payment.
- `theme-tools/audit-ready-series-plans.mjs` compares a paginated native readback with approved source `58272e4e011d03249b196d392319ad22fa8dc0ca`. It checks all five approved products and ten Beef/Non-Beef variants; it never creates products, plans, orders or charges.
- The 12 October dev-store readback shows invalid monthly Just Protein plans and missing plans for the other four products. All ten approved variant names exist. No group ownership is inferred from a null appId.
- Ready Series overview copy now describes prepaid terms without automatic renewal. Existing purchase guards remain closed pending native verification.
- Core's approved product-write and own-contract scopes are configured and the installed app's native scope readback confirmed their grant. This is not contract acceptance.

## Remaining gate

Use Core's own authenticated API session for new plans; do not create them under the CLI Connector's identity. Prove exact full-term native allocation and checkout charge amounts (especially amounts not evenly divisible into delivery cents), the single billing-cycle limit, and the 3/6 scheduled monthly fulfillments. Verify supported dev payment capability before preparing a subscription checkout. Obtain customer payment handoff for the final test payment, then verify original Shopify order, native contract, expiry/no recharge and customer-account management. Do not enable `prepaid_term_verified` on configuration evidence alone.

Official references: [billing policy cycle cap](https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/SellingPlanRecurringBillingPolicyInput), [prepaid selling plans](https://shopify.dev/docs/apps/build/purchase-options/subscriptions/selling-plans/build-a-selling-plan), [native allocation and checkout amounts](https://shopify.dev/docs/api/liquid/objects/selling_plan_allocation).

No Shopify data mutation, payment, order creation, theme push or publication was performed for this decision correction. Existing QA evidence remains unchanged. Production pricing and designs are not replaced with fixtures.
