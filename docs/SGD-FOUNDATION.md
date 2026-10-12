# Singapore / SGD foundation — dev store only

Date: 2026-10-05. Store: performance-meals-development.myshopify.com. Scope excludes Admin/app work and business-stream separation.

A. Base currency: PKR → SGD, saved in Shopify General settings. Shopify accepted the change; no dev-store currency limitation occurred. Historical #1001–#1003 retain PKR.

B. Market/default region: Pakistan → Singapore. This store uses new Markets (Store default + backup region rather than a legacy primary-market action). Active Singapore region market 38866976852 created, SGD currency; backup region saved as Singapore. Existing Canada/Pakistan markets preserved. Source: https://shopify.dev/changelog/posts/new-markets-apis

C. Settings changed: currency, Singapore market, backup region, timezone America/New_York → Asia/Singapore. Metric/kg preserved. Singapore moved from the sample international shipping zone into a Singapore-only zone; QA Singapore Delivery — test only created at SGD 5.00. Other countries/sample rates preserved. No tax registration invented; Singapore market currently Not collecting.

D. Theme: sections/rewards.liquid renders its eight monetary-copy fields through snippets/reward-money-text.liquid using native money_with_currency. Dollar tokens in approved editable copy are input placeholders, not rendered currency assumptions. rs is the Ready Series brand key; JavaScript ${...} is interpolation; prior PKR report entries are historical evidence. Neither was changed. Native commerce money filters/current-currency JavaScript preserved. Only these two files uploaded to unpublished theme 146242797652 with --only and --nodelete. Integrated check: zero findings; eight existing integration tests passed; targeted currency-copy regression test passed after placeholder fix.

E. QA prices: single meals SGD 12.50/13.50/14.50; bundles 60.00; subscription bundles 55.00; recurring Meal Plan 120.00; fixed Meal Plan 180.00. Gift denominations 10/25/50/100 now priced in SGD. No numerical product prices changed or production prices invented. All three selling plans retain 0% native adjustment; allocations derive from current product currency, not fixed PKR amounts. Prior issued PKR gift balances are invalid after store-currency change; no reissue/redemption claimed. Gift card product remains native, with prior one-denomination QA availability.

F–G. One clean SGD purchase is prepared: one QA Low Carb Chicken Meal at SGD 12.50 plus Singapore QA shipping 5.00 = SGD 17.50. Product/cart/checkout SGD verified. Completed order #1004 (gid://shopify/Order/1008) is PAID and test=true. Order currencyCode, shopMoney and presentmentMoney all record SGD 17.50. Native thank-you page shows SGD 17.50 and Test Payment Gateway. User performed the final payment click. Test gateway confirmed with approved dummy values. No additional test purchases requested.

H. Remaining: Pakistan business entity/store/fulfillment address require verified merchant details before production; Singapore tax obligations/delivery operations require Jerome's approved setup. No live payment gateway used. Sample markets and non-Singapore sample shipping rates remain for staging, not production configuration. Native customer account historical orders remain in their original currency.

I. Branch shopify/theme-migration-v2; final commit supplied in handoff. Existing work preserved.

J–K. Theme performance-meals-homepage-runtime-check (146242797652) remains unpublished. Jerome's live store and Admin prototype untouched. No custom app or business-stream implementation started.

Currency-change reference: https://help.shopify.com/en/manual/payments/shopify-payments/store-currency/changing-your-store-currency
