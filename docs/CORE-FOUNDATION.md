# Performance Meals Core foundation — 5 October 2026

## A. App and architecture

Performance Meals Core is a single-merchant embedded Shopify app, created from the official React Router TypeScript scaffold. Verified developer organization: My Store 2 (239064552). Installed app: 431715745793, handle performance-meals-core-1. Installation and server allowlist are restricted to performance-meals-development.myshopify.com. Shopify owns commerce and customer identity. React is used only inside the embedded app; the customer storefront remains Liquid/OS 2.0. The app has a minimal connection/reconciliation screen, not the future departmental Admin UI.

Authenticated Shopify app proxy `/apps/performance-meals/meal-plan` saves and reviews customer selections. Official Customer Account session-token authentication protects `/api/account`. Official Shopify webhook authentication protects order and privacy handlers. Admin API version 2026-10; customer-account extension API 2026-07.

## B. Theme cleanup

Changed runtime files: assets/meal-plan.js, config/settings_schema.json, layout/theme.liquid, locales/en.default.json, sections/gift-card-product.liquid, sections/meal-plan-builder.liquid, snippets/business-stream-properties.liquid. Tests, fixtures and merchant manifest were updated separately.

Removed critical Meal Plan sessionStorage persistence, obsolete local-save copy, and unconditional global loading of meal-plan.js and gift-card.js. Those modules now load only in their respective sections. Consolidated private stream properties through the reusable business-stream snippet. No sections, snippets, images or fonts were deleted: dependency review found no safely removable files after checking templates, runtime/editor rendering, header/popup/quick-view behavior and approved flows. home.js and catalog.js remain necessary shared dependencies. No redesign or obsolete customer routes were introduced. Theme tooling and the approved React source reference stay outside the upload ZIP.

Before: 104 files / 8,761,289 bytes. After: 104 files / 8,764,038 bytes, including .gitattributes. Small growth reflects trusted persistence integration; unrelated pages now avoid two JavaScript requests. Upload packages contain 103 theme files, excluding .gitattributes. Theme Check and integrated route tests confirm dependency closure, templates/schema/translations, selling-plan behavior and native purchase forms. No React/Vite runtime, Build a Box, internal download/export/QA controls, debug logs or dev-store IDs ship in the theme.

## C–D. Data ownership and contract

| Data | Owner |
|---|---|
| Customer identity, products, variants, prices, inventory, collections, cart, checkout, orders, payments, gift cards, selling plans | Shopify native |
| Canonical product classification | PRODUCT performance.business_stream: ready_series, meal_plan, shared |
| Programme menu-week count and meals/day | Shopify product/variant performance metafields |
| Bundle definitions, menu weeks, menu windows and native product references | Shopify metaobjects; see MERCHANT-SETUP-MANIFEST.json for exact definitions |
| Draft selections, revision, native customer/programme/variant/plan references | Private MealPlanDraft |
| Complete immutable reviewed windows, quantities, cutoff, hash, order/line/contract references | Private MealPlanSelection |
| Original order-line references, department, trusted classification, validation/quarantine and fulfillment state | Private OperationalLine |
| Idempotent authenticated event receipts | Private WebhookReceipt |
| Future pause/resume/cycle/delivery/production/fulfillment requests and references | Private PlanOperation; state model only |
| Legacy/source IDs, target GIDs, stream, state/timestamp, historical reference | Private MigrationMapping |
| OAuth sessions | Official Prisma session adapter |

Versioned Prisma migrations preserve state. Local development uses persistent SQLite; tokens/database/runtime fixtures are ignored by Git. No Shopify order/customer record is duplicated. Operational records reference original native GIDs.

The storefront snapshots `_pm_business_stream` and `_pm_stream_schema_version` on purchase forms. Meal Plan review additionally supplies `_pm_selection_id` and `_pm_selection_hash`; native cart/checkout retain these private line properties. Backend routing re-reads native product classification and gift-card identity, checks the authenticated customer's immutable selection against product/variant/selling plan/hash/quantity/order timestamp, and quarantines conflicting or missing metadata. Browser properties alone never authorize routing.

## E. Meal Plan persistence

Verified with the existing authenticated QA customer: a partial 3-meal draft survived page reload, then a complete 24-meal selection across four 6-meal windows was reviewed, locked, checked out and linked to the original Shopify order line. No critical selection depends solely on browser storage. Saves are serial, revisioned and use signed customer/shop-bound expiring nonces. Expired nonces refresh once; conflicts/errors stop checkout rather than lose selections. Review validates current native availability, plan membership, published menu windows, eligible active meals, counts and cutoff.

Catalog validation deliberately fails closed when any result needs additional pagination (100 weeks, 50 plans/groups/references per connection). Larger catalogs require complete pagination before production expansion. Archived/draft meals and unpublished publishable menus are excluded. The current phase supports one editable draft per customer and immutable historical reviews.

## F–H. Ready Series, mixed checkout and routing

Single Purchase and Bundles remain one-time native variants; Subscription uses native selling-plan allocations. Their completed prior dev-store commerce QA was retained, not repeated. Current automated tests cover all three modes and recurring context through product/cart routes. No subscription lifecycle is simulated.

New mixed QA order #1007, native GID gid://shopify/Order/1000: test=true, PAID, SGD 207.50 including SGD 5 Singapore QA delivery. One QA Low Carb Chicken Meal (12.50), one QA Fixed Meal Plan (180.00, 24 saved meals), and one native SGD 10 Gift Card. One native customer and one checkout/order. Product/cart/checkout/order all retain SGD.

App readback confirms three VALIDATED OperationalLine records against this same order with businessStream → department mappings: ready_series → ready_series, meal_plan → meal_plan, shared → gift_card_sales; the MealPlanSelection is ORDERED and linked to its original line. No order/customer duplication and no mixed-cart restriction.

Initial orders/create delivery was missed during staging setup. App-owned ORDERS_CREATE and ORDERS_UPDATED webhooks were then registered with the official SDK, and trusted native-order reconciliation recovered #1007. A reversible QA note on #1007 triggered a real authenticated ORDERS_UPDATED delivery; processing preserved the same three records without duplicates. Initial automatic order-create delivery is not claimed as proven. Recovery queries only orders matching pending owned selection locks, not an arbitrary historical import.

## I–K. Account, Gift Cards and operations

The native Shopify customer account shows #1007 and earlier orders together, including Ready Series, Meal Plan and Gift Card purchase lines. The My Plan customer-account extension preview shows Order received and the four saved 6-meal windows using the same native customer identity. Private account data is filtered by authenticated shop/customer; the endpoint origin is generated at build time from the trusted HTTPS app host, never supplied by an arbitrary merchant URL.

Gift Card product and line business-stream classification is shared. The separate app-level OperationalLine.department field routes Gift Card sales to gift_card_sales, independent of the payment method on other lines. gift_card_sales is never a performance.business_stream value; no additional Shopify operational-category metafield is needed for this equivalent app-level routing mechanism. Native checkout confirmed Gift Card email delivery behavior. Gift Card redemption was not exercised in this phase; no gift-card code was collected or stored by the app. Rewards balances and subscription pause/resume/billing controls are not fabricated. Native contract access/provider ownership remains unresolved.

Future department views can filter OperationalLine by department while referencing the same Shopify order/customer: Ready Series, Meal Plan and Gift Card Sales. PlanOperation provides a versioned state foundation, not working kitchen scheduling, subscription mutation, delivery scheduling or fulfillment execution.

## L–M. Future Admin and migration

Shopify Admin remains the platform. Native catalog/order/customer/gift-card administration stays native; later App Home/Admin extensions can consume these authenticated private records for menus/review/production/cycles/departmental reporting. No full Admin UI or existing Admin prototype was modified.

MigrationMapping supports fresher.com.sg source system/type/id, source customer/subscription/order IDs, target GID, app record, stream, migration state/time and historical reference. No source data was imported and no QA IDs are hard-coded into runtime logic. Real migration needs source exports/API authorization, identity matching, subscription provider transfer constraints, reconciliation and merchant-approved mapping.

## N. Singapore

SGD base currency, Singapore primary market and Asia/Singapore timezone remain unchanged. QA prices remain clearly test values; no final Jerome pricing was invented. Store business-entity/address and fulfillment-location details still need verified Singapore/legal information (previous Pakistan configuration was not guessed or overwritten). Shipping/tax/production setup needs merchant confirmation before launch.

## O. Validation

- Theme: 12 integrated tests passed; full Theme Check: 103 files, 67 checked code files, zero findings/static failures.
- App: 4 automated tests passed, covering validation/spoof/cutoff, publication/pagination boundaries, nonce isolation, durable revisions/locks and mixed routing/idempotency/quarantine.
- App and extension TypeScript, ESLint and production app build passed.
- Shopify app config validation: valid, no issues; official CLI customer-account extension build succeeded.
- Admin GraphQL catalog/order/reconciliation/connection queries validated against 2026-10 and exercised against the dev store.
- Bundled Shopify App Home/customer-account validation helpers could not complete because their shipped type index was absent. Official CLI builds, installed component typings, TypeScript and browser QA provide independent checks; this helper limitation remains explicit.
- Production build emits informational React Router v8 future warnings and empty client chunks for server-only endpoints. No build failure. Docker container execution was not verified.
- ZIP packaging verifies root layout and byte-for-byte equality with the local theme, and excludes the app, source prototype, tooling, credentials and test state.

## P–R. Release state

Branch: shopify/theme-migration-v2. Final commit/clean status are provided in the final phase report after committing this document. App installed only in the verified My Store 2 dev store. Current backend is a Shopify CLI staging tunnel, not a permanent hosted production deployment. Customer-account extension is a dev preview, not a permanently activated navigation page.

QA theme: performance-meals-homepage-runtime-check, ID 146242797652, unpublished. Only approved QA theme files were pushed with no-delete; settings_data was not overwritten. The live dev-store test-data theme and all client stores were untouched.

An unused initial scaffold app (performance-meals-core, ID 431714500609) remains in the same organization with zero installations. It was not deleted because deletion is destructive. The installed tested app is performance-meals-core-1, ID 431715745793.

## S. Merchant/hosting decisions before production

1. Permanent trusted HTTPS backend, encrypted credentials, durable database/volume, backup/restore and hosting ownership. Local SQLite must not run on ephemeral production storage; multiple instances need a tested managed-database migration.
2. Stable application URL/proxy/webhook configuration, deliberate app version/extension release, customer-data requirements and My Plan account editor/navigation activation. Reconnect shop-specific order subscriptions whenever the staging tunnel changes. Test automatic order-create delivery after stable deployment.
3. Subscription provider/contract ownership and API permissions for real billing, pause/resume and cycle operations; operational policies/cutoffs/timezone/delivery/production definitions.
4. Rewards provider and rules; Gift Card redemption QA; verified final product/variant/menu/bundle/image/content/pricing data and permanent selling plans. QA amounts are not launch prices.
5. Verified legal/business/fulfillment address, shipping and tax configuration for Singapore.
6. fresher.com.sg access and migration decisions. No migration is authorized by this foundation phase.
7. Optional approval to remove the unused zero-install scaffold app. No deletion occurred.

## T. Boundaries

Theme remains unpublished. Jerome's live store and existing Admin prototype were untouched. Only dummy Test Payment Gateway payment was used; the user performed the final Pay now click. No real payment was processed. No unnecessary storefront code was intentionally retained; necessary editor/runtime assets remain. No full Shopify Admin UI or operational extensions were started. Stop after reporting this phase.

## Focused taxonomy verification

Inspected existing order #1007 without modifying it or creating another checkout. Its three VALIDATED stored line mappings remain ready_series → ready_series, meal_plan → meal_plan, shared → gift_card_sales. No OperationalLine record uses gift_card_sales as businessStream. Runtime code, Shopify data and database schema already implement the required separation and were unchanged. Added explicit canonical-enum, Gift Card routing/rejection and mixed-order stream/department regression assertions. Theme stayed unpublished; no Admin UI or client-store work occurred.
