# Isolated Core shipping Function candidate

Not an active extension. Do not move this folder under the current app's extensions,
deploy, activate or set `enabled` without separate native acceptance/authorization.
CLI-generated TypeScript delivery-customization scaffold, API 2026-10.

The candidate uses a snapshot of Core's delivery policy and evidence adapter. Verify
`src/core-delivery-options.ts` and `src/delivery-policy.ts` match the canonical Core
services before every build. `core-source-hashes.json` records the reviewed snapshot.

Configuration defaults off. It requires enabled=true, policyVersion=
"sg-delivery-20261018", pricesIncludeTaxVerified=true and the native top-up product
identity if present, plus a mandatory exact-product allowlist for isolated QA.
Any cart containing an unlisted product returns no operations. Fixture configuration is SYNTHETIC evidence, not a claim that
GST/checkout acceptance has passed. No customer or private store data is included.

25 synthetic fixtures passed the official Shopify WASM test helpers and Function
runner on 18 October 2026. Inputs, input-query matching and expected outputs were
validated against the fetched 2026-10 schema. This includes order discounts, exact
75/125 boundaries, mixed/prepaid/excluded products, separate prepaid groups, native
quantity totals, multiple allocations, 250 cart lines and disabled/HELD cases.

To reproduce: generate an isolated `delivery_customization` TypeScript extension
with Shopify CLI, outside the real app. Replace its source/query/tests with these
files, set API version 2026-10, install its dependencies, fetch schema, build and run
Vitest with Shopify CLI in PATH. Never use deploy or app dev on the lab. Generated
types, dependencies and compiled artifacts are intentionally not versioned.

Remaining gates: real captured Function inputs after order-level discounts,
nonzero inclusive GST and shipping-tax semantics, native checkout including resumed
and draft/subscription cases, plan/distribution eligibility, multiple ordinary-food
groups, actual published-product profile/rate compatibility. Delivery customization
only hides existing rate options; it creates no rates. HELD means no operations,
NOT enforced correct shipping. Existing QA rules remain inactive.

Approved native development evidence now exists for the active QA copy under
apps/performance-meals-core/extensions/core-delivery-qa. See the18October QA report.
The lab remains isolated. Native rule is disabled after11unpaid comparisons.
