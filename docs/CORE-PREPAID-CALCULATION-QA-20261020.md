# Native prepaid calculation QA —20October2026

Calculation-only evidence for the approved unpublished Ready Series catalogue.
All8configurations/16term combinations match the approved full-term amounts.
Two successful calculations reused;14additional calculations created. No contract
commit, billing attempt, order, payment method, product edit or publication.
Independent before/after reads preserve all8draft products and the empty app-owned
contract set. These are projections, not paid checkout or renewal acceptance.

| Configuration |3-month total SGD|6-month total SGD|
|---|---:|---:|
|Just Protein  /  Non-Beef|255.20|493.60|
|Just Protein  /  Beef|253.60|490.50|
|Low Carb  /  Non-Beef|286.65|554.40|
|Low Carb  /  Beef|286.65|554.40|
|High Carb  /  Non-Beef|286.65|554.40|
|High Carb  /  Beef|286.65|554.40|
|Low Carb + Just Protein  /  Mixed|359.00|694.30|
|High Carb + Just Protein  /  Mixed|359.00|694.30|

Each result has SGD currency, the expected customer/product/variant, quantity1,
no payment method, MONTH×3/6billing,minCycles1/no maximum, explicit MONTH×1delivery
with3/6fulfilments, no warnings, no discounts and zero delivery charge. Native tax
is0in this run; nonzero-GST calculation acceptance is not claimed.
The calculated contract unit price is the full term amount in this API response.
It must not be labelled/multiplied as a per-delivery charge. Original paid-order
proof remains independent; future actual renewal price is still unverified.

Core now has a read-only development inspector. Pending/failure results, wrong
identity, incomplete lines, nonzero fees/discounts, one-cent price mismatches,
wrong counts/policies and production use cannot yield a verified projection.
UUID SubscriptionLine GIDs observed natively are now supported alongside historical
numeric references in account/origin/purchase readers; customer/order validation
remains unchanged.353Core tests/typecheck/lint pass;6subscription-link PostgreSQL
fixtures pass with scoped cleanup. No schema/migration change.

## Validation boundary

The pinned2026-10 Toolkit schema omits the calculation types/fields, so its
calculation-operation validation fails and is not counted as a pass. The same
operations validate against a read-only full native introspection snapshot and
execute successfully through the official SDK pinned2026-10. No API version switch.
Diagnostic instrumentation was disabled following the prior approval-review block.

Official reference: https://shopify.dev/docs/apps/build/purchase-options/subscriptions/contracts/build-a-subscription-contract

Private native schema, calculation/customer IDs and raw receipts stay ignored.
