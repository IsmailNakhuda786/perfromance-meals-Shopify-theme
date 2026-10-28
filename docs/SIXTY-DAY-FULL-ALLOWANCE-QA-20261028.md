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

Requirement 3 remains PARTIAL overall. Full quantity accounting is demonstrated; legacy programme records still require an authorized original-entitlement backfill, and general customer activation is deliberately gated. Scheduling/rescheduling belongs to requirement 13 and remains incomplete. Permanent hosting is a separate post-assessment gate and is not used to hold this functional test open.

Private evidence: Core .shopify/sixty-allowance-native-qa-20261028.private.json (RESTORED; all37/native unchanged). Local customer screenshot: /private/tmp/pm-sixty-full-allowance-20261028.png. Private journals, record identifiers, credentials and screenshots are excluded from the public source backup.
