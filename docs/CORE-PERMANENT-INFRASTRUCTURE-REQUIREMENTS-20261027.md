# Permanent Core infrastructure — approval checklist

Prepared 27 October 2026. Requirements only: no provisioning, subscription purchase, production deployment or payment-setting change is authorized by this document.

The merchant currently chose temporary development hosting. Quick tunnels depend on the local preview process and its current hostname. Restarting or losing that process can invalidate the callback origin; updating registrations restores routing but does not prove all missed events were replayed. A tunnel is unsuitable as the production callback address.

| Component | Required production configuration | Acceptance evidence required |
| --- | --- | --- |
| Core server | Merchant-approved permanent HTTPS origin; supported Node runtime; Singapore/nearby region; separate staging and production | App installation, OAuth return, signed customer API and Shopify webhook round trips on the permanent origin |
| PostgreSQL | Separate persistent production database; pooled application connection and direct migration connection; least-privilege access | Migration rehearsal, concurrent settlement/booking tests, encrypted backup and restore into an isolated database |
| Durable workers | Scheduled and retryable inbox processing, purchase reconciliation, subscription lifecycle, delivery reminders and approved expiry processing | Restart mid-job, retry/idempotency, dead-letter alert, stale-job detection and recovery; no dependency on an open Mac |
| Email | Approved sending domain and provider credentials, recipient rules, delivery receipts and duplicate suppression | Actual staging delivery, failed-send recovery and unsubscribe/transactional message treatment reviewed |
| WhatsApp | Jerome's Business setup, approved provider/number and message templates; authorization and costs before connection | 72-hour and 24-hour staging delivery receipts, consent/template checks and failure recovery |
| Monitoring | Availability, callback signatures/errors, inbox lag, stuck settlements, worker heartbeat, expiring credentials and database backup alerts | Named owner receives a controlled test alert and follows a recovery procedure |
| Secrets/access | Environment-specific secrets outside Git; named owners, access removal and rotation plan | Credential rotation rehearsal without losing pending work; logs and public backups checked for secrets |
| Recovery/release | Versioned schema, verified source backup, database restore runbook, protected financial audit history and rollback plan | Restore/reconcile rehearsal proves no duplicate credit, charge or dispatch; reconciliation of pending provider responses |

Before purchasing: choose account owner, provider, plan, region, budget, backup retention and response owner. Obtain written approval for actual prices and usage ceilings. Existing Vercel resources do not establish approval to upgrade or deploy. Database, workers, email and WhatsApp costs must be included in the review.

Production gates remain independent: permanent infrastructure does not unlock unsupported Wallet payment capabilities, establish Payments Partner eligibility, or approve changes to Ready Series recurring billing. Wallet top-ups remain disabled. No hosted expiry job alone is accepted as checkout enforcement of the required Wallet rules.
