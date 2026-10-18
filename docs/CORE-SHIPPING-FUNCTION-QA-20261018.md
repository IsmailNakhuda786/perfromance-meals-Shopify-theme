# Core shipping Function — isolated development QA, 18 October 2026

## Approved scope

User specifically approved uploading this Function through the preserved development
preview and temporarily activating a rule for three existing unpublished QA products.
No released app version, theme publication, completed order, payment, Wallet action,
production access, published-product shipping-profile or payment-provider change.
The same two guarded OPEN QA drafts were reused; no new draft was created.

## Native findings and fixes

1. Order discount: native Function input reports subtotal100, total100 and allocated
   discount30, while checkout food is70. `totalAmount` is not an all-discount net
   invariant. Core subtracts native allocations once from subtotal and bounds total
   between that result and subtotal. It rejects negative/overflow/inconsistent values.
2. Boolean metadata: native boolean false has typeboolean/valuefalse but jsonValue
   returned the stringfalse; true returned booleantrue. The query now reads declared
   type/raw value and accepts only exact boolean true/false representations. No
   product metadata, price or merchant content was changed to bypass validation.
3. The official generator picked the repository's pnpm path although npm modules
   were preserved. Explicit local type generation avoids an automatic module purge.
   Both existing lockfiles are updated; no existing npm package version changed.
4. A preview startup flag initially retained the placeholder app URL. Corrected by
   restarting normal development URL routing, without resetting authentication or
   publishing. Core UI loads and order listeners are reconnected.

## Observed unpaid checkout results

| Case | Ordinary food after allocated discounts | Offered delivery |
|---|---:|---:|
|100food less30order discount|70.00|10.00|
|Below75|74.99|10.00|
|Exactly75|75.00|5.00|
|Below125|124.99|5.00|
|Exactly125|125.00|0.00|
|20food +255.20prepaid|20.00|10.00|
|75food +255.20prepaid|75.00|5.00|
|125food +255.20prepaid|125.00|0.00|
|Prepaid only|0.00|0.00|
|Two25meals +50ordinary bundle|100.00|5.00|
|100food less30line discount|70.00|10.00|

Only the correct option remained for each case. The first order-discount checkout
showed80total. Mixed75checkout showed335.20total; mixed125showed380.20total.
All cases used the development store's existing0tax collection configuration.
This does not prove9%GST or shipping-tax behaviour.

## Verification and cleanup

25synthetic official WASM runner fixtures pass, including disabled config, exact
product allowlist, discounts, groups,250lines and scoped diagnostics.274Core tests,
typecheck/lint and SQLite/PostgreSQL schema alignment pass. No new migration.
All23SQLite migrations reconstructed an isolated empty test database; existing
native development balances/data were not migrated or financially mutated.

The rule is disabled after QA and independently read back. Diagnostic labels are
off. Existing Shipy rules were not activated. Top-ups remain disabled. The new
extension is development-only and requires an explicit exact-product allowlist.
Do not release/enable it for general products without the remaining acceptance.

All4current callbacks independently verified exactly once at the new preview:
ORDERS_CREATE,ORDERS_UPDATED,ORDERS_PAID,SUBSCRIPTION_CONTRACTS_CREATE.
Customer-account browser regression is unverified: automatic review rejected the
sharedshopify.com origin twice despite exact dev-page approval. No bypass used.
CLI runtime log stream reportsMalformedJWT; private scoped diagnostic labels proved
real Function invocation and were switched off. No false log-stream success claim.

## Remaining production gates

NonzeroGST and shipping-tax semantics; normal storefront/discount-code and resumed
checkout paths; native subscription checkout; multipleordinaryshippinggroups;
published-product profiles and rates; supported production app distribution/plan.
Delivery customization hides existing options and cannot create missing rates.
HELD returns no changes; it is not a promise of correct native shipping.
