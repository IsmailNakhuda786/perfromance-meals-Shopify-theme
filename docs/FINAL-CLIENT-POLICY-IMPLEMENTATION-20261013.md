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
Rewards and top-ups remain OFF. No new real/test financial operation executed.

Pending: native paid-order funding/line allocation verifier, actual native earning
and redemption QA, uncertain-credit recovery receipt reconciliation, authorized
Support approval/refund execution, subscription actions, and existing top-up gates.
The merchant must specify how mixed sources allocate between food and delivery;
Shopify payment transactions are order-level. No guessed allocation is activated.
Toolkit customer-account source validator is unavailable because its bundled types
index is missing; local backend/type/lint/build checks are not native UI proof.

Historical private QA evidence is preserved in the original workspace. Earned Rewards remain available on
Support-approved refunds (Option A). No automatic reward reversal hook is added.
