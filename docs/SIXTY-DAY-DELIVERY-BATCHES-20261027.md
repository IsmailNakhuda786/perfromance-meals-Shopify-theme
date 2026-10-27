# 6 by 60 delivery batches — development implementation

The merchant approved Core recording actual delivery batches. Shopify retains the programme order/payment; one purchased programme unit is not treated as one meal or proof that all 120 meals were dispatched.

## Implemented

- Authenticated Core admin page `/app/programme-deliveries` allocates separate weekday/frozen meal quantities and records a confirmed physical dispatch.
- Allocation reserves against the original saved 88 weekday + 32 frozen entitlement. Cancelling an unsent batch releases only that allocation. Sent meals cannot be automatically cancelled or restored.
- A locked immutable programme basis serializes allocations. Stable batch references and revision checks prevent repeated allocation/dispatch, stale confirmations and changed-entitlement reuse.
- Fresh Shopify read proof requires a paid, uncancelled development test order, exact customer/product/variant/programme quantity and complete native data. External native dispatch holds the programme for reconciliation rather than inventing meal counts.
- Customer accounts can display recorded dispatch counts/dates, without staff identities or internal audit references.
- Default-off `SIXTY_DAY_BATCHES_ENABLED` and explicit production guard. No native order, payment, refund, billing, inventory or fulfilment mutation is implemented here.

## Evidence and limits

Validated new native order-read query against Shopify Admin 2026-10. Read-only native checks verified both existing saved programmes' ownership/payment routing and a purchased programme quantity of one. Both older saved programmes have no original entitlement snapshot; neither was backfilled or altered.

Full isolated regression: 607 tests, 606 passed, 1 intentionally skipped PostgreSQL-specific concurrency case, 0 failed. Separate PostgreSQL regression: 9/9 passed, including concurrent allocation; all 37 protected existing-store model snapshots unchanged and zero native mutations. TypeScript and lint passed. Local tests are not customer journey acceptance.

The batch workflow is not yet accepted end to end in the actual admin/customer preview. A positive paid-programme QA needs approval for an identified isolated test record with an authoritative entitlement. Do not silently rewrite legacy paid programmes. Actual date/time booking, stock and menu composition per dispatch, customer rescheduling and operational reconciliation remain separate unfinished acceptance gates. No automatic claim that a native programme unit equals 120 physical meal deliveries.

## Recovery this session

Restored four existing development webhook registrations to the current reachable preview origin: order create/update/paid and contract create. Exactly one registration per topic/path remained; no duplicate subscriptions were created. Native registration and HTTP reachability were checked. A fresh provider-originated event was not generated in this session, so end-to-end event delivery is not newly certified.

Wallet top-ups and the new batch feature remain disabled. Ready Series billing, paid deliveries and financial records are preserved.
