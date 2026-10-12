# Customer and Core completion tracker

Authority: user's confirmed A–O functional requirements, with Jerome's subsequent 60-day programme clarification. These are 15 requirements, not the unrecovered 14-point acceptance checklist. Passing static checks does not complete a customer flow.

Sequence: customer design synchronization → functional completion → Admin prototype/Core architecture audit → written acceptance report → Admin UI development. No Admin UI work before the gate.

| # | Requirement | Current evidence and remaining completion gate |
| --- | --- | --- |
| 1 | Authenticated Meal Plan persistence | Authenticated create, retrieve, edit and save verified for paid 60-day menus in the dev store; revisions preserve original orders. Preceding-Thursday Singapore cutoff and immutable closed-week edits verified. All 72 operational records imported and field-matched in PostgreSQL; Running development Core now uses PostgreSQL. Authenticated paid-menu edit/save/full-reload and independent database readback verified on 12 October; native account readback verified. #1 passes the development-store scope; permanent-host acceptance is explicitly deferred. |
| 2 | Ready Series prepaid subscriptions | Latest 12 October decision supersedes term-boundary renewal: full 3/6-month upfront payment, 3/6 monthly deliveries, no automatic renewal or recharge. Existing Just Protein plans bill monthly and are invalid; four other products lack plans. Read-only Core contract verification code and three mocked-response checks added; not native acceptance. Payment QA remains blocked: Test Payment Gateway does not support subscriptions. User changed address/entity to Singapore; native SG/SGD readback verified and Shopify Payments now shows Complete setup. Shopify support documents initial onboarding with development-only placeholder data for never-live stores, but Singapore-specific test fields/activation still need confirmation and approval. Verify native finite prepaid pricing, billing/fulfillment contracts and account management before enabling purchase. |
| 3 | 6 by 60 / Plus period-based programmes | Earlier recurrence instruction superseded. Full payment upfront, customer-selected stipulated Monday start, 60-day duration, no automatic renewal. Native test orders #1008/#1009 verified. Later 40 and final 8 weekday meals saved and restored; native account displays dates and actual dish names. Both programmes include 88 weekday meals plus 32 frozen meals, confirmed 12 October. Frozen allocation/delivery follows selected menus or merchant arrangement; no fixed delivery weekday. Implementation and verification of this clarified entitlement remain pending. |
| 4 | Quantities and contents | Source extraction validates subscription meal totals. Finish exact native catalogue/variant/contents equivalence and entitlement QA. |
| 5 | Pricing and shipping | Approved food subtotal excludes Gift Cards; combined Ready Series/Meal Plan >= SGD 120 free, otherwise one SGD 10 charge. Preserve verified staging rates; complete programme pricing and mixed-flow verification. |
| 6 | Wallet ledger | Durable PostgreSQL source-separated history and audit checks pass. #1010 Gift Card conversion has one completed claim and matching Gift Card-funded ledger credit, SGD 25. Native account Wallet balance/history implementation now reads Shopify directly; rendered balance/history verified by recipient screenshot on 12 October. One native checkout deduction (#1011) and matching Core record verified; oldest-funded-credit-first mixed-source allocation is implemented/tested; native mixed funding, refunds and full cash/bonus lifecycle acceptance remain incomplete. |
| 7 | Native wallet settlement | Real native Store Credit credit of SGD 25 to the correct recipient verified. One native checkout spending/deduction verified (#1011), leaving SGD 2.10 in Shopify and Core. Customer-funded top-ups, native mixed-source FIFO QA, refunds and recovery remain incomplete. |
| 8 | Gift Card to Wallet | #1010 fulfilled; recipient email received; native SGD 25 Gift Card debited to SGD 0, matching recipient Store Credit credited to SGD 25, durable claim COMPLETED and one ledger credit verified. Default-off feature, recipient checks and no-blind-retry guards implemented. Native duplicate/partial-balance/recovery QA and full production acceptance remain pending. |
| 9 | Wallet renewal-payment feasibility | Verified platform limitation: native Shopify Store Credit can fund initial subscription purchases, but cannot fund recurring subscription bills. Source: https://help.shopify.com/en/manual/customers/store-credit. No unsupported renewal-payment path is implemented. |
| 10 | Rewards | Persistent earning, balances, redemption and history require implementation and verified approved rules. |
| 11 | Referral | Jerome's final economics and eligibility confirmation required before implementation. |
| 12 | Customer accounts | Seven native sections and saved programme/menu reads verified. Authenticated Gift Card claim verified; native Wallet balance/history code added and validated, rendered balance/history verified by recipient screenshot on 12 October. Final branding, Rewards and contract management remain incomplete. |
| 13 | Subscription management | Actual supported pause, skip, change and cancellation actions require contract-backed end-to-end verification. |
| 14 | Permanent infrastructure | Neon Free PostgreSQL provisioned in Singapore; eight migrations applied and 72 operational records field-matched. Running development Core now uses PostgreSQL through the development tunnel. PostgreSQL-backed development browser/account QA passed. User chose development-only hosting on 12 October; permanent commercial hosting remains deferred, not complete. No paid plan selected. |
| 15 | Ownership and routing | Preserve native Shopify commerce, shared customer/cart/checkout/original order/history. Streams ready_series, meal_plan, shared; Gift Card Sales separate operational classification. Native #1011 Ready Series routing and reconciled #1010 shared/Gift Card Sales routing are VALIDATED. Finish lifecycle and renewal routing verification. |

## Immediate work — 12 October 2026

Current focus: finish #6/#8 customer-visible Wallet balance/history using the real
native SGD 25 credit. One approved #7 spending test (#1011) now verifies native order payment,
reduced balance SGD 2.10 and one matching Core debit with retry protection.
Served Purchase label verified by recipient screenshot. Confirmed oldest-funded-credit-first
allocation is implemented with persistent credit-level attribution and PostgreSQL
fixture coverage; native mixed-funding QA remains pending. Do not credit the Gift Card again.

Next: finish #3 frozen-meal entitlement, #4 exact quantities/catalogue and #5 pricing
and delivery QA. Subscription items #2/#13 retain their payment/contract blocker;
continue independent work without claiming subscription acceptance. Then complete
Rewards, referral decisions and remaining account functionality in sequence.

#14 permanent commercial hosting remains deferred by the user. Do not buy a plan,
publish the theme, switch stores or begin Admin UI.

## Evidence limits

40 PostgreSQL-backed Core tests passed after the Wallet display change. Native
responses in service tests are mocked; actual #1010 debit/credit verification is
separate evidence from Shopify Core CLI readback and the durable claim record.
Source/contents and remaining lifecycle checks must not be marked complete from
passing code checks alone. #1 passes development-store persistence only; no item
has blanket production acceptance.

## Customer-funded top-up implementation — 12 October 2026

The approved customer commit 58272e4 defines Top Up Wallet, SGD 20/50/100/200
presets and custom amounts between SGD 5 and SGD 500. Its demo card inputs and
instant success are not evidence of a real payment.

Core now includes read-only native paid-order proof and durable, default-off
settlement orchestration. An additive PostgreSQL migration preserves existing
records. Duplicate/concurrent delivery, wrong ownership/payment/amount, lost
native responses and bookkeeping recovery are checked with isolated fixtures.
No actual top-up order, customer-funded credit, public route or checkout item has
been created or enabled. Merchant agrees in principle; native checkout restrictions and post-credit refund/chargeback handling must be proven before activation. This work
advances #6/#7 but does not pass native top-up end-to-end acceptance.
