# Subscription pricing acceptance — 23 October 2026

**Result: FAIL / release held.** Approved unpaid checkout comparisons were completed for both terms. No payment, capture, billing attempt, refund, new subscription or Wallet change was performed. The separately approved exact-price purchase/renewal test is the next gate.

## Fresh native observations

Read-only Admin evidence rechecked the original QA purchases and their separately identified successful historical test-renewal attempts. Store, customer, contract, saved idempotency key, successful attempt/order link, test flag, one captured Shopify Payments receipt and full term quantity were checked. These are historical simulated payments, freshly read today; they are not new renewal tests.

| Package | Stage | Expected SGD | Actual SGD | Difference SGD | Discount | Delivery | GST |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Three deliveries | Original test purchase | 255.20 | 255.18 | -0.02 | 0 | 0 | 0 |
| Three deliveries | Historical test renewal | 255.20 | 255.18 | -0.02 | 0 | 0 | 0 |
| Six deliveries | Original test purchase | 493.60 | 493.56 | -0.04 | 0 | 0 | 0 |
| Six deliveries | Historical test renewal | 493.60 | 493.56 | -0.04 | 0 | 0 | 0 |

All four native orders remain uncancelled and test-only, with prices marked tax-inclusive. Zero tax here is an observation, not nonzero-GST acceptance. Fresh preservation checks additionally confirm the latest paid three-delivery test order and all three original fulfilment records are unchanged. All five scoped test contracts remain cancelled; nine protected financial model snapshots are unchanged.

## Correction evidence and its limits

Earlier approved unpaid comparisons reached exact initial totals 255.20/493.60 after one-/two-cent corrections, but recurring checkout summaries still showed255.21/493.62. Separately approved calculation projections matched the exact net values. Two no-payment-method contract records retained the unlimited manual corrections after commit/readback, then were cancelled. Those results prove calculation/persistence, not exact payment propagation or future billing. See [SUBSCRIPTION-PRICING-SUPPORT-20261023.md](SUBSCRIPTION-PRICING-SUPPORT-20261023.md).

## Demonstrated engineering gap repaired

The original paid-package verifier rejects every discount. A separate explicit-correction reader now accepts only a server-approved one-/two-cent-style correction below one cent per delivery, with base minus correction equal to the immutable approved net. The native single package line, original gross value, exactly one allocation, automatic/manual application title/type, order discount, zero shipping/refunds, current/original expected GST and captured test payment must all agree. The original verifier still rejects every discount.

The corrected renewal reader additionally requires the actual saved successful attempt, exact contract, distinct renewal order and payment. Neither reader charges, changes records or enables sales. A historical matching total cannot prove a future renewal.

Seven new automated tests cover both terms, automatic/manual allocations, nonzero/changed GST, wrong or extra discount attribution, short payment, delivery, refunded quantity, ownership, real-payment rejection and saved-attempt identity. The full455Core tests, TypeScript and lint pass. The added read query validates with the Shopify Toolkit at Admin2026-10. A fresh native query succeeds with requested cost61; the real255.18historical order is correctly refused against expected255.20.

Allocation amounts are used because Shopify describes `discountedTotalSet` as excluding order-level discounts: [LineItem](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/LineItem), [DiscountAllocation](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/DiscountAllocation).

## Remaining engineering and approval gate

1. Reproduce exact unpaid checkout and accurate recurring disclosure for both terms under separately approved QA-only setup; record tax, discounts and free delivery independently.
2. Preserve complete checkout-created contract state when proving an exact correction. Do not replace unrelated lists or create unbound production subscriptions.
3. Obtain authorization for a new test purchase/contract correction/renewal as applicable. Keep all payments simulated and hand required final actions to the user.
4. Verify exact paid initial/renewal totals, full native paid-delivery preservation, duplicate-request recovery and actual Core routing before acceptance.

Private raw evidence is retained in ignored local QA receipts and is not included in the public backup. No catalogue price reduction or launch activation is authorized.

## Fresh approved unpaid checkout comparison

On 23 October the signed-in QA customer added each term separately from an empty cart through the unpublished QA preview. Native cart and final checkout both applied the exact variant/customer-scoped automatic correction:

| Term | Native base SGD | Correction SGD | Cart / final checkout SGD | Displayed recurring subtotal SGD | First / recurring delivery |
| --- | --- | --- | --- | --- | --- |
| Three deliveries | 255.21 | 0.01 | 255.20 | 255.21 every 3 months | Free / free |
| Six deliveries | 493.62 | 0.02 | 493.60 | 493.62 every 6 months | Free / free |

The three-term total was also confirmed in Shop Pay before leaving that flow without payment. Both standard checkouts were checked using the existing Singapore QA address, with empty card fields. No GST line was presented; this is not acceptance of nonzero GST. Native recurring-price disclosure still differs from the approved net. General subscription sales remain disabled.

Cleanup: removed the QA cart line; restored product to draft/unpublished, restored the isolated shipping profile to its original three entries, deactivated both QA discounts, restored original selling-plan prices, and removed only the two temporary QA theme files. Fresh read-only preservation confirmed five cancelled QA contracts, no new payment methods/orders on the two prior no-charge records, and nine unchanged protected financial models. Raw screenshots and receipts are private and excluded from the public backup.
