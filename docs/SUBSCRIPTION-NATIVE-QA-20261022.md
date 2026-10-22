# Subscription payment QA — 22 October 2026

Scope: the user approved isolated 3-/6-delivery development purchases, one test renewal each, pause/resume, future-renewal cancellation and duplicate-request checks. Shopify Payments was enabled in TEST MODE only after the user personally submitted its development onboarding. No real card, bank account, identity document, production store or general subscription activation is involved.

## Verified evidence

- One isolated QA product, with separate variant-specific 3-/6-month plans. Full-term billing every three/six calendar months; monthly delivery. General catalogue verification flags stay false.
- The three-delivery initial purchase created test Order #1015: successful Shopify Payments test SALE, SGD 255.18, free delivery, Core-owned active contract, quantity one subscription line. The original order contains quantity three and three separate fulfillment records: one open and two scheduled monthly. These records do not prove merchant availability/holiday or selected-slot reconciliation.
- First three-month renewal cycle was read before billing: Shopify's cycle index **1**, not an assumed index 2. A stable, journalled idempotency key created test Order #1016 for SGD 255.18. Repeating the identical key returned exactly the same attempt and order.
- That isolated contract then passed native PAUSED → ACTIVE → CANCELLED readbacks. This cancels future renewals; it does not refund or cancel already-paid delivery entitlements. No Wallet adjustment occurred. A future date remaining on a cancelled contract is not permission to bill it.
- Six-delivery Liquid allocation and unpaid checkout show SGD 493.56, free first and recurring delivery, billing every six months. Its completed initial test payment is Order #1017. First renewal created test Order #1018 for the same SGD 493.56; repeating its identical key returned that same attempt/order. Six separate monthly fulfillment records were read. Native pause, resume and future-renewal cancellation also passed. Both isolated contracts now have CANCELLED status.

## Release blockers

The merchant-approved amounts remain SGD 255.20 and SGD 493.60. Native checkout instead charges SGD 255.18 and SGD 493.56. The explicit full-term PRICE policy did not preserve the final cents. Do not change catalogue prices, hide this difference, mark the terms verified or activate general sales. The candidate helper flags fractional delivery cents and its exact allocation assertion rejects both captured discrepancies.

The manually isolated QA shipping profile is not production shipping acceptance. Native recurring fulfillment dates still require comparison with the final merchant calendar, exclusions, time slots and preserved entitlements. Core operational ingestion, complete six-delivery lifecycle, post-cancellation billing refusal and scheduling automation remain separate verification gates.

## Safety and cleanup

Private receipts and mutation journals are in Core's ignored `.shopify` folder. They include exact native references and are excluded from public GitHub. No credentials or personal data belong in this report.

Cleanup: the QA product is restored to DRAFT, and the two QA variants were removed from the isolated shipping profile, restoring its original three entries and unchanged rates. Resumed cleanup verified the saved publication was still present, removed it and saved the unpublished product. The two temporary QA-only theme files were then removed through the CLI with exact filename filters; an independent pull of those names returned no files. No other files or rates were selected. The draft product and cancelled contracts prevent new normal purchases/renewals. Keep existing rates/products/theme files unchanged. Test payment mode remains enabled. Total successful simulated charges: SGD 1,497.48, below the approved SGD 1,497.60 cap. No further charge is authorized by this QA scope.

Shopify advisor confirmed Wallet specialist escalation and promised ticket details/written email follow-up. The Help Center subsequently failed to load before the ticket number/reply route was supplied; do not claim receipt of the technical answer.

Validation: 399 Core tests, TypeScript and lint passed this run. Regression tests use a disposable migrated SQLite database and its separate fixture client; preserve the running development preview's PostgreSQL client. API operations were validated against the configured 2026-10 schema.


## Resumed verification

- The user explicitly requires the exact merchant prices; lower totals are not approved.
- Core now has a read-only renewal verifier using the current typed billing-attempt state. It binds the saved idempotency key, attempt, contract owner/customer, distinct renewal order/line and full captured payment. Historical verification after cancellation cannot authorize a future charge. Native readback of both existing QA renewals correctly holds the missing cents against the approved totals.
- 406 Core tests, TypeScript and lint pass, including seven renewal evidence tests.
- Read-only PostgreSQL verification found all four QA order lines quarantined. The temporary QA form omitted the required stream/schema properties; production purchase forms already render those properties. Do not silently edit historical orders, unquarantine records or claim Core routing acceptance. The private QA form is corrected for the next approved comparison; no upload or new order has occurred.
- Native contract pause/resume tests verify API behaviour only. Merchant-approved delivery pausing preserves the billing timeline; do not implement a delivery pause by blindly pausing the billing contract.
- Shopify's written follow-up confirms Backend Developer Support escalation under ticket 71332405. The technical Wallet architecture decision is still pending; the acknowledgement is not approval of a payment implementation.
- Another unpaid comparison of native pricing-policy settings has been requested and remains pending approval. No additional charge is authorized.
