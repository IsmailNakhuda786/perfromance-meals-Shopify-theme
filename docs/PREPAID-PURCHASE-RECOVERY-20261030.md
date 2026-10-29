# Missed-purchase recovery — 30 October 2026

Incoming checkpoint f5c0d81. This closes the need for an ad-hoc contract-ID script when a development purchase-create webhook is missed. It does not change billing, create a Shopify order, dispatch meals or issue Wallet/Rewards value.

## Engineering

- Bounded native subscription discovery uses Shopify's customer filter and independently checks the shop, development-store status, currency, app and customer on every returned record.
- Native cursor progression and whole-page ownership validation occur before any durable recovery write. Missing original orders, missing selling plans and incomplete native lines are individually held; one old test record cannot starve a valid purchase.
- Shopify subscription-line identifiers are opaque, including UUIDs; discovery no longer incorrectly assumes a numeric line ID.
- Only explicitly registered pricing can enter the existing exact-payment verifier. Fresh payment, customer, variant, quantities, GST, delivery and persistent discount checks remain mandatory.
- Read-only payment inspection is shared with intake. It creates no inbox, operational line or financial record.
- Explicit recovery creates a stable trigger identity, reuses the durable intake and converges with a late provider event or repeated request. Already-completed records are reported separately from newly recovered purchases. Uncertain/incomplete processing remains held and retryable.
- An authenticated development admin page previews ten records at a time and offers explicit bounded recovery. Client-supplied contract, customer and amount fields are rejected. The same disabled development gates apply to both the page and service; production is denied.

## Evidence

- Full disposable regression: 681 passed, one PostgreSQL-only test skipped, zero failed (682 total).
- Focused PostgreSQL intake/recovery: 22 passed, zero failed. Final focused replay/legacy/read-only inspection rerun is separately recorded in the private log.
- TypeScript, lint and production-schema consistency passed. Admin GraphQL 2026-10 and Polaris App Home validators passed.
- Actual read-only Shopify scan: 14 existing development contracts in one page, latest paid dispatch-test order included. Six were already registered, six had explicit pricing candidates and two incomplete no-order/selling-plan test records were held.
- Full read-only payment inspection of the 12 complete candidates: six verified; three held for a different native gross price and three for a different persistent recurring correction. These historical pricing tests were deliberately not rewritten or treated as approved purchases.
- All 37 protected Core model fingerprints were unchanged. Native mutations, Core writes and financial operations: zero during native discovery/inspection.
- Actual embedded Shopify admin displayed the recovery page in its disabled state. Enabled-page mutation acceptance has not been claimed.
- Normal temporary preview restored; four existing order/purchase callback topics have exactly one registration at the current origin. No new scope, charge, top-up activation or production setting change.

## Limits and next acceptance

Recovery is development-only and manually invoked; it is not a permanent scheduler. The new native scan and inspector were read-only. Actual new-row recovery through the enabled embedded admin page remains untested; PostgreSQL recovery used disposable fixtures. No whole requirement becomes PASS from this work alone. Complete booking/fulfilment, general activation, genuinely later billing-cycle calendars and platform-blocked Wallet checkout remain separate gates.

Private journals in ignored .shopify contain native IDs and snapshots; none are included in the public backup. The temporary development origin can still expire.

Official API reference: https://shopify.dev/docs/api/admin-graphql/2026-10/queries/subscriptionContracts
