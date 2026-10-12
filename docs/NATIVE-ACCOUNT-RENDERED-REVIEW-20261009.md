# Rendered native customer-account review

Review-only development preview; no app release or theme publication.

## Sources and actual rendering

- Approved customer source: `58272e4e011d03249b196d392319ad22fa8dc0ca`, AccountPage.tsx.
- Existing app: Performance Meals Core, verified organization My Store 2.
- Store: performance-meals-development.myshopify.com only.
- Shopify customer-account full-page extension, API 2026-07.
- The remote Make preview was blocked; the original Figma editor remained loading. The approved source was rendered locally, without changing its customer components. The local reference is not a production storefront or theme dependency. Its launch configuration alone enables symlink resolution to reuse installed dependencies.
- Actual native development preview: https://shopify.com/71166492756/account/pages/dev-7feb0fbe-41a0-dd17-770b-feaf4e0ef96f8e9eec5d?region_country=SG

Desktop 1440, tablet 768 and mobile 390 captures are saved under `work/account-review/`. The seven native section buttons were exercised in the browser. These are rendered comparisons, not proof that all seven underlying feature sets are complete.

## Comparison and functional boundaries

| Section | Approved prototype | Actual native development preview | Remaining work |
| --- | --- | --- | --- |
| Dashboard | Black/gold identity strip; points, wallet, plan week, next billing; plan and monetary wallet cards; reminder and management shortcuts | Seven approved labels; native sections and responsive two-card grid. Subscription status unavailable rather than incorrectly labelling a historical saved selection active | Supported merchant branding; verified identity/points/renewal/active-contract projection and management shortcuts |
| My Plan | Meal Plan / Ready Series contexts; programme, plan type, meals and management | Both contexts; authenticated saved selections retrieved. Shopify metadata resolves Monthly and Low Carb Regular / Lunch & Dinner; saved windows and meal counts render | Native contract status, full selections presentation, verified pause/skip/cancellation, Ready Series prepaid contract coverage |
| Order History | Unified prototype order list | Native Orders link using supported `shopify:customer-account/orders` protocol; resolves to the account's native Orders route | No invented prototype order list; any additional department-specific presentation must preserve one original order |
| Wallet | Funded + Gift Card-funded monetary balance, separate bonus, ledger/top-up/redemption | Disabled wallet stays unavailable; no demo monetary values shown | Durable source-separated projection, verified payment settlement, conversion, renewal support and customer transaction history |
| Rewards | Points, earning/redemption and history | Label preserved, unavailable state explicit | Persistent engine, verified economics and history; no demo balances/redemption success |
| Gift Cards | Purchase and conversion presentation, codes and balance | Native purchase history/checkout redemption explanation; conversion explicitly unavailable | Verified conversion workflow and authenticated safe balance/history presentation |
| Settings | Details, addresses, notifications, payment methods | Supported native `shopify:customer-account/profile` link resolves to the customer profile | Real custom notification preferences if required; use supported native profile/payment management |

Native account components inherit merchant branding and do not support theme CSS overrides. Current blue buttons and rounded native surfaces differ from the source's black/gold rectangular presentation. Blue is not the intended final Performance Meals palette. Branding remains pending review; no global branding setting was changed.

The initial account footer selected Pakistan. The native country picker exposed Singapore, and selecting it confirmed `Country switched to Singapore` and changed the native storefront link to `country=SG`. This was QA session context, not evidence that store/base currency or primary market reverted. Dashboard captures were refreshed in Singapore context. Earlier per-section captures may retain Pakistan in their footer and are not current regional evidence.

## Verified versus pending

Verified: authenticated account read returns existing saved selections; native Shopify names and variants render; no arbitrary substitute names; no historical selection presented as an active subscription; all section switches render; native order/profile URLs resolve; responsive dashboard layouts render at three widths.

Pending: complete account functionality, final branding, full live-Figma-side visual verification, persistence on permanent infrastructure, subscription lifecycle QA and the other Customer/Core acceptance requirements. Development SQLite/tunnel success does not establish permanent PostgreSQL readiness. No test orders were recreated.

## Validation

- Core tests: 11 passed, including two focused catalogue-name tests for native metadata, deduplication, mismatched product references and unavailable metadata.
- Core typecheck and extension SDK TypeScript check passed.
- Lint passed after correcting the unused projection variable.
- Core build passed, with existing React Router future-flag warnings.
- App config validation: valid true, no issues.
- Theme integrated validation: 145 files, 80 checked, zero findings; 29 tests passed.
- Theme Check: zero errors; three existing ExcessiveSettingsCount warnings (About 62, Meal Plan landing 71, Rewards 59).
- Bundled account validator could not run fully: the skill installation lacks TypeScript dependencies and its data/types/index.json. Reusing existing local TypeScript solved dependency resolution, but the types index is still absent. CLI extension bundling and installed SDK TypeScript validation passed; do not claim the toolkit validator passed.

## Preserved work

Existing dirty wallet/schema/migration/tests/deployment work remains untouched by this account change. The existing unpublished theme remains 146242797652. The individual cart corrections already uploaded before the pause were visually checked again; cart remains one original Teriyaki Chicken & Brown Rice line, unchanged in quantity. The approved source catalogue extractor still reports 12 singles, nine bundle products with 13 variants, 10 Ready Series subscription variants, and all five Meal Plan names. Billing cadence for the two 60-day programmes remains a specific merchant decision; they remain recurring programmes.

Account release remains gated on user review and functional completion. No Admin UI development, production database purchase, live-store change or theme push was performed in this resumed account-review work.
