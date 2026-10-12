# Performance Meals Shopify migration

Reference: `IsmailNakhuda786/perfromance-meals`, `main` commit `227c1a0efea28b0c122fdb1bbffb2f0944d3213f`. Implementation branch: `shopify/theme-migration-v2`. The approved React/Vite source is retained unchanged for comparison; only `theme/` is uploaded to Shopify. No Admin code is included.

The older `production` branch (`02c1069`) removes internal download/QA chrome but predates the latest customer corrections. This migration uses the new `main` for the approved behavior and excludes all internal chrome directly from the native theme. No React/Vercel deployment is created or changed.

Ready Series has exactly three purchase modes: **Single Purchase** and **Bundles** are one-time; **Subscription** is recurring predefined bundles using real selling plan allocations. Removed routes: Build a Box, Ready To Go, How It Works. Rewards, Gift Cards and About Us are included.

## Page and component map

| Approved reference | Shopify destination | Behavior/data |
| --- | --- | --- |
| `App.tsx`, `Nav.tsx`, `Footer.tsx`, `Logos.tsx` | `layout/theme.liquid`, header/footer section groups, logo snippet | Native URLs, Shopify account sign-in, session cart; remove prototype downloads/tooling |
| `HomePage.tsx` | `templates/index.json`, `sections/home-*.liquid` | Ordered editable sections, shatter carousel, brand accordion, approved imagery and typography |
| `PromoPopup.tsx` | promo section/dialog | Merchant content and real destination; no simulated discount validation |
| `ReadySeriesPage.tsx` | `collection.ready-series.json`, `main-collection.liquid` | Real collection products, filters, sorting, pagination, quick view; configured subscription products |
| `ReadySeriesProductPage.tsx` | `product.json`, `product.ready-series.json`, `main-product.liquid` | Native media, variant availability, Shopify prices, selling plan allocations, nutrition metafields, app reviews |
| `MealPlanLandingPage.tsx` | `page.meal-plan.json`, `meal-plan-landing.liquid` | Approved goal/process/frequency layout; actual plan product pricing |
| `MealPlanWizardPage.tsx` | `page.meal-plan-builder.json`, `meal-plan-builder.liquid` | Type → plan/meals → menu → details → review; actual plan variants and selling plans, published menu metaobjects, order line properties |
| `AboutPage.tsx` | dedicated page JSON templates and sections | Approved static editorial content, native links and FAQ disclosures |
| `GiftCardPage.tsx` | `page.gift-card.json`, native product form and `gift_card.liquid` | Real gift-card variants and Shopify recipient properties; native checkout |
| `RewardsPage.tsx` | `page.rewards.json` and app block host | Approved information design; earning, balance, redemption and referrals await loyalty integration |
| Cart drawer in `Nav.tsx` | `snippets/cart-content.liquid`, `sections/cart-drawer.liquid`, `main-cart.liquid` | Ajax cart with server-rendered sections, line keys, properties, selling plan names, checkout |
| `CheckoutPage.tsx`, `ConfirmationPage.tsx` | Shopify Checkout / Thank you / Order status | Shopify owns address, shipping, tax, discount, payment and real order confirmation |
| `AccountPage.tsx`, fake Nav auth | Shopify customer accounts | Real sign-in/orders/addresses. Custom subscription/menu/wallet screens need customer account extensions |
| Handoff, Blueprint, Wireframe, ScreensExport | retained only in reference source | Internal review tools are excluded from customer theme |

## Implementation decisions

Preserve Outfit/Inter/JetBrains Mono, charcoal `#1A1A1A`, Ready Series yellow `#F5B300`, Meal Plan orange `#E85D04`, approved spacing/breakpoints and homepage structure. Compile static utility CSS from Liquid templates; ship no React or Vite runtime. Use accessible links, native forms, disclosures and dialogs with progressive enhancement.

Shopify is the source of product identity, price, inventory, currency, cart totals, selling plans, customers, orders and checkout. Marketing content is editable in section settings/blocks. Nutrition and published menu information use merchant-owned `performance` metafields/metaobjects. Definitions must be created before values are populated and read by Liquid; setup documentation supplies that order. No production catalog or discount records are invented.

## Boundaries requiring later apps or extensions

- Recurring subscription creation/terms, contract changes, pause/resume/cancel, deferred billing and expiry require a subscription app. Theme code can only select existing selling plan allocations for purchase.
- Recurring predefined bundle fulfilment, component inventory and renewal scheduling require a compatible subscription app. Native Shopify Bundles cannot be combined with selling plans. Build a Box has been removed; the theme does not provide a mix-and-match flow.
- Meal Plan weekly menu edits after purchase, cutoffs, locked delivery capacity, holiday calendars and fulfilment scheduling require an app. Published menus can be displayed and initial selections captured as line properties, which are customer-editable preferences rather than enforceable business rules.
- Wallet credits, reward points/tiers, referral codes, voucher redemption and automatic refunds require real loyalty/credit integrations. The prototype balances and transactions are not real customer data.
- New customer account pages operate outside theme templates. Custom account layouts/actions need customer account UI extensions. Payment method updates and order-status customization belong to Shopify's native surfaces or compatible extensions.
- Delivery fees/eligibility, taxes, discounts and account-required checkout must be configured/enforced in Shopify or an app. Browser controls alone cannot enforce them.

## Store acceptance gate

Package and check the theme locally, then upload as a new unpublished theme. Populate actual catalog, collections, metafields and menu records; assign page templates; choose account/app integration settings. Compare desktop/mobile previews against the approved source, test real cart/variant/selling-plan flows and Shopify checkout in the store. Publishing remains a separate action requiring explicit approval.

Official references: [theme architecture](https://shopify.dev/docs/storefronts/themes/architecture), [Ajax cart](https://shopify.dev/docs/api/ajax/reference/cart), [selling plans in themes](https://shopify.dev/docs/storefronts/themes/pricing-payments/subscriptions/add-subscriptions-to-your-theme), [customer account extensions](https://shopify.dev/docs/api/customer-account-ui-extensions).
