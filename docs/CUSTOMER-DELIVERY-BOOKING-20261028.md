# Authenticated customer delivery integration —28October2026

## Local implementation and native read preflight

Customer account booking/rescheduling and merchant policy/calendar/bookings screens are implemented behind development-only, exact QA-customer/order flags. Neither controls nor migrations are enabled merely by compiling the source. Wallet, payment providers, contracts and native fulfilment dates are not mutated by this implementation.

Fresh owned Shopify proof validates paid status, original product/variant/quantities, complete scheduled-work coverage, each delivery occurrence and exact Singapore destination. Completed earlier instalments do not block an independently unsent later occurrence. Native work-start dates remain separate from physical delivery dates. Read-only Order#1031 preflight found6eligible groups,3with both packages, with all37existing Core model fingerprints unchanged.

Merchant calendar preparation uses the next available merchant slot and approved monthly/short-month adjustment, persists its original anchor and refuses to overwrite earlier delivery data. Original calendar replay does not reset later customer changes. A new renewal calendar cannot silently acquire a fresh anchor; original-anchor/cycle binding remains required before enabling that preparation path.

A customer command obtains owner from Shopify's verified session token, notice/holiday policy from the merchant record, and native evidence from server queries. It accepts no owner, financial amount, notice override or native proof. Capacity, all package members, reminder revisions, booking and request receipt commit atomically. Closed/full/stale slots, wrong ownership, changed native facts and incomplete calendars reject without losing the original booking. A recorded request restores an interrupted response without charging another capacity place. Booking a slot already used by another same-address occurrence is held for consolidation review rather than double-counting a physical visit; automatic cross-occurrence consolidation remains incomplete.

The authenticated customer UI includes bounded loading, explicit slot confirmation, receipt lookup and same-key retry. Merchant UI shows the same Core bookings and supports editable notice/closures and original calendar preparation. A temporary slot-key namespace can isolate QA from pre-existing merchant capacity. Customer activation remains off until the approved controlled preview is verified.

## Safeguards and recovery

Added3additive models: ReadyDeliveryPolicy, ReadyDeliveryBooking, ReadyDeliveryBookingRequest. Source SQLite and production PostgreSQL migration definitions match. Privacy classification covers all3, and customer calendar audit uses the existing customer-scoped operation identity. Operational snapshot version5includes the new data, preserves compatibility with versions1–4and excludes OAuth sessions. Recovery tests restore a real fixture booking and its receipt, then prove retry creates no extra reservation.

Full disposable regression:638passed,1PostgreSQL-only skip,0failed. Focused checks after the optional QA namespace:17passed. TypeScript/lint and source/production schema consistency passed. Official Admin2026-10query validation passed; customer-account2026-07component validation passed; App Home v1.1Polaris components validated, while ordinary HTML forms are verified separately by application typecheck and the upcoming browser journey.

Official holiday data sources (verified28October):
- https://www.mom.gov.sg/newsroom/press-releases/2025/0616-public-holidays-for-2026
- https://www.mom.gov.sg/newsroom/press-releases/2026/0618-public-holidays-for-2027

Published holidays and observed Mondays are always retained; Saturdays are closed. Calendar years without verified coverage are rejected. Products/menus remain merchant-managed and are not encoded into this calendar data.

## Controlled preview approval

User approved adding the3empty development tables and testing only paid Order#1031/its existing QA customer, with7temporary November–April slots,72hour notice, published holidays, a first combined booking/reschedule, capacity/retries and customer/admin readback. Temporary records and flags must be removed afterward. Existing native orders, paid deliveries, renewals, payments, Wallet and Rewards must be preserved. Actual preview evidence and cleanup will be appended after verification; this document does not yet claim the preview passed.

Requirement13 remains PARTIAL pending actual customer preview, authoritative operational follow-through, renewal-cycle calendar binding, dispatch/reconciliation and notification delivery (WhatsApp setup remains external). Permanent hosting remains deferred for the functional assessment, not accepted for production.
