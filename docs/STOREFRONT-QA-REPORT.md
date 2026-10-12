# Customer storefront QA — final phase report

Date: 2026-10-05. Dev store only: performance-meals-development.myshopify.com.

Result: three native PAID test=true orders succeeded. Customer commerce integration is demonstrated; production acceptance is incomplete. SGD/market configuration and enforceable business-stream separation fail the stated requirements. Remaining browser coverage is explicitly unverified, not passed. Stop after this report; no custom app implementation begins.

## A. Singapore / SGD

Actual currency is PKR. Native Markets lists Pakistan and Canada; Singapore is missing. Products, bundles, subscriptions, programmes, gift denomination, cart and checkout use native PKR formatting. SGD acceptance FAILS. No currency/market change was made. Store owner must configure SGD/Singapore, review prices, shipping, taxes and gift balances, then run targeted SGD checks. The theme uses Shopify money formatting/current currency, not a substituted SGD label.

## B. Passed customer flows

| Flow | Native evidence |
|---|---|
| Ready Series Single Purchase | Product detail, add, quantity 1→2, drawer/cart totals and persistence; purchased in #1003. No selling plan. |
| Ready Series Bundles | Beef/Non-Beef selection and one-time cart; Beef bundle purchased in #1003. No selling plan. |
| Ready Series Subscription | Non-Beef allocation, 6-month term/monthly billing retained through checkout and #1001. Native recurring charge disclosure. |
| Fixed Meal Plan | Native programme variant, two menu weeks, four windows, 24 meals; builder→review→cart→checkout→#1002. Private structured menu JSON plus readable selections retained on order. No selling plan. |
| Cart | Drawer/page, native quantity totals, selling-plan context, remove and persisted selections. |
| Product/catalog data | Native QA products, variants, images, nutrition and one-time/recurring prices render in tested Ready Series flows. |
| Search | All seven native QA products returned. |
| Account | Native Shopify authentication and order/account navigation work. |
| Gift Cards | Native 10 denomination, recipient properties and purchase in #1001. Synthetic recipient; real email delivery/redemption not tested. |
| Test checkout | #1001 subscription + gift, #1002 fixed programme, #1003 one-time bundle + single. All PAID, test=true; API verified. |

Orders: #1001 / 6441968730196; #1002 / 6442168418388; #1003 / 6442173595732. All historical PKR. First subscription purchase is not proof of renewal billing or fulfillment.

## C. Failed / incomplete coverage

- FAIL: SGD base currency / Singapore primary market.
- FAIL: durable Ready Series vs Meal Plan enforcement. Cart permits mixed streams; no canonical product business_stream or immutable order/contract snapshot. No mixed-stream order submitted.
- NOT VERIFIED: final native Meal Plan landing navigation. Repeated navigation attempts remained on /pages/meal-plan-builder; no cause established. Final link check was interrupted by Mac lock. Do not classify this as a confirmed theme routing defect.
- NOT VERIFIED in this resumed native-data phase: exhaustive collection pagination/filter states, remaining gift denominations, gift delivery/redemption, recurring Meal Plan checkout/renewals, all programme variants, renewal lifecycle, rewards transactions, or a new responsive sweep. Earlier fixture/browser responsive coverage remains separate evidence.
- Mac lock prevented remaining browser inspection. No redesign or speculative routing fix was applied.

## D. Exact implementation/configuration boundaries

Native configuration: SGD/Singapore, production prices/content, delivery/tax, inventory and supported fixed Shopify Bundles component mapping, gift denominations, subscription provider and commercial terms.

Theme changes next phase: canonical stream snapshot on every cart path, clear stream-switch feedback, app-block/proxy communication preserving approved flows; targeted landing-route investigation if reproducible. No theme-only substitute for trusted scheduling or billing.

REQUIRES CUSTOM APP — NEXT PHASE: authoritative Meal Plan selections, eligibility/menu versions/cutoffs/capacity/scheduling; subscription renewal/term/pause/resume and recurring component fulfillment via a compatible provider or custom app; rewards/referral/wallet ledger via suitable provider or custom app; immutable stream-aware operational persistence.

Customer account extension — next phase: authenticated saved/future menu selections, subscription management and stream context.

Shopify Function — next phase: authoritative Cart/Checkout Validation for missing/mixed streams and supported purchase constraints, subject to store/Function eligibility.

Admin extension — later Admin phase: contextual native order actions/blocks; embedded App Home for cross-order kitchen/operations views. No external standalone Admin.

Exact mechanisms, data, theme communication and Admin effects are documented in STOREFRONT-QA-NEXT-PHASE.md.

## E. Business-stream separation

Validated current product/variant/selling-plan references and initial Meal Plan menu properties, but these are insufficient permanent separation. Recommend required merchant-owned performance.business_stream (ready_series/meal_plan), validated line snapshots, Function enforcement, immutable webhook-derived order/contract/schedule records and stream-qualified reporting. Customer identity remains shared. Gift mixing policy requires Jerome’s decision. No fragile QA-only tags were added to claim compliance.

## F. Migration

No fresher.com.sg migration performed. Use source-qualified stable business keys and explicit customer/product/variant/menu/order/contract mapping to destination IDs. Resolve destination IDs at import; never embed QA IDs/prices/customer assumptions in production. Password/payment-token/subscription migration requires provider-supported compatibility and reauthorization where necessary. Preserve provenance, reconcile balances and commitments, quarantine ambiguous stream records.

## G. Created staging data / merchant needs

Created seven QA products / 19 variants; three collections; five pages; one supplementary menu; fourteen metafield definitions (13 product, one variant), 43 values; three metaobject definitions / seven entries; two selling-plan groups / three plans; seven approved-reference product images. Online Store visibility was explicitly authorized. Existing native gift product reused; only its 10 denomination inventory policy changed DENY→CONTINUE to allow test sale with zero tracked stock. Other sample records/denominations preserved. Three native test orders created; authenticated test customer used.

Only four data-selection JSON files were configured on the unpublished QA theme. QA defaults remain in the staging copy, outside the production package. Required resource inventory: ../../outputs/Storefront-Required-Resources.json; actual setup: ../../outputs/Storefront-Native-Resource-Setup.json. Generated merchant manifest is also tracked.

Still required from Jerome: production catalog/SKUs/prices/nutrition/images; Singapore delivery/tax/cutoff/capacity rules; subscription terms/provider; rewards rules/provider; gift denomination/stream policy; migration exports/consent and payment-provider constraints. Store owner must complete SGD/Singapore configuration.

## H. Git / validation

Branch: shopify/theme-migration-v2. Final commit: the commit containing this report (recorded by Git and supplied with the handoff). Existing work preserved; no reset/reclone. Current phase adds QA tooling/manifests/documentation only; no theme or Admin implementation changes. Prior integrated Theme Check: 0 errors / 0 warnings; runtime-corrected integration suite: 8 passed. Already completed checks were not repeated. Native API readbacks confirm test orders, allocation/properties and unpublished status. Documentation changes were reviewed for consistency.

## I. Theme / package

Unpublished QA theme: performance-meals-homepage-runtime-check, ID 146242797652. Live dev theme remains test-data, ID 146241945684.

Existing corrected upload package: ../../outputs/Performance-Meals-Merchant-Review-v2-homepage-runtime-fixed.zip. No new ZIP necessary for this documentation/data QA phase; production package does not contain staging product IDs/defaults.

## J. Scope confirmations

Performance Meals theme remains unpublished. Jerome’s live store untouched. Separate Admin prototype untouched. No custom app started. Native orders are test=true; no real payments processed. No production migration performed. Stop after report.
