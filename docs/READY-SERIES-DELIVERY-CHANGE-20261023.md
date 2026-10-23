# Ready Series delivery-change preparation — 23 October 2026

Core now prepares one delivery change against a complete server-supplied three-/six-delivery term and explicit current merchant slot availability. This is pure planning; there is no public route, database migration, capacity reservation, native reschedule, billing action or message send.

The planner checks occurrence identity/revision, a valid Singapore same-day delivery window, unique complete term coverage, explicit configured notice hours and an available replacement slot. Both the original delivery and replacement must meet the configured notice boundary. Dispatched, uncertain and late requests require Support. Invalid or overlapping evidence is held rather than guessing a replacement or merging paid deliveries. A no-op prepares no new revision or reminders.

A valid plan changes only the selected occurrence, preserves the other paid occurrences, increments its revision and prepares the four replacement 72-/24-hour email/WhatsApp reminders. The previous revision reminder identities are supplied for an eventual transactional executor to supersede only unsent drafts; sent messages must remain auditable. This does not stop or shift subscription billing, remove an entitlement or refund money.

Ten focused tests cover three/six terms, exact notice boundaries, configurable notice, dispatch uncertainty, stale and duplicate records, unavailable slots, overlap, no-op, unchanged input/other occurrences, reminder revisions and Singapore timezone validation. A further database integration test composes the plan with the existing inactive draft workflow: it verifies exact reminder identities, unchanged other occurrences, one revision increment and stale-repeat rejection. The full 448-test Core suite, TypeScript and lint pass.

## Remaining execution gate

An authenticated executor must freshly verify customer ownership, paid entitlement, native dispatch, merchant slot capacity and persisted revision immediately before committing. A planner result is not permission or proof of a booking. Native fulfillment `fulfillAt` is the time work becomes ready, not the customer's delivery-slot timestamp. Shopify's reschedule mutation can merge fulfillment orders at matching work-start times; native date changes therefore require explicit mapping and preservation checks, not blindly copying the delivery time.

Source: https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/fulfillmentOrderReschedule
