# Performance Meals visual parity audit — 7 October 2026

This continues the existing workspace; no checkout was reset, recloned or discarded. Scope is customer-facing presentation only. No Admin/Core implementation, database work, merchant catalogue/settings/order changes or publishing was performed.

## 1. Reference inspected

Latest approved [Figma Make](https://www.figma.com/make/rH3lObMXl8HkxSMt9KxFaz/Shopify-Store-Design-Prototype) and customer `origin/main` at **a5eb7f2ac38222e5b54a5b44be84012d22001e63**. Source extraction now reads this ref directly, rather than reading older React files on the theme branch. Browser runtime initially became unavailable after an internet interruption; remaining desktop comparisons completed through the current preview observed in the same Figma Make file. No browser security setting was changed.

## 2. Existing production-oriented theme branch

Continued **shopify/theme-migration-v2**, starting from **355b2458ed93cdc272311b62755366ee7c9bbc08**. The existing source/theme/app work is preserved. Final commit is the commit containing this report; see Git history.

## 3–5. Presentation corrections

Extra UI found/removed: unconditional Rewards link; arbitrary merchant menu entries that added Gift Cards/Search/Storefront to contextual navigation; extra footer menu entries; unsupported catalogue search, sort and apply-filter controls; additional Quick View link. Existing routes and purchase logic remain.

Corrections added: source contextual desktop/mobile links and active states; correct homepage Ready Series landing destinations; source footer labels/order; announcement scroll/sticky-nav behavior; source catalogue content width/card typography, category badge, inline nutrition, stars when real rating data exists, price/Add row; separate native variant cards for Beef/Non-Beef bundles; native bundle unit prices and approved Add to Cart label; missing Ready Series benefits section; Meal Plan process restored independently of testimonial visibility; decoded dynamic Plan & Meals label; source product nutrition hierarchy, related-meal cards/heading/CTA, inline desktop shopping controls, native variant/quantity total; Gift Card black heading, Close link, placeholder fields with accessible labels, summary frame/value/total and source message wording; unapproved visible scheduled-date control hidden while preserving its native property/support; cart drawer width 400px, heading 20px, centered source empty state and Shop Meals action.

A focused preview check found the existing prepaid guard dependency was stale at its unversioned module URL: Subscribe could add an unverified plan despite the on-disk guard tests passing. The unchanged guard dependency now has a content-derived cache key in its import. After upload/reload, all three widths show Subscription unavailable and Subscribe is disabled. The disposable line from this focused check was removed; cart returned to zero. No checkout/payment/order was created. This fixes delivery of the existing guard; native billing policies and the subscription engine were not changed. A regression test checks the dependency content hash.

## 6. Header/navigation

Parent: Our Brands, About Us. Ready Series: Overview, About, Order. Meal Plan: Overview, About, Order, Customer Stories. Mobile contextual navigation preserves the same approved links and current-brand treatment. Account/cart and actual native login/logout remain. No generic Storefront catalogue navigation item exists.

The logged-in dev customer's actual first name is **Storefront**, so the shared account identity control displays Storefront/S rather than the prototype's sample Jerome/J. This is customer data, not a Storefront route or menu item. No customer was renamed to fabricate parity. The prototype wallet/points chip is not populated with invented balances.

## 7. Footer

Approved primary order: Ready Series, Meal Plans, Gift Cards, About Us. Prototype export/QA/developer links excluded. Native Privacy is present; native Terms/Refunds and confirmed phone/location/UEN/support configuration are missing. Prototype placeholder legal/contact values were not represented as verified merchant data.

## 8. Page/state matrix

| Page/state | Desktop 1440×900 | Tablet 768×1024 | Mobile 390×844 | Result / limit |
|---|---|---|---|---|
| Parent Home | Compared | Compared | Compared | Common heading styles/content image dimensions match; rotating hero phase varies. Announcement/promotions/contact data pending. |
| Parent About | Previously passed; retained | Previously passed; retained | Previously passed; retained | Approved heading/image geometry matches. |
| Ready Series landing | Compared | Compared | Compared | Approved heading/image geometry matches. |
| Ready Series About | Compared | Compared | Compared | Approved heading styles match. |
| Ready Series Individual Selection | Compared; updated preview verified | Compared; updated preview verified | Compared; updated preview verified | Presentation corrected; 3 visible products rather than 12 due native publication/collection gaps. |
| Ready Series Bundles | Compared; updated preview verified | Compared; updated preview verified | Compared; updated preview verified | Native Beef/Non-Beef cards preserved; remaining groups/components unavailable from native data. |
| Ready Series Subscription | Compared; guard verified | Compared; guard verified | Compared; guard verified | One product visible rather than five/ten variants. Wrong native monthly installment plans stay unavailable under restored guard. |
| Ready Series product details | Compared; final updated preview verified | Compared; final updated preview verified | Compared; final updated preview verified | Main title/image dimensions match; nutrition/related presentation corrected. Native descriptions/preparation/reviews/related references missing. Quantity total 12.50→25.00→12.50 verified from native variant data. |
| Meal Plan landing | Compared; restored process verified | Compared; restored process verified | Compared; restored process verified | Missing process section fixed; all four steps visible. |
| Meal Plan contextual About | Compared | Compared | Compared | Heading/image geometry matches. Source body About Us CTA intentionally goes to parent About; contextual About goes to Meal Plan About. |
| Meal Plan Customer Stories | Compared | Compared | Compared | Heading/image geometry matches. Explicit source placeholder/consent labels are content, not internal export controls. |
| Meal Plan builder Type / Plan & Meals / Menu | Compared | Compared | Compared | Dynamic ampersand fixed; only two native programmes configured. Four weeks/twelve windows load but every window has zero visible menu products. |
| Meal Plan Your Details / Review / checkout state | Data-blocked | Data-blocked | Data-blocked | Cannot claim parity or end-to-end success while native menus are empty and persistence reports save failure. No fake menu/review created. |
| Shared account | Source/native inspected | Source/native inspected | Source/native inspected | Shopify-hosted Orders/Profile/Subscriptions differ from custom prototype dashboard. Theme cannot restyle hosted account; existing extension/account work is preserved, not expanded. |
| Gift Card details | Source/native inspected | Source/native inspected | Source/native inspected; final summary verified | Source field/layout corrections applied; denominations, physical delivery and source conflicts remain. Payment uses native Shopify checkout, not prototype card-entry/Stripe simulation. |
| Cart drawer | Source/native inspected; final 400px verified | Source/native inspected; final 400px verified | Source/native inspected; final 390px verified | Empty-state styling corrected. Earlier native add/remove check retained; shipping progress/promotion/wallet data unavailable. No payment/order created. |
| Cart page / Search / Rewards routes | Integrated render tests | Integrated render tests | Integrated render tests | Native functionality/routes retained; no unapproved header links added. These are not claimed to be pixel-identical to a custom hosted account or prototype payment form. |

## 9–11. Responsive result

All representative widths above were inspected. No horizontal overflow on the updated Ready Series collections, Meal Plan landing/builder, product or Gift Card pages. No broken content images on the restored Meal Plan landing. Drawer widths now match source: 390 mobile; 400 tablet/desktop. No redesign was applied. This is a completed audit with explicit dependency gaps, **not a blanket full-parity approval**.

## 12–14. Controls and preserved functionality

Rewards/Gift Cards/Search/Storefront catalogue links are absent from the header and mobile navigation. Gift Cards remains in the approved footer; Rewards and Gift Card functionality/routes remain available underneath the approved customer/account architecture. The actual customer's Storefront name is the identity distinction noted above.

Full-theme static checks find no customer HTML/PDF/ZIP downloads, QA Handoff, source/export/debug tools, removed Build-A-Box flow or React/Vite runtime. Shopify's password-protected Draft preview toolbar is platform QA chrome, not customer theme markup.

Native cart forms, variants, selling-plan integration, shared identity/checkout, Gift Card recipient properties, account/wallet/reward hooks, Meal Plan persistence, Core hooks, canonical business streams and line-level routing remain. Ready Series and Meal Plan streams remain ready_series/meal_plan; Gift Cards remain shared with separate operational classification. Historical Order #1007 and prior QA orders were not edited/recreated.

## 15. Actual checks

- Theme tests: **22/22 pass**, including whole-route integration, unique IDs, purchase JSON, translation closure, stream metadata, one-time/subscription separation, unchanged prepaid guard and content-versioned module dependency.
- Full integrated theme validator: **117 files / 77 code files**, zero static failures and zero findings from its installed recommended check set.
- Shopify CLI Theme Check: **0 errors, 3 warnings**. ExcessiveSettingsCount on About (56 settings), Meal Plan landing (80), Rewards (67), threshold 40. These existing merchant-editability warnings are not upload/render blockers; schemas were not split during a presentation-only task.
- Core integration tests: **8/8 pass**. Typecheck and lint pass; existing app build passes with its existing configured endpoint. Initial build without the required app URL failed; rerun reused the existing generated endpoint, with no app source/config changes. SSR empty-route chunks and React Router future-flag notices are non-failing build messages. No Core deployment was performed.
- CSS production build passes; JavaScript syntax, JSON/schema/template/asset/snippet dependencies checked; git diff --check passes.
- Read-only Shopify data audit: 12 approved singles; 9 bundle products/13 offers; 5 subscription products/10 variants; 5 Meal Plan programmes; 9 menu products. Exact visibility/membership/media/pricing gaps are in the companion data report.
- Existing merchant settings_data, header-group, footer-group, builder programme bindings and Gift Card product binding preserved via readback comparison. All 24 uploaded/read-back presentation and guard files match local output byte-for-byte (JSON compared structurally). Final push reports the same theme ID and unpublished role.

## 16–17. Git / unpublished development update

All completed presentation changes, regression tests and these reports are committed on the existing branch. Only **performance-meals-development.myshopify.com**, theme **146242797652**, **performance-meals-homepage-runtime-check**, was updated. Shopify reports **unpublished**. No new/live theme was created or published, no client store was accessed, and no Admin/Core implementation was started.

## 18. Remaining differences — separated

**A. Theme/design:** verified changes above are applied. Remaining visual regions that need integration (source wallet/reward chip, real account dashboard, menu/review state, shipping progress/promotion state, physical Gift Card delivery/payment state) cannot be validated as exact functional parity using unavailable data or by rendering fictitious balances/commerce. They remain explicitly unapproved for a full parity signoff. Native money/currency labels intentionally use Shopify formatting rather than hard-coded prototype dollar text.

**B. Native data/configuration:** [exact catalogue/data gap report](VISUAL-PARITY-DATA-GAPS-20261007.md) lists every missing collection/channel association and approved name/handle, image, prices, native filters, programme blocks, menu-product visibility, real reviews/descriptions, prepaid selling plans, Gift Card denominations/availability, footer/policies/discount/support dependencies. Existing products were not duplicated or replaced with placeholders. Menu-week definitions already exist; unpublished referenced products explain empty Liquid windows. Persistence/save failure remains a pre-existing backend/deployment blocker outside this presentation scope. Hosted accounts require supported extension configuration for the source custom dashboard; no new architecture/UI was built.

**Exact source conflicts:** Gift Card still says FRESHER. and refers to removed Build-A-Box/Ready-to-Go; source claims gift use on Meal Plan subscriptions, while native Gift Cards cannot fund recurring renewal charges. Source product delivery note says free delivery over SGD80, while catalogue/announcement say SGD120; current dev shipping is test configuration. Stale fixed/one-time programme grouping contradicts the explicit approved subscription-only Meal Plan requirement. 6 by 60/Plus are genuine 60-day programmes; only their absent exact recurring billing/delivery cadence remains a merchant decision. Placeholder review counts, balances and identity were not invented as real Shopify data. Source fields win when unambiguous; conflicts were reported rather than guessed.

Stopped at the end of this customer presentation audit. No Admin/Core phase begins automatically.
