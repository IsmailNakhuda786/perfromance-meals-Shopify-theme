# Confirmed delivery policy —16October2026

User confirmed ordinary Ready Series food belowSGD75 costs10delivery,75inclusive to below125 costs5,125inclusive and above is free. Use food value after discounts; Gift Card purchases and top-up transactions do not qualify. Delivery-included prepaid packages do not subsidize ordinary-food delivery:300prepaid +20ordinary food still requires10delivery for ordinary food. Prepaid-only remains delivery-included.

Pure Core calculation and focused tests cover exact thresholds/cents, mixed categories, discounted input, invalid evidence, zero-price ordinary food and configurable thresholds. It is not an activated shipping endpoint. Native product classification and amounts must be verified; client properties/prices cannot authorize a fee.

Theme progress now uses125threshold, excludes Meal Plans, native subscription cart allocations and explicitly delivery-included products, and excludes shared/Gift Card/top-up lines. Native rates are not yet verified, so food_delivery_policy_verified defaultsfalse; the cart uses neutral checkout-confirmation wording. Keep it off until actual boundary/mixed-cart QA passes. Ordinary ready-series bundles without a selected native selling plan remain ordinary food.

Important platform constraint: standard Shopify price-based rates use total cart value across profiles. Separate profiles alone cannot enforce the approved exclusion. Do not write a global75/125rule and mark mixed-cart acceptance passed. A supported app/function/rate mechanism must evaluate qualifying ordinary-food subtotal. No shipping profile, payment provider or subscription plan was changed.

References checked:
- https://help.shopify.com/en/manual/fulfillment/setup/shipping-profiles/combined-shipping-rates
- https://help.shopify.com/en/manual/fulfillment/setup/shipping-rates/setting-up-shipping-rates

## Native calculation comparison — resumed checkpoint

| Calculation | Expected delivery | Offered delivery | Result |
|---|---:|---:|---|
| Individual food SGD 11.90 | SGD 10 | SGD 5 | Mismatch |
| Ordinary bundle SGD 109.80 | SGD 5 | SGD 5 | Expected fee offered only |
| Prepaid variant SGD 255.20 | Included / SGD 0 | SGD 5 | Mismatch |
| Prepaid + individual SGD 267.10 | SGD 10 for individual food | SGD 5 | Mismatch |

The offered option is the historical QA Singapore test rate. These calculations cover the specified staged variants and address only; do not extrapolate to every shipping profile. No option was selected and no checkout completed. Prepaid calculation has no selling plan, so it does not verify subscription shipping or renewals.

A delivery customization can hide/rename/reorder existing options, but cannot create or price a missing option. Draft Order Admin and subscription recurring orders are not supported delivery-customization surfaces. Initial checkout success cannot establish recurring shipping correctness. Any proposed mechanism must evaluate the ordinary-food subtotal after discounts across the complete cart, preserve separate prepaid delivery inclusion, handle multiple delivery groups, and prevent an incorrect cheaper option being offered. No app installation or shipping setting change has been made.

Official references: https://shopify.dev/docs/api/admin-graphql/latest/mutations/draftOrderCalculate ; https://shopify.dev/docs/api/functions/latest/delivery-customization

Research candidate, not an adopted dependency: Shipy / Cirkle Studio lists free development-store testing with all features and hide/rename/reorder rules. Its listing does not prove filtered ordinary-food subtotal calculations, complete multi-group enforcement or recurring-subscription behaviour. Production plans are paid; no installation, subscription or recommendation to purchase was made. Evaluate actual permissions and exact conditions before requesting a scoped installation test. Listing checked16October2026: https://apps.shopify.com/shipfy-delivery-customization

## Approved isolated native delivery QA — completed before allowance pause

User separately approved Shipy installation and isolated shipping configuration. The new QA profile (97149091924) contains only three unpublished merchant draft products; existing 76-product food profile was preserved. All three targets previously belonged to General profile96892485716. Singapore-only test options are PM QA Delivery — 0 /5 /10. Catalogue prices were not changed. Collection305535549524 contains only the two ordinary-food test products, not the prepaid product.

Two unpaid, unsent draft checkouts were created:1151851003988 (reused boundary fixture) and1151851036756 (mixed fixture). No order was completed, no invoice email sent, no payment/card entry or Wallet transfer occurred. Draft-only native price overrides exercised boundaries without changing products. One draft-only SGD30 line discount exercised after-discount qualification.

| Native draft checkout | Only offered QA fee | Result |
|---|---:|---|
| Food74.99 |10 |Pass |
| Food75.00 |5 |Pass |
| Food75.01 |5 |Pass |
| Food124.99 |5 |Pass |
| Food125.00 |0 |Pass |
| Food125.01 |0 |Pass |
| Prepaid255.20 only |0 |Pass |
| Prepaid255.20 +food11.90 |10 |Pass |
| Food100 less30 discount =70 |10 |Pass |

Shipy direct-comparison rule75497556 retained exact numeric values and uses five independent stackable hide conditions against the QA collection. Its absence test requires “Does not contains all”; “Does not contains” incorrectly matched a mixed cart and was corrected/tested. First tier-form experiment75432020 reloaded incorrect upper-range values; it was never activated. Do not reuse that faulty form as accepted enforcement.

Both rules are now INACTIVE. Fresh dashboard confirms0active customizations. The isolated QA profile/collection and two unpaid drafts remain for continuation, with private receipts/scripts under work/gst-shipping-qa-20261016 and Core .shopify. Original published products/profiles, payment settings, top-up activation and delivery-calendar policy were not changed. Screenshots are privately preserved under Core .shopify/evidence.

These passes establish the specified native draft-checkout fee cases only. Not yet accepted: split/multiple delivery groups, ordinary storefront checkout path, shared-commerce exclusions, order-level discounts, native selling-plan checkout and recurring shipping. GST remains exclusive/zero-tax in native calculations and is not accepted as an inclusive GST breakdown. Do not enable the Theme shipping-verification flag or claim tracker#5complete.


##17October order-level discount failure — rule not accepted

The isolated direct-comparison rule was temporarily reactivated for the approved unpaid draft QA. A native order-level fixed discount of SGD30 on food priced SGD100 yielded an authoritative draft subtotal of SGD70. Checkout nevertheless offered only SGD5 delivery and total SGD75. Policy requires SGD10 delivery and total SGD80. This differs from the earlier passing line-item-discount case; those results must not be generalized to order-level discounts.

No order was completed, invoice email sent, payment entered, Wallet value moved, catalogue price changed or production accessed. The test rule was deactivated after the failure; final dashboard readback is the cleanup authority. Both QA drafts remain unpaid. The current absence/collection-total implementation is not accepted for production; the shipping-verification flag remains off. Need a supported after-order-discount ordinary-food subtotal mechanism, then all boundary/mixed/split-group/resumed-checkout cases must pass.
