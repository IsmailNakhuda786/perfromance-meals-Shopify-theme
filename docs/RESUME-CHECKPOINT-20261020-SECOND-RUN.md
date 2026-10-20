# Resume checkpoint —20October2026, second run

Resumed source aa6c3ed on shopify/theme-migration-v2. Preserve all unrelated changes.
Five-hour pause threshold remains5%remaining; weekly1%. No production, publication,
payment setup, real identities/bank details or terms acceptance authorized.
Top-ups, paid-delivery draft activation, general Rewards and automatic cancellation
remain off. Logan's final correction is saved in the gateway investigation: strictly
dev-only placeholders may be attempted, without supplied values or success guarantee.
Chat ended; no ticket number supplied. Do not invent verification information.

## Verified implementation

- Read-only native calculation verifier, with identity/policy/amount/visibility guards.
- All8approved draft package configurations/16terms match native projected totals.
- No contracts, orders, charges or product changes. No payment method attached.
- Neutral native unit-price observation replaces the misleading per-delivery label;
  actual upfront receipts remain independently required and renewal unverified.
- Native UUID SubscriptionLine references accepted without relaxing other IDs or
  ownership checks.353Core tests/typecheck/lint and6PostgreSQL link fixtures pass.
- No migrations or new public endpoint/worker/activation.

See CORE-PREPAID-CALCULATION-QA-20261020.md for the price matrix and evidence limits.
Toolkit calculation schema is stale relative to native schema; actual operations
validate against native introspection. Do not claim Toolkit validation passed.

## Approved real email QA

User approved exactly one simulated Ready Series delivery email to their QA inbox.
Existing free Resend sending-only key reused; one stable key and private receipt.
Provider accepted it, and dashboard confirmed Delivered against the exact receipt.
No booking/order was implied: the message explicitly labels the23October9am–12pm
Singapore slot as a development test with no delivery booked. No second send,
WhatsApp, automatic schedule or balance change. Private receipt and screenshot
remain excluded from public backup. This is transport QA, not production sender,
booking proof or durable reminder-worker acceptance.

## Next work

Continue independent #2/#3/#4/#13/#15 fulfilment and lifecycle verification. Actual
paid subscription checkout and renewals still need a supported payment setup.
A successful calculation does not authorize committing a contract or billing.
Production senders, WhatsApp setup and scheduler activation remain explicit gates.
Save sanitized source checkpoints; never include .env/.shopify secrets/customer data.

## Follow-up after user requested continued work

Fixed late-purchase catch-up rescheduling: validate the complete original plus
catch-up history before moving a draft, preserve superseded rows, return only
active reminders on same-date replay and reject damaged/processed history.
355Core tests and typecheck/lint pass. Database concurrency proof is recorded
separately after the focused PostgreSQL run. No sender/scheduler/route activation.
Fresh read-only final-verifier check passes all16existing native calculations;
no new calculation, contract, order, payment or message was created.

Focused PostgreSQL verification: all11reminder draft/catch-up/concurrency tests
pass in the existing development database with scoped fixture cleanup. No customer
records, bookings, messages or balances were changed by these fixtures.

## Per-delivery business decision and implementation

User confirmed fees per physical delivery for ordinary food; prepaid stays included.
Core supports explicit trusted group-to-delivery mappings with per-delivery tiers,
stable one-fee handling for multiple groups of the same delivery and fail-closed
missing mappings/rates. Checkout wrapper does not expose the mappings and ambiguous
groups remain HELD. Native audit requires verified single-delivery context for a
fee match rather than inferring physical deliveries from native shipping lines.
360Core tests/typecheck/lint and25official WASM fixtures pass. Production schema
consistency passes; no deployment/settings/order/payment changes. See new fee report.

## Approved unpublished bundle purchase

One14-item Low Carb + Just Protein Mixed Bundle test completed by user at
SGD114.80(109.80food+5prepared shipping), fully paid through dummy gateway. Native
read confirms test PAID, one successful full-valueSALE, unchanged unpublished
product/components; Core has one VALIDATED ready_series line. Private receipts
remain under.shopify. Draft shipping was manually prepared, not Function evidence.

Fixed actual created/paid callback P2002 race using one bounded fresh persistence
transaction on OperationalLine/WebhookReceipt unique conflict, preserving winner
identity and transactional selection checks.361Core tests/typecheck/lint and6
PostgreSQL routing fixtures pass. No migrations/production/provider changes.
The dev tunnel was restored and native callbacks re-registered before payment.

## Account preview follow-up — not yet accepted

After restarting the tunnel, reconnecting through Shopify CLI's actual devUUID
restores the extension shell. The Core account API still shows its loading failure
banner on this fresh session. Do not call this a successful new account readback.
Earlier successful account evidence remains historical; saved data is not altered.
Investigate the account request boundary/timeout and preview bootstrap next, without
relaxing authentication or repeating any payment. Native order readback already
proves the bundle test. CLI dev process is intentionally running for continuation.
