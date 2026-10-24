# Registered prepaid renewal pipeline — 24 October 2026

Development evidence starting from `1933ae8`. Full agreed scope remains required. Top-ups stay disabled. This checkpoint makes no Shopify mutation, charge, refund, new order or paid-delivery change.

## Implemented

- Immutable, checksum-protected original-purchase evidence binds the paid package, original line, customer, app, contract, exact amount and explicit correction to its validated Core routing.
- An SDK-authenticated successful-billing endpoint durably records minimal triggers before doing slow native reads. Only registered purchases for the explicitly configured QA customer are accepted; absent context returns failure for retry rather than inventing a purchase.
- Native inspection proves the attempt, idempotency key, original contract/customer, captured test payment, exact net amount and actual correction allocation/GST. The processor reads the real Manual/Automatic allocation kind instead of assuming discount propagation.
- Bounded, cursor-based processors link verified renewal orders from stored evidence. Duplicate event IDs/attempts, concurrent workers, completed-page cursors and interrupted completion saves are covered. Unknown financial results remain pending/held; no billing action is retried.
- Missing record IDs cannot accidentally select the first customer record. Corrupt or cross-bound snapshots, changed payment, refunds/disputes, incorrect corrections and changed ownership fail closed.
- Production preflight blocks activation. The route and optional callback registration are disabled by default and production-rejected. No production release is implied.
- All three new customer-linked models are included in privacy classification and data-inspection coverage. Existing privacy execution remains a reviewed operational dependency.

## Evidence

- **489/489** disposable-database Core tests passed, zero skipped.
- **25/25** focused PostgreSQL tests passed for the new evidence/inbox lifecycle.
- TypeScript, lint and canonical/production schema consistency passed.
- Existing three-/six-delivery test renewals were processed using new local evidence rows and fresh read-only Shopify proof. Replaying both leaves completed inbox records and all four operational rows unchanged.
- Independent before/after proof preserved all **18 native paid fulfilments** and **nine protected financial models**. No native mutation or financial action occurred.
- Local HTTP against the real Shopify SDK: bad signature **401**; valid signed historical replay **200** in 1,458 ms; repeat **200** in 518 ms. One durable intake receipt, unchanged operational/inbox rows. This is synthetic historical replay, **not a new Shopify-generated billing event or load test**. The temporary localhost server was stopped afterward.
- Both additive migrations were applied to the development database. The first attempt caught an incorrect timestamp token before creating any new table; after confirming all three tables absent, that failed migration was marked rolled back, corrected and reapplied. Eleven protected Core/financial model snapshots were unchanged. No existing table or row was dropped.

Private native receipts, identities and signatures remain excluded from GitHub.

## Remaining acceptance gates

1. The original purchase-registration function still needs integration with an accepted server-side purchase configuration flow. Today it records only explicitly supplied, native-verified development snapshots. Unknown purchase context is retried, not durably resolved automatically.
2. A real provider-originated billing-success event must be observed through permanent staging, including event ordering and callback outages. The optional fifth callback has not been activated generally.
3. The batch processors require approved durable scheduling, monitoring and reconciliation; no in-process timer or temporary tunnel is accepted as production infrastructure.
4. Native proof is currently restricted to test payments and a single prepaid-only order line. Real payments, mixed/multiple packages, general discount provisioning and ongoing tax/price changes remain gated.
5. The exact-cent correction works for the verified single-package QA cases, but general production correction creation/propagation and customer-facing pricing acceptance remain incomplete. Whether multiple identical packages may be bought together is awaiting the user's business choice.
6. Full delivery calendar/capacity, reschedule and dispatch lifecycle, Wallet-funded renewals and supported Wallet architecture remain incomplete or blocked.

Shopify documents the billing-success trigger and that billing attempts are separate from contract creation: [Subscription contracts](https://shopify.dev/docs/apps/build/purchase-options/subscriptions/contracts). Native payment is re-read as proof, never inferred merely from that trigger.

The production matrix remains **1 PASS / 10 PARTIAL / 0 FAIL / 4 BLOCKED**. New integration evidence strengthens requirements 2, 14 and 15 without satisfying their remaining gates.
