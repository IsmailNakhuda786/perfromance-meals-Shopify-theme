# Development GST checkout QA — 19 October 2026

User approved temporarily enabling Singapore GST collection, inspecting unpaid
checkouts, then restoring the prior configuration. No real GST number was entered:
Shopify accepted its optional blank field. This was a development calculation
setting only, not tax-authority registration or production configuration.

## Native observed results

| Existing unpaid checkout | Food/package subtotal | Selected delivery | Total | Included tax |
| --- | ---: | ---: | ---: | ---: |
|100food less30line discount, initial free option|70.00|0.00|70.00|5.78|
|Same discounted food, selected10option|70.00|10.00|80.00|6.61|
|125ordinary +255.20prepaid variant|380.20|0.00|380.20|31.39|

All amounts SGD. These are browser-observed unpaid checkout totals, not completed
orders or native subscription acceptance. Advertised gross prices did not receive
additional GST. The native included-tax display changed when delivery was selected;
shipping-tax checkbox remained unchecked throughout. Do not infer zero shipping
tax from that checkbox, or infer line-level tax allocation from aggregate totals.

The Core shipping rule stayed disabled, so the test checkout exposed all three
QA delivery options. Selecting the expected rate here proves its gross-price/tax
behaviour only, not automatic shipping enforcement under nonzero GST. The earlier
11shipping-enforcement tests were at zero collected tax; combined Function/GST
input and threshold acceptance remains outstanding.

## Cleanup independently observed

Removed only the temporary Singapore collection entry. Singapore shows Not
collecting again; inclusive-price checkbox remains checked, shipping-tax checkbox
unchecked, digital-goods VAT checkbox unchecked. No tax override, shipping rate,
product price, payment setting, order, Wallet transaction or live store change.
Private screenshots saved outside Git under /private/tmp/pm-gst-*-20261019.png.

Next: combined nonzero-GST Function input/rate enforcement and wider storefront,
resumed-cart and subscription acceptance. No overall production pass is claimed.

## Combined Core Function plus nonzero GST — same approved QA

Reconnected the existing development preview (no release) and enabled only the
previously approved three-product rule. Repeated temporary Singapore GST setup,
then observed exactly the expected single native shipping option for all four:

| Case | Ordinary food after discounts | Offered fee | Gross checkout total | Included tax |
| --- | ---: | ---: | ---: | ---: |
|100less30line discount|70.00|10.00|80.00|6.61|
|100less30order discount|70.00|10.00|80.00|6.61|
|75ordinary +255.20prepaid|75.00|5.00|335.20|27.67|
|125ordinary +255.20prepaid|125.00|0.00|380.20|31.39|

This supersedes the earlier combined-test outstanding note for these four cases
only. Unpaid draft statuses remain OPEN; no payment details entered or order
submitted. Correct5at75andfreeat125demonstrate gross inclusive qualification in
these actual native inputs. Native line/aggregate shipping-tax allocation is not
inferred beyond the checkout's included-tax display.

Afterward the Core rule independently read back enabled=false; temporary GST entry
removed and Collect in new region restored. Original tax checkboxes untouched.
No production catalogue, published shipping profile or payment-provider change.
Normal storefront, resumed-cart, native subscription and multiple ordinary-group
acceptance remain open. Private screenshots pm-core-gst-*-20261019.png stay out of Git.
