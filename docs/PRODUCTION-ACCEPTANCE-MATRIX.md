# Performance Meals — full production acceptance

Updated 23 October 2026. Evidence baseline: `ecbfb31`; 455 Core tests. No production acceptance or reduced-scope release is authorized. Tests and historical development observations are evidence, not blanket PASS decisions.

Current classification: 1 PASS / 9 PARTIAL / 1 FAIL / 4 BLOCKED. The PASS is the merchant-approved absence of referral rewards, not a completed payment or subscription flow.

| # | Requirement | Status |
| --- | --- | --- |
| 1 | Authenticated Meal Plan persistence | **PARTIAL** |
| 2 | Ready Series prepaid subscriptions | **FAIL** |
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

The machine-readable companion is [PRODUCTION-ACCEPTANCE-MATRIX.json](PRODUCTION-ACCEPTANCE-MATRIX.json). Status definitions and all evidence fields are recorded there. No overall completion percentage is inferred.

## 1. Authenticated Meal Plan persistence — PARTIAL

**Implemented:** Authenticated saved menus, paid-menu edits, revision checks and database persistence.

**Automated evidence:** `account-programmes.test.mjs`, `programme-menus.test.mjs`, `programme-period.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** Development account save/reload plus independent PostgreSQL readback; preserved historical operational records.

**Customer journey:** Development journey verified; permanent-host, recovery and final production environment not accepted.

**Outstanding issues:** No permanent-environment acceptance or restored-backup customer replay.

**Dependencies/approvals:** Permanent infrastructure and production credentials/approval.

**Exact evidence:** [CORE-ACCOUNT-STARTUP-20261021.md](CORE-ACCOUNT-STARTUP-20261021.md), [CUSTOMER-CORE-COMPLETION-TRACKER.md](CUSTOMER-CORE-COMPLETION-TRACKER.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Repeat complete signed-in edit/save/reload on permanent staging; prove restore and isolation.

## 2. Ready Series prepaid subscriptions — FAIL

**Implemented:** Three-/six-delivery products, independent billing/delivery cadence, paid-order checks, draft calendar/reminders, schedule pagination and explicit correction inspector. Separate corrected-payment/renewal readers now verify the exact approved allocation, total, captured payment and GST without relaxing the default no-discount gate.

**Automated evidence:** `prepaid-selling-plan.test.mjs`, `prepaid-verification.test.mjs`, `prepaid-calculation.test.mjs`, `prepaid-payment.test.mjs`, `prepaid-purchase.test.mjs`, `prepaid-renewal.test.mjs`, `prepaid-schedule.test.mjs`, `paid-ready-draft.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** Both initial purchases and historical test renewals observed; exact initial correction checkout comparisons and no-charge committed correction records observed. Last fresh cleanup: five QA contracts cancelled. Fresh unpaid comparisons reconfirm exact 255.20/493.60 first totals and free first/recurring delivery; recurring disclosure remains 255.21/493.62.

**Customer journey:** Partial only: purchase and renewal-stop tested; corrected exact-price purchase-through-renewal and merchant delivery lifecycle not verified.

**Outstanding issues:** Uncorrected checkout/renewals charged 255.18/493.56 instead of 255.20/493.60. Corrected unpaid first checkout matched, but recurring display showed 255.21/493.62. Saved manual corrections do not prove checkout transfer or charged renewal.

**Dependencies/approvals:** Fresh unpaid setup completed and restored. Scoped exact-price purchase/renewal test approved, with user payment handoff; compatible test provider; merchant slot mapping.

**Exact evidence:** [SUBSCRIPTION-NATIVE-QA-20261022.md](SUBSCRIPTION-NATIVE-QA-20261022.md), [SUBSCRIPTION-PRICING-SUPPORT-20261023.md](SUBSCRIPTION-PRICING-SUPPORT-20261023.md), [PREPAID-SCHEDULE-PAGINATION-20261023.md](PREPAID-SCHEDULE-PAGINATION-20261023.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Verify a supported exact-price checkout-to-contract path; test exact renewal, discounts, GST and delivery; complete native calendar/slot lifecycle.

## 3. 6 by 60 and Plus programmes — PARTIAL

**Implemented:** One-off programme semantics and immutable 88-weekday/32-frozen/120-total entitlement snapshots for new purchases.

**Automated evidence:** `programme-period.test.mjs`, `programme-menus.test.mjs`, `account-programmes.test.mjs`, `subscription-quantity.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** Native one-off test orders and saved sixty-day menus recorded.

**Customer journey:** Purchase/menu persistence partially verified; full frozen allocation, dispatch and Support lifecycle incomplete.

**Outstanding issues:** Frozen-meal fulfilment allocation and complete native lifecycle remain unverified.

**Dependencies/approvals:** Merchant stock/fulfilment configuration and isolated QA approval where new records are needed.

**Exact evidence:** [MEAL-PLAN-60-DAY-BILLING-DECISION-20261009.md](MEAL-PLAN-60-DAY-BILLING-DECISION-20261009.md), [CUSTOMER-CORE-COMPLETION-TRACKER.md](CUSTOMER-CORE-COMPLETION-TRACKER.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Bind every frozen/weekday entitlement to actual fulfilment quantities and prove no loss or duplicate delivery.

## 4. Product, bundle quantities and contents — PARTIAL

**Implemented:** Admin-editable dish/catalogue records, bundle component references, immutable review and signed-in bundle checks.

**Automated evidence:** `bundle-reviews.test.mjs`, `bundle-review-route.test.mjs`, `bundle-checkout-approvals.test.mjs`, `bundle-fulfillment.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** Draft catalogue: 28 dishes, 13 bundles, eight prepaid configurations. Fourteen-item bundle payment/routing and scoped unpaid review/cart/sign-in comparisons recorded.

**Customer journey:** Review and cart quantity journey verified in isolated preview; final-submission concurrent replay and bound fulfilment acceptance incomplete.

**Outstanding issues:** Freshness and two concurrent checkouts reusing the same review not fully proven at final submission.

**Dependencies/approvals:** Supported final checkout enforcement and isolated complete fulfilment test.

**Exact evidence:** [CORE-BUNDLE-CART-20261021.md](CORE-BUNDLE-CART-20261021.md), [CORE-BUNDLE-APPROVAL-CANDIDATE-20261021.md](CORE-BUNDLE-APPROVAL-CANDIDATE-20261021.md), [CORE-BUNDLE-FULFILLMENT-AUDIT-20261021.md](CORE-BUNDLE-FULFILLMENT-AUDIT-20261021.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Close final-submission replay/freshness gap and verify actual review-bound fulfilment.

## 5. GST, pricing and delivery charging — PARTIAL

**Implemented:** Core shipping policy: eligible ordinary food after discounts, 75/125 boundaries, prepaid exclusion and per-physical-delivery allocation.

**Automated evidence:** `delivery-policy.test.mjs`, `core-delivery-options.test.mjs`, `core-delivery-qa.test.mjs`, `delivery-charge-audit.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** Official Function fixtures and eleven isolated unpaid shipping comparisons; temporary nonzero-GST, mixed, coupon and normal-storefront checks recorded. Core Function tests restored inactive.

**Customer journey:** Ordinary-food and selected mixed-cart unpaid journeys verified; production profiles, subscription groups and all multi-delivery assignments incomplete.

**Outstanding issues:** Exact subscription pricing failure tracked in requirement 2. Third-party Collection Total rule failed order-level discounts and is not an accepted production dependency.

**Dependencies/approvals:** Production plan/distribution eligibility, verified physical-delivery grouping and shipping-profile approval.

**Exact evidence:** [CORE-SHIPPING-FUNCTION-QA-20261018.md](CORE-SHIPPING-FUNCTION-QA-20261018.md), [GST-CHECKOUT-QA-20261019.md](GST-CHECKOUT-QA-20261019.md), [STOREFRONT-SHIPPING-QA-20261019.md](STOREFRONT-SHIPPING-QA-20261019.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Complete subscription and multi-delivery native cases; install supported Core enforcement on approved production profiles.

## 6. Wallet source ledger, priority and expiry — BLOCKED

**Implemented:** Source-aware ledger, exact source priority, FIFO within source, guarded expiry, draft recovery and protected attribution.

**Automated evidence:** `wallet-ledger.test.mjs`, `wallet-fifo.test.mjs`, `wallet-credit-policy.test.mjs`, `wallet-core-expiry.test.mjs`, `core-wallet-draft.test.mjs`, `core-wallet-redemption.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** Historical native spending, reconciliation and isolated expiry debit recorded. Developer Support did not identify an Advanced architecture meeting all rules.

**Customer journey:** Approved full priority/food-only/expiry/card-preserving checkout journey not supported or verified.

**Outstanding issues:** Native Store Credit spends earliest expiry; cannot select required lots or restrict only bonus to food. Scheduler-only expiry cannot prove resumed-checkout safety.

**Dependencies/approvals:** Shopify eligibility/architecture review; Plus plus closed-beta invitation is not guaranteed by buying Plus.

**Exact evidence:** [WALLET-PLATFORM-REVIEW-20261023.md](WALLET-PLATFORM-REVIEW-20261023.md), [CORE-FIRST-WALLET-INVESTIGATION-20261017.md](CORE-FIRST-WALLET-INVESTIGATION-20261017.md), [WALLET-CORE-EXPIRY-QA-20261015.md](WALLET-CORE-EXPIRY-QA-20261015.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Obtain supported payment architecture, then implement transactional reservation, expiry, reconciliation and card-preserving recovery. Do not relax approved rules.

## 7. Wallet top-up and native settlement — BLOCKED

**Implemented:** Default-off guarded settlement, verified-payment evidence, duplicate protection, amount/package rules and reversal/reconciliation guards.

**Automated evidence:** `wallet-top-up-settlement.test.mjs`, `wallet-top-up-reconciliation.test.mjs`, `wallet-top-up-native.test.mjs`, `wallet-top-up-lifecycle.test.mjs`, `wallet-top-up-policy.test.mjs`, `wallet-approved-package.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** Scoped payment restriction, credit spending/return and temporary credit expiry tests recorded; no approved general end-to-end top-up activation.

**Customer journey:** Full paid top-up to spend, expiry and exceptional reversal not accepted.

**Outstanding issues:** Complete supported bonus/source/expiry architecture absent; top-ups remain disabled.

**Dependencies/approvals:** Requirement 6 architecture and approved final safeguard matrix.

**Exact evidence:** [WALLET-TOP-UP-IMPLEMENTATION.md](WALLET-TOP-UP-IMPLEMENTATION.md), [WALLET-TOP-UP-SAFEGUARD-QA-20261013.md](WALLET-TOP-UP-SAFEGUARD-QA-20261013.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Prove exact once credit after paid proof, exclusions, no circular funding, failed/lost payment recovery and reconciled exceptional reversals.

## 8. Gift Card claim, conversion and expiry — PARTIAL

**Implemented:** Named-recipient full conversion, original Gift Card expiry retention, concurrency/recovery guards and inactive reminder outbox.

**Automated evidence:** `gift-card-claim.test.mjs`, `gift-card-request.test.mjs`, `gift-card-expiry-policy.test.mjs`, `gift-card-reminder.test.mjs`, `gift-card-reminder-development.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** Recipient full conversion and one matching native credit verified; separate expiry QA card cancelled/deactivated. Reminder adapter/provider integration partly mocked.

**Customer journey:** Scoped claim verified; automated issuance, full reminder/recovery and expired/replayed live journeys incomplete.

**Outstanding issues:** No full permanent sender/scheduler acceptance; overall funding consumption depends on Wallet architecture.

**Dependencies/approvals:** Production sender, scheduler and requirement 6.

**Exact evidence:** [GIFT-CARD-WALLET-QA.md](GIFT-CARD-WALLET-QA.md), [GIFT-CARD-EXPIRY-READINESS-20261015.md](GIFT-CARD-EXPIRY-READINESS-20261015.md), [GIFT-CARD-REMINDER-DEVELOPMENT-20261018.md](GIFT-CARD-REMINDER-DEVELOPMENT-20261018.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Verify issuance-to-claim-to-spend-to-expiry including named recipient, original expiry and interruption recovery.

## 9. Wallet-funded subscription renewals — BLOCKED

**Implemented:** Feasibility gate prevents claiming native Store Credit can pay recurring bills.

**Automated evidence:** `readiness.test.mjs`, `native-wallet-credit-ready.test.mjs`, `prepaid-renewal.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** Written Shopify clarification: native Store Credit/Gift Cards may fund initial purchase, not recurring subscription bills.

**Customer journey:** Required recurring Wallet payment journey not implemented or accepted.

**Outstanding issues:** No supported production Wallet recurring-payment route confirmed.

**Dependencies/approvals:** Shopify-approved payment architecture/eligibility distinct from initial checkout funding.

**Exact evidence:** [WALLET-PLATFORM-REVIEW-20261023.md](WALLET-PLATFORM-REVIEW-20261023.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Establish supported recurring authorization and atomic debit/charge recovery; test mixed/failed/expired funding without duplicate bills.

## 10. Rewards earning and redemption — PARTIAL

**Implemented:** Payment-time rates, non-stacking promotions, cents floored per rate, qualifying food GST, exact funding exclusions and fixed redemption.

**Automated evidence:** `rewards-policy.test.mjs`, `rewards-rate-history.test.mjs`, `rewards-ledger.test.mjs`, `rewards-native.test.mjs`, `rewards-redemption.test.mjs`, `order-funding.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** Scoped native earning/redemption and mixed-payment exclusion recorded; 500 cross-engine attribution samples recorded.

**Customer journey:** Scoped customer earning/redemption verified; general source-controlled checkout, bonus/GST/reversal and recovery journey incomplete.

**Outstanding issues:** Full original-money attribution at checkout depends on supported Wallet consumption; activation remains guarded.

**Dependencies/approvals:** Requirement 6 and final native funding/reversal acceptance.

**Exact evidence:** [REWARDS-FUNDING-VALIDATION-20261014.md](REWARDS-FUNDING-VALIDATION-20261014.md), [REWARDS-NATIVE-QA-20261013.md](REWARDS-NATIVE-QA-20261013.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Verify full earning-to-redemption-to-spend with real native funding, GST, promotions and exceptional reversals; activate only after acceptance.

## 11. Referral and unapproved benefits remain inactive — PASS

**Implemented:** Referral bonuses and unconfirmed tiers/benefits deliberately inactive according to merchant decision.

**Automated evidence:** `rewards-policy.test.mjs`, `readiness.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** No referral earning or paid referral journey is enabled; merchant explicitly deferred formal referral rewards.

**Customer journey:** Not applicable by approved policy: no referral programme should exist at launch under current requirements.

**Outstanding issues:** None for the explicitly inactive referral policy.

**Dependencies/approvals:** Any future referral economics require a new merchant decision.

**Exact evidence:** [CUSTOMER-CORE-COMPLETION-TRACKER.md](CUSTOMER-CORE-COMPLETION-TRACKER.md), [WALLET-MERCHANT-RULES-20261015.md](WALLET-MERCHANT-RULES-20261015.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Retain disabled state; final configuration acceptance must confirm no accidental referral claims.

## 12. Customer account journeys — PARTIAL

**Implemented:** Seven account sections, Wallet/history, saved programmes and freshly bound subscription status; startup race repair.

**Automated evidence:** `account-programmes.test.mjs`, `account-subscriptions.test.mjs`, `subscription-renewal-stop-client.test.mjs`, `subscription-renewal-stop-route.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** Native seven-section rendering and saved menus recorded; authenticated Ready Series future-renewal stop now passed with independent preservation proof.

**Customer journey:** Several isolated journeys verified; all sections with full final Wallet/subscription state and permanent host not accepted.

**Outstanding issues:** General management/branding and recovery acceptance incomplete; blocked payment features must not be represented as ready.

**Dependencies/approvals:** Requirements 2, 6-10, 13 and permanent hosting.

**Exact evidence:** [CORE-ACCOUNT-STARTUP-20261021.md](CORE-ACCOUNT-STARTUP-20261021.md), [SUBSCRIPTION-RENEWAL-STOP-20261023.md](SUBSCRIPTION-RENEWAL-STOP-20261023.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Complete final seven-section end-to-end matrix, expired sessions, access isolation, mobile and interrupted-operation recovery.

## 13. Fulfilment, pause, reschedule and future-renewal management — PARTIAL

**Implemented:** Authenticated future-renewal stop with durable intent/replay guards; pure delivery-change notice/slot planner and inactive reminder persistence.

**Automated evidence:** `subscription-renewal-stop.test.mjs`, `subscription-renewal-stop-route.test.mjs`, `subscription-renewal-stop-client.test.mjs`, `ready-series-change.test.mjs`, `ready-delivery-draft.test.mjs`, `order-dispatch.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** Ready Series customer stop verified: native contract cancelled, one completed audit, three paid fulfilments/order unchanged and nine financial models unchanged. Same/new-key service replays attempted no second mutation.

**Customer journey:** Future-renewal stop passed in isolated Ready Series journey. Customer delivery pause/reschedule and Meal Plan management incomplete.

**Outstanding issues:** Slot capacity, authenticated reschedule persistence, native work-start/delivery mapping and complete paid entitlement lifecycle are not proven.

**Dependencies/approvals:** Merchant slot source, native write access/test approval and provider/scheduler for reminders.

**Exact evidence:** [SUBSCRIPTION-RENEWAL-STOP-20261023.md](SUBSCRIPTION-RENEWAL-STOP-20261023.md), [READY-SERIES-DELIVERY-CHANGE-20261023.md](READY-SERIES-DELIVERY-CHANGE-20261023.md), [PREPAID-SCHEDULE-PAGINATION-20261023.md](PREPAID-SCHEDULE-PAGINATION-20261023.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Implement authoritative capacity/reschedule executor and native preservation proof; verify Meal Plan management without pausing billing inadvertently.

## 14. Permanent infrastructure, recovery and operations — BLOCKED

**Implemented:** Development PostgreSQL, production-schema migration mirror, deployment safety preflight and local checkpoint/backups.

**Automated evidence:** `dev-config.test.mjs`, `readiness.test.mjs`, `privacy.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** Development migrations and preserved-data checks recorded; no commercial production deployment approved.

**Customer journey:** Permanent customer journey, restore/failover, scheduler and production incidents not accepted.

**Outstanding issues:** Temporary local/tunnel environment is not a permanent operational platform.

**Dependencies/approvals:** Merchant hosting/plan/budget, production credentials and explicit deployment approval.

**Exact evidence:** [CORE-DEPLOYMENT.md](CORE-DEPLOYMENT.md), [PRIVACY-REVIEW-GATE-20261019.md](PRIVACY-REVIEW-GATE-20261019.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Provision approved hosting/database/secrets/workers, perform restore/replay drills, monitoring, retention and operational ownership acceptance.

## 15. Original ownership, webhook routing and cross-stream reconciliation — PARTIAL

**Implemented:** Native order/contract listeners, immutable stream markers, validated original linking, quarantine and monotonic dispatch guards.

**Automated evidence:** `order-webhook.test.mjs`, `order-routing-evidence.test.mjs`, `subscription-webhook.test.mjs`, `subscription-links.test.mjs`, `order-dispatch.test.mjs`, `privacy.test.mjs`. These belong to the passing baseline; they do not alone satisfy acceptance.

**Actual Shopify tests:** Correctly marked new prepaid paid order linked successfully; earlier malformed QA orders remain quarantined; native callback registration and read-only dispatch history recorded.

**Customer journey:** New initial purchase through future-renewal stop verified; actual validated renewal and wider mixed-stream lifecycle incomplete.

**Outstanding issues:** Corrected-price renewal routing, retry/out-of-order recovery and complete reconciliation still need native acceptance.

**Dependencies/approvals:** Exact pricing tests, fulfilment acceptance and permanent webhook/worker host.

**Exact evidence:** [SUBSCRIPTION-RENEWAL-STOP-20261023.md](SUBSCRIPTION-RENEWAL-STOP-20261023.md), [SUBSCRIPTION-NATIVE-QA-20261022.md](SUBSCRIPTION-NATIVE-QA-20261022.md), [CORE-BUNDLE-FULFILLMENT-AUDIT-20261021.md](CORE-BUNDLE-FULFILLMENT-AUDIT-20261021.md). Private raw provider/native receipts remain local and are excluded from the public backup.

**Remaining work:** Verify a paid renewal routes to the same correct customer/contract with no fabricated historical mappings; prove retry/recovery and mixed-stream isolation.

Fresh pricing observations are recorded in [SUBSCRIPTION-PRICING-ACCEPTANCE-20261023.md](SUBSCRIPTION-PRICING-ACCEPTANCE-20261023.md). Seven new tests cover explicit corrected payments and renewals; actual corrected native payment acceptance remains outstanding.

## Pricing acceptance sequence

1. Fresh unpaid checkout comparison for both exact approved totals, with discounts, GST and included delivery separately recorded. Do not silently accept zero-tax evidence as a nonzero-GST test.
2. Verify that the exact correction is preserved on the actual checkout-created contract without replacing unrelated state. Saved standalone contracts do not prove this.
3. Obtain specific approval before any new initial purchase, renewal attempt or contract edit. Use only test mode and user handoff where required.
4. Compare expected and actual first/renewal paid amounts and preserve original paid fulfilment IDs, quantities, dates, statuses and financial snapshots.
5. Keep FAIL/held activation until all acceptance gaps are closed; retain exact merchant catalogue prices.
