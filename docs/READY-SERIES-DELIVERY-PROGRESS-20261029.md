# Ready Series delivery progress — 29 October 2026

Read-only native shipment evidence now separates awaiting dispatch, partially dispatched, dispatched and merchant-review states. Successful Shopify fulfilment is labelled dispatched, never proof of arrival. Exact order/app/line quantities and complete shipment associations must match; cancelled, pending, truncated or ambiguous histories require review and cannot silently reopen a processed delivery for customer booking. Later untouched occurrences remain independently bookable.

## Actual acceptance evidence

Development Order #1031: nine paid package-deliveries across six native fulfilment occurrence groups, zero confirmed dispatched. Two read-only Admin requests; zero native mutations. All 37 protected development model fingerprints unchanged. The refreshed customer My Plan preview displayed “Confirmed dispatched packages: 0 of 9 package deliveries”, the combined 3-/6-delivery members and merchant-preparation notices. No booking/reschedule action was enabled or performed. Screenshot: private local QA artifact `/private/tmp/pm-ready-progress-account-20261029.png`.

Automated regression: 671 passed, one PostgreSQL-only skip, zero failed. Focused shipment tests cover exact/partial quantities, cancelled history, incomplete pagination, wrong owner/app and over-delivery. TypeScript, lint, schema consistency and Shopify Admin/Customer Account validation passed. Native positive-dispatch and subsequent customer lifecycle evidence remain outstanding; no dispatch was invented to claim acceptance.

## PostgreSQL follow-up resolved

The test module awaited additional service imports after registering its first tests and cleanup hook. In a filtered run, Node could finish the first registered batch and run cleanup while the later selected test was still loading. SQL tracing demonstrated DELETE statements before its fixture INSERTs, explaining missing rows and disconnected-engine responses. Loading every service before registering tests/hooks fixes the demonstrated harness defect without weakening application guards.

Fresh PostgreSQL results after the fix: all 19 booking/calendar/reminder tests and all nine renewal-notice tests passed, including valid SENT receipt followed by rescheduling, corruption rejection, concurrent sends, uncertain responses and snapshot restoration. Disposable SQLite follow-up passed 28/28; full Core regression passed 671 with one PostgreSQL-only skip. The earlier failed runs remain historical evidence, not an unresolved application/database acceptance result. This does not certify every production database path.

Wallet top-ups and normal customer booking remain disabled. Functional matrix remains 2 PASS / 9 PARTIAL / 3 BLOCKED / 1 DEFERRED.
