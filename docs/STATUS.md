# Merchant review checkpoint — 5 October 2026

Approved source: current `main`, `227c1a0efea28b0c122fdb1bbffb2f0944d3213f`, verified against GitHub. Dedicated branch: `shopify/theme-migration-v2`. Original customer React source and Admin project are unchanged.

Native OS 2.0 theme implementation is complete for local merchant review: approved homepage/chrome, Ready Series Single Purchase/Bundles/Subscription, product details, native cart drawer/page, search, Meal Plan landing/builder, About Us, Rewards integration host and native gift cards. Internal prototype controls and Build a Box are excluded.

Full integrated validation passes across 101 packaged files (65 Liquid/JSON/JS/CSS files checked by Shopify’s validator), with zero Theme Check errors/warnings and no missing translations/assets/references. Seven integrated fixture tests pass. Browser checks cover 12 theme routes at 390, 768, 1366 and 1920px, with no remaining horizontal overflow or captured console errors. Gift Cards mobile labels/contrast were repaired to preserve the approved responsive behavior.

Merchant setup documentation and complete machine-readable settings/catalog/definition inventory are in MERCHANT-SETUP.md and MERCHANT-SETUP-MANIFEST.json. Local Liquid fixtures and validation/package tooling are outside the uploaded theme. ZIP output is in the task outputs folder and is verified byte-for-byte against the theme files.

Jerome’s store access is still missing. Actual products, prices, inventory, nutrition, selling plans, menu entries, navigation selections, loyalty/subscription providers, gift-card setup, shipping/tax/policies and support details remain merchant setup tasks. Native checkout/authentication, subscription contract creation and gift delivery require acceptance in the unpublished Shopify store preview. See VERIFICATION.md for the practical limits of local verification.

Nothing uploaded or published. No live theme was overwritten. Subscription contracts, recurring bundle fulfillment, enforceable Meal Plan scheduling and loyalty/account extensions remain app work, explicitly documented for the later phase.

The earlier interruption checkpoint and migration generator scripts remain preserved locally in ignored work/migration-history/.
