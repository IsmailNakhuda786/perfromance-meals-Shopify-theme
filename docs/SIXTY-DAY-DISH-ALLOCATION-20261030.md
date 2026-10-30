# Customer-selected dish allocation — 30 October 2026

The user confirmed that Jerome's team assembles the 32 frozen meals using the customer's already-selected dishes. No separate frozen menu choice is required. Weekday dish quantities come from saved customer menu windows; the frozen allowance remains independently capped at32.

## Implemented development workflow

The existing batch screen can allocate actual dishes from the immutable original purchase menu and latest committed customer menu revisions. Draft menu edits do not replace committed selections. Dates and source-window identity are validated; a renamed week cannot reset a consumed allowance. Frozen dishes must appear among the customer's saved meal choices, without consuming their weekday quantities.

Version2 batch records retain source revision references, a menu checksum, dish identities, window references and exact quantities. The service verifies the paid original programme and current catalogue references. It conserves both per-dish and per-window weekday quantities across planned/dispatched batches and the separate32-meal frozen ceiling. Old count-only batches are held for explicit reconciliation rather than inventing dish attribution. Cancelling an unsent batch releases its allocation once; dispatched batches cannot be cancelled automatically.

Allocation, dispatch and customer menu edits lock the same programme record. Fresh dispatch validation holds a batch if the customer has removed its dishes or reduced the applicable selected quantity. It does not silently substitute meals. The customer progress response retains counts/dates and omits operator IDs and internal source references.

`SIXTY_DAY_DISH_ALLOCATION_ENABLED=true` is an additional development-only gate, requiring the existing batch gate. Both default off; production configuration rejects dish activation. No schema or migration change is required. Original paid entitlements, dates and choices are not rewritten by allocation.

## Verification before native-linked acceptance

- Full isolated regression:719 passed,3 PostgreSQL-only cases skipped,0failed.
- First focused PostgreSQL run:22 passed,0skipped,0failed;40protected real-store model groups unchanged.
- Final dish-specific PostgreSQL run:9passed,including competing allocations, a concurrent menu edit and foreign menu ownership;40protected model groups unchanged.
- TypeScript/lint, production-schema consistency and official App Home component validation checked separately. Existing standard HTML/React controls are typechecked by the application rather than by the Polaris component validator.

The separately approved Order #1009 test passed in the actual authenticated staff and customer previews. Exactly two weekday and three frozen Greek Chicken & Quinoa Bowl meals were allocated from the saved week of2November. Staff saw the exact dish quantities and source window; the customer saw2/88weekday and3/32frozen sent. Allocation/dispatch replay passed; stale-menu, unknown-dish and excess-quantity requests were rejected. A discovered form-state issue was corrected so successful allocation resets stale quantity fields.

Only the temporary Core test batch/parent and original routing metadata were restored. The guarded cleanup journal is RESTORED: all40protected model groups and the complete native test-order history match the baseline. No paid menu, entitlement, Shopify dispatch, payment, notification, Wallet or Rewards change remained. Screenshots: `/private/tmp/pm-dish-batch-admin-20261030.png` and `/private/tmp/pm-dish-batch-customer-20261030.png`. Normal preview flags are off again. This accepts the scoped dish-allocation journey; scheduling/stock gates below remain open.

This implementation does not claim warehouse stock reservation, a new native Shopify dispatch, automatic scheduling or production activation. Those remain separate fulfilment gates. The Admin prototype/ACL compatibility phase remains deferred until the functional work is complete.
