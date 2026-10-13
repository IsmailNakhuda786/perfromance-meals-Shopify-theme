# Final client Rewards and Support cancellation policy

Confirmed on 13 October 2026. Supersedes automatic 48-hour cancellation/refunds.

## Implemented

- Legacy customer cancellation route, service and native adapter reject automatic
  cancellation/refunds. Historical records/read-only reconciliation preserved.
- Authenticated Support request endpoint checks native order ownership and saves
  one persistent request per order. No financial/contract mutation occurs.
- Account displays Support review rather than an automatic-refund confirmation.
- Rewards earning uses original customer-paid food after discounts only; direct
  payments and customer-funded principal qualify. Gift Card/Reward/bonus funds,
  delivery, top-ups and purchased Gift Cards do not. Cents ignored.
- Configurable regular/product/stream rates and bounded product promotions are
  persistent and versioned; active promotions override regular rates, never stack.
- Redemption conversion fixed at 10 points = SGD 1. Points do not auto-convert.
- Redemption deducts points atomically with its operation record; native receipt
  precedes ledger credit. Replayed keys cannot double-credit. Lost responses hold
  the operation for reconciliation without retrying a financial mutation.
- Reward-funded Store Credit remains a distinct FIFO source, including returns.
- Privacy handlers cover the new customer records. No customer Admin UI added.

## Verification and boundaries

Isolated database tests cover policy guards, native adapter retirement, ownership,
request idempotency, configuration immutability, rates/date boundaries, prohibited
funding, exact conversion, ledger attribution and uncertain native responses.
GraphQL Store Credit credit mutation validates against Shopify 2026-10.
Additive development PostgreSQL migrations preserve existing financial/plan counts.
Scoped development Rewards QA passed and its activation is now OFF. Top-ups
remain OFF. Native earning readback passed exactly once. Native redemption passed
with one completed operation, matching point deduction, native Store Credit receipt
and Reward-funded ledger credit. Reload preserved both histories. Replaying the
same operation made zero further native credit calls. Earlier failed attempts
created no operation or financial transfer. The expired development session and
unreachable tunnel were restored before the successful test.

The native paid-order verifier checks successful payment receipts, discounts,
original Wallet funding lots, ownership and validated food-stream snapshots.
Gift Card value covers food first, proportionally across food lines; customer
money earns only on the remaining food. Wallet lots retain the approved FIFO rule.
Original payment-source evidence is also retained for Support review; an edited
order's changed total does not prevent the customer from requesting Support.

Pending: automatic paid-event integration,
uncertain-credit recovery receipt reconciliation, authorized
Support approval/refund execution, subscription actions, and existing top-up gates.
Reward/bonus-funded food-versus-delivery allocation and nonzero-tax earning need
confirmation; those cases fail closed. No guessed allocation is activated.
Toolkit customer-account source validator is unavailable because its bundled types
index is missing; local backend/type/lint/build checks are not native UI proof.

Historical evidence is preserved privately. Earned Rewards remain available on
Support-approved refunds (Option A). No automatic reward reversal hook is added.

Latest validation: 95 Core tests plus the added changed-order Support regression,
33 theme tests, typecheck, lint, build and Theme Check passed. Unapproved tier
benefits and 90-day expiry promises are hidden without replacing the layout.
No theme push, release, production deployment or payment-setting change occurred.
