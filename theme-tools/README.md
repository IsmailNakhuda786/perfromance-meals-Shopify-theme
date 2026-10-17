# Performance Meals theme tooling

The deployable theme is `../theme/`. Tooling and fixtures stay outside it. This does not change or deploy the original React reference.

Run `npm ci` here, then:

- `npm run build:css` compiles static CSS from Liquid/native JS using Tailwind CLI.
- `npm run check` checks all theme files, JSON references, assets, prohibited runtime/internal controls, JS syntax and the full Shopify Theme Check/schema/translation rules. Findings cause a nonzero exit. It uses Shopify's unmodified skill validator with pinned Theme Check dependencies. If the machine cannot cache updated docs, bundled rule schemas are used; the report records that limitation.
- `npm test` renders the approved routes with LiquidJS and checks meaningful purchase/data contracts.
- `node preview.mjs` starts a local Liquid fixture server on `127.0.0.1:4173`. `?customer=1` enables a synthetic signed-in customer; `?empty=1` disables builder configuration. Fixtures never enter the ZIP. Cart endpoints mimic the native API contract for browser interaction tests; account/checkout are explicitly labeled placeholders. It does not emulate Shopify's full pagination, checkout, authentication or fulfillment.
- `node merchant-manifest.mjs /absolute/review-output.json` generates a review inventory without replacing the checked-in file. Omitting the output path refreshes the full inventory, including every theme schema/template, so review its diff before saving. Prototype Ready Series arrays are historical reference shapes; the authoritative merchant prices and contents are in `merchant-catalogue-20261015.json`. Meal Plan billing rules distinguish recurring plans from one-time 60-day programmes. Ready Series delivery-calendar cadence remains pending Jerome; this tool does not activate purchases or create Shopify records.
- `npm run package` builds and verifies a ZIP containing only Shopify theme directories. It rejects Git LFS pointers and verifies every archived file against its source. Output defaults to the task's `outputs/` folder; pass an absolute ZIP path as an argument for another location.

Do not use the old one-time migration generator scripts to regenerate final theme files. Historical scripts and scratch data are preserved locally outside release tooling. No Shopify CLI upload or publish is performed by these commands.

For merchant design sync, use explicit upload file allowlists and preserve the current remote configuration before uploading. Portable templates deliberately have no staging resource IDs; do not overwrite a configured merchant builder/Gift Card template or settings_data with those defaults. See `../docs/CUSTOMER-SYNC-20261007.md`.
