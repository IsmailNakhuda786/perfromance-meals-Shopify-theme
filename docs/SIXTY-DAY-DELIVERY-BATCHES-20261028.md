# Core delivery batch acceptance — 28 October 2026

Merchant approved isolated Core-only QA on existing development Order #1009. Fresh native proof confirmed PAID, test-only, correct owner, one programme unit and zero native dispatches.

## Native-linked admin/customer journey: passed for the approved batch

- Temporarily added the approved 88 weekday/32 frozen entitlement snapshot only to the identified QA selection, with complete before-state preserved.
- Opened the authenticated Shopify embedded Core screen; allocated exactly 4 weekday and 8 frozen meals. Repeating the allocation retained 84 weekday/24 frozen unallocated meals and one batch.
- Confirmed the QA dispatch through the admin screen. Customer-account My Plan independently displayed exactly 4/88 weekday and 8/32 frozen meals, with the Singapore dispatch date.
- Read back one DISPATCHED batch at revision 2. Repeating the same dispatch request returned replayed=true with no extra meals or batch.
- Removed only the QA audit records and restored original entitlement, routing flag and timestamps. All 37 protected model snapshots matched exactly; the native order query matched its original hash. No payment, native fulfilment, Wallet or Rewards mutation.
- Returned normal preview to SIXTY_DAY_BATCHES_ENABLED=false; actual admin page shows awaiting activation. Normal customer preview no longer shows the temporary progress.

Screenshots are local private QA evidence: /private/tmp/performance-meals-batch-admin-20261028.png, /private/tmp/performance-meals-batch-customer-20261028.png and /private/tmp/performance-meals-batches-disabled-20261028.png. They are not public backup artifacts.

## Engineering safeguards completed

QA writes and reads now require an explicit selected-programme allowlist as well as the default-off development flag. Normal customers and other programmes stay excluded. Batch/parent identities and evidence are cross-checked. The admin home links to the screen only in the permitted development configuration; production activation remains blocked. Production readiness has a regression assertion for this gate.

Full isolated Core regression: 606 passed, zero failed, one PostgreSQL-only test skipped (that concurrent-allocation case passed in the previous separate PostgreSQL run). TypeScript/lint passed. Theme regression: 71 passed and theme check passed. Shopify App Home component validation passed with an explicit Node process type declaration for the validator's isolated context; native application typecheck passed independently.

## Remaining requirement 3 work

This passes the approved batch-recording subjourney, not full production acceptance. Full 120-meal operational completion, stock/dish allocation, scheduling/rescheduling and permanent-host recovery remain outstanding. Historical entitlements were not permanently backfilled. Ready Series billing remains unchanged, and Wallet top-ups remain disabled.

## Other findings

A read-only Browse journey reached the hidden QA catalogue and showed a misleading save-failure message on initial loading. The local fix separates load errors from save errors and preserves the availability gate. Three wording files were approved for the existing unpublished QA theme; no catalogue publication was approved. Actual wording read-back is recorded in the session checkpoint.

Normal preview callbacks were restored with exactly one order create/update/paid and contract-create registration per expected topic/path. No fresh provider event was generated this session.

Unpublished theme wording upload completed for only assets/meal-plan.js, sections/meal-plan-builder.liquid and locales/en.default.json on theme146768560212. Actual browser read-back showed the new load-error message; no publication or catalogue changes.
