# Confirmed merchant rules — 17 October 2026

Authority: Jerome's email replies pasted by the user, followed by the user's approval to resume and reminder-channel confirmation. This supersedes earlier conflicting calendar/Gift Card interpretations.

- Latest consolidated email review and user confirmation supersede the earlier28-day choice: Ready Series first delivery uses the next earliest available merchant slot. Later deliveries use the same calendar day monthly. If absent in a short month, clamp to that month's last date, then apply the next-available merchant-day rule. Subsequent occurrences retain the original day. Three/six terms mean three/six deliveries. Billing remains separate. Historical stored drafts are not rewritten automatically.
- Ready Series upfront renewal remains every3/6calendar months from first payment. Delivery adjustments, pause or skip do not move billing dates. No invented custom billing-date rollover: native billing lifecycle remains a separate verification gate.
- Meal Plans first delivery starts Monday; Ready Series does not inherit that requirement.
- If a delivery is unavailable, move that occurrence to the next available merchant delivery day. Subsequent occurrences retain the original anchor. Availability/holidays must come from merchant-managed slots; do not hardcode a holiday list or derive availability from the prototype's sample dates.
- Pause/skip preserves the entire undelivered meal entitlement. It is a fulfilment change; renewal payments remain on their original timeline.
- Self-service delivery change needs at least72hours before both the current and replacement delivery. Exactly72hours qualifies. Notice must be configurable by the merchant. Other permission, dispatch, capacity and programme checks remain mandatory; notice alone is not authorization. Later changes go through WhatsApp Support.
- Every delivery requires email and WhatsApp reminders at72hours and24hours beforehand: four planned messages per occurrence. Actual sending requires durable scheduling, receipt/retry protection and an approved WhatsApp provider. No messaging service is activated by this policy update.
- Gift Card conversion retains the card's original expiry date. No fresh year starts at claim. This replaces the earlier user-approved fresh-year rule. Historical settled balances are not automatically changed.
- One-month expiry reminders cover all credit sources.
- Bundle savings should be computed from the corresponding individual products; omit price-per-meal display. Do not invent individual prices or savings where component pricing is incomplete.

## Implementation progress / limits

Core monthly-calendar, next-future-slot, notice-window and four-message reminder
planning are tested. Availability and capacity must come from verified merchant
records; choosing a slot does not reserve it. Durable reminder drafts have revision
protection but no public booking route, active scheduler or sender. Native prepaid
checkout/contract/fulfilment and general activation remain acceptance gates.

Gift Card expiry snapshots and guarded settlement/reminder/expiry reconciliation
retain the original card expiry. Historical missing snapshots require review; no
automatic redating of settled balances. Dynamic bundle savings use native component
prices and hide when evidence is incomplete. Per-meal prices are omitted.

No theme publication, deployment, balance transfer, payment setting or production
change. Wallet top-ups remain disabled pending the documented architecture safeguards.
