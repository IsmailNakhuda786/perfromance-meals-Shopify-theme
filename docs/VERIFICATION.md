# Performance Meals merchant review verification

Date: 5 October 2026. Source: `227c1a0efea28b0c122fdb1bbffb2f0944d3213f`. Branch: `shopify/theme-migration-v2`.

## Integrated validation

Shopify Theme Check 3.24.0 ran across the entire theme through the unmodified Shopify Liquid skill validator. All 65 Liquid/JSON/JS/CSS files passed: **0 errors, 0 warnings**. The complete output accompanies the deliverables as `theme-validation.json`. The validator could not write its documentation update cache on this machine, so it used bundled rule/schema documentation. This did not disable integrated checks; merchant upload remains a separate store acceptance step.

Additional checks passed for every JSON file, template/section/snippet/asset reference and JavaScript syntax. The theme contains **101 release files**, no React/Vite runtime, TSX/JSX source, node_modules, source maps or build server dependency. The ZIP contains only recognized theme directories at its root, with actual image/font bytes rather than Git LFS pointers. The archive integrity and every extracted file are compared against local theme files.

No HTML/PDF downloads, QA handoff, screenshot/source/export controls, prototype ZIP/theme downloads or Build a Box/How It Works routes occur in the theme output. Development tooling and synthetic fixtures are excluded from the ZIP. Original React reference files remain in their existing repository location.

## Automated fixture checks

Seven integrated tests pass:

1. Approved routes render with complete static/dynamic translations, valid purchase/config JSON and unique HTML IDs.
2. Single Purchase and Bundles contain no selling-plan input; Subscription requires recurring allocations and predefined bundle contents, with missing configuration disabled.
3. Subscription selling-plan context survives navigation into product details.
4. Purchase resolver prevents missing/non-recurring plans from falling back to one-time prices and respects unavailable/account-required states.
5. Meal Plan configuration uses native product/variant/allocation IDs and prices, plus metaobject delivery windows; missing configuration remains unavailable.
6. Native gift-card variants and recipient properties render, and the redemption template reads the supplied gift-card balance/code.
7. Cart rendering shows actual selling plans and line keys while hiding private selection properties.

## Browser responsive checks

Local browser verification uses a LiquidJS preview of the actual Liquid templates with synthetic Shopify-shaped data. A native browser was used because the agent-browser CLI was unavailable. Checks included meaningful content, expected headings/cards, viewport overflow and captured console errors. Screenshots were visually inspected at representative responsive widths; changes were limited to integration/fidelity repairs. This is not a claim of pixel-identical rendering against every state of the original prototype.

| Viewport | Theme routes checked | Remaining horizontal overflow | Captured console errors |
|---|---:|---:|---:|
| Mobile 390 × 844 | 12 | 0 | 0 |
| Tablet 768 × 1024 | 12 | 0 | 0 |
| Laptop 1366 × 900 | 12 | 0 | 0 |
| Desktop 1920 × 1080 | 12 | 0 | 0 |

The 12 routes are Home; Ready Series Single Purchase, Bundles and Subscription; Meal Plan landing and builder; About Us; Rewards; Gift Cards; a meal product detail; Search results; and Cart. Account navigation was inspected and uses the native Shopify account destination. Local account/checkout destinations are explicitly labeled placeholders, not Shopify authentication/payment simulations.

Browser interactions verified: mobile menu open/close and native account destinations; product quick view; one-time add to cart and drawer refresh; recurring bundle add with selling-plan name and actual allocation price; unavailable subscription disabled; gift-card amount change and recipient properties in cart; Meal Plan variant/billing selection, published windows, exact entitlement limits, review and local checkout handoff. Merchant data, rather than fixture data, will determine production catalog counts and prices.

Repairs made during integration: missing static/dynamic translations; ES module loading for catalog purchase logic; redundant builder script inclusion; missing native route references; exact approved editorial images packaged locally; subscription product-detail context; chosen Meal Plan landing product carried to the builder; Gift Cards mobile step-label overflow and logo contrast. Native product prices/reviews/customer data replaced prototype commerce state. No new page design was introduced.

## Store acceptance still required

No Shopify upload, publish, checkout payment, real account login, contract creation or gift-card email was attempted. Store access and actual merchant setup are unavailable. Shopify filter/pagination/Markets behaviors, app block installation, shipping/tax/discount configuration, native customer accounts, subscription provider policies, checkout/thank-you and gift fulfillment must be tested in Jerome’s unpublished theme.

The package is prepared for **unpublished merchant review**, with these setup requirements documented rather than silently filled with invented live records. Subscription contracts/bundle renewals, enforceable Meal Plan scheduling/menu validation, loyalty/wallet/referrals and custom account extensions require later apps.
