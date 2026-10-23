# Approved native webhook and GST checkout QA — 24 October

Both user-approved development tests passed. No payment was submitted; no new Shopify order, capture, refund or Wallet transfer was made. Top-ups remain disabled.

## Fresh Shopify event

The existing development tunnel was unavailable despite its CLI session still existing; a refreshed preview and the four existing callback registrations restored connectivity. The exact underlying tunnel failure cause remains unproven.

Temporarily appended a labelled QA note to existing test Order #1023. A fresh Shopify-originated ORDERS_UPDATED event produced a new Core receipt. The original note was restored. Fresh before/after snapshots prove all four recovered paid orders, their 18 fulfilments and all four Core operational rows unchanged. This is real provider-originated delivery evidence, unlike the earlier synthetic replay. It does not prove fresh create/paid/subscription events or permanent uptime.

The first precheck stopped without any mutation because Shopify represented SGD 493.60 as `493.6`. The private harness was corrected to accept equivalent decimal formatting; the guarded second run completed and restored the note.

## Actual unpaid native checkouts

| QA package | Gross subtotal | Correction | Final total | Included GST | Delivery |
| --- | --- | --- | --- | --- | --- |
| 3 deliveries | SGD 255.21 | SGD 0.01 | **SGD 255.20** | **SGD 21.07** | Free |
| 6 deliveries | SGD 493.62 | SGD 0.02 | **SGD 493.60** | **SGD 40.76** | Free |

The signed-in QA account reached Shop Pay checkout with its existing test identity and address. No payment button was clicked and no payment details were entered. Native recurring subtotal still excludes applicable discounts; actual net first-charge totals above are correct. GST on an actually charged renewal has not been newly tested.

The first checkout initially used the original General shipping profile and correctly exposed a SGD 15 total delivery charge. Moving only the two QA variants into the previously approved isolated profile offered free delivery and produced the totals above. This confirms profile configuration remains essential; it does not certify general prepaid or mixed-cart production shipping enforcement.

## Cleanup independently verified

- QA cart emptied and checkout tab closed.
- Both temporary automatic discounts deactivated; original selling-plan prices restored.
- QA product restored to Draft and unpublished everywhere.
- Only its two variants removed from the isolated profile; original three entries and SGD 0/5/10 rates retained.
- Temporary Singapore GST collection removed; Not collecting observed. Inclusive prices remain enabled; shipping-tax and digital-VAT switches remain disabled.
- Only the two temporary QA files removed from the existing unpublished theme through a scoped theme synchronization. Theme remains unpublished.
- Raw receipts, authenticated links, identities and screenshots stay in ignored local storage.

No application source changed in this test session. Prior regression evidence remains 463 Core disposable-database tests, 60 focused PostgreSQL tests, 71 Theme tests, TypeScript/lint/schema checks. New native evidence strengthens requirements 2, 5 and 15 without completing their wider production scope. Matrix remains **1 PASS / 10 PARTIAL / 0 FAIL / 4 BLOCKED**.

Next: automatic renewal association and production cent-correction lifecycle, permanent durable callbacks/reconciliation, full fulfilment lifecycle, and Shopify-approved Wallet architecture. Do not re-enable top-ups or infer production acceptance from these QA cases.
