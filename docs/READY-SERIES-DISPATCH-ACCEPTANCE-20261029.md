# Isolated Ready Series dispatch acceptance — 29 October 2026

User approved one new SGD 255.20 three-delivery development purchase, test card only, one simulated native dispatch, development fulfilment-writing permission and stopping its future renewals. The user performed the payment click. No production store or real card was used.

## Native and Core evidence

New Order #1034: exact SGD 255.20 paid total, one package, three native delivery occurrences, one-cent per-package correction retained in the contract and free delivery. The current dev setup calculated zero GST; historical nonzero-GST tests remain separate. Shopify Payments test mode was visibly verified before checkout. The existing higher recurring-price display remains a separate release issue.

First occurrence only: Shopify returned SUCCESS for one fulfilment with customer notification disabled. Core independently read the exact order, line and fulfilment-order associations, counted one dispatched package out of three, kept two untouched unsent occurrences eligible, rejected booking the processed occurrence and replayed sync without another audit/debit/count. Dispatched is not presented as carrier-confirmed arrival. All 32 earlier native test orders and nine financial model fingerprints remained unchanged.

The temporary tunnel restarted during this run, so the new purchase required explicit authenticated native reconciliation rather than provider purchase-webhook intake. The evidence intentionally reports that distinction. Replaying the verified purchase reconciliation created no duplicate operational line or purchase evidence. No extra payment, renewal attempt, refund or Wallet change occurred.

The new contract was then cancelled to stop future test renewals; its paid order and all three fulfilment records remained unchanged from the verified post-dispatch state. The test card order, one simulated dispatch and immutable purchase/audit evidence remain as the test record.

## Demonstrated repairs

PostgreSQL booking/reminder failure was a test-loader cleanup race; all 19 booking/calendar/sender and nine renewal-notice PostgreSQL scenarios now pass after moving awaited imports before test registration. Full Core regression: 673 passed, one PostgreSQL-only skip; TypeScript/lint pass. Connection readiness previously checked only ordinary order events; it now also requires subscription purchase events and conditionally billing-success, with missing/duplicate/stale callback regression coverage.

## Cleanup / boundaries

The QA product was returned to draft, the customer-only correction deactivated, and Online Store publication removed. The QA three-delivery variant was removed from the temporary shipping profile, restoring its original General membership; the pre-existing QA profile again contains three products. Temporary theme and preview cleanup verification is recorded at the final checkpoint. No paid production functionality is enabled. This scoped dispatch test does not complete all lifecycle/Support/WhatsApp acceptance in requirements 2 and 13.

## Customer account evidence

The actual Shopify customer-account development preview showed “Confirmed dispatched packages: 1 of 3 package deliveries” for Order #1034, with only delivery 2 of 3 and delivery 3 of 3 awaiting preparation. The dispatched occurrence had no booking control. The linked subscription showed future renewals stopped. Screenshot preserved privately as `/private/tmp/pm-dispatch-progress-verified-20261029b.png`. No actual carrier arrival is claimed.

## Final preservation and cleanup readback

All 37 pre-existing Core model hashes matched after excluding only eight explicitly identified new test/audit rows (one operational line, four receipts, one dispatch audit, one purchase evidence, one intake record). All nine financial snapshots and all 32 earlier native orders stayed unchanged. Theme readback confirmed the two temporary QA files absent and the original snippet byte-identical. Normal development preview was restored; its four callbacks were verified, and only this run’s temporary billing-success callback was removed. Customer booking, purchase intake, renewal evidence and Wallet top-ups are disabled in the restored preview.
