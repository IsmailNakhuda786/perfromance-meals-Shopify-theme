# Native credit expiry and reminder readiness — 15 October 2026

Core now has a receipt-backed expiry registry and a durable reminder outbox. This is not an activated expiry engine or an email delivery service.

A new record requires a fresh Shopify credit-transaction read, exact development-store/customer/account/currency ownership, a positive settled Core credit matching the native receipt, and the native expiration date. Missing native expiry is reported explicitly; no historical date is invented or changed. Food-only bonus cannot be registered as unrestricted native Store Credit. Existing return credits retain their verified source evidence.

Reminder preparation starts one calendar month before the native expiry date, in Singapore time. It rereads ownership, the exact credit receipt, remaining balance and expiry before claiming delivery. Spent or expired credit is suppressed. A revision check prevents two workers claiming one notification; successful completion is idempotent. Lost responses remain UNKNOWN/DELIVERING and are held for provider receipt reconciliation instead of blind retries. `WALLET_EXPIRY_REMINDERS_ENABLED` defaults off. No provider is selected or contacted.

The additive SQLite/PostgreSQL migrations are prepared. All17 SQLite migrations were applied to a new isolated temporary database; comparison with the canonical schema produced no differences. The existing isolated fixture was updated. The later normal development-preview startup applied this additive migration to development PostgreSQL. A read-only check confirms it completed, the five existing Wallet entries remain, expiry records/sent reminders are0, and top-ups/general Rewards remain disabled. No application release occurred. All132 Core tests pass; typecheck, lint and PostgreSQL schema synchronization checks pass.

The new Admin GraphQL read was validated against2026-10 and run read-only against one existing settled development credit. Store, owner and receipt matched; the native record has no expiry. Ledger count and money were unchanged. This is evidence that the reader handles historical non-expiring credit, not proof that new one-year credit issuance or email delivery works.

Remaining gates: issue/verify native expiry on new approved credit flows; connect an approved idempotent email provider and durable scheduler; recover uncertain deliveries from provider receipts; add unclaimed Gift Card reminders separately; reconcile actual native expiration debits with Core source lots. The source-priority/soonest-native-expiry conflict and food-only bonus enforcement remain open. Top-ups remain disabled. No Shopify payment, publication, deployment, financial transfer or notification occurred.

Official schema references:
- https://shopify.dev/docs/api/admin-graphql/2026-10/objects/StoreCreditAccountCreditTransaction
- https://shopify.dev/docs/api/admin-graphql/2026-10/objects/StoreCreditAccountExpirationTransaction
