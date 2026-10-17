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

Paid-event handler uses authenticated topic/event guards and is registered in
Performance Meals Development through Shopify’s supported SDK.
Tests prove retry continues earning verification after routing was persisted and
reject invalid events. Native paid-order delivery QA passed: one paid event produced the correct food-only
earning, and a signed duplicate handler replay produced no duplicate points.
Temporary customer-scoped activation was closed. General Rewards remains OFF.

Pending:
uncertain-credit recovery receipt reconciliation, authorized
Support approval/refund execution, subscription actions, and existing top-up gates.
Reward/bonus-funded food-versus-delivery allocation and nonzero-tax earning need
confirmation; those cases fail closed. No guessed allocation is activated.
Toolkit customer-account source validator is unavailable because its bundled types
index is missing; local backend/type/lint/build checks are not native UI proof.

Historical #1010/#1011 evidence is preserved. Earned Rewards remain available on
Support-approved refunds (Option A). No automatic reward reversal hook is added.

Latest validation: 95 Core tests plus the added changed-order Support regression,
33 theme tests, typecheck, lint, build and Theme Check passed. Unapproved tier
benefits and 90-day expiry promises are hidden without replacing the layout.
No theme push, release, production deployment or payment-setting change occurred.

Latest commencement clarification: use the saved selected start date in Singapore
time, not first dispatch. Bound customer/order selection dates are exposed as
Support evidence; absent or mixed dates remain unknown. Ready Series must assign
the next merchant preset commencement date, and Support may adjust that purchased
commitment. Exact updated delivery-calendar source remains unverified: GitHub
main is 58272e4. Browser access now confirms Figma Version 233 still contains
monthly deliveries and dates confirmed after sign-up. The merchant subsequently
described weekday delivery, then explicitly placed Ready Series subscriptions
on hold pending Jerome's confirmation of package quantities and delivery rules.
Do not activate or change those subscription resources while that decision is pending.
No guessed monthly schedule or automatic refund is introduced.

Ready Series Individual Selection and Bundles use merchant-configured delivery
dates and customer-selectable time slots. The reference checkout shows
6am–9am, 9am–12pm, 12pm–3pm and 3pm–6pm; its static September dates are demo
content and must not become production availability.

Read-only Rewards balances and history remain visible when earning/redemption
is disabled. Redemption controls require both activation and a reconciled ledger.
Browser verification confirms saved Rewards balances/history remain visible with
redemption disabled. Account loading has a bounded timeout and an explicit retry.
Core regression suite: 103 tests passed at the current checkpoint; typecheck,
lint, backend build and Shopify extension build passed.

Merchant-confirmed promotion eligibility uses completed payment time. The native
verifier reads successful SALE/CAPTURE transaction processedAt values and uses
the latest successful payment time. Authorizations cannot extend a promotion;
missing payment timestamps fail closed. Shopify GraphQL validation and a read-only
query against the existing approved paid test order both passed. No points were
reissued and no new order was created for this verification.
