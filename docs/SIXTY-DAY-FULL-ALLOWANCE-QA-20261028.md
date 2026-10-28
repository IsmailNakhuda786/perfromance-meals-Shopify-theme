# 6 by 60 full allowance acceptance — 28 October 2026

## Approved development test: passed and restored

The merchant explicitly approved a temporary Core-only completion test on existing development Order #1009. Fresh authenticated Shopify Admin evidence confirmed the same paid test order, owner, programme variant, single purchased programme unit and zero native dispatches. No Shopify write API was used.

Using the actual PostgreSQL database and the existing batch service with native paid-order validation on each operation:

1. Allocated four weekday meals, cancelled that unsent batch and replayed cancellation. The cancellation released its allocation exactly once.
2. Allocated 88 weekday meals and 32 frozen meals in two clearly labelled simulated test batches. Allocation replay returned the same batches. Confirmed each Core dispatch and replayed confirmation without incrementing counts.
3. Tried to allocate one further weekday meal. The service rejected it with no extra batch or entitlement change.
4. The authenticated Shopify embedded admin screen independently displayed 88/88 weekday, 32/32 frozen and zero unallocated meals, alongside the cancelled unsent batch.
5. The signed-in customer account independently displayed both recorded batches and the full 88/32/120 purchased allowance. No operator identifier was exposed in the customer progress display.
6. Removed only the three approved QA batch records and their temporary basis, then restored the original entitlement, routing state and timestamps. All 37 protected development-store model fingerprints exactly matched the pre-test baseline. Fresh native order readback matched its original fingerprint.

The service API exercised the real database and native Shopify read context; this run did not claim another browser click-through of allocation/dispatch forms. The earlier 4/8 admin form journey is separately recorded in SIXTY-DAY-DELIVERY-BATCHES-20261028.md. This run completes the full-count, cancellation, overflow and replay subcases.

No actual meals were dispatched; no native fulfilment, order, payment, credit, Wallet, Rewards or billing mutation occurred. Temporary batch access was scoped solely to the approved programme and restored disabled afterward. Ready Series recurring billing was unchanged.

## Acceptance boundary

Requirement 3 remains PARTIAL overall. Full quantity accounting is demonstrated; the two older development programmes now have their separately approved original-entitlement backfill, while general customer activation is deliberately gated. Scheduling/rescheduling belongs to requirement 13 and remains incomplete. Permanent hosting is a separate post-assessment gate and is not used to hold this functional test open.

Private evidence: Core .shopify/sixty-allowance-native-qa-20261028.private.json (RESTORED; all37/native unchanged). Local customer screenshot: /private/tmp/pm-sixty-full-allowance-20261028.png. Private journals, record identifiers, credentials and screenshots are excluded from the public source backup.

## Separately approved original allowance reconciliation

After temporary QA cleanup, the merchant separately approved permanently saving the original 88weekday/32frozen allowance on development Orders #1008 and #1009. Both were freshly read from Shopify: paid test orders, correct original programme/variant/owner/quantity, zero native dispatches, no existing Core delivery batches and matching original60day period (12October–10December).

Saved only the computed original entitlement on the two identified Core selections in one transaction, conditional on their original timestamps and missing allowance. Independently verified their other fields and every other selection were unchanged; all36 other protected model fingerprints and both native-order fingerprints remained identical. No dispatch, financial, menu, order or date change occurred. Batch booking remains disabled. The private reconciliation journal records the exact approved before/after data and status VERIFIED; it is excluded from GitHub.
