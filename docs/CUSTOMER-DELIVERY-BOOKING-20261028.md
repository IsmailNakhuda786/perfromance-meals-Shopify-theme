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

## Approved customer/admin preview result

28 October: applied only the three approved additive development tables; all 37 existing shop-scoped model fingerprints stayed unchanged. Created seven disposable QA slots, saved 72-hour notice and MOM holiday coverage through the authenticated merchant screen, and prepared Order #1031's original monthly calendar.

Actual signed-in customer preview booked its first 3-/6-package occurrence on 11 November, 09:00–12:00 Singapore time. PostgreSQL confirmed two package members, one visit and one reserved capacity place. Closing the selected replacement slot before submission rejected the stale change while keeping the original booking. After reopening/reloading, customer rescheduling to 12 November succeeded: booking revision 2, original slot reserved 0, replacement reserved 1. Merchant screen showed the same date and two packages in one visit. Preparing the original calendar again reported that no delivery date was replaced.

Two successful request receipts were present. Replaying the original saved request returned its receipt and left all 40 model fingerprints unchanged. Later occurrences retained their original dates. Removed only the disposable slots, policy, calendar, reminders, bookings and receipts; all 37 protected model fingerprints match baseline and the three new tables are empty. The migration remains applied. No native fulfilment mutation, billing, payment, Wallet/Rewards mutation or notification send occurred.

Real CLI preview exposed an extension resolution failure not caught by component/unit checks. Fixed the JSX import to include its file extension; Shopify CLI then built the account extension successfully. Actual account preview loaded and completed the authenticated journey. Screenshot evidence is saved locally under /private/tmp/pm-booking-{calendar-admin,customer-confirmed,customer-rescheduled,admin-rescheduled}-20261028.png.

This accepts the isolated initial booking/reschedule subjourney, not the whole requirement: renewal calendar cycle binding, general activation, cross-occurrence consolidation, dispatch/reconciliation and notification delivery remain outstanding.
