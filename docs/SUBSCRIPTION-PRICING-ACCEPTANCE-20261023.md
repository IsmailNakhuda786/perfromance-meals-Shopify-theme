# Subscription pricing acceptance — 23 October 2026

**Result: FAIL / release held.** Approved exact-price test purchases and one simulated renewal per term are now verified. Four Shopify Payments test charges totalled SGD 1,497.60. No real charge, refund or Wallet mutation occurred. Both newly tested subscriptions were cancelled with their paid deliveries preserved. Pricing release remains held for incorrect native recurring disclosure, nonzero GST acceptance and production integration.

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

Seven new automated tests cover both terms, automatic/manual allocations, nonzero/changed GST, wrong or extra discount attribution, short payment, delivery, refunded quantity, ownership, real-payment rejection and saved-attempt identity. The full456Core tests, TypeScript and lint pass. The added read query validates with the Shopify Toolkit at Admin2026-10. A fresh native query succeeds with requested cost61; the real255.18historical order is correctly refused against expected255.20.

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

## Approved exact-price captured-payment and renewal result

| Term | Expected first / renewal SGD | Captured first SGD | Captured renewal SGD | Renewal correction SGD | Delivery / GST SGD |
| --- | --- | --- | --- | --- | --- |
| Three deliveries | 255.20 / 255.20 | 255.20 | 255.20 | 0.01 | 0 / 0 |
| Six deliveries | 493.60 / 493.60 | 493.60 | 493.60 | 0.02 | 0 / 0 |

Each initial payment was completed by the user using Shopify's test card. Fresh contract reads verified the expected app, QA customer, original test order, exact gross price, one unlimited recurring automatic discount, test payment method and zero delivery price before the single first-cycle attempt. Each attempt was journalled before submission with its own stable idempotency key; existing journals prevent another creation. Successful native attempt identity and linked order were checked through Core's corrected-renewal inspector. The original checkout uses AutomaticDiscountApplication; Shopify represents the inherited renewal allocation as ManualDiscountApplication with the same exact title and amount. Those two expectations were checked explicitly, without accepting arbitrary discounts.

Both fresh subscriptions were cancelled after verification. Before/after native order snapshots prove both original and renewal orders remain uncancelled, with all 18 paid fulfilment records unchanged (six for the three-delivery test, twelve for the six-delivery test). Earlier five QA contracts and nine protected financial model snapshots also remain unchanged. Original catalogue/selling-plan prices, draft/unpublished availability and the three-entry isolated shipping profile were restored; both temporary corrections expired and the two preview files were removed.

The first real test receipt exposed an incorrect chronology assumption: native payment processedAt was three seconds earlier than order createdAt. Core now validates both timestamps independently and trusts the exact native order-to-transaction association, identity and captured totals instead of inventing timestamp ordering. A regression test covers both ordinary and corrected payment readers. Payment time remains the native captured timestamp. A full-run fixture packaging error was also repaired by keeping installed dependencies external in the delivery-audit ESM test build.

**Not accepted:** native checkout and thank-you recurring summaries still display 255.21/493.62 even though actual renewals captured the correct lower net. Zero GST in this environment does not prove inclusive nonzero GST. QA-only scripts do not supply a production correction/monitoring lifecycle, complete calendar acceptance or Wallet-funded renewal support. General sales and top-ups remain disabled.

A separate read-only Core database check found no operational rows for these four fresh QA orders. Native payment acceptance therefore does not prove webhook delivery or Core lifecycle routing; reconnecting the development callback and safely reconciling these exact orders remains required. No manual replay or financial settlement was performed to conceal that gap.

Final regression: 456 Core tests passed with development database network access; TypeScript and lint passed. The earlier restricted-network attempt failed to reach the database and is not counted as functional acceptance.

## 24 October correction: gross recurring subtotal is not a final charge

Fresh inspection of Shopify's native tooltip states that “Recurring subtotal” excludes applicable discounts (and shipping, tax and duties). The displayed 255.21/493.62 amounts are therefore gross subtotals before the persisted one-/two-cent correction. Earlier wording calling those figures an inaccurate final renewal price is superseded. Actual initial and renewal payments remain verified at exactly 255.20/493.60. No catalogue change is approved or required by this finding. Full production correction lifecycle and native nonzero-GST subscription checkout remain unaccepted. See `CORE-CONNECTIVITY-RECOVERY-20261024.md` and the updated matrix.
