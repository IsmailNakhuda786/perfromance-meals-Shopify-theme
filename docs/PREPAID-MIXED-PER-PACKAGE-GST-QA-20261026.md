# Mixed prepaid packages: charged GST, Core intake and inactive fulfilment

Verified 26 October 2026 in Performance Meals Development only. No production changes or real money. Wallet top-ups remain disabled.

## Actual Shopify evidence

| Test | Expected SGD | Actual SGD | Included GST | Delivery | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| #1031: one three-delivery and one six-delivery package | 748.80 | 748.80 | 61.83 | 0.00 | PASS for this isolated case |
| #1032: three-delivery simulated renewal | 255.20 | 255.20 | 21.07 | 0.00 | PASS for this isolated case |
| #1033: six-delivery simulated renewal | 493.60 | 493.60 | 40.76 | 0.00 | PASS for this isolated case |

The initial order has exactly two original lines and two app-owned subscription contracts. Each retained the approved per-package cent correction for unlimited renewals. Shopify created three and six native fulfilment allocations respectively, each with quantity one; each renewal retained its corresponding quantity and delivery count.

Actual authenticated Shopify contract-create and billing-success messages reached Core. Explicit bounded worker processing completed intake/linking. Reprocessing preserved the existing inbox, evidence and operational records. Each contract has exactly two native test orders (the shared initial order and its own renewal), one billing attempt with its original idempotency key, and two correctly owned Core rows. No extra billing attempts or orders were created. This is explicit QA worker execution, not evidence of a permanent scheduler.

All eleven earlier paid orders and their 45 native fulfilment records remained unchanged. The shared initial order also remained unchanged through both renewals and both future-billing cancellations. Nine Wallet/Gift Card/Rewards financial-model snapshots remained unchanged. The entire approved simulated test budget, including the previous two-identical-package case, was SGD 2,518.40; it was not exceeded.

## Cleanup

Both new test subscriptions have future billing CANCELLED; all paid delivery records remain intact. The QA product is draft and unpublished everywhere. Its two variants were removed from the isolated shipping profile, restoring the original three entries. Both temporary correction discounts are inactive. Temporary Singapore GST collection was removed. The two QA-only files were removed from the unpublished theme and a filtered native theme pull returned neither file.

The isolated intake/renewal feature flags are off again. The billing-success QA callback was removed; all four normal callbacks were read back once each against the restored normal preview. The temporary Cloudflare URL expired overnight, requiring a fresh CLI login and preview. Permanent HTTPS callbacks and durable workers remain a launch dependency.

## Engineering

Added an internal registered-purchase path for inactive Ready Series delivery drafts. It takes a saved evidence identity, derives exact economics and quantity from that immutable snapshot, rechecks current native ownership, active contract, gross price, captured payment, approved correction and GST, then applies the existing merchant-calendar, native-schedule and undispatched-order checks. Its version-two audit binds the saved purchase checksum, package quantity, payment scope and correction. The transaction checks that saved evidence has not changed during native reads. Legacy version-one audit/replay remains compatible.

These services do not book, reschedule, dispatch, send reminders, activate general subscriptions or change Shopify records. Native end-to-end fulfilment acceptance remains incomplete; the paid QA orders were not modified to manufacture a future calendar match.

Automated validation: 526/526 disposable Core regression tests pass; eleven focused PostgreSQL tests and the additional PostgreSQL evidence-change race test pass (12 checks in total). TypeScript and lint pass. The first PostgreSQL attempt found an outdated test-only generated client; that client was regenerated and the nineteen isolated fixture rows left by that failed attempt were removed. No application schema migration was applied.

## Remaining acceptance

Rows 2, 5, 13 and 15 remain PARTIAL. This closes the mixed-term charged nonzero-GST case, not the full production correction provisioning/recovery lifecycle, merchant calendar/time-slot booking, final account journey, or permanent infrastructure. Wallet architecture, top-ups and Wallet-funded subscription renewals remain BLOCKED.
