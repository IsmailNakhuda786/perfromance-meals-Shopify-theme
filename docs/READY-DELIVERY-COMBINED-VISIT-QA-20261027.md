# Combined delivery visits — 27 October 2026

Merchant rule: multiple packages arriving together for the same customer/address/time slot consume one driver visit. Each package retains its paid quantity and delivery entitlement.

## Implemented

- Durable internal combined visit plus separately owned/revisioned membership records.
- One slot reservation per visit, preserving all member package counts.
- Immutable original-purchase checksum, customer/order/contract/product/variant, paid package quantity and occurrence limit checks. Current implementation accepts original-purchase evidence only; renewal delivery visits remain a separate integration gate.
- Atomic locks and revision checks prevent standalone or combined reservations from consuming a member twice. Non-leader members are protected too.
- Individual draft movement remains blocked until the combined capacity is released, even when new capacity writes are disabled.
- Releasing a combined visit releases all members and returns one place, exactly once. Partial/corrupt membership holds for reconciliation. Released revisions cannot be reused as standalone bookings.
- Customer privacy inventory covers both new models. Complete operational snapshots advance to format v4, include all 37 operational models, and retain v1/v2/v3 import compatibility.

## Verification

567/567 disposable Core tests passed. 27/27 focused PostgreSQL tests passed: combined visits, standalone capacity/races, recovery roundtrip and private CLI export. TypeScript, lint, production schema consistency and whitespace checks passed.

The user approved adding the two tables to Development. The additive migration was applied there; no production migration occurred. Tests used random disposable shop namespaces and removed their records. Hashes for all 35 existing development business models remained identical before/after, including paid orders, financial records and saved deliveries.

## Remaining acceptance gates

These are internal reservations, not confirmed Shopify bookings. Customer endpoints are not activated. Server-verified destination identity, fresh native fulfilment/dispatch checks, renewal entitlement mapping, actual calendar/reschedule integration and customer acceptance remain required. Separate orders are not automatically consolidated. No schedule or holiday defaults were invented, no paid delivery moved, no payment/credit issued, and Wallet top-ups remain disabled.

Private regression logs and protected hashes are ignored under .shopify. No private customer data, credentials or checkout links are included here.
