# Development callback and missed-order recovery

Verified 23–24 October 2026, starting from `e066401`. Development only; top-ups stay disabled. No Shopify orders, payments, captures, refunds, Wallet credits or paid deliveries were created or modified during recovery.

## Connection and cause

The previous temporary tunnel hostname no longer resolved. The existing app preview was restarted, then all four existing order/create, order/updated, order/paid and subscription/create callback topics were re-registered and read back: exactly one current callback per topic. The public app returned HTTP 200 and the customer-account preview loaded again.

The exact cause of the old process ending is not established. There is no evidence of a fixed expiration timer. A temporary local tunnel depends on its local process and server; its address is unsuitable as a permanent callback. The restart also needed the existing temporary Rust toolchain on the process PATH to build the Function; no system toolchain installation was made.

Cloudflare describes Quick Tunnels as temporary development/testing endpoints with no uptime guarantee. Shopify documents that development origins change between app-dev sessions. API-created webhook subscriptions can be removed after repeated delivery failures. Sources: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/), [Shopify delivery verification](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries), [Shopify troubleshooting](https://shopify.dev/docs/apps/build/webhooks/troubleshoot).

## Recovered existing orders

| Term | Existing initial order | Existing renewal order | Exact amount each | Paid native fulfilments preserved |
| --- | --- | --- | --- | --- |
| Three deliveries | #1020 | #1021 | SGD 255.20 | 6 |
| Six deliveries | #1022 | #1023 | SGD 493.60 | 12 |

All four were absent from Core before recovery. Fresh native proof established test payment, exact amount, correct app/customer/product/variant, original order, successful billing attempt and matching renewal idempotency key. The existing order router created four validated operational rows. The original-subscription linker and new development-only verified renewal linker associated the correct contract without changing native orders or deliveries.

A second complete pass produced identical operational rows and no duplicate audit receipts. All 18 paid native fulfilment snapshots remained unchanged. Previously cancelled QA contracts remained cancelled; the independent nine-financial-model preservation check also passed. The new linker rejects foreign customers/apps, real payments, mismatched attempts, quarantined rows and production use. It is a recovery safeguard, not a general automatic production renewal implementation.

## HTTP and customer evidence

- Invalid webhook signature: HTTP 401.
- Correctly signed synthetic replay of an existing recovered order: HTTP 200 twice, with all four operational rows unchanged.
- This proves live ingress/signature/replay handling, **not a fresh Shopify-initiated event**. No new order was placed merely to generate an event.
- Reconnected signed-in account displayed three stopped-renewal subscription cards (including the earlier test), without duplicate cards for renewal orders. Existing 6 by 60 programmes remained visible.
- Private receipts and screenshots stay in ignored local storage; no identities, credentials or authenticated checkout URLs belong in the public backup.

## Pricing disclosure correction

The native “Recurring subtotal” tooltip explicitly says it excludes shipping, tax, duties and applicable discounts. Therefore SGD 255.21 / 493.62 are gross subtotals before the one-/two-cent correction, **not incorrect final renewal charges**. The actual verified first and renewal payments were SGD 255.20 / 493.60. Earlier reports describing the subtotal as a wrong final price were inaccurate. No catalogue price has been changed.

A clear net-price explanation in the Core customer journey and a general production correction lifecycle remain engineering work. Native subtotal semantics should not be disguised or overwritten.

## GST and delivery evidence

Temporary development Singapore GST collection was enabled under the existing approved test, without a registration number. Two calculation-only subscription projections passed Core's independent inspector:

| Net GST-inclusive total | Gross before correction | Correction | Included GST | Delivery |
| --- | --- | --- | --- | --- |
| SGD 255.20 | SGD 255.21 | SGD 0.01 | SGD 21.07 | SGD 0.00 |
| SGD 493.60 | SGD 493.62 | SGD 0.02 | SGD 40.76 | SGD 0.00 |

No contract was committed and no payment method was attached. These projections are not charged-GST or native subscription-checkout acceptance. Historical native mixed-cart GST/shipping cases are separately recorded in `GST-CHECKOUT-QA-20261019.md`.

Cleanup was independently observed: Singapore **Not collecting**, inclusive pricing enabled, shipping-tax and digital-VAT switches disabled, matching the prior configuration.

## Engineering and tests

- Added `subscription-renewal-links.server.ts` and seven focused PostgreSQL recovery tests, all passed.
- Disposable SQLite regression: **463 passed / 0 failed / 0 skipped**. New `npm run test:isolated` generates a separate client, deploys fixture migrations and deletes its temporary database; it never targets the application database.
- Full remote PostgreSQL runs were not clean: the first had 461/463 pass (a connection failure and dependent fixture failure); a bounded-concurrency run had 459/463 pass (one connection failure and three interactive-transaction timeouts). Isolated rerun of the first failed suite passed 2/2. This remains infrastructure evidence, not a claim of a fully passing PostgreSQL regression.

## Permanent callback recommendation

Before launch, provision an approved always-on Core service with a stable HTTPS hostname, production database and durable worker scheduling. Configure OAuth/app URLs and callbacks against that fixed origin. Persist authenticated webhook events before acknowledgement, enforce unique provider event identities, process retries asynchronously, and run a periodic native reconciliation scan with a durable cursor and overlap. Monitor delivery failures, queue age, reconciliation discrepancies and endpoint availability. Verify a restored database and replay drill on permanent staging.

Shopify allows only a short response window and recommends queuing and periodic reconciliation. The database timeouts found here must be resolved and load-tested; increasing timeout values alone is not proof of reliable infrastructure. A named tunnel to a sleeping Mac is still not an always-on production service. No provider, budget, domain purchase or deployment has been chosen or authorized by this report.

## Acceptance impact

**1 PASS / 10 PARTIAL / 0 FAIL / 4 BLOCKED.** The subscription row moves from FAIL to PARTIAL because the earlier displayed-price failure was a misinterpretation; exact payment evidence already passed. Wallet architecture, top-ups, Wallet-funded renewals and permanent infrastructure remain blocked. Full agreed scope is still required.
