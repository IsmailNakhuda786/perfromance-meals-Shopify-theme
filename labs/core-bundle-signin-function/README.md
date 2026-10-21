# Local-only Ready Series bundle sign-in validation candidate

Not installed, uploaded, deployed or activated. Keep outside the Core app's extensions directory.

User explicitly requires sign-in for ordinary Ready Series bundles. This Shopify CLI-generated Rust checkout validation candidate reads native buyerIdentity.isAuthenticated, native product stream and variant/product bundle references. A known customer/email alone is not authentication. Ordinary food, Meal Plans and Gift Cards are not affected by this bundle-specific rule.

Default off. Its app-owned validation metafield `bundle_signin_configuration` in `$app:core` requires enabled=true, policyVersion=`bundle-signin-20261020` and a nonempty exact native productGids allowlist. Missing, invalid, disabled or wrong-version configuration returns no operations and does NOT establish enforcement. This QA restriction is intentional; no general production activation is approved.

14 synthetic fixtures pass the official Shopify WASM runner at API2026-07: guests/signed-in/missing identity; individual, mixed, Meal Plan/Gift Card; product fallback/variant override; disabled/missing/foreign-product/wrong-version configuration. Query validated by Shopify Toolkit. This proves compiled logic only, not live checkout behaviour, plan eligibility or bundle snapshot cryptographic verification.

Reproduce in an isolated Shopify CLI-generated `cart_checkout_validation` Rust extension. Copy these sources, schema, fixtures and Cargo lockfile. Install the generated test dependencies; put Shopify CLI and Rust/Cargo in the process PATH; build and run `npm test -- --run tests/default.test.js`. The local machine needed its existing MacOSX15.4 SDK selected for the build process because the default27 SDK was incompatible with its linker. Do not change system SDK settings or deploy from this lab. Dependencies, toolchains and compiled WASM are not versioned.

Native gates: development-only permission/deployment/activation approval, exact QA-product scope, unpaid guest/signed-in checkout comparisons and deactivation afterward. Core review route and storefront attachment remain disabled. This candidate validates sign-in only; it does not authenticate review hashes, select Wallet lots, charge payments or alter shipping fees.

## Default-off review approval candidate — 21 October

Optional `requireReviews:true` compares cart proof against the authenticated customer's `$app.bundle_review_approvals` JSON. The input and native values are customer-bound, product/variant/quantity-bound and bounded; forged/missing/duplicate/ambiguous reviews and changed listed-product classification are rejected.33officialWASMfixtures pass. The original14signinfixtures still pass with the option omitted. Core's matching projection and native QA evidence are documented in `docs/CORE-BUNDLE-APPROVAL-CANDIDATE-20261021.md`. This is approval authenticity, not atomic single-use permission or catalogue freshness; do not claim full checkout prevention or enable generally. The scoped native development test is complete and its rule/customer values restored.
