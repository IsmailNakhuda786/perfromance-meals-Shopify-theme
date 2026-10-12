# Performance Meals customer flow audit — historical inspection

This preserves the initial audit before the corrected source was pushed. Removed Build A Box / Ready To Go / How It Works references below are historical and are not current release requirements. The final scope uses main commit `227c1a0efea28b0c122fdb1bbffb2f0944d3213f`; see MIGRATION-PLAN.md, MERCHANT-SETUP.md and VERIFICATION.md for the implemented release.

Audit date: 5 October 2026. Reference: `IsmailNakhuda786/perfromance-meals`, checked out at `work/performance-meals`. `AGENTS.md` was read. This document inspects the customer prototype only; it proposes no Admin project changes and creates no Shopify commerce records.

## Current reference and scope

`src/App.tsx` implements navigation by changing a React `Page` state variable. There are no URL routes, persisted cart, backend calls, actual sign-in, or completed orders in these flows. The approved reference is useful for page structure, responsive presentation and interaction patterns; its arrays and local state are not an approved production catalog or transactional implementation.

The code contains multiple differing meal catalogs. Ready Series has 12 locally defined meals (IDs 101–112), while Build A Box, Meal Plan Wizard and Ready To Go use nine meals in `src/data.ts` (IDs 1–9). The PDP combines both catalogs and gives some Ready Series meals different categories from the listing. Product names, categories, nutrition, product references and bundle contents must be reconciled against Jerome's Shopify catalog, not silently imported from these arrays.

The top download banner and footer links to wireframes, blueprint, handoff, screen exports and ZIP/HTML downloads are prototype tools. They should not be customer navigation in the development theme.

## Page and flow mapping

Theme filenames below are proposed ownership boundaries. Native Shopify paths use configured handles; theme templates do not create products, pages or collections by themselves.

| React page / component | Shopify route / template | Theme responsibility | App or platform boundary |
| --- | --- | --- | --- |
| `HomePage.tsx` | `/`, `templates/index.json` | Approved hero, brand hierarchy, Ready Series and Meal Plan entry points, homepage sections and responsive behavior | Marketing text and media can be section settings; product teasers must reference real products/collections |
| `ReadySeriesPage.tsx` | `/collections/<ready-series-handle>`, `templates/collection.ready-series.json` | Dark approved catalog, A-la-carte / Bundles / Subscription tabs, category filters, product cards, meal previews, carousels, native add to cart | Bundle inventory composition and recurring fulfillment require configured bundle/subscription products and app support |
| `ReadySeriesProductPage.tsx` | `/products/<handle>`, `templates/product.ready-series.json` | PDP hero, real variant choice and quantity, nutrition / overview / review tabs, related meals, native selling plan selector | Verified reviews and review submission require approved review app/data source |
| `ReadyToGoPage.tsx` | `/collections/<ready-to-go-handle>`, `templates/collection.ready-to-go.json` | Preserve reachable alternate catalog flow, filter/sort and quick view | Same native commerce rules as Ready Series; do not assume its old nine-meal catalog is current |
| `BuildABoxPage.tsx` | `/pages/build-a-box`, `templates/page.build-a-box.json`, `sections/build-a-box.liquid`, `assets/build-a-box.js` | Choose configured size, choose configured native meal variants, show selections and quantities, review, submit native cart payload | Fixed aggregate price / component inventory / enforced exact size / renewal recipe changes require app or Shopify Functions, with selling-plan limitations below |
| `MealPlanLandingPage.tsx` | `/pages/meal-plan`, `templates/page.meal-plan.json` | Warm/orange brand, goal picker and entry to wizard, plans, process, testimonials, FAQs | Plan prices and availability must come from configured Shopify products and selling-plan allocations |
| `MealPlanWizardPage.tsx` | `/pages/meal-plan-builder`, `templates/page.meal-plan-builder.json`, `sections/meal-plan-builder.liquid`, `assets/meal-plan-builder.js` | Programme → plan / meal frequency → dated menu → details / preferences → review → native cart → checkout | Real recurring contract, multi-delivery entitlement, cutoff enforcement, future menu persistence, fixed-programme completion, fulfillment, wallet and account management require apps/extensions |
| `Nav.tsx` cart drawer | All theme pages, `sections/cart-drawer.liquid`, `snippets/cart-item.liquid`, `assets/cart.js` | Mobile menu / brand picker, cart drawer, quantity / remove, real totals and line properties, native account links | Use Shopify returned cart, line keys and selling-plan allocations; no locally fabricated cart totals |
| `CheckoutPage.tsx` | Shopify native checkout, entered from `/cart` | `templates/cart.json`, `sections/main-cart.liquid` can preserve order summary, notes and optional delivery preferences before checkout | Theme cannot replace Shopify checkout, collect raw cards, validate discounts or create paid orders. Exact information / shipping / payment customization needs checkout extensions and Plus eligibility |
| `ConfirmationPage.tsx` | Shopify Thank you / Order status pages | Link to Shopify's real confirmation and tracking experience | No `page.confirmation.json` claiming payment or inventing an order number. Further design uses extensions / checkout branding, scoped later |
| `AccountPage.tsx` | `routes.account_url` / Shopify customer accounts | Theme header account entry and real login return links; legacy customer templates only if currently supported on that store | New customer accounts are separately rendered. Plan management, menu selections, rewards/wallet/payment management require customer account extensions / apps |
| `GiftCardPage.tsx` | `/products/<gift-card-handle>`, `templates/product.gift-card.json`; redemption `templates/gift_card.liquid` | Native gift-card product variants, recipient email/name/message/send date, native add to cart; real balance/code rendering only through gift card object | Physical-card fulfillment / fee is a real product/service configuration; no fake payment screen or generated gift code |
| `RewardsPage.tsx` | `/pages/rewards`, `templates/page.rewards.json` | Approved marketing layout, editor-controlled terms and native account CTA | Points, tier status, redemption, expiry, referral credit and ledger need loyalty app/backend |
| `HowItWorksPage.tsx`, `AboutPage.tsx` | `/pages/how-it-works`, `/pages/about`, page JSON templates and content sections | Preserve approved responsive content and CTA flows | Policies/footer links use Shopify policies or configured page links |
| `HandoffPage.tsx`, `BlueprintPage.tsx`, `WireframePage.tsx`, `ScreensExportPage.tsx` | No customer storefront routes | Keep in reference repo / migration documentation | Internal review and export tools, excluded from customer theme |
| `PromoPopup.tsx` | `snippets/promo-popup.liquid`, `assets/promo-popup.js` | Approved popup and navigation; merchant settings for active campaigns and valid links | Coupon validity/expiry/combination is decided by Shopify discounts, not a theme array |
| `FloatingChat` in `App.tsx` | Support snippet + theme settings | Approved WhatsApp panel and configured contact URL | Prototype number `6512345678` is a placeholder; keep CTA unconfigured until merchant provides actual support number |

## Exact commerce behaviors in the prototype

### Ready Series

`src/pages/ReadySeriesPage.tsx` defines A-la-carte / Bundles / Subscription purchase modes, with dark/warm/espresso presentation previews. Dark is the default. The native catalog should determine category memberships and order. Product detail navigation must become real product URLs, with reload/back/deep-link support.

The predefined bundle groups are Low Carb Meals, High Carb Meals, Just Protein and Mixed Bundle. The UI shows Signature 5 (Beef / Non-Beef), 9 Flavours of the Month, Essential 10 (Beef / Non-Beef), JP Variety Bundle of 10, and 7 Low Carb or High Carb + 7 Just Protein. Prototype pricing and discount claims are hard-coded. Represent these as configured native products/variants and audited composition records; do not apply 3/5/7% discounts in browser arithmetic.

Subscription reference SKUs: `JPSUB01`, `JPSUB02`, `LCSUB01`, `LCSUB02`, `HCSUB01`, `HCSUB02`, `LCMIXSUB01`, `LCMIXSUB02`, `HCMIXSUB01`, `HCMIXSUB02`. The screen offers 3 and 6 month terms with prepaid totals, showing item counts and contents. This does not establish whether Jerome requires prepaid terms, recurring billing at those intervals, or finite subscription contracts. Shopify products, variants and selling plans must express the approved charging semantics. A theme selector can submit only real allocation-compatible selling-plan IDs. Showing a subscription name alone does not create a subscription.

The sign-in gate is a local Boolean. Production must use Shopify sign-in and return the customer to their selection flow. Local preview state must not be treated as authentication.

### Build A Box

`src/pages/BuildABoxPage.tsx` is Size → Select → Review. Sizes in `src/data.ts` are 5, 10, 15 and 20 with decreasing fixed price per meal. Subscription defaults on with Weekly / Fortnightly and a hard-coded 10% reduction. The selector can repeat a meal and prevents advancement unless the selected count matches size.

The prototype's final action adds one fabricated cart item ID `9999` and omits every selected meal and quantity. Production must preserve selections using native variant IDs plus quantities, and an app-owned persisted recipe where the purchased product requires it. Line properties can record a descriptive recipe / requested date, but do not adjust prices, create component inventory, enforce entitlements or configure future renewal orders.

A phase-one theme can present the approved selection interface and submit native component variants where Jerome approves individual-variant pricing. For the approved fixed box price and recurring recipe, the app integration must exist before enabling that purchase. Never quietly present individual-line totals as the approved fixed box price.

### Meal Plan Wizard

Programmes: Biweekly (two weekly menus), Monthly (four menus), 2 Months (four menus), 6 by 60 and 6 by 60 Plus (60-day fixed programmes; lunch and dinner fixed). Plan types: Low Carb Regular / Low Carb Regular+ / Balance Regular / Balance Regular+. Meal frequency: Lunch Only or Lunch & Dinner. The goal links default CUT → 6 by 60 / Low Carb Regular; BUILD → 6 by 60 Plus / Balance Regular; other → Biweekly / Low Carb Regular.

Menu step uses four local weekly meal pools and three delivery windows: Mon–Tue (two days), Wed–Thu (two), Fri (one). Allocation is days × one or two meals. Repeated meals are permitted. The next four weeks are generated from the browser clock; the final summary instead begins next Sunday. Fixed programmes promise all-week coverage while this selector is Mon–Fri. These inconsistencies need business resolution in menu/fulfillment configuration, not copied as authoritative dates.

Collected inputs include name, phone/WhatsApp, email, street, city, postcode and delivery notes. The reference shows Malaysian examples even though other screens show Singapore. Let Shopify's configured market, checkout/address forms and merchant timezone govern real commerce. Avoid retaining customer addresses or raw payment credentials in browser storage.

The final step simulates sign-in, a wallet balance of $12, points (1.5 × base price), promo validation, 6% GST and a Place Order action. It calls the confirmation callback directly; `addToCart` is unused. Rebuild this as a real native product/variant plus real selling plan where configured, pass descriptive non-authoritative selections, then use Shopify cart/checkout. The theme must not calculate binding tax, claim rewarded points or report a paid order.

Landing plan prices ($120 / $180 / $200), wizard prices ($140–$235), and old account CUT / MAINTAIN / BUILD plans differ. Do not use any of them as a fallback catalog.

### Cart, checkout and account

`App.tsx` merges lines by prototype ID + type and has no persistence. Shopify lines can differ by variant, selling plan and properties; update/remove by Shopify line key. Re-render the drawer from authoritative returned cart sections after successful add/change, display errors and unavailable inventory, and preserve a working normal `/cart` form.

`CheckoutPage.tsx` invents delivery dates, time slots, Singapore address defaults, $120 free-delivery threshold / $10 fee, promo validity and $12.50 wallet credit. Authentication is local. Its Place Order action does not pay or create an order. Store shipping, tax, checkout, discounts and any native store credit are authoritative. Cart attributes can carry requested delivery preferences but do not reserve a slot.

`ConfirmationPage.tsx` fabricates random order IDs and notification promises. Use Shopify's real Thank you / Order status pages.

`AccountPage.tsx` includes dashboard, subscription, orders, wallet and settings tabs. Orders, balance, points and customer details are invented. Plan selection, quantity, delivery days/time, billing interval, pause/resume/cancel, retention downgrade, Ready Series skip, weekly menu swap and cutoff status change local state only. Wallet top-up and saved cards use raw card inputs with no payment provider. Referral copy/invite and review submission show toasts without executing actions.

Preserve this as the specification for later Shopify app / customer account extensions. Theme links should lead to real native accounts and configured management portals; no fake accounts, saved cards, orders or balances should appear on Jerome's development store.

## Shopify data contract (proposed, not installed)

Create merchant-visible definitions before values. Populate verified values next. Read them in Liquid last. No catalog records, definitions or values were created by this audit. Because this phase is a theme with no new app, these are merchant-owned definitions; app-owned contract/ledger data should be introduced with the later app.

| Owner | Field / native source | Proposed type and purpose |
| --- | --- | --- |
| Product / variant | Native title, description, URL, media, variant ID, SKU, price, compare-at price, availability, options | Commerce identity, inventory and money remain native |
| Product | `pm.protein`, `pm.carbs`, `pm.fat` | `number_decimal`, grams per serve; omit values when absent |
| Product | `pm.calories` | `number_integer`, kcal per serve |
| Product | `pm.meal_category`, `pm.badge`, `pm.brand` | Single line text or validated values used for labels / filters; collections are the merchandising source |
| Product | `pm.ingredients`, `pm.allergens`, `pm.preparation`, `pm.storage` | Rich text / list single line text as appropriate; approved contents only |
| Product | Native `selling_plan_groups`; per-variant `selling_plan_allocations` | Available terms, eligible variants and allocation price from installed subscription app |
| Product | `pm.meal_count`, `pm.programme_days`, `pm.meals_per_day` | Integer fields documenting bought entitlements; not browser-enforced authority |
| Product | `pm.bundle_components` | `list.metaobject_reference` to product/variant reference + quantity; presentation only unless backed by bundle app inventory semantics |
| Product | `pm.programme_kind` | Validated recurring / fixed label matching actual product/selling-plan configuration |
| Shop / section | Collection and product pickers | Ready Series / Bundles / Subscription / Meal Plan references, use resource settings rather than guessed handles |
| Menu week metaobject | Week start/end, merchant timezone, cutoff timestamp, state, meal product/variant references, window entitlements | Dated menu catalog; public read only where suitable, merchant maintained. Time windows and cutoff are authoritative only with app validation |
| Bundle component metaobject | Product/variant reference, quantity, label | Repeated component counts and safe preview of bundle contents |
| Cart line | Native variant ID, quantity, selling plan; descriptive properties | Recipe summary, programme, week/window preference and notes. Do not use properties as price or entitlement authority |
| Customer / order / contract | Native customer account/order; app-owned recipe, renewal and ledger data | App-side authenticated access, future menu state, rewards and referral lifecycle; do not expose private ledger data as public storefront metaobjects |

Names above are a proposed namespace contract; the implemented theme should use one consistent documented contract and the verified merchant definitions. Never write Admin API credentials into Liquid or JavaScript. Dynamic definitions / values belong in a future app or approved setup process; do not hand-roll an app during this theme phase.

## Flows that need app/extension work later

1. **Subscriptions:** configured selling plans come from a subscription app; recurring billing contracts, finite prepaid programmes, renewal orders, pause/skip/resume/cancel and payment updates need the subscription platform and authenticated management.
2. **Subscription boxes:** native Shopify product bundles cannot be sold with selling plans. The recurring box design needs a subscription-compatible app model, explicitly verified against its component inventory, pricing and renewal rules. Do not combine Shopify Bundles and a selling-plan ID and call it supported.
3. **Meal menu operations:** customer selections across future weeks, delivery windows, cutoff enforcement, recipe auto-fill, fixed programme entitlement and multiple fulfillments per billing cycle need server-side persisted state and order/contract integration. A theme can render dated options and submit descriptive selections.
4. **Fixed-price custom boxes:** exact size and allowed meal constraints must be enforced at checkout/server side. Native variants can be added by the theme, but fixed basket pricing, component inventory and bypass-proof validation require configuration/app/Functions.
5. **Delivery slots:** theme can collect a request; guaranteed slots, holidays, capacity, geography, cutoff, recurring scheduling and fees require fulfillment/delivery integration.
6. **Accounts:** Shopify handles identity, profile and order history. New customer account plan/menu/wallet pages need customer account extensions. The theme cannot reproduce a free-form authenticated React account application using Liquid alone.
7. **Rewards, wallet, referrals:** real earning/reversal/expiry, redemptions, credits, top-ups and referral events need a ledger and Shopify-aware app. Marketing section settings are possible; simulated balances and payment inputs are not production features.
8. **Reviews:** approved real rating/review data and authenticated submissions need a review service/app; testimonials may be editable marketing content, without fake verified-purchase claims.
9. **Checkout and confirmation:** Shopify hosts these pages. Exact custom fields/layout behavior needs allowed checkout/Thank you/Order status extensions, subject to Jerome's plan. Card collection and payment completion remain native.
10. **Gift cards:** native digital gift cards and recipient forms can be theme implemented. Physical card charging/fulfillment must use verified native product/shipping setup or a later integration.

## Official boundaries verified

- [Theme subscription integration](https://shopify.dev/docs/storefronts/themes/pricing-payments/subscriptions/add-subscriptions-to-your-theme): theme forms submit real selling plan IDs and present allocation pricing; cart displays the chosen allocation.
- [Ajax cart API](https://shopify.dev/docs/api/ajax/reference/cart): native cart additions support variant quantities, properties and selling plans; line keys distinguish configurations.
- [Product bundles](https://shopify.dev/docs/apps/build/product-merchandising/bundles): fixed/customized bundle models; bundles cannot be sold with selling plans.
- [Customer account apps](https://shopify.dev/docs/apps/build/customer-accounts): custom account pages use extensions; legacy accounts deprecated 26 February 2026 and unavailable to new/not-currently-using stores. Confirm Jerome's active account mode.
- [Checkout UI extensions](https://shopify.dev/docs/api/checkout-ui-extensions/latest): information, shipping and payment UI extension steps are Plus only; verify plan before committing to matching those layouts.
- [Gift card recipient form](https://shopify.dev/docs/storefronts/themes/product-merchandising/gift-cards): native recipient email/name/message/send date line properties and recipient flag enable actual email gifting after purchase.

## Development theme acceptance gates

- Native theme ZIP contains Liquid / JSON / CSS / JS, no React runtime or standalone storefront deployment.
- No fabricated variant IDs, sample customer/order/balance records, fake payment forms, hard-coded authoritative commerce prices/taxes/discounts or generated order/gift codes.
- Product, collection, price, currency, availability and selling plans read Shopify data; unconfigured mandatory resources show a clear safe setup/empty state.
- Cart add/change/remove uses real variant IDs and line keys, returns native errors, and updates drawer and `/cart` consistently. Selected recipe quantities remain visible when app/config integration is enabled.
- Real checkout/account links; back/deep links and mobile navigation work through Shopify URLs.
- Theme checkout entry submits native cart; only actual Shopify completion reaches confirmation/order status.
- Visual review covers approved desktop/mobile pages and all accessible selection steps. Known app-dependent portions are documented as blocked integrations rather than simulated success.
- Upload only as a new unpublished development theme after confirming Jerome's intended store and access. Publishing or overwriting live themes remains outside authorization.
