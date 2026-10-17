# 16 October continuation

Existing branch/workspace preserved. Five-hour usage starts at 0% used; pause at95% used as requested. User requires plain-language business questions with practical examples and consequences.

User reconfirmed exact Wallet source priority, rejecting native earliest-expiry-first. BoomGate vendor limitation is recorded in WALLET-MERCHANT-RULES-20261015.md. No Store Credit migration or new financial QA performed. Top-ups remain disabled.

Gift Card claim safety: reject malformed/missing expiry evidence and non-boolean enabled status before financial actions. Check Singapore date again after asynchronous readiness work. Focused isolated tests verify expiry-day/leap-day boundaries, no claim/financial calls for invalid evidence, full remaining-value transfer, concurrent single transfer, and receipt-backed ledger recovery without repeating money movement. These are fixture tests, not fresh Shopify transfers.

Prior unrelated modified/untracked files preserved. No publication, deployment, provider changes or production access.

## Unclaimed Gift Card reminder implementation

Added GiftCardExpiryReminder metadata/outbox, read-only native registration, fresh named-recipient/expiry/balance checks, single-send claim, permanent UNKNOWN hold, receipt completion, and bounded keyset batch continuation. No card codes/email addresses in the registry. Default-off GIFT_CARD_EXPIRY_REMINDERS_ENABLED; production preflight rejects activation. No sender route/scheduler installed and no email sent. Native card edits/Wallet transfers are not performed by these services.

Additive SQLite/PostgreSQL migration20261016090000_gift_card_reminders prepared; all19SQLite migrations applied successfully from empty to /private/tmp/pm-gift-reminder-20261016.sqlite. Existing older fixture had no migration baseline; its deploy was refused before changes. New-table focused tests then pass on the fresh fixture. Development PostgreSQL was NOT migrated this continuation. Before connecting these services to the running app, apply reviewed additive migration in the approved development database and verify preserved counts.

User rejects blocking all checkout when Wallet expiry is overdue: preserve card checkout. This and retained exact source priority rule out the two proposed fallbacks; top-ups stay disabled while supported alternatives are investigated. Do not repeat either rejected business proposal.

## Payment-time Rewards rate history

User confirmed normal rates follow completed-payment time, including delayed processing. Added immutable RewardRuleActivation history, monotonic configuration changes, and payment-time selection of an immutable approved rate version. Current QA/enablement gates still apply. Orders predating known activation history hold for review; no historical rate is invented or automatically backfilled. Previously earned events retain their original version and cannot duplicate.

Rewards timestamps require explicit timezones and actual calendar dates; impossible dates/local-time strings are rejected in promotion configuration and native successful-payment evidence. Tests cover Singapore offset equivalence, leap days, exact activation boundary, delayed old-rate earning, reactivation of an earlier version, unknown history, immutability and current QA scope. Receipt-backed redemption recovery/concurrency regressions still pass.

176 isolated Core tests pass. Typecheck, lint and production-schema alignment pass. All20SQLite migrations apply from empty; schema diff reports no difference. PostgreSQL DDL prepared but not applied to development DB. Existing development policies, balances and points unchanged. No financial QA or email repeated; no deployment/publication/settings change. Direct backend build checked separately from unavailable account-preview configuration.

## 60-day entitlement snapshot and development migration

New reviewed60-day purchases preserve an immutable entitlement snapshot in MealPlanSelection:44weekdays ×2=88weekday meals,32frozen meals,120total,60inclusive days, no renewal. Both programmes use this confirmed entitlement. Frozen dispatch stays menu/merchant-arranged; no dates/batch sizes invented. Snapshot is included in the review hash and remains unchanged during later menu revisions. Stream schema stays1. Legacy rows remain null and are not automatically backfilled. Account API/UI displays only a valid preserved snapshot matching the saved period.

178isolated Core tests pass, typecheck/lint/backend build pass, and local account bundle passes.21SQLite migrations reconstruct from empty with no drift. Toolkit component validation is unavailable because its bundled TypeScript dependency is missing; do not claim its validation passed.

The three reviewed additive migrations (Gift Card reminders, rate history, nullable programme entitlement) have NOW been applied to the verified development PostgreSQL database. Guarded before/after checks prove saved-plan/draft/operational/order-audit counts, Wallet/claim/history/Rewards records, balances and feature settings preserved. New reminder/history tables are empty. No financial changes, customer emails or historical entitlement/rate backfill. Private verification under Core .shopify/migrations-*-20261016.private.*.

Initial sandbox connection failed; escalated connectivity worked. A private precheck query incorrectly used CommercePolicy.id and stopped before migration; corrected to shop and reran successfully using the verified direct connection to the same database. Earlier P2037 classifier matched bundled source text, not the actual error; it is not evidence of pool saturation. All diagnostics kept private.

Core preview restart again reached a Shopify internal error; no app release or theme publish. Existing account tab was cached and is being refreshed for current browser verification. Do not report preview restored from the cached screen.

## Shipping boundaries and mixed carts

User confirmed inclusive75/125boundaries and separate ordinary-food delivery qualification when a prepaid package is in the cart. Implemented pure Core policy and guarded Theme delivery progress, with ordinary subtotal excluding delivery-included packages/Gift Cards/topups. Native checkout integration is NOT accepted: standard price-based Shopify rates use whole-cart value. New Theme promise switch defaultsfalse until native policy QA passes. See DELIVERY-POLICY-20261016.md.37Theme tests and97-file Theme Check pass. No shipping/profile/provider settings changed.

## Merchant setup regression guard

User confirmed Ready Series monthly-versus-28-day calendar stays pending Jerome. Corrected legacy setup inventory/generator: both 60-day programmes are upfront/non-renewing with 120-meal entitlement; recurring Meal Plans retain their cadences; current Fresher option names replace obsolete prototype options. Merchant catalogue is explicitly authoritative over historical Ready Series arrays. Optional review-output path avoids replacing the full inventory. Generated only targeted billing sections in the checked-in JSON, preserving unrelated historical sections. Regression test checks generated and checked-in billing policy match. No catalogue import, native mutations or calendar implementation.

Core full suite:181 tests pass. Five-hour usage last checked61% used/39%remaining; continue monitoring and pause at95%used.

## Continued after premature checkpoint stop

Corrected Core's old prepaid-contract inspector which still required a finite non-renewing term. It now verifies automatic term renewal with no fixed cycle cap and rejects instalments, finite caps and missing cap evidence. Overall configuration cannot be accepted while Jerome's delivery calendar remains pending; observed delivery evidence is preserved without choosing monthly or28days.182Core tests pass; typecheck passes. No native contract changed.

Fresh preview restart: sandbox DNS failed; authorized network retry again reports Shopify Internal error. No reset, release or payment change. Browser acceptance remains open. Current five-hour usage69%used/31%remaining.

## Catalogue and routing continuation

Added guarded local merchant component review with exact quantities/prices/source evidence, explicit native bindings, no similarity substitutions, pagination checks and no activation claim.42Theme-tool tests pass. Existing historical native snapshot leaves28dishes unresolved; no product was created or overwritten.

Order routing now checks allowed store/requested identity/HTTP status/full pagination/real UTC creation date/positive quantities/unique native lines before any database mutation. Duplicate customer properties quarantine rather than bind a paid selection. Isolated failure cases prove no operational records or webhook receipts, and replay creates no duplicate. No native webhook or financial QA was triggered.

## Native merchant staging — completed safe draft step

Fresh Core SDK native read succeeds after a process-only localhost app URL was supplied for SDK initialization. No saved app URL/config changed. Separate store CLI has no saved app authentication; do not reset/re-auth unnecessarily. Dev preview still fails Shopify Internal error.

49new native merchant records verified as DRAFT:28dishes,13bundles,8prepaid configurations. Exact bundle/3-/6-month package prices and readable quantities/inclusions staged, with individual price/media/nutrition unresolved. All58original products field-preserved; total107products. No publication, native selling plans, contracts, payment/provider/shipping changes or financial action. See MERCHANT-DRAFT-STAGING-20261016.md and private ignored receipts. Do not rerun creation blindly.

User approved contacting Shopify Support with the prepared Wallet technical brief. Official Help Center opened under Performance Meals Development and human chat requested. Submission/human response is not yet verified; preserve this distinction until chat evidence is captured.

## PAUSED —5% remaining

Exact usage reading:95%used/5%remaining in300minute window. Pause requested by user; resume only on user instruction/refreshed allowance.

Native draft component assembly review now maps all28exact merchant dish names/variant receipts into21package content records, preserving quantities. Explicit draftReview mode accepts only managed draft products with exact source titles, and cannot activate purchases; ordinary mapping still rejects drafts. Five focused catalogue tests pass (full Theme suite previously42passed before this additional test). No native component metaobject writes yet. Component review private receipt: work/merchant-drafts-20261016/component-assembly-review.json. Native8subscription term-to-price mapping independently verified, only3/6months.

Shopify Support: user explicitly approved contact. Brief was submitted in official Help Center under Performance Meals Development. Chat is WAITING IN QUEUE for a human/technical advisor; initial automated response confirms combination is unverified and avoids recommending Plus without proof. No human resolution/ticket yet. Browser3/tab9 marked for handoff, screenshot at Core .shopify/evidence/wallet-support-submitted-20261016.jpg. Do not claim human escalation completed or abandon the chat silently. New communication contains technical requirements only, no customer/balance/credential data. Source: docs/WALLET-PLATFORM-SUPPORT-BRIEF-20261016.md.

Next: preserve/read Support reply; request documented solution or precise limitation. Continue approved merchant component wiring/media/individual pricing evidence, then remaining tracker acceptance. New drafts stay unpublished. Topups stay disabled. Calendar remains pending Jerome. Original unrelated local changes remain preserved. CurrentCore184tests/typecheck/lint pass; no further financial QA executed.

## Resumed after refreshed limit

User approved write_metaobjects and then read_metaobject_definitions for development only. Both are in Core config and verified native scopes; app config validates. Existing bundle definition and product/variant reference definitions were read and preserved. The development preview is now Ready, and a fresh Dev Console account preview link renders the account/Wallet correctly. The old standalone URL failed until the current development bootstrap link was opened. Do not claim the old failure persists as a platform blocker.

All21managed draft packages now have exact native component references:47component records reused/verified and50product/variant attachments independently read back. Early preparation created components; execution was stopped before reference attachment to strengthen variant prior-value/pagination readback. Resume re-read and reused all47, so no duplicate entries were created. All previous component objects and unrelated products were field-preserved. Draft status, exact prices, term mappings and classification unchanged. No publication, financial transactions or shipping/provider changes.45Theme-tool tests pass, including guarded draft assembly plans.

Support: old chat closed as unresolved; actual ticket71105866 (Support Inbox14293620). Closing recap confirms no technical review/workaround was completed. The only email is a no-reply transcript notification, so do not email that address. New live advisor Ana is reviewing the existing case; confirmed request is written technical escalation + monitored reply route, including source priority, food-only bonus and expired applied credit/card checkout. Browser3/tab4 live. Keep responding while working; do not leave it unattended through a pause. No resolution or escalation reference yet.

## Editable prices and nutrition source preservation

User clarified catalogue is dynamic, not worth blocking on initial aliases.23exact Fresher price matches are now saved to the managed dish DRAFTs and independently read back;84other products and target non-price fields preserved. No publication. Five unmatched prices/photos stay editable pending drafts. Public source manifest and guarded/replay-safe planner/tests added.47Theme tests and184Core tests pass. Private native script .shopify/stage-individual-prices-20261016.private.mjs and work/merchant-drafts-20261016/individual-price-*.json. Initial sandbox DB connection failed before writes; escalated network run completed successfully.

28nutrition labels visually transcribed into source-only evidence with original deck/image hashes; less-than values retained as strings. No serving basis/weight/servings claims imported/published. Real photo review in progress from fresh public Fresher exact-name product associations.

Browser support tab4no longer exists; saved inbox14293620contains only previous unresolved Cardy case71105866. No new written technical answer is visible. Do not claim Ana escalation completed.

### Further verified catalogue and connection work

23source-associated real product photos visually reviewed, attached to exact managed draft owners, and independently verified native media READY. No existing photo overwritten; receipt-before-write prevents blind replay of an uncertain attachment. All products remain DRAFT. Public source/hash evidence: theme-tools/fresher-product-photos-20261016.json. Private receipts/readback: work/fresher-photos-20261016/{attachment-state,readback}.json.28nutrition label transcriptions remain source-only/unpublished.

Core connection reporting previously checked only ORDERS_CREATE. It now requires ORDERS_CREATE, ORDERS_UPDATED and ORDERS_PAID at the current HTTPS origin, complete native pagination and successful store-matching response. Missing/stale/duplicate events cannot claim Connected.186Core tests pass; GraphQL query validated from actual source after correcting an extra brace caught by the validator. Final typecheck/lint pass.

Support correction: reopening the known conversation URL restored Ana's still-live chat. She is reviewing documented behavior and written reply routing. No technical resolution/reference yet. New tab9marked for handoff; continue monitoring. Last usage58%used/42%remaining.

## Customer account linked-contract readback

Added read-only linked subscription status for validated operational records. Native current-app/customer/original-order/product/variant/line evidence is required; unknown, mismatched or truncated data displays a pending message rather than another customer's status or invented contract. No renewal/pause/cancellation/charge mutation is performed. Only mapped lines are returned; an empty linked set is not represented as proof the customer has no other subscriptions. UI directs management to Shopify's existing Subscriptions menu/Support.25-contract/100binding limits hold oversized history for future pagination rather than truncate silently.189Core tests pass, typecheck/lint pass and account bundle builds. Native GraphQL validation passes. Toolkit UI validator remains unavailable because its bundled TypeScript dependency is absent; this is not claimed as a pass. Actual contract-backed actions/payment acceptance remain incomplete.

Also tightened programme catalogue validation: failed nativeHTTP, wrong requested variant and missing pagination/availability evidence cannot establish a valid menu.187Core tests passed before the contract-read additions. No existing saved programme/Wallet data changed.

Current development order-event registration now independently confirms all3required callbacks at the current preview, and fresh Core UI shows Connected. Screenshot/private native receipt saved; no paid-order delivery was simulated or repeated. Support Ana still consulting specialist with no technical resolution/reference.71%five-hour usage used/29%remaining at last check.

Fresh development account browser readback passes: My Plan renders both existing60-day programmes/menus plus the verified empty linked-subscription state. No synthetic native contract is created and no legacy selection is backfilled. Private screenshot: .shopify/evidence/account-linked-subscriptions-20261016.jpg.189Core tests/typecheck/lint/account bundle pass. Contract fixtures cover renewal-order records without losing the original contract anchor. Merchant editing guide explains dynamic products/components/prices/nutrition and preservation of historical orders.

### Shopify Support native Wallet finding

Ana now explicitly confirms native Store Credit does not support custom source priority, choosing a credit lot through API, or food-only restrictions. Resumed-checkout final-submission expiry/card-only protection remains undocumented in her response. Requested Plus-specific evidence, a supported alternative and active case/monitored written reply route. No solution or Plus recommendation established. See WALLET-SUPPORT-FINDINGS-20261016.md. User rules remain unchanged; top-ups remain disabled.

Pending business clarification: mixed-rate Rewards rounding (SGD12.90at1point +12.90at2points: floor dollars separately per rate=36points, or calculate then floor finalpoints=38). Existing per-rate calculation is not newly activated while this answer is pending.

## Subscription origin linking and native tax readback

Read-only-native/transactional-local contract linking is implemented with SDK-authenticated subscription_contracts/create trigger. Native app/customer/original-order/product/variant/selling-plan/quantity evidence must match already validated operational records; Meal Plans must match the exact ORDERED saved selection. Replays retain the same records; conflicting mappings/ambiguous lines/missing rows stop, and a multi-line failure rolls back the whole link. Does not create/cancel/charge a contract or invent a delivery calendar.195Core tests/typecheck/lint pass. Native GraphQL and official webhook payload documentation checked.

The development subscription listener is registered at /webhooks/subscriptions/create alongside the3existing order listeners, independently verified by native subscription read. No real contract notification or native subscription checkout was generated; end-to-end acceptance remains open.

Read-only native GST check: Shop.taxesIncluded=false; all57merchant draft variants taxable=true. This does not prove the actual extra checkout tax amount, but cannot establish Jerome's inclusive-GST checkout requirement. See MERCHANT-GST-READINESS-20261016.md. No tax registration/setting changed.52reviewed base prices (23individual +29packagevariants) are verified; five individual placeholders remain unresolved.

Next native housekeeping: review remaining five draft aliases/prices/photos and remove only proven-complete staging tags when ready; tags were intentionally not wholesale rewritten. Nutrition source-only records remain hidden pending serving basis. Current75/125mixed-cart shipping enforcement and Ready Series calendar remain separate acceptance gaps.

### Final checkpoint checks

196Core tests now pass, including500deterministic mixed-funding samples verifying cent conservation, no source overspend, food-only bonus allocation, Gift Card food allocation and zero points from excluded credit. This uses one earning rate and does not decide the pending mixed-rate rounding question.48Theme-tool tests pass; latest backend typecheck/lint and account bundle passed. Local commits preserve unrelated pre-existing changes.

Ana's Plus reply does not document any upgrade unlocking the specific Wallet controls. No supported alternative/reference/monitored reply path yet. She was told a pause is imminent and asked to retain the unresolved technical request for written follow-up. Supporttab9, accounttab8, CoreAdmintab10 and SupportInboxtab5 marked for handoff. No financial test, payment/tax setting change, publication or production action performed.

## PAUSED at requested threshold — latest run

Exact five-hour reading:95%used/5%remaining. Stop work until user resumes/refreshed allowance. Latest implementation commit ecc5fbf. All unrelated original local changes preserved.

Resume: read Supporttab9for case/reference/alternative reply; the user still retains exact Wallet priority and card checkout. Mixed-rate Rewards rounding question is pending. Continue unblocked catalogue/checkout readiness, resolve GST configuration through authorised review, native mixed-cart shipping and remaining customer lifecycle acceptance. Do not repeat any financial QA or enable top-ups. Calendar stays pending Jerome.196Core tests/48Theme tests, backend typecheck/lint and account build verified; no full production acceptance.

## Resumed from88b5ec0 — refreshed allowance

Five-hour usage0%at resume. User confirmed mixed-rate Rewards ignore cents separately per rate (12.90at1 +12.90at2 =36points). Current implementation already matches. Preserve that rule; no general Rewards activation. Prioritise independent GST/mixed-cart shipping/Core acceptance. Keep Wallet top-ups disabled, calendar pending, no publication/provider/production changes.

### Resumed GST / mixed-cart calculation checkpoint

Native calculation-only comparisons verified the four staged base-price cases. Exclusive tax mode with zero tax remains unaccepted GST evidence. Historical SGD 5 delivery differs from policy in three of four cases; bundle fee is offered but no checkout acceptance claimed. See MERCHANT-GST-READINESS and DELIVERY-POLICY documents. Pure quote reviewer and explicit 36-point mixed-rate regression added; no settings, orders or payments changed. Wallet top-ups remain disabled; unresolved delivery cadence untouched.

Verification: 199 Core tests passed using isolated SQLite fixtures; typecheck and lint passed. Latest allowance check: 11% used. Unrelated existing files remain unstaged.

Additional Core verification: discounted multi-quantity food keeps native line totals intact and includes food GST exactly once in inclusive and exclusive modes. Focused native Rewards tests pass. No new financial test was performed. Shipping app research remains a candidate only, with no installation or paid commitment.

### Approved shipping-app inspection

User approved free development-store Shipy installation after exact permissions were shown. Installed in Performance Meals Development with no billing prompt; dashboard independently shows zero active rules and an empty rule list. Inspected unsaved collection-total tier editor and collection picker, then returned to dashboard without creating a rule. The editor offers Collection Total/Collection Does Not Contain Total and hide selected options. This is promising UI evidence, not proof of discounted subtotal or multi-group checkout correctness. Separate approval requested for an isolated three-draft-product shipping profile/rate/rule test; do not configure/activate until answered. No shipping rates, payment settings, products or order balances changed during inspection.

Full Core verification now passes 200 tests. Latest usage check:16% used (84% remaining), not a usage pause. Local checkpoint preserves prior unrelated files.

## Approved isolated native delivery QA — completed before allowance pause

User separately approved Shipy installation and isolated shipping configuration. The new QA profile (97149091924) contains only three unpublished merchant draft products; existing 76-product food profile was preserved. All three targets previously belonged to General profile96892485716. Singapore-only test options are PM QA Delivery — 0 /5 /10. Catalogue prices were not changed. Collection305535549524 contains only the two ordinary-food test products, not the prepaid product.

Two unpaid, unsent draft checkouts were created:1151851003988 (reused boundary fixture) and1151851036756 (mixed fixture). No order was completed, no invoice email sent, no payment/card entry or Wallet transfer occurred. Draft-only native price overrides exercised boundaries without changing products. One draft-only SGD30 line discount exercised after-discount qualification.

| Native draft checkout | Only offered QA fee | Result |
|---|---:|---|
| Food74.99 |10 |Pass |
| Food75.00 |5 |Pass |
| Food75.01 |5 |Pass |
| Food124.99 |5 |Pass |
| Food125.00 |0 |Pass |
| Food125.01 |0 |Pass |
| Prepaid255.20 only |0 |Pass |
| Prepaid255.20 +food11.90 |10 |Pass |
| Food100 less30 discount =70 |10 |Pass |

Shipy direct-comparison rule75497556 retained exact numeric values and uses five independent stackable hide conditions against the QA collection. Its absence test requires “Does not contains all”; “Does not contains” incorrectly matched a mixed cart and was corrected/tested. First tier-form experiment75432020 reloaded incorrect upper-range values; it was never activated. Do not reuse that faulty form as accepted enforcement.

Both rules are now INACTIVE. Fresh dashboard confirms0active customizations. The isolated QA profile/collection and two unpaid drafts remain for continuation, with private receipts/scripts under work/gst-shipping-qa-20261016 and Core .shopify. Original published products/profiles, payment settings, top-up activation and delivery-calendar policy were not changed. Screenshots are privately preserved under Core .shopify/evidence.

These passes establish the specified native draft-checkout fee cases only. Not yet accepted: split/multiple delivery groups, ordinary storefront checkout path, shared-commerce exclusions, order-level discounts, native selling-plan checkout and recurring shipping. GST remains exclusive/zero-tax in native calculations and is not accepted as an inclusive GST breakdown. Do not enable the Theme shipping-verification flag or claim tracker#5complete.
