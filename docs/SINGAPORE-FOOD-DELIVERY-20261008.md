# Singapore food delivery — staging verification

Store: `performance-meals-development.myshopify.com` only.
Theme: `146242797652`, `performance-meals-homepage-runtime-check`, unpublished.

## Confirmed rule

- Combine Ready Series and Meal Plan merchandise value after discounts.
- Exclude purchased Gift Cards from eligibility, including mixed carts.
- Below SGD 120: one SGD 10 delivery charge.
- From SGD 120: free Singapore delivery.
- Gift Card payments are distinct from purchasing a Gift Card product.

## Native configuration

Delivery profile `gid://shopify/DeliveryProfile/96970539092`, named
`Performance Meals — Singapore Food Delivery`, contains the existing products
classified `ready_series` and `meal_plan`. Gift Card products are excluded.
Origin: `gid://shopify/Location/81430806612`.
Singapore zone: `gid://shopify/DeliveryZone/335436218452`.

| Rate | Native condition | SGD charge |
| --- | --- | --- |
| Singapore Delivery | Merchandise price 0–119.99 | 10 |
| Free Singapore Delivery | Merchandise price at least 120 | 0 |

Products now use one profile, avoiding the previous separate SGD 5 Meal Plan
test rate combining with the Ready Series charge. Other pre-existing profile
rates were not deleted. This verification does not establish recurring renewal
shipping charges or monthly fulfillment scheduling for prepaid subscriptions.

## Actual checkout evidence

No order was submitted and no payment details were entered.

1. Signature 5 — Non-Beef SGD 48.99 + Teriyaki Chicken & Brown Rice SGD 12.90
   + Gift Card SGD 100: food SGD 61.89, cart SGD 161.89, native checkout delivery
   SGD 10, checkout total SGD 171.89.
2. Three Signature 5 — Non-Beef bundles SGD 146.97 + Teriyaki Chicken & Brown
   Rice SGD 12.90 + Gift Card SGD 100: food SGD 159.87, cart SGD 259.87,
   native checkout delivery FREE, total SGD 259.87.
3. Returning to one bundle: cart eligibility SGD 61.89 and message
   `Add $58.11 more for free delivery`.

The precise three-stream checkout containing a persisted Meal Plan selection
has not been repeated here. All Meal Plan variants were verified in the same
native delivery profile; focused render tests cover the combined three-stream
eligibility calculation below, at and above the threshold.

Screenshots in `work/design-sync/`:
- `shipping-gift-excluded-below-threshold.png`
- `shipping-food-above-threshold.png`
- `cart-shipping-1440.png`, `cart-shipping-768.png`, `cart-shipping-390.png`

## Theme and QA

`cart-delivery-progress.liquid` calculates eligible value from native
`final_line_price` and native discount allocations (including cart-level
allocations), and the canonical product stream, excluding `gift_card`.
It uses Liquid money formatting and translations. The editable theme threshold
must match the native shipping profile; changing theme settings alone does not
change checkout rates.

29 integrated theme tests passed. Full theme validation: 145 files, 80 checked,
zero findings. Theme Check: zero errors, three pre-existing section-setting
count warnings. Responsive drawer checks: 1440, 768 and 390 CSS pixels, no
horizontal page overflow. Temporary viewport overrides were reset.

Bundle test inventory was authorized and recorded separately in
`DEV-BUNDLE-INVENTORY-20261008.json`: 13 approved variants, 10 each, staging only.
Singapore storefront context is essential: `?country=SG` changed the native
account link context from PK to SG and restored fulfillable bundle availability.
No outside-Singapore shipping rates were added to the food profile.

The bundle drawer now preserves approved full names, per-meal price, thumbnail
strip, expandable native contents and remove action. Continue Shopping closes
the drawer. No prototype wallet balance or simulated checkout was introduced.

The missing Egg White & Avocado Toast product image was restored from the exact
approved `readySeriesData.ts` listing URL (source commit
`58272e4e011d03249b196d392319ad22fa8dc0ca`), without a substitute image.
Shopify media `33042478497876` reached READY with no media errors. The live
drawer now displays all five approved meal thumbnails.
Native quantity controls also passed: increasing the original meal from one to
two changed food eligibility from SGD 61.89 to SGD 74.79, and remaining value
from SGD 58.11 to SGD 45.21.

This is focused shipping/cart evidence, not acceptance of all Customer/Core
requirements. No live store, Admin UI or theme publication was touched.
