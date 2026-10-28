# Ready Series renewal calendar continuity — 29 October 2026

## Implemented

Renewed delivery calendars reuse the original immutable monthly anchor. A change to one delivery does not move the anchor for subsequent deliveries or renewals. Short-month and closure adjustments remain occurrence-specific. Three- and six-month lines in a mixed order bind independently to their own purchased term and native billing cycle.

Core reads Shopify's original contract, successful billing attempt and complete billing-cycle attempt coverage. It requires the correct app, customer, original order, renewal order, price-evidence checksum, unedited/unskipped cycle and one uniquely associated successful attempt. It never creates a billing attempt, changes a contract or infers cycle number from webhook arrival time. Missing or ambiguous proof, overdue dates, missing merchant capacity and conflicting grouped calendars hold for reconciliation without replacing paid deliveries.

The original contract and cycle can start several seconds after checkout's order timestamp. Shopify's first-cycle selector is used for the original term; the original order timestamp is not incorrectly treated as a billing-cycle selector. The actual renewed cycle must be later than the original one. Planning offsets retain the original day through February and later cycles instead of accumulating short-month drift.

## Actual Shopify finding

A read-only check of the existing latest six-delivery QA renewal found that its early simulated billing attempt still belongs to the first native billing period. Core correctly returned `Renewal has no later verified delivery cycle`. That order remains evidence of the earlier exact-price payment test; it is not relabelled as proof of a later calendar cycle. No order, financial record, contract or native fulfilment was changed.

Later-cycle planning and original-anchor retention passed controlled database fixtures, including a prior rescheduled visit and mixed three-/six-month terms. Actual later-cycle calendar acceptance remains pending a supported, explicitly approved native cycle test. No extra simulated or real charge was initiated in this run.

## Evidence and remaining acceptance

The focused PostgreSQL booking suite passed 19/19, covering the new renewal calendar cases and delivery-message receipt handling. Focused negative receipt regression passed 49/49 on a disposable database. Final regression totals and source checkpoint are recorded in the acceptance matrix.

Shopify read queries validate against Admin API 2026-10. Official references:

- [Subscription billing cycle](https://shopify.dev/docs/api/admin-graphql/2026-10/queries/subscriptionBillingCycle)
- [Billing cycle fields and associated attempts](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/SubscriptionBillingCycle)
- [Billing attempt origin time and successful order](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/SubscriptionBillingAttempt)

Requirement 2/13 remain PARTIAL. A full later-cycle native demonstration, operational fulfilment/reconciliation and general merchant activation remain incomplete. Existing automatic card billing is preserved; Wallet renewals remain separately blocked.
