# Customer future-renewal stop — 23 October 2026

A development-only backend and authenticated customer-account endpoint now implement stopping future automatic renewals without cancelling an already-paid order, removing paid deliveries, changing a saved Meal Plan, refunding a payment or crediting Wallet.

## Guarded implementation

- Disabled by default and rejected in production. Development activation additionally requires one explicitly scoped QA customer and a list of QA contract IDs. No account button is active.
- Customer identity comes from the verified Shopify customer-account token, never the request body. POST requests require a bounded JSON payload, a UUID request key and explicit STOP_FUTURE_RENEWALS confirmation.
- Fresh native evidence binds the store, owning Core app, customer, original order and every contract line to validated original operational records. Shared contracts with unmapped lines, quarantined orders and changed Meal Plan bindings are refused.
- A unique durable intent is saved before native submission. A second ownership/mapping read occurs before the customer-actor cancel mutation. Repeated/concurrent requests cannot send a second cancellation.
- Native rejection requires review. A lost/ambiguous response stays UNKNOWN and is not blindly retried. A fresh CANCELLED read can reconcile that same operation; an externally reactivated contract is not automatically cancelled again.
- Successful completion requires both fresh native cancellation evidence and durable audit confirmation. Paid entitlement, dispatch, order-cancellation and Wallet models are untouched.

## Verification and limits

432 isolated Core tests pass, including customer authentication/payload boundaries, concurrency, response loss, original-paid-plan preservation, cross-customer/app/order rejection, production/default-off guards and privacy classification. TypeScript, lint, production-schema mirror and Admin 2026-10 operation validation pass.

SQLite migrations were applied only to a disposable regression database. PostgreSQL migration structure was independently exercised in a uniquely named temporary schema: 11 columns and three indexes verified, then that schema removed. Hashes of 14 protected development models are unchanged. The additive migration was then applied to the development public schema after confirming it was the only pending migration. All 14 protected-model hashes remain unchanged, the new audit table contains zero customer-operation rows and customer activation remains off. No production database or real customer record was changed.

A native read-only harness verifies both existing QA contract statuses are CANCELLED through the actual account-status reader. It does not create or repair persistent mappings. The new action guard also rejects those old unvalidated QA purchase anchors before any native mutation or audit write, as intended. No native cancellation was performed in this run.

Remaining: obtain a correctly routed subscription purchase; verify the actual authenticated customer action and recovery path; preserve remaining paid delivery entitlements in the full native flow. Exact checkout/renewal pricing remains a separate release hold. No general subscription sales or customer management control is enabled.

## Hidden customer control

The account reader now exposes a read-only capability only after the same fresh ownership/mapping checks. Pending or changed operations require Support; default-off activation performs no audit-table access. The customer control requires explicit confirmation, sends one token-bound request and never automatically retries. Timeout, interrupted authentication, late responses and mismatched contract responses remain unconfirmed. The new client adds no refund or paid-delivery action.

Full 432-test suite, TypeScript, lint, production-schema mirror and local account-extension bundle pass. Shopify component validation was attempted but its bundled dependencies/type index are missing; this is not reported as a validator pass. The control remains hidden in native accounts and has not received native customer-action acceptance.

## Fresh native preservation check

A read-only comparison against both saved original paid QA-order snapshots confirms that the cancelled 3-/6-delivery contracts leave their original paid orders uncancelled. All nine fulfillment records retain the same IDs, dates, statuses, total/remaining quantities and original line references. No native mutation was submitted. This proves preservation for those existing isolated lifecycle tests, not acceptance of the new customer endpoint or merchant delivery calendar.
