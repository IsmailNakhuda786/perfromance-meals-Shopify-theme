# Resume checkpoint — 19 October 2026

Resumed from6fd7fa2; latest verified public backup93e3c33contains794files.
Approved temporary development GST check completed and original setting restored.
See GST-CHECKOUT-QA-20261019.md and tracker. No completed order or financial action.
Core shipping rule remains inactive; top-ups/general Rewards/cancellation off.
Existing unrelated modified/untracked files remain untouched.

Next independent requirement: combined GST/Function checkout evidence, then
remaining Core lifecycle verification. Customer-account check remains unverified
following the prior automatic review rejection; no bypass. Monthly Ready Series
rules follow latest consolidated Jerome approval, not historical28day notes.
Monitor five-hour allowance and pause at5%remaining; weekly pause at1%remaining.

Combined Core Function/nonzero GST4cases pass, including the original Shipy
order-discount failure. Correct single option shown for line/order discount70,
mixed75andmixed125. QA rule disabled and GST collection restored afterward.
Preserved preview reconnected at current development URL; native callback readback
must be refreshed before claiming order events connected. No released app version.

Current Core-controlled Rewards allocation now agrees with the approved Wallet
planner: principal covers delivery first, then food, followed by Gift Card, food-
only bonus and proportional Reward.500deterministic cross-engine samples verify
per-source food attribution/conservation. Historical native helper and posted
entries remain unchanged. No activation or points/credit mutation.279Core tests
passed, plus focused no-food bonus rejection added/passed (11focused tests total).
Typecheck/lint/schema alignment passed before the final small no-food guard.

Final full suite280tests passes; typecheck/lint/schema alignment pass. Public
backup95726a4independently fetched:796files,168Theme and252Core.
Four current callbacks independently verified exactly once. Policy flags remain
off for top-ups/general Rewards/automatic cancellation;10operational lines and
3ORDEREDprogrammes present. No financial action.

User approved temporary normal-storefront QA. Created three clearly named copies
of the draft QA catalogue references; originals untouched. Copy/source receipts
are private in .shopify/shipping-qa-copies-20261019.private.json. Copies ACTIVE
and Online Store-only, with ordinary test prices25/50; prepaid copiedprices.
Added copied variants to existing isolatedQAprofile (UI7variant/product entries).
Rule temporarily uses only3copyIDs; original disabled configuration saved in
.shopify/qa-copy-rule-original-20261019.private.json. Cleanup controller:
node .shopify/qa-copy-rule-20261019.private.mjs cleanup (restore original list/off),
node .shopify/update-shipping-qa-copies-20261019.private.mjs cleanup (DRAFT/original
copiedprices), then remove OnlineStorepublication and copiedprofilemembership
through observedUI. Never delete/reset original merchant products or touch profiles
for published products. Storefront password entry requested; nativecartQA pending.

## Final storefront cleanup — supersedes in-progress setup above

Four normal storefront native cases pass:75→5,125→0,25ordinary+255.20prepaid→10,
prepaid-only→0. Same native checkout recalculated on cart changes. No payment.
No normal coupon created or tested; that remains a next gate.
Original cart restored/read back exactly: two originals,61.89food subtotal.
Ruleoff and original3IDallowlist restored. CopiesDRAFTwith originalcopiedprices,
unpublished everywhere; copied profile entries removed, original3remain with
unchanged0/5/10rates. Three original merchant products independently verified
unchanged. GST remainsNotcollecting; taxcheckboxes untouched after approvedtest.
Private receipts/controllers stay in.shopify and /private/tmp. No need to repeat
completed financial actions. Full280Core tests/typecheck/lint/schemaalignmentpass.

Next: normal discount-code and combinedGSTstorefront checks; supported Wallet
provider architecture remains blocked by documented Shopify capabilities. Topups
stayoff. Accountbrowser regression remains blocked; no bypass/retry. WhatsApp
setup still withJerome. Permanenthosting and native subscriptionacceptance open.
Source review also identified older privacy-redaction hook missing newer reminder/
menu/credit records; no deletion or code change performed. Review/fix with isolated
fixtures next, retaining authenticated-webhook boundary and merchant retention
requirements; do not execute real redaction during QA.


## Resumed after allowance refresh — current progress

Normal checkout coupon/GST acceptance now passes5additional cases:75minus1→10fee;
125minus1→5fee; same125case with10.65includedGST;75ordinary+255.20prepaid minus1
→10fee/339.20gross/28.01includedGST; removing code→5fee/335.20gross/27.67GST.
Native machine receipts omit included-tax amounts; expanded checkout summary is
the independent tax evidence. No payment/completion. No sellingplan selected.
Same shippingQA3copies only; third copy never republished this run. Cleanup:code
deactivated, GSTcollection removed, ruleoff/original allowlist, profile3original
entries, copiesDRAFT/originalprices, temporary publications removed. Native
original-product readback passes. Original cart2variants/quantities/line amounts
and61.89total independently restored. Private receipts/controllers remainignored.

User approved minimal payment-audit retention without contact details. Found old
privacyhook deleted financial dedup records while missing newer customer tables.
Replaced destructive automatic deletion with atomic authenticated intake marked
PENDING_REVIEW; all26models classified and customer inventory scoped/counts-only.
No real erasure or automatic compliance completion. Actual reviewed audit-preserving
erasure/deadline execution is still a technical/retention gate.8new tests pass;
full288Coretests pass. SeePRIVACY-REVIEW-GATE-20261019.md.

User reconfirmed catalogue/nutrition placeholders are approved and remaineditable
inShopifyAdmin; do not ask for names or serving details as Core blockers.
Topups/generalRewards/automaticcancellation remainoff. No production/publication
or provider setting changes. Continue independentCore lifecycle verification;
retain earlier account-origin review boundary. Monitor5-hourpause5%/weekly1%.


## Verified lifecycle checkpoint — dispatch, privacy backlog, late reminders

Full isolated Core suite:308 passed,0failed; typecheck, lint and production-schema
alignment pass. No live database writes were used by these fixture tests.

Order intake now rejects malformed identities and quarantines changed/ambiguous
routing evidence without automatically clearing review. Authenticated create/update
webhooks refresh native fulfillment coverage; incomplete history is DISPATCH_REVIEW,
not proof of no dispatch. Confirmed dispatch remains monotonic across cancellation,
missing history and replay, with one auditable observation. Three existing dev QA
orders were read only; all had complete empty fulfillment history. One negative
Core synchronization preserved its three existing operational lines and audit count.
Positive native dispatch remains an unexecuted QA gate; fixture coverage is not a
claim of live positive acceptance. No fulfillment or financial mutation occurred.

Privacy review queue now exposes bounded, scoped request counts, received/deadline
timestamps and stable pagination without customer details. Duplicate intake preserves
the original30-day review deadline. This is review visibility, not an erasure worker,
legal retention approval or completed privacy compliance.

Latest user decision: if purchase confirmation misses a delivery-reminder lead time,
prepare one immediate reminder per channel and preserve later scheduled reminders.
Pure planning coalesces missed72/24-hour stages, including the exact24-hour boundary,
using stable occurrence/revision keys. It rejects past deliveries. Immediate content
uses the verified upcoming delivery window, without a misleading zero-hour claim.
No durable catch-up worker or email/WhatsApp sending was enabled. Existing scheduled
reminder persistence still requires an explicit guarded integration before activation.

Top-ups remain disabled. No production, theme publication, payment provider or new
store-setting changes in this checkpoint. Unrelated preexisting edits preserved.
