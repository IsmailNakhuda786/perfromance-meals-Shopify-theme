# Business stream schema operations

Validated Admin API 2026-10 operations used for the dev-store separation phase. These contain no store-specific IDs or credentials. Read native definitions/records first; reconcile by namespace/key/type and explicit migration mapping. Create definitions before values; use metafieldsSet and metaobjectUpsert; retrieve and verify after writes. Do not replay create operations without checking existence. Execution variables/readbacks remain in ignored work/stream-separation.

Merchant-owned namespace is intentional: theme and future provider integrations need shared access, and no app is created this phase. Product definition choices are ready_series/meal_plan with PUBLIC_READ. Metaobject field updates preserve existing definitions and entries. See docs/BUSINESS-STREAM-SEPARATION.md for authority, migration and future app boundaries. The subscription-read query validates but current store authorization denies contract access.
