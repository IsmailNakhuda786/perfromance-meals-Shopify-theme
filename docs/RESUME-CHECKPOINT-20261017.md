# Resume checkpoint — 17 October 2026

Resumed from1facc88. Preserve original workspace/branch and unrelated changes. User confirmed Jerome's Option B28-day Ready Series schedule and retaining original Gift Card expiry. See MERCHANT-RULES-20261017.md for authoritative replacement rules; earlier pending calendar/fresh-year notes are superseded.

Added pure ready-series-calendar service and tests: selected first date plus28-day nominal anchors; next supplied available date for closures without cascading drift; incomplete availability holds rather than invents dates; notice checks both timestamps; four reminder plans per delivery at72/24hours through email/WhatsApp. No actual calendar bookings, contracts, charges, messages or entitlements changed.

Added giftCardClaimTerm calculation preserving original expiry through Singapore end-of-day, with calendar-month reminder and invalid/expired evidence tests. NEXT: durable original-expiry snapshot before Gift Card debit; bind that snapshot to claim recovery, Wallet expiry registration and reminder/debit reconciliation. Do not assign historical balances a new expiry or claim this integration is complete.

Removed the bundle cart per-meal figure. NEXT: dynamic savings from native component quantities and complete individual prices, then remaining local package display changes. Keep unsupported/incomplete savings hidden.

Continue native mixed-cart shipping from the existing isolated approved fixtures. Both Shipy QA rules remain inactive; no new native changes this run. Top-ups remain disabled. GST remains unverified. Existing Core preview was502 at the prior inspection and may need its preserved development process resumed; never reset auth/workspace or publish.

Verification:206Core tests,48Theme-tool tests, backend typecheck/lint and local Theme Check97Liquid files all pass. Toolkit Liquid validator cannot load its bundled theme-check dependency; local repository Theme Check is the actual successful check. No Toolkit success is claimed.


## Verified follow-up: original Gift Card expiry and bundle savings

New claims now save `giftCardExpiresOn` before native debit. Missing or changed expiry holds before transfer; ambiguous financial outcomes remain held without automatic retries. Completed historical claims replay without changing their dates. Registration, reminder validation and expiry-debit receipt validation share the original claim-expiry resolver; missing historical snapshots require reconciliation, never a fresh year.

Additive migration `20261017110000_gift_claim_original_expiry` exists for SQLite and PostgreSQL. Applied only to the isolated local SQLite fixture in this run. **Not applied to development PostgreSQL or production.** Apply with preserved-data verification before running the updated app against that database. No native balances changed.

Bundle cards calculate savings from every current component variant price and quantity. Missing/zero component prices hide savings. Bundle selection/cart price-per-meal text is removed. Catalogue stays Admin-editable; no catalogue price changes.

Verification:209Core tests,49Theme-tool tests, backend typecheck/lint, schema alignment and local Theme Check pass. Four reminder plans per delivery are confirmed (email and WhatsApp at72/24hours). Durable delivery/reminder outbox integration and sender activation remain pending; no messages sent.


## Verified follow-up: durable inactive delivery reminders

`stageReadyDeliveryReminders` binds a draft occurrence to the correct customer and validated, linked Ready Series operational line. It atomically persists four DRAFT reminders per revision (email/WhatsApp at72/24hours). A date change supersedes all four old drafts, preserves history and leaves other occurrences unchanged. Stale/concurrent requests cannot duplicate the active draft revision; missing or uncertain reminder records hold for review. Dispatched/cancelled/unlinked/wrong-customer lines cannot create drafts. Long closures that would merge two nominal deliveries hold for Support rather than silently collapse entitlements.

No customer route, confirmed booking, capacity reservation, sender or active worker exists for these drafts. Payment/term/slot/current fulfilment verification remains required before activation. WhatsApp provider details are pending Jerome; user is asking him. No messages sent and no connection/purchase authorized by this change.

Additive `20261017120000_ready_delivery_reminder_draft` is applied only to the isolated SQLite fixture; development PostgreSQL remains untouched.215Core tests, typecheck/lint and schema alignment pass. Continue GST/mixed-cart shipping verification and native delivery integration without deploying or enabling top-ups.


##17October order-level discount failure — rule not accepted

The isolated direct-comparison rule was temporarily reactivated for the approved unpaid draft QA. A native order-level fixed discount of SGD30 on food priced SGD100 yielded an authoritative draft subtotal of SGD70. Checkout nevertheless offered only SGD5 delivery and total SGD75. Policy requires SGD10 delivery and total SGD80. This differs from the earlier passing line-item-discount case; those results must not be generalized to order-level discounts.

No order was completed, invoice email sent, payment entered, Wallet value moved, catalogue price changed or production accessed. The test rule was deactivated after the failure; final dashboard readback is the cleanup authority. Both QA drafts remain unpaid. The current absence/collection-total implementation is not accepted for production; the shipping-verification flag remains off. Need a supported after-order-discount ordinary-food subtotal mechanism, then all boundary/mixed/split-group/resumed-checkout cases must pass.


## Verified follow-up: native verifier, development migrations and local copy

The legacy consecutive-calendar-month fulfilment verifier is replaced with explicit approved-date comparison under `verifyReadySeriesFulfillments`. Native records must match the correct original order/line, delivery count, quantities, valid Singapore dates and acceptable status. A one-off closure adjustment is accepted only when explicitly present in the verified expected calendar. Contract auditing now distinguishes confirmed28-day delivery policy (4WEEK/28DAY) from3/6MONTH billing; overall acceptance stays false until actual payment/fulfilment/renewal evidence passes.

All23SQLite migrations apply successfully to an empty isolated fixture;216Core tests pass on that fresh database.50Theme-tool tests pass, typecheck/lint and Theme Check pass. The Toolkit Liquid validator remains unavailable due to its bundled dependency issue.

The two new additive PostgreSQL migrations were applied to the existing development database through the preserved-data guard. Existing selection/draft/operational/ledger/claim/Rewards counts, Wallet/Rewards totals and activation flags match before/after. New delivery/reminder tables are empty; historical Gift Card expiry snapshots remain null. No financial operation, notification or deployment occurred. This supersedes the earlier local-fixture-only migration status above.

Local Ready Series editorial/default/template copy now explains28-day deliveries and independent3/6-calendar-month renewal billing, without a fixed catalogue-count claim. Local fixture preview runs at localhost:4173; no theme push or publication. Delivery rule cleanup verified:bothShipy rules inactive,0active. Order-level discount QA remains a documented failure. User is asking Jerome about WhatsApp sender setup. Technical-support contact permission forShipy's discount failure is pending.


## Verified follow-up: read-only delivery audit and order binding

Added `inspectNativeDeliveryCharge`: reads authoritative all-discount, before-tax line totals plus native tax lines, classifies native products, excludes prepaid/GiftCard/configuredtop-up values from ordinary-food qualification and reconciles the full order total before comparing delivery fees. It never changes an order, places an order, credits/debits money or grants checkout acceptance. Official2026-10GraphQL validation passes. The existing approved mixed-payment test order readsSGD25.80eligiblefood/SGD10expected/SGD10observed and matches, with0financialwrites. The separate unpaid order-discount failure remains unresolved.

Core's Meal Plan order-binding update now claims an unchanged REVIEWED selection atomically; competing checkout lines cannot overwrite its original order binding. A concurrent-checkout regression proves one validated line/one quarantined line. Paid menu edits now check store allowlist, successful native response, exact original order and original operational product/variant binding. These are evidence/ownership safeguards, not new business rules.

222Core tests pass;50Theme-tool tests, typecheck/lint and GraphQL schema checks pass. Theme-tools' separate prepaid policy auditor now also expects4WEEK/28DAYdelivery and3/6MONTHbilling; no policy auditor grants native acceptance. Legacy untracked catalogue staging scripts are preserved and were not run; the old prototype-based source must not overwrite merchant-approved catalogue/delivery data. No publication, deployment, tax/payment setting change or Wallet top-up activation.


## Verified follow-up: reminder content and Meal Plan calendar context

Pure delivery-notice content now supports both72/24-hour reminders with exact Singapore date/time window, configurable change-notice copy, original delivery reference and separate renewal-billing explanation. Unsafe/foreign account URLs, invalid times, header/HTML injection and unsupported phases are rejected. WhatsApp output is template variables only and explicitly requires provider/template approval; no sender or message is activated.

Meal Plan catalogue reads now verify the native store, and draft/review entry points enforce the store/customer context before persistence. Selected published weeks must startMonday, be valid/consecutive weeks, and contain unique bounded delivery windows; duplicate numeric/GID aliases for one selected meal are rejected. These enforce confirmed policy/configuration integrity, without changing saved paid records.

Read-only development evidence:9published relevant menu weeks,0non-Monday starts. Both existing saved paid programmes pass the strengthened original-store/order/product/variant ownership checks (2verified/0held), with0financialwrites.227Core tests pass on the isolated fixture;typecheck/lint and updated GraphQL validation pass. No native catalogue/menu changes, publications, notifications or top-up activation occurred.

## Latest consolidated email approval — monthly calendar supersedes 28 days

User supplied the full sent/replied email chain and explicitly approved resuming
with the consolidated interpretation: next earliest available first delivery;
subsequent fixed monthly day; short months clamp to last date, unavailable days
move forward to merchant availability, later dates retain original anchor.
This supersedes the earlier28-day implementation and historical notes above.
Three/six calendar-month billing remains independent. No native selling plan,
contract, historical draft, payment setting or published theme was changed.

Updated pure Core calendar and native-readback expectations, Theme billing intent
and local customer copy. Added earliest-future-slot choice using merchant-provided
bookable slots and Singapore dates; this is not a capacity reservation. Existing
calendar records require explicit review before activation; no public booking route
or reminder sender has been enabled. All4reminders remain72/24hours × email/WhatsApp.
Gift Card retained original expiry remains unchanged.

Verification:229Core tests pass with the isolated SQLite fixture; typecheck/lint
pass.50Theme-tool tests pass. Local ThemeCheck167files/98Liquid checks passes.
Toolkit Liquid validation remains unavailable (missing bundled dependency), not
counted as passed. Native subscription acceptance remains outstanding.

Approved Shipy technical support email sent to qa@example.invalid via Gmail;
SENT receipt recorded. Only generic delivery-tier/order-discount reproduction and
mixed-cart requirements were shared; no customer records, credentials or access.
Question:100food−30orderdiscount must qualify for10delivery, but Collection Total
offers5. Both isolated QA rules remain inactive; no new checkout/order was placed.

Fresh old account-page reload failed; current development preview console is
connected and shows an extension preview link. Fresh account readback is being
rechecked; do not count historical loaded page as current verification.


### Fresh preview and final verified handoff

Opened the currently connected Core Dev Console extension link (rather than the
stale saved account-page URL). Fresh account preview loaded correctly. Read-only
My Plan verification shows both preserved60-day programmes/menus. Rewards readback
222balance/232lifetime with prior earning/redemption history; Wallet dashboard0
with historical receipts. No redemption, credit, cancellation or order action.
Local Ready Series page now displaysMonthly delivery schedule; remaining28-day
stat label corrected and regression-covered. Screenshots saved in private/tmp.

Final tests:230Core pass;50Theme-tool pass; typecheck/lint pass; localThemeCheck
167files/98Liquidchecks passes. Added integrated earliest-slot→monthly-clamp→
closure-adjustment→four-reminder/notice test. No new migration or native financial
mutation. Top-ups and general Rewards activation remain off.

Shipy support contact sent and no reply found on current check. Do not reactivate
shipping QA rules or claim mixed-cart/order-discount enforcement acceptance.
Next: verify native GST-inclusive checkout under approved dev configuration,
resolve Shipy post-order-discount basis, then integrate calendar only against
verified paid term/slots/fulfilment. WhatsApp provider details pending Jerome.
Preserve existing unrelated modified/untracked files and original branch.

### Usage pause — 5% remaining

95% of five-hour allowance used; paused by explicit user instruction. Final
maintenance action reconnected existing approved development event listeners to
the current preview. Fresh Admin loader now readsOrder events:Connected and
registration checked. This proves required threeorder callbacks readback; no new
order, reconciliation batch, Wallet movement or contract created. Contract-create
listener is registered by the same existing SDK configuration but its separate
fresh readback remains for next run. Screenshot private/tmp/pm-core-event-reconnection-20261017.png.
Current saved implementation checkpoints8b9a6f9 andc6c1d7e; preserve unrelated
pre-existing modifications/untracked files. Resume independent GST/shipping/native
calendar acceptance from here, without restarting project or re-asking settled rules.


## Refreshed run — Core-first checkout research and safe independent code

Resumed fromb0693c5; original unrelated modified/untracked files preserved. User
approved Approach2/Core-owned Wallet investigation and reusable first-party Core
rather than production app subscriptions. No merchant policy changes.

Added official-schema-validated offline delivery input and Core decision adapter.
Allocations must reconcile to native totals; unknown tax basis/multipleordinary
shippinggroups/conflicting evidence stays held without checkout operations.
Added pure Core Wallet redemption draft/state machine (not database reservation or
provider), strict timestamps/amount bounds and unknown-outcome/receipt safeguards.
247Core tests pass, typecheck/lint pass. No native mutations, scopes, migrations,
provider activation, financial QA, deployment or theme publication.

Research limitation: redeemables is documented invite-only/Plus-only; payments app
cannot use other Shopify APIs or require an additional app, and payment callbacks
lack line/order/checkout data. Need Shopify technical eligibility and final-cart
binding answer before adopting a payment connector. No payment application or
agreement submitted. SeeCORE-FIRST-WALLET-INVESTIGATION-20261017.md. Top-ups off.


### Approved inclusive-price configuration

User approved exact development-only inclusive-price checkbox. Saved in Shopify;
fresh API readbacktaxesIncluded=true/SGD/AsiaSingapore. No GST registration, shipping
tax checkbox or other tax/payment setting changed. Admin stillNotcollecting/0%.
Four native calculation-only unpublished taxable variant cases preserve current
11.90/109.80/255.20/267.10 totals,zeroGST. No draft/order/invoice created. See
GST-INCLUSIVE-DEVELOPMENT-QA-20261017.md. NonzeroGST/shipping-tax/checkout proof pending.

Fresh Shopify Support inbox recap fromCardy says combined Wallet technical review
has NOT been completed and no documented solution/workaround confirmed. Do not
represent this as a completed technical rejection or approval. Existing case has
no reply box; corresponding email not found in connected Gmail. No follow-up sent.

### Read-only reference and native event verification

User'sFigmaOS2ZIP studied only; no current Theme source changed/imported.26files
pass localThemeCheck, JSON and JSsyntax. Reference has older plan/Rewards rules and
no Core persistence; useful responsive summary/auto-fill presentation recorded in
FIGMA-THEME-REFERENCE-REVIEW-20261017.md. Archive unchanged.

Fresh native current-origin readback independently confirms exactlyonecallback each
forORDERS_CREATE,ORDERS_UPDATED,ORDERS_PAID,SUBSCRIPTION_CONTRACTS_CREATE. No mutation,
reconciliation batch, order or contract. This closes the previous pending fourth
listener readback, not actual subscription lifecycle acceptance.

Usage five-hour29%used/weekly96%used. User explicitly approved continuing remaining
weekly allowance; retain five-hour95%used pause. No use of available reset credit.
