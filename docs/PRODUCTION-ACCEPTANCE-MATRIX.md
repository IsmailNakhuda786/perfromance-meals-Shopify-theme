# Performance Meals — full production acceptance

Updated 2026-10-26. Latest engineering baseline: `3eea617`; fresh two-package native evidence is recorded below. Full agreed scope remains required; no production acceptance or reduced-scope release.

Current classification: **1 PASS / 10 PARTIAL / 0 FAIL / 4 BLOCKED**. The PASS is the approved absence of referral benefits, not a completed payment feature.

Regression: **570/570** disposable Core tests pass; historical **73/73** focused PostgreSQL checks and the new **11/11** corrected-draft PostgreSQL group pass; TypeScript, lint and schema consistency pass. Historical Theme baseline remains 71/71. These focused database checks do not certify the full concurrent production PostgreSQL suite.

| # | Requirement | Status |
| --- | --- | --- |
| 1 | Authenticated Meal Plan persistence | **PARTIAL** |
| 2 | Ready Series prepaid subscriptions | **PARTIAL** |
| 3 | 6 by 60 and Plus programmes | **PARTIAL** |
| 4 | Product, bundle quantities and contents | **PARTIAL** |
| 5 | GST, pricing and delivery charging | **PARTIAL** |
| 6 | Wallet source ledger, priority and expiry | **BLOCKED** |
| 7 | Wallet top-up and native settlement | **BLOCKED** |
| 8 | Gift Card claim, conversion and expiry | **PARTIAL** |
| 9 | Wallet-funded subscription renewals | **BLOCKED** |
| 10 | Rewards earning and redemption | **PARTIAL** |
| 11 | Referral and unapproved benefits remain inactive | **PASS** |
| 12 | Customer account journeys | **PARTIAL** |
| 13 | Fulfilment, pause, reschedule and future-renewal management | **PARTIAL** |
| 14 | Permanent infrastructure, recovery and operations | **BLOCKED** |
| 15 | Original ownership, webhook routing and cross-stream reconciliation | **PARTIAL** |

Machine-readable full evidence: [PRODUCTION-ACCEPTANCE-MATRIX.json](PRODUCTION-ACCEPTANCE-MATRIX.json).

## 1. Authenticated Meal Plan persistence — PARTIAL

**Implemented:** Authenticated saved menus, paid-menu edits, revision checks and database persistence.

**Automated evidence:** `account-programmes.test.mjs`, `programme-menus.test.mjs`, `programme-period.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** Development account save/reload plus independent PostgreSQL readback; preserved historical operational records.

**Customer journey:** Development journey verified; permanent-host, recovery and final production environment not accepted.

**Outstanding:** No permanent-environment acceptance or restored-backup customer replay.

**Dependencies:** Permanent infrastructure and production credentials/approval.

**Evidence:** [CORE-ACCOUNT-STARTUP-20261021.md](CORE-ACCOUNT-STARTUP-20261021.md), [CUSTOMER-CORE-COMPLETION-TRACKER.md](CUSTOMER-CORE-COMPLETION-TRACKER.md)

**Remaining engineering:** Repeat complete signed-in edit/save/reload on permanent staging; prove restore and isolation.

## 2. Ready Series prepaid subscriptions — PARTIAL

**Implemented:** Three-/six-delivery products, independent billing/delivery cadence, paid-order checks, draft calendar/reminders, schedule pagination and explicit correction inspector. Separate explicit-cent-correction payment/renewal proof now checks native allocation identity, exact gross/net, current/original GST and captured test receipts.

**Automated evidence:** `prepaid-selling-plan.test.mjs`, `prepaid-verification.test.mjs`, `prepaid-calculation.test.mjs`, `prepaid-payment.test.mjs`, `prepaid-purchase.test.mjs`, `prepaid-renewal.test.mjs`, `prepaid-schedule.test.mjs`, `paid-ready-draft.test.mjs`, `subscription-renewal-links.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** Both terms passed exact initial and first simulated renewal charges. Four previously missed paid orders now have validated Core rows and verified initial/renewal contract associations; replay leaves them unchanged. All 18 paid native fulfilments preserved. Native recurring subtotal tooltip explicitly excludes applicable discounts, explaining gross 255.21/493.62 versus net charged 255.20/493.60.

**Customer journey:** Initial/renewal test payments and future-renewal stop verified. Recovered account renders three linked stopped-renewal subscriptions, without duplicate renewal cards. Full merchant delivery lifecycle and permanent callback acceptance incomplete.

**Outstanding:** Production cent-correction creation, persistence and recovery lifecycle is not implemented/accepted generally. Charged nonzero-GST two-identical-package initial/renewal now pass. Mixed-term charged GST now passes. Corrected-payment inactive drafts pass automated/PostgreSQL checks; native delivery/calendar integration and permanent worker scheduling remain unaccepted. Actual provider purchase and renewal events plus explicit worker/replay are verified.

**Dependencies:** Production correction/disclosure approach; nonzero GST configuration/acceptance; merchant slot mapping.

**Evidence:** [SUBSCRIPTION-NATIVE-QA-20261022.md](SUBSCRIPTION-NATIVE-QA-20261022.md), [SUBSCRIPTION-PRICING-SUPPORT-20261023.md](SUBSCRIPTION-PRICING-SUPPORT-20261023.md), [PREPAID-SCHEDULE-PAGINATION-20261023.md](PREPAID-SCHEDULE-PAGINATION-20261023.md), [SUBSCRIPTION-PRICING-ACCEPTANCE-20261023.md](SUBSCRIPTION-PRICING-ACCEPTANCE-20261023.md), [CORE-CONNECTIVITY-RECOVERY-20261024.md](CORE-CONNECTIVITY-RECOVERY-20261024.md)

**Remaining engineering:** Implement gated production correction lifecycle and clear net-price explanation without mislabelling native gross subtotal; complete nonzero-GST native subscription journey and delivery lifecycle.

## 3. 6 by 60 and Plus programmes — PARTIAL

**Implemented:** One-off programme semantics and immutable 88-weekday/32-frozen/120-total entitlement snapshots for new purchases.

**Automated evidence:** `programme-period.test.mjs`, `programme-menus.test.mjs`, `account-programmes.test.mjs`, `subscription-quantity.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** Native one-off test orders and saved sixty-day menus recorded.

**Customer journey:** Purchase/menu persistence partially verified; full frozen allocation, dispatch and Support lifecycle incomplete.

**Outstanding:** Frozen-meal fulfilment allocation and complete native lifecycle remain unverified.

**Dependencies:** Merchant stock/fulfilment configuration and isolated QA approval where new records are needed.

**Evidence:** [MEAL-PLAN-60-DAY-BILLING-DECISION-20261009.md](MEAL-PLAN-60-DAY-BILLING-DECISION-20261009.md), [CUSTOMER-CORE-COMPLETION-TRACKER.md](CUSTOMER-CORE-COMPLETION-TRACKER.md)

**Remaining engineering:** Bind every frozen/weekday entitlement to actual fulfilment quantities and prove no loss or duplicate delivery.

## 4. Product, bundle quantities and contents — PARTIAL

**Implemented:** Admin-editable dish/catalogue records, bundle component references, immutable review and signed-in bundle checks.

**Automated evidence:** `bundle-reviews.test.mjs`, `bundle-review-route.test.mjs`, `bundle-checkout-approvals.test.mjs`, `bundle-fulfillment.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** Draft catalogue: 28 dishes, 13 bundles, eight prepaid configurations. Fourteen-item bundle payment/routing and scoped unpaid review/cart/sign-in comparisons recorded.

**Customer journey:** Review and cart quantity journey verified in isolated preview; final-submission concurrent replay and bound fulfilment acceptance incomplete.

**Outstanding:** Freshness and two concurrent checkouts reusing the same review not fully proven at final submission.

**Dependencies:** Supported final checkout enforcement and isolated complete fulfilment test.

**Evidence:** [CORE-BUNDLE-CART-20261021.md](CORE-BUNDLE-CART-20261021.md), [CORE-BUNDLE-APPROVAL-CANDIDATE-20261021.md](CORE-BUNDLE-APPROVAL-CANDIDATE-20261021.md), [CORE-BUNDLE-FULFILLMENT-AUDIT-20261021.md](CORE-BUNDLE-FULFILLMENT-AUDIT-20261021.md)

**Remaining engineering:** Close final-submission replay/freshness gap and verify actual review-bound fulfilment.

## 5. GST, pricing and delivery charging — PARTIAL

**Implemented:** Core shipping policy: eligible ordinary food after discounts, 75/125 boundaries, prepaid exclusion and per-physical-delivery allocation.

**Automated evidence:** `delivery-policy.test.mjs`, `core-delivery-options.test.mjs`, `core-delivery-qa.test.mjs`, `delivery-charge-audit.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** Official Function fixtures and eleven isolated unpaid shipping comparisons; temporary nonzero-GST, mixed, coupon and normal-storefront checks recorded. Core Function tests restored inactive. Recovery session independently verified included-GST calculation projections: 255.20 includes 21.07 GST; 493.60 includes 40.76 GST, free delivery and matching cent corrections. Calculation only; temporary development Singapore collection restored to Not collecting.

**Customer journey:** Ordinary-food and selected mixed-cart unpaid journeys verified; production profiles, subscription groups and all multi-delivery assignments incomplete.

**Outstanding:** Third-party Collection Total failed order-level discounts and is not accepted for production. Native unpaid nonzero-GST single-package checkouts passed for both terms. Charged nonzero-GST two-identical-package initial/renewal now pass; mixed-term per-package GST now passes; all physical-delivery group cases remain incomplete.

**Dependencies:** Production plan/distribution eligibility, verified physical-delivery grouping and shipping-profile approval.

**Evidence:** [CORE-SHIPPING-FUNCTION-QA-20261018.md](CORE-SHIPPING-FUNCTION-QA-20261018.md), [GST-CHECKOUT-QA-20261019.md](GST-CHECKOUT-QA-20261019.md), [STOREFRONT-SHIPPING-QA-20261019.md](STOREFRONT-SHIPPING-QA-20261019.md), [CORE-CONNECTIVITY-RECOVERY-20261024.md](CORE-CONNECTIVITY-RECOVERY-20261024.md)

**Remaining engineering:** Complete subscription and multi-delivery native cases; install supported Core enforcement on approved production profiles.

## 6. Wallet source ledger, priority and expiry — BLOCKED

**Implemented:** Source-aware ledger, exact source priority, FIFO within source, guarded expiry, draft recovery and protected attribution.

**Automated evidence:** `wallet-ledger.test.mjs`, `wallet-fifo.test.mjs`, `wallet-credit-policy.test.mjs`, `wallet-core-expiry.test.mjs`, `core-wallet-draft.test.mjs`, `core-wallet-redemption.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** Historical native spending, reconciliation and isolated expiry debit recorded. Developer Support did not identify an Advanced architecture meeting all rules.

**Customer journey:** Approved full priority/food-only/expiry/card-preserving checkout journey not supported or verified.

**Outstanding:** Native Store Credit spends earliest expiry; cannot select required lots or restrict only bonus to food. Scheduler-only expiry cannot prove resumed-checkout safety.

**Dependencies:** Shopify eligibility/architecture review; Plus plus closed-beta invitation is not guaranteed by buying Plus.

**Evidence:** [WALLET-PLATFORM-REVIEW-20261023.md](WALLET-PLATFORM-REVIEW-20261023.md), [CORE-FIRST-WALLET-INVESTIGATION-20261017.md](CORE-FIRST-WALLET-INVESTIGATION-20261017.md), [WALLET-CORE-EXPIRY-QA-20261015.md](WALLET-CORE-EXPIRY-QA-20261015.md)

**Remaining engineering:** Obtain supported payment architecture, then implement transactional reservation, expiry, reconciliation and card-preserving recovery. Do not relax approved rules.

## 7. Wallet top-up and native settlement — BLOCKED

**Implemented:** Default-off guarded settlement, verified-payment evidence, duplicate protection, amount/package rules and reversal/reconciliation guards.

**Automated evidence:** `wallet-top-up-settlement.test.mjs`, `wallet-top-up-reconciliation.test.mjs`, `wallet-top-up-native.test.mjs`, `wallet-top-up-lifecycle.test.mjs`, `wallet-top-up-policy.test.mjs`, `wallet-approved-package.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** Scoped payment restriction, credit spending/return and temporary credit expiry tests recorded; no approved general end-to-end top-up activation.

**Customer journey:** Full paid top-up to spend, expiry and exceptional reversal not accepted.

**Outstanding:** Complete supported bonus/source/expiry architecture absent; top-ups remain disabled.

**Dependencies:** Requirement 6 architecture and approved final safeguard matrix.

**Evidence:** [WALLET-TOP-UP-IMPLEMENTATION.md](WALLET-TOP-UP-IMPLEMENTATION.md), [WALLET-TOP-UP-SAFEGUARD-QA-20261013.md](WALLET-TOP-UP-SAFEGUARD-QA-20261013.md)

**Remaining engineering:** Prove exact once credit after paid proof, exclusions, no circular funding, failed/lost payment recovery and reconciled exceptional reversals.

## 8. Gift Card claim, conversion and expiry — PARTIAL

**Implemented:** Named-recipient full conversion, original Gift Card expiry retention, concurrency/recovery guards and inactive reminder outbox.

**Automated evidence:** `gift-card-claim.test.mjs`, `gift-card-request.test.mjs`, `gift-card-expiry-policy.test.mjs`, `gift-card-reminder.test.mjs`, `gift-card-reminder-development.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** Recipient full conversion and one matching native credit verified; separate expiry QA card cancelled/deactivated. Reminder adapter/provider integration partly mocked.

**Customer journey:** Scoped claim verified; automated issuance, full reminder/recovery and expired/replayed live journeys incomplete.

**Outstanding:** No full permanent sender/scheduler acceptance; overall funding consumption depends on Wallet architecture.

**Dependencies:** Production sender, scheduler and requirement 6.

**Evidence:** [GIFT-CARD-WALLET-QA.md](GIFT-CARD-WALLET-QA.md), [GIFT-CARD-EXPIRY-READINESS-20261015.md](GIFT-CARD-EXPIRY-READINESS-20261015.md), [GIFT-CARD-REMINDER-DEVELOPMENT-20261018.md](GIFT-CARD-REMINDER-DEVELOPMENT-20261018.md)

**Remaining engineering:** Verify issuance-to-claim-to-spend-to-expiry including named recipient, original expiry and interruption recovery.

## 9. Wallet-funded subscription renewals — BLOCKED

**Implemented:** Feasibility gate prevents claiming native Store Credit can pay recurring bills.

**Automated evidence:** `readiness.test.mjs`, `native-wallet-credit-ready.test.mjs`, `prepaid-renewal.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** Written Shopify clarification: native Store Credit/Gift Cards may fund initial purchase, not recurring subscription bills.

**Customer journey:** Required recurring Wallet payment journey not implemented or accepted.

**Outstanding:** No supported production Wallet recurring-payment route confirmed.

**Dependencies:** Shopify-approved payment architecture/eligibility distinct from initial checkout funding.

**Evidence:** [WALLET-PLATFORM-REVIEW-20261023.md](WALLET-PLATFORM-REVIEW-20261023.md)

**Remaining engineering:** Establish supported recurring authorization and atomic debit/charge recovery; test mixed/failed/expired funding without duplicate bills.

## 10. Rewards earning and redemption — PARTIAL

**Implemented:** Payment-time rates, non-stacking promotions, cents floored per rate, qualifying food GST, exact funding exclusions and fixed redemption.

**Automated evidence:** `rewards-policy.test.mjs`, `rewards-rate-history.test.mjs`, `rewards-ledger.test.mjs`, `rewards-native.test.mjs`, `rewards-redemption.test.mjs`, `order-funding.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** Scoped native earning/redemption and mixed-payment exclusion recorded; 500 cross-engine attribution samples recorded.

**Customer journey:** Scoped customer earning/redemption verified; general source-controlled checkout, bonus/GST/reversal and recovery journey incomplete.

**Outstanding:** Full original-money attribution at checkout depends on supported Wallet consumption; activation remains guarded.

**Dependencies:** Requirement 6 and final native funding/reversal acceptance.

**Evidence:** [REWARDS-FUNDING-VALIDATION-20261014.md](REWARDS-FUNDING-VALIDATION-20261014.md), [REWARDS-NATIVE-QA-20261013.md](REWARDS-NATIVE-QA-20261013.md)

**Remaining engineering:** Verify full earning-to-redemption-to-spend with real native funding, GST, promotions and exceptional reversals; activate only after acceptance.

## 11. Referral and unapproved benefits remain inactive — PASS

**Implemented:** Referral bonuses and unconfirmed tiers/benefits deliberately inactive according to merchant decision.

**Automated evidence:** `rewards-policy.test.mjs`, `readiness.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** No referral earning or paid referral journey is enabled; merchant explicitly deferred formal referral rewards.

**Customer journey:** Not applicable by approved policy: no referral programme should exist at launch under current requirements.

**Outstanding:** None for this intentionally disabled policy.

**Dependencies:** Any future referral economics require a new merchant decision.

**Evidence:** [CUSTOMER-CORE-COMPLETION-TRACKER.md](CUSTOMER-CORE-COMPLETION-TRACKER.md), [WALLET-MERCHANT-RULES-20261015.md](WALLET-MERCHANT-RULES-20261015.md)

**Remaining engineering:** Retain disabled state; final configuration acceptance must confirm no accidental referral claims.

## 12. Customer account journeys — PARTIAL

**Implemented:** Seven account sections, Wallet/history, saved programmes and freshly bound subscription status; startup race repair.

**Automated evidence:** `account-programmes.test.mjs`, `account-subscriptions.test.mjs`, `subscription-renewal-stop-client.test.mjs`, `subscription-renewal-stop-route.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** Native seven-section rendering and saved menus recorded; authenticated Ready Series future-renewal stop now passed with independent preservation proof. Reconnected current account preview: three stopped-renewal cards and existing saved 6 by 60 programmes visible, with no duplicate renewal cards.

**Customer journey:** Several isolated journeys verified; all sections with full final Wallet/subscription state and permanent host not accepted.

**Outstanding:** General management/branding and recovery acceptance incomplete; blocked payment features must not be represented as ready.

**Dependencies:** Requirements 2, 6-10, 13 and permanent hosting.

**Evidence:** [CORE-ACCOUNT-STARTUP-20261021.md](CORE-ACCOUNT-STARTUP-20261021.md), [SUBSCRIPTION-RENEWAL-STOP-20261023.md](SUBSCRIPTION-RENEWAL-STOP-20261023.md), [CORE-CONNECTIVITY-RECOVERY-20261024.md](CORE-CONNECTIVITY-RECOVERY-20261024.md)

**Remaining engineering:** Complete final seven-section end-to-end matrix, expired sessions, access isolation, mobile and interrupted-operation recovery.

## 13. Fulfilment, pause, reschedule and future-renewal management — PARTIAL

**Implemented:** Authenticated future-renewal stop with durable intent/replay guards; pure delivery-change notice/slot planner and inactive reminder persistence.

**Automated evidence:** `subscription-renewal-stop.test.mjs`, `subscription-renewal-stop-route.test.mjs`, `subscription-renewal-stop-client.test.mjs`, `ready-series-change.test.mjs`, `ready-delivery-draft.test.mjs`, `order-dispatch.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** Ready Series customer stop verified: native contract cancelled, one completed audit, three paid fulfilments/order unchanged and nine financial models unchanged. Same/new-key service replays attempted no second mutation.

**Customer journey:** Future-renewal stop passed in isolated Ready Series journey. Customer delivery pause/reschedule and Meal Plan management incomplete.

**Outstanding:** Slot capacity, authenticated reschedule persistence, native work-start/delivery mapping and complete paid entitlement lifecycle are not proven.

**Dependencies:** Merchant slot source, native write access/test approval and provider/scheduler for reminders.

**Evidence:** [SUBSCRIPTION-RENEWAL-STOP-20261023.md](SUBSCRIPTION-RENEWAL-STOP-20261023.md), [READY-SERIES-DELIVERY-CHANGE-20261023.md](READY-SERIES-DELIVERY-CHANGE-20261023.md), [PREPAID-SCHEDULE-PAGINATION-20261023.md](PREPAID-SCHEDULE-PAGINATION-20261023.md)

**Remaining engineering:** Implement authoritative capacity/reschedule executor and native preservation proof; verify Meal Plan management without pausing billing inadvertently.

## 14. Permanent infrastructure, recovery and operations — BLOCKED

**Implemented:** Development PostgreSQL, production-schema migration mirror, deployment safety preflight and local checkpoint/backups.

**Automated evidence:** `dev-config.test.mjs`, `readiness.test.mjs`, `privacy.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** Development migrations and preserved-data checks recorded; no commercial production deployment approved.

**Customer journey:** Permanent customer journey, restore/failover, scheduler and production incidents not accepted.

**Outstanding:** Temporary local/tunnel environment is not a permanent operational platform. Quick-tunnel origin became unavailable; exact process termination cause unknown. Restored development connection remains temporary. Full PostgreSQL regression runs hit connection/interactive-transaction timeouts; disposable SQLite regression passes but does not certify production PostgreSQL.

**Dependencies:** Merchant hosting/plan/budget, production credentials and explicit deployment approval.

**Evidence:** [CORE-DEPLOYMENT.md](CORE-DEPLOYMENT.md), [PRIVACY-REVIEW-GATE-20261019.md](PRIVACY-REVIEW-GATE-20261019.md), [CORE-CONNECTIVITY-RECOVERY-20261024.md](CORE-CONNECTIVITY-RECOVERY-20261024.md)

**Remaining engineering:** Provision approved hosting/database/secrets/workers, perform restore/replay drills, monitoring, retention and operational ownership acceptance.

## 15. Original ownership, webhook routing and cross-stream reconciliation — PARTIAL

**Implemented:** Native order/contract listeners, immutable stream markers, validated original linking, quarantine and monotonic dispatch guards. Added development-only native-payment/attempt-verified renewal reconciliation with compare-and-set linkage and durable replay receipt.

**Automated evidence:** `order-webhook.test.mjs`, `order-routing-evidence.test.mjs`, `subscription-webhook.test.mjs`, `subscription-links.test.mjs`, `order-dispatch.test.mjs`, `privacy.test.mjs`, `subscription-renewal-links.test.mjs`. Unit tests alone do not establish PASS.

**Actual Shopify tests:** Restored four callback topics, exactly one each. Existing orders #1020–#1023 recovered from native paid proof with correct ownership, stream and contract association. Two complete processing passes leave four Core rows unchanged; all 18 paid native fulfilments unchanged. Invalid-HMAC HTTP returns 401; correctly signed synthetic existing-order replay returns 200 twice with no operational-row change. This is not a newly Shopify-generated webhook delivery.

**Customer journey:** New initial purchase through future-renewal stop verified; actual validated renewal and wider mixed-stream lifecycle incomplete.

**Outstanding:** Fresh Shopify-initiated delivery through the restored callback remains unverified. Development recovery linker is not an automatic production renewal processor. Permanent durable ingress, queued retries and periodic reconciliation remain required.

**Dependencies:** Exact pricing tests, fulfilment acceptance and permanent webhook/worker host.

**Evidence:** [SUBSCRIPTION-RENEWAL-STOP-20261023.md](SUBSCRIPTION-RENEWAL-STOP-20261023.md), [SUBSCRIPTION-NATIVE-QA-20261022.md](SUBSCRIPTION-NATIVE-QA-20261022.md), [CORE-BUNDLE-FULFILLMENT-AUDIT-20261021.md](CORE-BUNDLE-FULFILLMENT-AUDIT-20261021.md), [CORE-CONNECTIVITY-RECOVERY-20261024.md](CORE-CONNECTIVITY-RECOVERY-20261024.md)

**Remaining engineering:** Implement automatic, native-proof-bound renewal routing and durable ingest/replay on permanent staging; prove provider-originated delivery and mixed-stream isolation.

## 24 October approved native follow-up

Real Shopify order-update delivery passed with original note, four Core rows and all 18 paid fulfilments preserved. Both unpaid subscription GST checkouts passed: SGD 255.20 including 21.07 GST and SGD 493.60 including 40.76 GST, free isolated delivery. Temporary product, discounts, profile membership, tax settings and QA preview files restored. Counts remain 1 PASS / 10 PARTIAL / 0 FAIL / 4 BLOCKED; see [NATIVE-WEBHOOK-GST-QA-20261024.md](NATIVE-WEBHOOK-GST-QA-20261024.md). This follow-up supersedes earlier statements that these two specific native checks were pending; wider production acceptance remains incomplete.

## Registered-renewal engineering checkpoint

489 Core tests and 25 focused PostgreSQL tests pass. The new default-off pipeline stores immutable purchase proof, authenticates and persists billing triggers, and links successful renewals from fresh native evidence. Both existing paid QA renewals replay unchanged; all 18 native paid fulfilments and nine financial models preserved. Real SDK local HTTP signed replays pass, not a fresh provider billing event. See [PREPAID-RENEWAL-PIPELINE-20261024.md](PREPAID-RENEWAL-PIPELINE-20261024.md). Production counts remain unchanged; purchase-flow integration, durable scheduling, general correction lifecycle and full native acceptance are still required.

### Multiple-package decision and verification — 24 October

Customer approved multiple prepaid packages per checkout. Core now validates package counts, separate registered contract lines, whole-order capture/allocation and quantity-preserving delivery proof. 500 Core tests and 33 focused PostgreSQL tests passed; TypeScript/lint passed. Historical single-package native replay preserved all 18 paid fulfilments and nine financial models. Native multiple-package checkout/correction propagation is pending isolated-test approval; no additional requirement is PASS. Counts remain **1 PASS / 10 PARTIAL / 0 FAIL / 4 BLOCKED**.

### Unpaid multiple-package native checkout evidence

Both approved comparisons passed exact checkout food totals with free isolated delivery: two3-delivery packagesSGD 510.40 and3+6 packagesSGD748.80. The former exposed and corrected a fixed-discount quantity error in the temporary QA setup; general production provisioning remains incomplete. All six discounts inactive, original policies restored, QA product draft/unpublished, profile membership and cart restored. Multi-package payment/renewal and nonzero GST remain open. See [PREPAID-MULTIPLE-PACKAGE-CHECKOUT-20261024.md](PREPAID-MULTIPLE-PACKAGE-CHECKOUT-20261024.md). Acceptance counts unchanged.

### Two-identical-package native lifecycle — 25 October

Initial test order #1024 and one simulated renewal #1025 each captured exactly **SGD 510.40**. Shopify has exactly those two orders and one billing attempt on the QA contract. A real billing-success notification reached the durable Core inbox; the explicit worker and replay left two validated linked rows without duplicates. Each order has three deliveries of quantity 2. Future renewals were stopped while preserving all 24 protected native fulfilments and nine financial models. Temporary QA settings and callback gates were restored. GST was 0 in this scenario; general correction, mixed terms, paid nonzero GST and permanent infrastructure remain open. See [PREPAID-TWO-PACKAGE-NATIVE-QA-20261025.md](PREPAID-TWO-PACKAGE-NATIVE-QA-20261025.md). Counts remain **1 PASS / 10 PARTIAL / 0 FAIL / 4 BLOCKED**.

## Mixed-term native QA — 25 October

Initial #1026 SGD748.80 and separate renewals #1027 SGD255.20 / #1028 SGD493.60 passed. Two correct contracts, four linked Core rows, one billing attempt each, actual provider notifications and explicit worker/replay verified. Paid delivery quantities and six earlier orders preserved. Nine financial models unchanged. Future test renewals stopped and temporary configuration restored. GST was zero: nonzero-tax charged renewal acceptance remains open. See PREPAID-MIXED-PACKAGE-NATIVE-QA-20261025.md. Classification unchanged.

## Original-purchase intake — 25 October

Immutable pricing approvals, durable authenticated intake and bounded recovery now replace the missing server-side original-purchase registration step in development. 520 full disposable tests pass;98 focused PostgreSQL checks pass sequentially. Historical native proofs and signed SDK replays preserve nine paid orders and nine financial models. The real provider create-event/permanent worker and general pricing provisioning remain unaccepted. Counts remain1 PASS/10 PARTIAL/0 FAIL/4 BLOCKED. See [purchase intake evidence](PREPAID-PURCHASE-INTAKE-20261025.md).

## Quantity-aware corrections — 25 October

One per-package automatic correction produced exact native unpaid totals255.20,510.40 and748.80 without quantity-specific resizing. Full suite522/522 and23 focused PostgreSQL checks pass. Separate QA pricing versions and immutable per-package approvals are prepared under the customer's new simulated-test authorization. No payment/renewal for those versions is claimed yet. See [unpaid evidence](PREPAID-PER-ITEM-UNPAID-QA-20261025.md). Counts unchanged.

### 25 October: per-package charged GST evidence

Two identical packages passed exact SGD 510.40 initial and renewal charges, including SGD 42.14 GST each and free delivery. Real provider events reached the durable intake; explicit worker processing and replay retained correct links and quantities. Future test renewals stopped, paid deliveries and financial snapshots preserved. Temporary settings restored. New quantity-scaled mixed paid GST scenario remains approved and unstarted. Status counts unchanged. See [detailed evidence](PREPAID-PER-PACKAGE-GST-PAID-QA-20261025.md).

## 26 October acceptance evidence

Mixed-package initial #1031 and renewals #1032/#1033 passed exact prices and nonzero included GST. Native provider events, Core processing and replay passed; both future test renewals stopped without changing paid deliveries. All temporary QA settings were restored. Registered corrected-purchase inactive draft support now passes regression and focused PostgreSQL checks. Full acceptance remains **1 PASS / 10 PARTIAL / 0 FAIL / 4 BLOCKED**. See [dated evidence](PREPAID-MIXED-PER-PACKAGE-GST-QA-20261026.md) for amounts, cleanup, test limits and remaining work.

## 26 October merchant slot-capacity follow-up

The merchant confirmed administrator-set delivery limits per slot. Core now has atomic internal reservations/releases, editable Singapore-time slot controls, privacy inventory and revision/ownership guards. All542 disposable tests and38 focused PostgreSQL checks pass. Actual embedded-admin create/edit/close passed and was independently read back; the disposable slot was removed and all15 protected business-model snapshots remain unchanged. Native booking/customer reschedule integration remains open. See [capacity evidence](READY-DELIVERY-CAPACITY-QA-20261026.md).

Shopify eligibility feedback now identifies the general Payments Partner application as the assessment route, while its compatibility attestation remains unconfirmed. No application, agreement or plan purchase was submitted. See [application preparation](PAYMENTS-PARTNER-ASSESSMENT-PREPARATION-20261026.md). Acceptance counts are unchanged.

Reservation follow-up: the default-off switch now preserves existing internal reservations, with a concurrent move/reserve regression. Full disposable suite: 555/555. Native customer booking remains unaccepted.

Recovery follow-up: fixed the legacy 11-table export omission. Format v3 covers all 35 operational models; 554 disposable Core tests and five focused PostgreSQL recovery cases pass. Hosted recovery remains BLOCKED. See [recovery evidence](CORE-RECOVERY-COVERAGE-QA-20261026.md).

Gift Card acceptance follow-up: [26 October native claim and cleanup](GIFT-CARD-CLAIM-ACCEPTANCE-20261026.md). Full disposable regression 558/558; TypeScript/lint pass. Requirement 8 remains PARTIAL; expiry enforcement and permanent reminders are not claimed.

## 27 October combined-visit evidence

Durable internal grouping now preserves all paid package counts while consuming one place per visit. Replay, standalone/group overlap, non-leader protection, atomic release and recovery passed 27 PostgreSQL checks; full disposable regression567/567, TypeScript/lint/schema checks passed. All35 existing business-model hashes are unchanged. Customer booking/native rescheduling remain incomplete, so status counts remain1PASS/10PARTIAL/4BLOCKED. See [combined visit evidence](READY-DELIVERY-COMBINED-VISIT-QA-20261027.md).

Paid renewal delivery follow-up: immutable original/renewal entitlement checks passed12 focused PostgreSQL cases and51 focused disposable tests; full serial regression570/570. All37 protected model snapshots unchanged. Native customer booking remains inactive; acceptance counts unchanged.

## 27 October stopped-renewal entitlement fix

Confirmed future-renewal stops no longer incorrectly block preparation of still-paid registered deliveries. Fresh native identity/binding, full payment and dispatch checks remain mandatory. 574 full disposable tests and 27 focused PostgreSQL checks pass; all37 protected business models unchanged. Existing native stop binding readback passed without financial mutations. This is internal preparation evidence, not customer booking acceptance. Counts remain **1 PASS / 10 PARTIAL / 0 FAIL / 4 BLOCKED**. See [verification](STOPPED-RENEWAL-PAID-DELIVERIES-QA-20261027.md).

The owner chose to retain temporary development hosting on27 October. No permanent host, upgrade or deployment was authorized; hosted ingress, scheduling, monitoring and restore acceptance remain BLOCKED. The final support response directs formal Wallet eligibility review to the Payments Partner application; it does not approve the proposed Wallet integration. See [support outcome](WALLET-PARTNER-ROUTING-20261027.md).

## 27 October native destination proof

Read-only server-side destination/ownership/dispatch proof passed for nine native fulfilment orders across#1029/#1031, without new permissions or mutations. All11 protected business models stayed unchanged. Eight focused tests and582 full disposable Core tests pass; TypeScript/lint and pinned API query validation pass. This is not customer booking or paid-line/time-slot authorization. See [native destination evidence](READY-DELIVERY-DESTINATION-QA-20261027.md). Counts remain **1 PASS /10 PARTIAL /0 FAIL /4 BLOCKED**.

## 27 October paid-allocation and diagnostic follow-up

Fresh read-only Shopify verification preserved12 paid line-level delivery allocations for#1029/#1031, including the two-package quantities. Eight protected Core data groups stayed unchanged; no native mutation occurred. The callback diagnostic also reproduced and fixed a false healthy result when a current callback coexisted with an expired-tunnel duplicate for the same topic. This is a configuration check, not network-reachability proof. Full disposable regression583/583; TypeScript/lint pass. Acceptance counts unchanged.
