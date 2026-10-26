# Merchant delivery-slot limits and Core admin verification

26 October 2026. Customer approved an administrator-set maximum number of deliveries per date/time slot. No fixed business limit, time window or holiday date was invented. Customer booking remains disabled.

## Implemented

- Internal, store-scoped slot configuration with explicit Singapore delivery window, capacity, availability and revision.
- Atomic slot row locking and reservation/counter reconciliation. One internal delivery reservation consumes one place; concurrent requests cannot claim the final place twice. Mapping an internal draft to a physical delivery still needs native integration acceptance.
- Replay-safe reservations and exactly-once release. A released revision cannot silently reacquire a place. Closed slots preserve existing reservations and refuse new ones.
- Limits cannot fall below existing reservations, and reserved windows cannot move. Draft rescheduling refuses to leave an active capacity reservation behind.
- Authenticated Core admin page for creating, editing and closing slots, with UTC conversion independent of the administrator’s browser timezone. Bounded store-scoped pagination preserves embedded-app parameters.
- Privacy inventory classifies slot configuration as shop-only and reservations as customer-linked. No customer records are exposed in the slot list.

## Database change

The user specifically approved the additive development migration. Migration 20261026120000_ready_delivery_capacity added ReadyDeliverySlot and ReadyDeliverySlotReservation. Before/after checks found all fifteen protected existing business-model snapshots unchanged and both new tables empty. Matching SQLite and PostgreSQL migrations and schemas are retained in source. No production migration was run.

## Acceptance evidence

- Full disposable Core regression: 542/542 pass.
- PostgreSQL group: 32/32 capacity, paid-draft and privacy tests pass, including two simultaneous requests for one remaining place.
- PostgreSQL admin-route group: 6/6 pass, covering authentication, store ownership, exact Singapore-time conversion, stale edits, invalid forms and complete pagination.
- TypeScript, ESLint and production-schema mirror consistency pass.
- Actual Shopify development admin: authenticated page rendered; a disposable 7 January 2030 9am–12pm Singapore QA slot was created at capacity 2, edited to capacity 3, and closed. Independent database readback confirmed UTC01:00–04:00, revision2, zero reservations and unavailable state.
- The disposable slot was removed; new development tables are empty. Fifteen protected business-model snapshots still match. Normal preview restored with slot/purchase/renewal flags disabled and standard callbacks restored.

The official Polaris component validator could not run: its installed bundle lacks TypeScript and the required data/types/index.json. An unchanged temporary validator copy resolved the TypeScript dependency, but the bundled type index is absent. This is not recorded as a passed toolkit check. Installed Shopify Polaris TypeScript declarations, lint, route tests and actual embedded rendering passed.

## Remaining work

This does not confirm a Shopify delivery booking, change paid meals or billing, dispatch fulfilments, send messages or activate customer slot selection. Bind authoritative native fulfilment/physical-delivery grouping to these internal reservations and implement the authenticated customer change executor with the approved notice window. Verify reschedule/recovery and holiday availability end to end before activation. Requirement13 remains PARTIAL.

## Reservation protection after disabling the feature

A regression test demonstrated that turning the capacity flag off previously allowed an internally reserved draft to move while its original slot remained occupied. The draft now checks existing reservations regardless of the activation flag and locks its revision before checking reminders and reservations. A competing move/reserve test verifies that only one operation can commit. These checks do not activate customer booking or modify Shopify deliveries.

The complete disposable regression suite passes 544/544. TypeScript and lint pass. All 24 focused PostgreSQL capacity/draft checks pass, including the disabled-feature regression and competing move/reserve test.
