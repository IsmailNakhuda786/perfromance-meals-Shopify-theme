# Multiple-package unpaid Shopify checkout — 24 October 2026

User approved multiple prepaid packages per checkout and two isolated unpaid development comparisons. No order was submitted, payment attempted, renewal charged, refund issued or Wallet changed.

| Cart | Approved food total | Initial observation | Corrected native checkout | Delivery | Result |
| --- | ---: | --- | ---: | --- | --- |
| Two 3-delivery packages | SGD 510.40 | The previous fixed one-cent correction applied once to the whole line, producing SGD 510.41 food | SGD 510.40 after a two-cent aggregate correction | Free first shipment and free recurring delivery in isolated profile | Unpaid checkout PASS |
| One 3-delivery + one 6-delivery package | SGD 748.80 | Independent corrections must combine across the two different eligible variants | SGD 748.80, comprising 255.20 + 493.60 and total correction0.03 | Free first shipment and recurring groups | Unpaid checkout PASS |

## Important limits

- The working aggregate correction was intentionally scoped to the tested QA customer, variants and quantities. It is not a generally activated discount or a production correction writer. A cart quantity change must cause recalculation and new native verification; a stale correction must never be assumed correct. Customer-scoped fixed-amount discounts also cannot safely serve simultaneous carts with different quantities; general activation requires a checkout-bound, quantity-aware supported mechanism, not switching a customer-wide discount between requests.
- Product-discount combination was enabled only on these isolated cent corrections for the mixed comparison; this does not approve stacking merchant promotions generally.
- Shopify's gross recurring subtotal excludes discounts and is not a final renewal quote. Multi-package payment, resulting contract structure, saved correction and actual simulated renewal remain unverified. A separate approval request is pending.
- This session did not activate nonzero GST. Prior single-package nonzero GST checkout evidence remains separate; multi-package nonzero GST acceptance remains open.
- Existing QA plan prices were temporarily set to255.21/493.62 to compensate for prepaid rounding. Original advertised variant prices remained255.20/493.60. Both plan policies restored to255.20/493.60 afterward.

## Cleanup verified

- All six temporary customer-scoped discounts are inactive (native readback EXPIRED after deactivation).
- QA product is DRAFT and unpublished from all channels.
- Both QA variants were temporarily assigned to the existing isolated shipping profile; its original three-product membership was restored. No delivery rate or general customization rule was activated.
- The unpaid QA cart was emptied. The two temporary preview files were removed using a filename-restricted cleanup on the existing unpublished theme.
- Identities, checkout URLs, native receipts and screenshot evidence remain private and excluded from GitHub.

No new full requirement is accepted: matrix remains1 PASS /10 PARTIAL /0 FAIL /4 BLOCKED. The updated disposable regression passed501/501; the focused PostgreSQL multiple-package rerun passed10/10, including a regression rejecting the observed stale one-cent correction. Prior33-check payment/schedule database evidence remains separate. Native observations above are additional acceptance evidence.
