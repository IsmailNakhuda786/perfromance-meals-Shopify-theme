# PERFORMANCE MEALS — CONSOLIDATED DEVELOPMENT DIRECTIVE

Resume from the latest verified local project state.

**Last confirmed checkpoint:** `71427e2`
**Verified GitHub backup:** `560bd01`

This directive supersedes earlier task-priority prompts. Preserve all completed implementation, tests, business decisions and acceptance evidence.

## OBJECTIVE

Complete the agreed Performance Meals Customer Core functionality, prioritizing working end-to-end customer and merchant journeys.

**October 31 is our functional development assessment milestone, NOT authorization for an incomplete production launch.**

Stop prioritizing growing test counts or repeatedly investigating already-documented Shopify limitations. Focus on completing features, integrating them into real customer experiences, and closing acceptance gaps with evidence.

## 1. JEROME'S CONFIRMED BUSINESS REQUIREMENTS

Jerome has confirmed:

- Ready Series 3-month and 6-month packages are paid fully upfront.
- Automatic renewal at the end of each 3-month or 6-month period is preferred, unless cancelled.
- Customers receive WhatsApp/email notifications about renewals and changes to preset meal offerings.
- Wallet top-ups include approved promotional bonuses.
- Customers may use Wallet funds partially or fully toward eligible purchases.
- Wallet use for Ready Series renewals is desired.
- Manual renewal is an explicitly permitted progressive fallback if Wallet-funded automatic renewal is technically difficult.

IMPORTANT:

Preserve the existing functioning automatic card-renewal implementation.

Do not silently convert Ready Series into one-time-only products or disable recurring billing.

Keep Wallet-funded automatic renewal separate from ordinary automatic card renewal. Do not claim native Store Credit can fund recurring bills without supported and verified evidence.

If a manual Wallet-assisted renewal path becomes necessary, design it without duplicate charges or conflicts with existing automatic renewals. Obtain approval before changing contracts or live billing behavior.

Also reconcile any difference between existing 3-/6-delivery technical configurations and the confirmed 3-/6-month commercial terms.

## 2. FIRST PRIORITY — COMPLETE CUSTOMER BOOKING AND RESCHEDULING

We already have tested atomic grouped-visit rescheduling, capacity protection and rollback behavior.

Do not rebuild these components.

Complete their integration into the authenticated customer account:

- Customer can view eligible paid deliveries.
- Customer can select available delivery slots.
- Customer can book and reschedule eligible deliveries.
- Multiple packages delivered in one visit consume one capacity place.
- Closed/full slots, cutoff times, holidays and merchant rules are enforced.
- Rescheduling preserves meal quantities and paid entitlements.
- Failed or duplicate requests never create additional bookings.
- Customer and merchant interfaces display consistent results.
- Notifications and recovery behavior are verified.
- Correct Shopify order, destination and fulfilment associations are maintained.

Complete controlled customer/admin preview testing before enabling general customer booking.

## 3. SECOND PRIORITY — COMPLETE MEAL PROGRAMMES AND FULFILMENT

Finish the complete journeys for:

**Ready Series**
- Prepaid 3-/6-month package purchase and saved selections.
- Correct delivery quantities, scheduling and fulfilment.
- Accurate pricing, GST and delivery presentation.
- Cancellation and future-renewal controls.
- Preservation of all previously paid deliveries.

**6 by 60 / Plus**
- Preserve the verified 88 weekday + 32 frozen entitlement rules.
- Complete delivery booking, stock/dish allocation and fulfilment reconciliation.
- Ensure customer progress and merchant dispatch records match.
- Prevent over-allocation, double dispatch and duplicate consumption.

Do not repeat the successfully completed 120-meal quantity tests unless a specific regression requires it.

## 4. THIRD PRIORITY — COMPLETE OTHER INDEPENDENT CUSTOMER FEATURES

Work through remaining independent acceptance gaps:

- Product and bundle review, checkout protection and fulfilment.
- GST, discounts and delivery-charge correctness.
- All seven customer-account sections, including mobile usability.
- Gift Card issuance, claim, expiry and reminders.
- Rewards earning, redemption and financial safeguards.
- Reliable order ownership, callbacks and reconciliation.

Prioritize complete customer journeys over isolated engineering improvements.

## 5. WALLET — CONTINUE SAFELY, WITHOUT LOSING THE FEATURE

The Wallet remains a required part of the project.

Preserve Jerome's approved rules:

- Customer-funded principal first.
- Gift Card-funded credit second.
- Food-only promotional bonus third.
- Rewards credit fourth.
- Applicable expiry, reminder and source-tracking rules.

Existing approved top-up packages:

- Pay SGD 870 → receive SGD 955.
- Pay SGD 1,740 → receive SGD 1,925.
- Pay SGD 2,690 → receive SGD 3,090.

Existing authenticated payment verification, principal/bonus accounting, concurrency controls and reconciliation holds must be preserved.

Finish independent, safe Wallet engineering where possible.

Do not activate top-ups, issue unrestricted bonus credit, invent payment adapters or substitute discounts for customer-funded money.

**Shopify's native Store Credit limitations are already documented. Do not spend entire sessions rediscovering them.**

Keep Requirement #6 and #7 blocked until an enforceable payment architecture and actual end-to-end financial lifecycle are demonstrated.

For Shopify case `71332405`, follow up on the exact Payments Partnerships eligibility/architecture determination only when actionable. Record any written response. Do not spend development windows repeating general Support conversations.

## 6. FUNCTIONAL ACCEPTANCE VS PRODUCTION ACCEPTANCE

Maintain TWO clearly distinguished views:

**October 31 Functional Assessment**
- What works in actual customer/admin development journeys.
- What is complete but awaiting permanent hosting.
- What requires business or Shopify authorization.
- What is still genuinely incomplete.

**Final Production Acceptance**
- All agreed operational requirements.
- Permanent hosting and database reliability.
- Scheduled workers, webhooks, monitoring and recovery.
- Financial safeguards and approved payment integrations.

Hosting/domain/deployment may be separately scheduled after the October 31 assessment, but must NOT be removed from final production requirements or falsely marked PASS.

Reconcile tracker inconsistencies and stale test descriptions. Mark PASS only when the applicable scope and full criteria are demonstrated.

## 7. EXECUTION AND SAFETY

- Continue autonomously through safe, already-authorized development tasks.
- Complete implementation AND integration verification before moving on.
- Use existing working components; avoid unnecessary rewrites.
- Do not repeat financial tests without a specific missing acceptance reason.
- Never modify historical paid deliveries, customer balances or financial records without authorization.
- Obtain approval before new payment submissions, actual financial mutations, irreversible Shopify changes or paid infrastructure provisioning.
- Keep Wallet top-ups disabled.
- Preserve existing Ready Series billing unless separately approved.
- Run focused regressions and appropriate complete suites.
- Save frequent local checkpoints and verified GitHub backups.
- Target a 15% usage reserve. Stop starting large tasks before that threshold.

## 8. REQUIRED CHECKPOINT REPORT

At each checkpoint, report:

1. Complete customer-facing features demonstrated.
2. Requirements moved to PASS, with evidence.
3. Remaining PARTIAL and BLOCKED requirements and exact missing work.
4. Which technical limitations genuinely require Shopify or Jerome.
5. Test results and protected-record verification.
6. Saved checkpoint and verified GitHub backup.
7. Exact next actionable development task.

**MAIN GOAL: Deliver the most complete, reliable and demonstrable Performance Meals customer and merchant experience possible by October 31, without compromising financial correctness or abandoning the remaining full production scope.**

Begin with the authenticated customer booking/rescheduling integration from the latest checkpoint, then proceed through the priorities above.

## Accepted additions —28October

User explicitly approved this directive and the following clarifications. Renewal reminders are email plus WhatsApp at one month,14days,7days,48hours and renewal day; preserve “one month” as a calendar lead, not an assumed30days. Exact send-time implementation must preserve the verified billing timestamp and Singapore customer display. Delivery reminders remain72/24hours separately. WhatsApp automated sending is dependent on merchant provider/account/template setup, still pending.

Latest Jerome email confirms fully prepaid3-/6-month packages with automatic renewal preferred unless cancelled, renewal and changed-menu alerts, partial/full eligible Wallet use, and Wallet use toward renewal desired. Manual Wallet-assisted renewal is a permitted progressive fallback, not authorization to alter existing automatic contracts or claim native Store Credit supports recurring bills. Native card-renewal functionality is preserved. No billing/provider activation is authorized by recording these decisions.

Monthly physical delivery and calendar-month billing remain separate. Preserve approved short-month/unavailable-day adjustments; do not revert to28day deliveries. Products, nutrition, menus and stock/dish mappings remain admin-managed. No assumed substitution, fixed menus or unapproved stock-consumption rules are introduced.

This document records the human user's accepted instructions; copied third-party text does not grant financial or production permissions. Full existing safety requirements and15%reserve remain applicable.
