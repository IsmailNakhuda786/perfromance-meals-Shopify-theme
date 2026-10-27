# Native delivery destination proof — 27 October 2026

Core now has an internal read-only destination verifier for a server-selected set of native fulfilment orders. It checks the shop, app, test-order ownership, cancellation, both fulfilment-visibility scopes, complete bounded pagination and exact shipping address fields. Shipping and local-delivery methods are supported; pickup, missing destinations, ambiguous/truncated coverage and any visible dispatch are held for review. Different unit, postcode or company fields are not guessed to be equivalent.

Only an opaque shop/customer/order-scoped fingerprint and native fulfilment references leave the reader. No address or contact data is written to visit storage. This proof alone does not establish paid-line quantities, merchant time slots, capacity, notice-window eligibility or permission to reschedule. It is deliberately not connected to a public booking endpoint.

## Evidence

- Eight focused automated tests pass; full disposable Core regression582/582; TypeScript and lint pass.
- Query validated against Shopify Admin GraphQL2026-10.
- Read-only native checks: order#1029 with three fulfilment orders and order#1031 with six. All requested destinations matched and complete undispatched ownership checks passed. Five native reads, zero native mutations. All11 protected business-model snapshots stayed unchanged.
- The first query used a location field which Shopify rejected for missing access. It was replaced with the documented delivery-method field; the passing version needs no new scope. No permission was granted or store configuration changed.

[Destination reference](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/FulfillmentOrderDestination) and [delivery-method types](https://shopify.dev/docs/api/admin-graphql/2026-10/enums/DeliveryMethodType).

Native booking, fresh per-line quantity/fulfilment binding, dispatch races, capacity/reschedule execution and customer journey acceptance remain open. Existing paid deliveries were not changed; Wallet top-ups remain disabled. Private order/address receipts are ignored outside the public backup.

## Existing paid-quantity preservation check

A further read-only run compared fresh Shopify fulfilment schedules to the saved accepted QA allocations. Order#1029 retains three deliveries of two packages. Order#1031 retains its six-delivery and three-delivery entitlements, one package per occurrence. Twelve line-level delivery allocations remain intact across the two orders; five native reads, zero mutations and all eight protected Core data groups unchanged. This verifies preservation, not permission to move or dispatch those deliveries.
