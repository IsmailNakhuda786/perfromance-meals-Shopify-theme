# Two-package subscription native acceptance — 25 October 2026

Starting verified source checkpoint: `3eea617`; backup: `920fdcf`. This was the explicitly approved isolated development/test workflow. The customer performed the initial payment click. One separately approved simulated renewal was requested through the Admin API. No real card charge, Wallet use, refund or production change occurred.

## Expected versus actual

| Check | Expected | Native result |
| --- | --- | --- |
| Initial order | Two 3-delivery packages, SGD 510.40 | Test order #1024, SGD 510.40, paid |
| Initial correction | SGD 510.42 gross less SGD 0.02 | Exact allocated correction and captured test receipt verified |
| Saved subscription | Quantity 2, SGD 255.21 per package before aggregate correction | Quantity 2 and unlimited SGD 0.02 recurring correction retained |
| Simulated renewal | SGD 510.40 | Test order #1025, SGD 510.40, paid |
| Delivery charges | Included initially and on renewal | SGD 0.00 on both orders |
| GST | Inspect actual development calculation | SGD 0.00 on both; this is not nonzero-GST acceptance |
| Initial delivery entitlement | Three scheduled deliveries, quantity 2 each | Exact native allocation verified |
| Renewal delivery entitlement | Three scheduled deliveries, quantity 2 each | Exact native allocation verified |
| Native duplicate check | Exactly the initial order and intended renewal | Complete contract order connection contains exactly #1024 and #1025; exactly one billing attempt |
| Core ownership and association | Correct QA customer and contract on both orders | Two validated operational rows, correctly linked |
| Future test renewals | Stop after this test | Native contract CANCELLED; paid delivery records preserved |

## Shopify → Core evidence

- The original paid order reached Core through the development callback path and had a validated customer/contract binding.
- Its native-verified immutable purchase snapshot was registered twice; the same evidence row/hash was returned. Registration was performed by the isolated QA harness, not an automatic production purchase flow.
- The successful renewal generated an actual Shopify billing-success notification. The SDK-authenticated handler persisted its durable inbox record; the harness did not synthesize that trigger.
- Core's bounded worker entrypoint was invoked explicitly for this QA. It verified native success, payment, ownership and correction, then linked the renewal. A second processing pass left the completed inbox and operational rows unchanged. No permanent scheduled worker is claimed.
- The handler rejected an invalid signature with HTTP 401 before billing.

## Preservation and cleanup

- All nine protected Wallet/Rewards/financial models matched their pre-test snapshots. Top-ups and Rewards earning remained disabled throughout.
- All 18 earlier paid fulfilments plus the six fulfilments belonging to these two new orders remained unchanged after future-renewal cancellation: 24 protected native records total. No paid delivery was cancelled, dispatched or rewritten.
- Only the new QA contract was cancelled. No refund or Wallet credit was issued.
- QA product restored to DRAFT and unpublished everywhere. The temporary three-month variant assignment was removed, restoring the isolated profile's original three-product membership. No normal shipping rate was edited.
- The customer-only two-cent correction is inactive; the original three-month policy price is restored. The six-month price was not changed in this test.
- Both temporary unpublished-theme files were removed, then a filename-restricted native pull confirmed neither remained.
- The temporary fifth callback was removed. The four normal development callbacks were restored exactly once each on the refreshed preview; the renewal-test handler returned HTTP 503 with its default-off gate restored. Test flags were process-only; no environment secret file was edited.
- The local Rust toolchain required explicit selection of the existing stable installation. A subsequent Shopify preview internal error was resolved by one retry. Neither incident required changing payment settings or production.

## Regression and acceptance limits

**503/503** disposable-database Core tests, **73/73** focused PostgreSQL checks, TypeScript, lint and production-schema consistency passed. PostgreSQL checks cover payment, multiple-package quantities, renewal inbox/evidence, schedule and calculation paths; this is a focused subset, not a full production PostgreSQL certification.

This completes the scoped two-identical-package initial-payment, actual notification, worker, renewal and cleanup test. General correction provisioning, simultaneous-cart safety, mixed 3-/6-term purchases, nonzero-GST paid renewals, complete delivery management, Wallet architecture and permanent infrastructure remain separate acceptance gates. Full matrix remains **1 PASS / 10 PARTIAL / 0 FAIL / 4 BLOCKED**.

Private checkout/transaction identities, customer information, native receipts and signatures are retained locally and excluded from the public backup.
