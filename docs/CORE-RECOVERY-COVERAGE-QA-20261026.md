# Complete Core operational recovery coverage — 26 October 2026

The legacy transfer script exported only 11 models. Current recovery format v3 explicitly includes all 35 operational models, excluding only Shopify OAuth sessions. A schema-inventory test fails if a future persistent model is omitted. New Rewards, Gift Card, top-up, expiry, subscription evidence, pricing approval, booking and reminder records are included.

Exports use a consistent database transaction and exclusive mode-0600 file creation. PostgreSQL uses Repeatable Read for export; imports use Serializable transactions. V3 requires the complete table inventory and exact current scalar fields. Foreign stores, unknown/missing models, duplicate identities, malformed rows and conflicts are rejected. Existing v1/v2 snapshots remain compatible; absent newer model records stay absent. Existing destination conflicts roll back all earlier inserts. OAuth credentials must be reauthenticated.

Verification uses a random disposable shop namespace only. It demonstrates complete export/restore of Wallet, Rewards and slot records, identical replay without duplicates, and rollback on a later Rewards conflict without restoring an earlier Wallet row. No actual customer export, migration, Shopify mutation, payment, balance adjustment or production deployment was run.

The complete disposable Core suite passes 555/555. TypeScript and lint pass. All five focused PostgreSQL recovery checks pass, including the full roundtrip and rollback proof. Actual hosted backup retention, cross-host restore, workers, outage drills and merchant operational acceptance remain outstanding; requirement 14 remains BLOCKED.

The command-line export was also exercised on disposable fixtures: complete v3 output, mode 0600, exclusive creation and unchanged contents after a rejected second export. The test file was removed.

Final preservation readback: all 15 protected development business-model snapshots remain unchanged; both slot-capacity tables are empty.
