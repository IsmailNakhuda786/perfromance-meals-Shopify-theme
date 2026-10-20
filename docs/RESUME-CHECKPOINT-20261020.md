# Performance Meals checkpoint — 20 October 2026

Resumed existing branch from5a0be61. Preexisting unrelated edits remain untouched.
No import/restart of the project, publication, provider activation or production
change. Wallet top-ups/general Rewards/automatic cancellation remain disabled.

## Paid Ready Series delivery-draft integration

New read-only payment proof binds original test order/customer/line/product/variant/
selling plan to an approved server-held upfront value. Native captured SALE/CAPTURE
receipts must sum exactly, with duplicate receipts excluded by rejection; successful
authorizations and failed attempts are not counted as money received. Missing,
pending, manual-gateway, reversed, edited, disputed, cancelled, truncated, refunded,
non-SGD or non-test evidence holds. Payment timestamps require an explicit timezone.
Current development coverage is prepaid-only, one package, no discount/delivery
surcharge. Mixed/discounted package acceptance remains unverified, not forbidden
by a new business policy. No amount is taken from browser fields.

Contract verification now includes the currently installed app and strict complete
line pagination. The combined read boundary also requires ACTIVE status, one exact
contract line, approved price, monthly delivery and3-/6-calendar-month automatic
billing with no fixed cap. It does not prove a future renewal or native schedule.

A default-off internal orchestration joins this proof to complete fresh dispatch
history and the existing exact linked operational line. It prepares all3or6monthly
DRAFT deliveries, their inactive reminders, late-confirmation catch-up and one audit
record in a single transaction. Partial preexisting drafts cause rollback. Original
line locking serializes retries. Replays retain the initial reminder time; changed
snapshot/reminder evidence or later schedule revisions hold without resetting them.
No native fulfillment, entitlement, contract, charge, booking, email or WhatsApp is
created. Server-supplied explicit merchant dates/times remain mandatory. Slot
capacity, automatic earliest-slot selection, final native scheduling and sending
remain separate gates. No customer-facing endpoint or scheduler was activated.

The new READY_SERIES_PAID_DRAFTS_ENABLED flag remains unset/off in the running app;
production execution is also refused. No schema/client/migration change required.
The audit is customer-key scoped, using the existing privacy inventory path.

## Verification

-339isolated Core tests pass; typecheck/lint/production-schema alignment pass.
-6new term-orchestration tests passed against development PostgreSQL, with scoped
 fixture cleanup. Three updated replay/concurrency/corruption cases also pass
 against PostgreSQL after final hardening; these are controlled service fixtures.
-Official2026-10 payment query rev2 and contract query rev2 validate.
-One existing development order was read with the new payment query: native fields
 include manual gateway classification, complete line evidence and zero subscription
 lines. This proves query execution only, not a successful native prepaid purchase.
-No native mutation or balance change. Private native readback stays in.shopify.

## Shopify Support

User approved asking Singapore-specific development subscription setup guidance.
Question submitted through Help Center and advisor queue on20October. No credentials
or customer details shared, and no provider setup/terms/payment change authorized.
The Help Center assistant confirms the test-gateway incompatibility but does not
confirm Singapore placeholder onboarding or a no-charge alternative. Human technical
advice remains pending. Do not recommend a paid plan or invent identity/bank values.

Next: finish supported native paid-term/slot/schedule acceptance and sender activation
checks. Continue independent remaining requirements while provider guidance is pending.


## Native prepaid schedule follow-up

Approved development-only merchant-managed and third-party fulfillment read scopes
are granted and verified by native readback. The read-only schedule reader requires
complete visible pages, matching app/customer/order/line identity, uncancelled test
orders and intact quantities. It refuses processed, ambiguous or hidden work.
Shopify expands a prepaid contract unit into 3/6 original-order units; each delivery
contains one unit. Contract linking now uses the exact native policy ratio rather
than equating contract and order quantities. Cross-interval approximations are held.
The contract price is per delivery: full upfront payment is independently proven by
original order totals and successful non-manual receipts. Renewal price acceptance
remains unverified. Native fulfillAt is work-start evidence, not proof of the selected
customer time slot. Paid draft preparation now requires matching native scheduled
work, remains inactive/DRAFT, and explicitly reports time-slot verification false.

Final checks:339 isolated Core tests pass, typecheck/lint pass;13 focused orchestration
and contract-link tests pass against development PostgreSQL with scoped cleanup.
The schedule query validates against2026-10 and executes on one existing one-time
order with complete visible coverage. That is query/read-access proof only; no actual
positive native prepaid checkout or renewal acceptance is claimed. No financial
mutation, delivery dispatch or customer message occurred.

The existing development preview is resumed. Only the two approved read scopes were
added. Private receipts and connection helpers remain excluded from Git. Top-ups and
paid-draft activation remain off. Shopify advisor Neeraj is consulting Developer
Support for the Singapore-specific test onboarding path; no provider setup approved.

All four current development callbacks were independently read back once each at
the refreshed preview URL, including subscription creation; no duplicate callbacks.


## Sender preparation and positive dispatch readback

Development-only Ready Series email adapter now prepares the approved72-hour,
24-hour and immediate messages using the validated delivery window/account/support
content. It is recipient/customer/store scoped, refuses past or invalid windows,
rechecks disabled production scope at send time and requires a stable provider
idempotency key plus confirmed provider receipt. No caller consumes DRAFT rows;
no environment activation, email, WhatsApp or real provider request occurred.
Three provider-mocked tests cover these boundaries. Full342Core tests/typecheck/lint
pass. Native slot/booking proof, durable send/recovery and actual sender QA remain.

Read-only native dispatch QA examined7existing routed development orders: all7
histories complete, one has SUCCESS dispatch evidence. No native or Core record
was changed. This verifies a positive native reader case, not mutation/lifecycle
or recurrence acceptance. Private evidence is excluded from the public backup.

Shopify transferred the Singapore test setup question to specialist Logan after
Neeraj consulted Developer Support. Written Singapore-specific guidance remains
pending; no onboarding or provider activation authorized.


## Customer account regression and dispatch replay

Fresh approved customer-account development preview loads all seven sections.
My Plan shows both saved60-day programmes and all three menu blocks, including
prior customer edits; no edit/save action performed. Wallet shows its expected
SGD0balance and preserved history. Rewards shows222current/232lifetime points and
prior earning/redemption history with general activation unavailable. Order history
shows Support review actions and the historical confirmed cancellation. Gift Card
claim activation remains unavailable. Settings points to the native profile.
No purchase, redemption, claim, Support submission or account change performed.

Corrected obsolete Gift Card account instructions to describe named-recipient full
Wallet claiming with retained original card expiry; served copy independently
verified in the preview. This wording is not proof of native checkout recipient
restriction or automated issuance acceptance. Extension Toolkit validation remains
unavailable due to its missing bundled TypeScript dependency, not counted as passed.
Existing development extension compilation/served rendering and Core build pass.

A second native read of the already-dispatched routed order plus two Core dispatch
sync calls preserves DISPATCHED with zero new audit rows and zero duplicate audit
rows; it was already recorded. No native/financial mutation. This verifies actual
native replay behavior, not a new dispatch creation or renewal lifecycle.

Latest sanitized backup before this note:5bbc4062c6bf22cf54ac5171e6891e2bae46a13d,
817files/814manifest hashes verified with zero mismatches, including168Theme files.
Support specialist Logan remains reviewing; requested written case/follow-up route.
