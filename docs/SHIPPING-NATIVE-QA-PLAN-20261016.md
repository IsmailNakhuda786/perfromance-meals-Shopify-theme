# Isolated shipping acceptance plan — 16 October 2026

Status: proposed test configuration; separate approval pending. Shipy is installed by approval, with no saved or active rules. No purchase is needed to inspect delivery options. Preserve existing product prices, collection membership and profile assignments before any approved test changes; restore temporary fixtures afterward. Do not move published products.

## Approved expected outcomes

| Ordinary food after discounts | Other content | Expected delivery |
|---:|---|---:|
| SGD 74.99 | None | SGD 10 |
| SGD 75.00 | None | SGD 5 |
| SGD 75.01 | None | SGD 5 |
| SGD 124.99 | None | SGD 5 |
| SGD 125.00 | None | Free |
| SGD 125.01 | None | Free |
| None | Prepaid only | Included/free |
| SGD 20 | Prepaid package | SGD 10 |
| SGD 75 | Prepaid package | SGD 5 |
| SGD 125 | Prepaid package | Free |

Gift Card purchases/top-ups cannot raise qualifying food value. Top-ups remain disabled and must not be made purchasable for shipping QA. Validate shared-commerce exclusions only using permitted fixtures; do not infer acceptance from collection labels alone.

## Native enforcement checks

- Use native collection/product identity, not customer-editable cart attributes.
- Confirm whether Collection Total is before or after product/order discounts. If it is before discounts, do not activate this as the final solution.
- Combine all ordinary-food lines once. A prepaid package cannot increase that subtotal.
- Account for multiple delivery groups and split quantities: the whole-cart fee must not be charged twice, omitted or replaced by an unintended cheaper option.
- Check both initial checkout and resumed checkout after changing quantities/discounts. Refreshing a display alone is insufficient.
- Preserve delivery inclusion for prepaid packages. Native subscription recurring shipping remains a separate unsupported surface for delivery customization; do not claim renewal acceptance.
- Exact SGD 75/125 boundaries must pass with currency cents; no rounded-dollar comparisons.
- Inspect the final offered/selected delivery amounts before payment. Do not place an order or trigger a Wallet movement.
- Record native receipts and screenshot evidence privately. Public checkpoint includes only sanitized results, no checkout handles, authentication URLs or customer data.

A native option-hiding function cannot create a missing rate. Proposed isolated profile must offer the required test rates before validating the rule. If rates from another profile combine unexpectedly, stop rather than change existing store-wide rates.


##17October order-level discount failure — rule not accepted

The isolated direct-comparison rule was temporarily reactivated for the approved unpaid draft QA. A native order-level fixed discount of SGD30 on food priced SGD100 yielded an authoritative draft subtotal of SGD70. Checkout nevertheless offered only SGD5 delivery and total SGD75. Policy requires SGD10 delivery and total SGD80. This differs from the earlier passing line-item-discount case; those results must not be generalized to order-level discounts.

No order was completed, invoice email sent, payment entered, Wallet value moved, catalogue price changed or production accessed. The test rule was deactivated after the failure; final dashboard readback is the cleanup authority. Both QA drafts remain unpaid. The current absence/collection-total implementation is not accepted for production; the shipping-verification flag remains off. Need a supported after-order-discount ordinary-food subtotal mechanism, then all boundary/mixed/split-group/resumed-checkout cases must pass.
