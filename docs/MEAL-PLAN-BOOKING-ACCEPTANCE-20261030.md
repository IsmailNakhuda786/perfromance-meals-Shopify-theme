# Meal Plans booking — staff/customer acceptance, 30 October 2026

The isolated approved journey passed on paid development Order #1009. This is acceptance evidence for booking/rescheduling, not a claim that every 6 by 60, fulfilment or production requirement is complete.

## Actual journey

- Verified original customer menu, paid test ownership and full original allowance without changing the purchase.
- Temporarily allocated two Greek Chicken & Quinoa Bowl batches: 1 weekday + 1 frozen, then 1 weekday + 2 frozen. Two temporary slots each had capacity one.
- Staff booked both batches for 11 November, 9am–12pm Singapore. They shared one visit and consumed exactly one place.
- Customer My Plan displayed the two-batch visit and the confirmed 72-hour change notice. Customer moved the whole visit to 12 November, 9am–12pm.
- Customer success message and a fresh staff read showed the same replacement date. Core confirmed old-slot reserved=0, new-slot reserved=1, visit revision3, two booking receipts and one move receipt.
- Replaying the original move returned its existing result and added no booking or place. No native Shopify order, fulfilment, payment, message, Wallet or Rewards mutation occurred.
- Guarded cleanup restored all44 protected record groups exactly. Private journal `.shopify/meal-booking-native30b.private.json` is RESTORED; never replay it. A separate read-only audit independently confirmed changedModels=[].

## Demonstrated defect fixed

The initial staff slot list hid a full slot even when the next batch could join its existing visit without consuming another place. Staff reads now include an eligible owned unsent visit on that slot. Customer replacement choices continue to exclude full slots and never silently combine visits. The actual staff journey passed after the fix. The account panel is limited to programmes with a saved 60-day entitlement.

## Verification

- Full disposable regression: 750 collected,744 passed,6 PostgreSQL-only skips,0 failed.
- Prior PostgreSQL booking/menu/dish group25/25; concurrency follow-up2/2. New full-slot-join case1/1 passed on PostgreSQL with all44 protected fingerprints unchanged on a stable baseline.
- TypeScript, zero-warning lint, production-schema consistency and diff checks passed. Shopify customer-account2026-07 component validation passed; custom composition components are application-checked, not certified by the Polaris validator.
- One intermediate fingerprint comparison overlapped the approved cleanup and reported a mismatch. Automatic review rejected an immediate retry. Read-only diagnosis proved all44 models matched the saved originals; a subsequent stable, authorized test passed its unchanged-data guard. No unexplained discrepancy remains.

Private logs and screenshots remain local and are excluded from GitHub. Proof images: `/private/tmp/pm-meal-booking-admin30.png`, `/private/tmp/pm-meal-booking-customer30.png`.

Normal preview restored with booking gates off, Wallet top-ups disabled and four normal callbacks verified exactly once each. The temporary host must be checked before future QA setup. The failed DNS attempt was fully restored before this successful attempt.

## Remaining

Requirements3 and13 remain PARTIAL for their complete agreed lifecycles. Do not re-ask the separate-brand capacity or two-box/one-visit decisions. Next useful acceptance is the full selected-dish 88-weekday/32-frozen programme completion and exhaustion/replay journey, with a fresh specific mutation scope if needed. The earlier count-only full-allowance test does not certify the new dish-linked full-term journey. Production hosting remains outside the October31 assessment scope.
