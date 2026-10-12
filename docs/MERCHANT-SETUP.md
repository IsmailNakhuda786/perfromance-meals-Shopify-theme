# Performance Meals — unpublished merchant review setup

Approved customer source: `main` commit `227c1a0efea28b0c122fdb1bbffb2f0944d3213f`. Work branch: `shopify/theme-migration-v2`. The theme is a native Shopify Online Store 2.0 theme. The original React project remains the visual reference and is excluded from the theme ZIP.

This package can be uploaded to a new **unpublished** theme. It is not ready to transact until the merchant completes the store setup and acceptance checks below. No store records, live theme, or Admin project have been changed.

The accompanying `MERCHANT-SETUP-MANIFEST.json` is the exhaustive inventory of source catalog items, required definitions, all theme/section/block settings, default content, template assignments and image/font dependencies. Prototype prices, promotions, reviews, nutrition and programme claims are references for Jerome to verify; they are not silently installed as commerce data.

## Setup order

1. Obtain collaborator access to Jerome’s store and its Online Store theme area. Check the store currency, customer accounts, Markets, shipping zones, taxes, policies and gift-card support. Use a new unpublished theme only.
2. Create the merchant-owned metafield and metaobject definitions listed in the manifest before entering values. Enable storefront read access for every referenced metaobject definition and publish each entry as Active if the publishable capability is enabled. Do not enable webpage rendering for these reference records.
3. Create or map real products and variants, confirming title, handle, SKU, price, inventory, fulfillment, tax treatment, images, nutrition, ingredients and allergens. Publish products to the Online Store sales channel. Never use synthetic fixture IDs.
4. Install/configure a subscription provider. It must support predefined recurring bundles and required commitment terms. Create actual selling plans and allocate them to the relevant variants. The theme selects existing plans; it cannot create billing contracts.
5. Create the three Ready Series collections, assign their templates and add their appropriate products. Do not mix subscription-only variants into Single Purchase or one-time Bundles.
6. Create published Meal Plan menu windows and weeks, then add matched native programme products as blocks in both the Meal Plan landing section and builder. Configure native product options and variant meals-per-day values.
7. Create pages and assign templates, configure header/footer links, and assign optional navigation menus. Configure gift-card product selection and verified support details.
8. Configure loyalty/review apps and their theme app blocks where applicable. Activate rewards marketing only after the advertised programme rules are real.
9. Open the unpublished preview, verify real catalog and customer data, then perform the merchant acceptance checks below. Publishing requires separate explicit approval.

## Required products and variants

**Ready Series Single Purchase:** the manifest lists all 12 current Ready Series meal names and categories. Create/map one real product per meal. Use a default variant when there are no customer options; use actual options/variants when portion or recipe choices exist. Assign `product.ready-series`. One-time purchases must be permitted. Do not attach a recurring plan to the Single Purchase form.

**Ready Series Bundles:** the manifest lists all 13 predefined offers grouped into Low Carb Meals, High Carb Meals, Just Protein and Mixed Bundle. Create one native bundle product per offer, with the specified Beef/Non-Beef variant where applicable, and assign `product.bundle`. Set product type to the source group name to preserve the grouped grid. Populate `performance.meal_count` and `performance.bundle_contents` with exact referenced component variants and quantities. Shopify Bundles can provide component inventory for compatible one-time bundles; a metafield alone does not implement inventory decomposition.

**Ready Series Subscription:** the manifest lists all 10 SKUs (`JPSUB01/02`, `LCSUB01/02`, `HCSUB01/02`, `LCMIXSUB01/02`, `HCMIXSUB01/02`) and reference names/Beef choices. Use a dedicated product for each SKU and its actual variant so that its product-level bundle contents are unambiguous. Assign `product.subscription`. Set `performance.meal_count`, category, accent color, highlights and exact bundle contents. Attach actual recurring selling plans. A subscription with no recurring allocation or no recorded bundle contents stays unavailable. These are recurring predefined bundles; there is no Build a Box.

Native Shopify Bundles are not compatible with selling plans. Use a compatible subscription/bundle app or appropriate app-managed predefined bundle products for recurring component inventory and fulfillment. Confirm this provider choice before taking subscription orders.

**Meal Plan programme products:** Biweekly, Monthly and 2 Months are recurring; 6 by 60 and 6 by 60 Plus are fixed programmes. Use options `Meal plan` (Low Carb Regular, Low Carb Regular+, Balance Regular, Balance Regular+) and `Meal frequency` (Lunch only, Lunch & dinner). Each recurring product needs 8 variants; each fixed programme needs the 4 Lunch & dinner variants. Record `performance.meals_per_day` = 1 or 2 on each variant. Programme `performance.menu_weeks` is 2 for Biweekly and 4 for the other source programmes, subject to Jerome’s confirmed operational setup. Set recorded inclusions/badge; configure real prices and selling-plan allocations. Fixed programmes remain one-time unless the merchant explicitly configures a supported prepaid arrangement. The manifest separately lists the Meal Plan menu meal reference products from `src/data.ts`; map these to actual kitchen products and publish their nutrition/image records.

**Gift card:** create Shopify’s native gift-card product with handle `gift-card`; assign `product.gift-card` and select it in the Gift Cards page section. Reference denominations are S$25/S$50/S$100/S$150; confirm actual denominations and currency. Recipient email/name/message/send date use Shopify’s native gift-card recipient properties. Shopify generates and fulfills codes after checkout. Physical delivery, custom redemption rules or exceptional fulfillment need a later app/process.

## Collections, pages and navigation

| Handle | Shopify resource | Template |
|---|---|---|
| `ready-series` | Single Purchase collection | `collection.ready-series` |
| `ready-series-bundles` | One-time Bundles collection | `collection.bundles` |
| `ready-series-subscriptions` | Recurring bundle collection | `collection.subscriptions` |
| `meal-plan` | Page | `page.meal-plan` |
| `meal-plan-builder` | Page | `page.meal-plan-builder` |
| `about` | About Us page | `page.about` |
| `rewards` | Rewards page | `page.rewards` |
| `gift-card` | Gift Cards page | `page.gift-card` |
| `ready-series` | Optional alternative landing page | `page.ready-series` |

Home uses `index.json`. Search uses native `/search` and `search.json`; Cart uses `/cart` and `cart.json`. Account links point to Shopify customer accounts, which must be enabled. New customer accounts are hosted by Shopify and are not rendered by Liquid theme templates. Gift-card redemption view uses `gift_card.liquid`.

Header and footer already supply brand links, About Us and native account/cart destinations. Create an optional `main-menu` containing extra required links such as Gift Cards and Search and choose it in the Header section. Include Home, Ready Series, Meal Plan, About Us, Rewards, Gift Cards, Account, Search and Cart across the navigation surfaces without duplicating built-in header links. If handles change, update every corresponding section/block URL. Configure the three collection selectors on every Ready Series collection template; their defaults assume the handles above.

Enable Shopify Search & Discovery filters for `performance.category` (Low Carb, High Carb, Just Protein), `performance.subscription_category` and any actual price/availability filters. Category filter values must match category block values exactly. Shopify owns filter/sort/pagination results; the local fixtures do not emulate every server-side filter state.

## Metafield definitions

All custom fields use the merchant-owned namespace `performance`; there is no app-owned `$app` namespace because this is a theme migration. The manifest supplies all 27 owner/type definitions. Product nutrition fields are calories_kcal (integer), protein_g/carbs_g/fat_g/sugar_g/saturated_fat_g/fibre_g/sodium_mg (decimal). Optional missing nutrition is never estimated.

Product descriptive fields: category, subscription_category, badge, prep_time, storage, heat_method, nutrition_note (single-line text); ingredients, allergens, preparation (multi-line text); highlights and inclusions (lists of single-line text); accent_color (color); related_products (list of product references).

Product commerce/presentation fields: meal_count, menu_weeks and meals_per_day (positive integers); bundle_contents (list of `performance_bundle_item` references). Variant meals_per_day is a separate positive integer definition and overrides the product fallback.

Standard product `reviews.rating` (rating) and `reviews.rating_count` (integer) should be maintained by a real review app. Attach review app blocks to product sections. Do not import the prototype’s invented authors or rating totals.

## Metaobject definitions and entries

| Definition | Fields |
|---|---|
| `performance_bundle_item` | label (required single-line text), variant (required variant reference), product (optional product reference fallback), quantity (required positive integer) |
| `performance_menu_window` | key (required stable single-line key), label (required text), days (required positive integer), meals (required list of product references) |
| `performance_menu_week` | label (required text), starts_on/ends_on (required dates), cutoff_at (required date-time with timezone), programmes (optional list of programme product references), windows (required list of `performance_menu_window` references) |

Create bundle items/window entries before linking them from products/week entries. Weekly entries need stable handles, valid date ranges, a future selection cutoff, at least one complete window, and enough eligible published weeks for the programme. Empty programmes means the week can serve any programme. Window entitlement is `days × selected variant meals_per_day`; days are coverage days in that window, not a shipping interval. A 60-day programme’s initial four weeks do not implement the remainder of fulfillment. Keep active upcoming records within Liquid’s first 50 metaobject entries; archive obsolete records. Larger catalogs or strict menu scheduling require the later app.

## Theme settings, images and content

The manifest embeds every global setting and every section/block schema with IDs, labels, types and defaults, including all editable approved editorial copy. Use that inventory when setting up or translating the theme; no setting is omitted.

Required resource selectors: all Ready Series collections; product detail back/related collections; Gift Cards native product; Meal Plan landing plan blocks and builder programme blocks. Required links: header/footer brand/About/Rewards/Gift Cards URLs and builder landing URL. Optional global settings: favicon, verified WhatsApp number (digits plus country code), support label/message prefix. Support stays hidden until a real number is supplied.

Homepage has seven approved sections: hero, statistics, brand standard, two experiences, brand family, mission and closing. Images, slide copy, buttons, statistics and brand details are editable. Static marketing claims and testimonials need Jerome’s confirmation. Gift Cards section has native heading/copy and selected product. Catalog palette is configurable (dark, warm, espresso); dark is the approved default. Purchase modes are configured by templates. Keep subscription account requirement consistent with the merchant’s actual customer-account policy.

The ZIP contains the four recovered original homepage PNGs, approved Ready Series hero and five exact approved Unsplash editorial images, plus Outfit/Inter/JetBrains Mono fonts. Their complete filenames are in `assetDependencies`. Product/collection images must come from Shopify uploads; add real alt text. Optional section image pickers override packaged editorial fallbacks. No external image downloads are needed for the default marketing pages. Review nutritional claims, programme guarantees, rewards tiers, company footer and any promotion/testimonial before enabling customer visibility. Set announcement/promotion blocks only after the corresponding discount and delivery rules exist. Test coupons are not automatically created.

## App-required flows

- Subscription plans/contracts, recurring billing, term expiry, renewals, cancellation/pause/resume and payment-method changes.
- Recurring predefined bundle component inventory/fulfillment and renewal meal contents.
- Meal Plan server-side validation of menu capacity, cutoffs, entitlements, delivery schedules/holidays, later-week selections, post-purchase edits and fulfillment integration. Initial theme choices are order line properties (`_pm_menu_selection` contains product IDs/window handles); they are editable client preferences and need app validation to become enforceable kitchen instructions.
- Rewards points, tier balance, referrals, wallet/credit, redemption and reconciliation. The Rewards section offers app-block integration and keeps unavailable programme content gated until configured.
- Custom account subscription/menu/rewards screens require customer-account extensions. Shopify handles real authentication, orders, addresses, checkout, thank-you and order-status surfaces.
- Guaranteed delivery eligibility/capacity and account-required purchasing must be enforced by store/app configuration, not browser controls alone.

## Local review and merchant acceptance

From `theme-tools`: `npm ci`, `npm run build:css`, `npm run check`, `npm test`, then `node preview.mjs`. Open `http://localhost:4173`. Fixtures are synthetic, remain outside the uploaded theme and create no Shopify records. Use `?customer=1` for signed-in presentation and `?empty=1` on the builder for unconfigured state. Account/checkout are labeled local placeholders. This is a LiquidJS approximation of Shopify’s rendering, not a replacement for the merchant preview.

In Jerome’s unpublished store preview verify: real product/variant prices and sold-out states; each of the three Ready Series modes; selling-plan prices in cart and checkout; gift recipient delivery; menus and required allocations; customer login/return route; filters/sort/pagination; app blocks; checkout shipping/tax/discounts; accessibility and mobile layouts. Upload success, actual Shopify checkout, subscription contract creation, gift delivery and account extensions cannot be certified without the store and provider configuration.

Upload instructions when access is available: Online Store → Themes → Add theme → Upload ZIP, select the packaged theme and keep it unpublished. Name it Performance Meals — Merchant Review. Never choose Publish or replace an existing live theme as part of this review.

## Business stream classification

Set performance.business_stream on every Performance Meals commerce product to ready_series or meal_plan. All variants inherit it. Populate business_stream on bundle/menu metaobjects; validate stream ownership of references. See [BUSINESS-STREAM-SEPARATION.md](BUSINESS-STREAM-SEPARATION.md) for the completed dev-store tests, shared gift-card/mixed-cart merchant decisions and future server validation requirements. Do not use product titles or collection handles as identifiers.
