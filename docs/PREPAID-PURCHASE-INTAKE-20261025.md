# Automatic prepaid purchase evidence intake — 25 October 2026

Development-only and default-off. No payment, discount, contract, product or delivery mutation is performed by this service.

## Completed engineering

- Immutable server-approved pricing registry binds native app/product/variant/selling-plan identity, term, exact per-package amount and correction title. Replays return the same approval; changed economics cannot overwrite an existing plan revision.
- Authenticated subscription-create intake durably saves a minimal contract trigger before original routing or an unavailable Admin session can fail. A bounded worker can recover when paid-order and contract notifications arrive out of order.
- The worker requires complete native contract/order coverage, matching customer/app, exact gross/net prices, unlimited line-scoped recurring correction, no unexpected discounts, fully captured test payment and verified original routing. Pricing is never learned from browser inputs or blindly copied from a webhook.
- Multiple identical packages and mixed terms retain their own quantities and line payment scope. All lines are financially verified before operational routing. Interrupted completion and repeat processing converge on the same immutable purchase evidence.
- Two additive tables were applied only to the known development database. Both models are included in privacy inventory; production preflight rejects intake activation. No permanent worker is provisioned and the running normal preview remains off.

## Acceptance evidence

- Full disposable suite: 520 passed, zero failures/skips.
- Focused PostgreSQL run: 98 passed sequentially. An earlier concurrent run passed97/98; its privacy inventory exceeded Prisma's default five-second interactive transaction timeout. The specific read-only inventory now has a bounded30-second timeout; this is not a general transaction-timeout change or production load certification.
- Historical native comparison: two existing cancelled QA contracts registered/replayed using actual read-only Shopify data. Existing immutable purchase evidence and operational rows remained byte-for-byte unchanged. Nine paid native orders and nine protected financial models were preserved. No native mutation was sent.
- Real Shopify SDK localhost replay, both terms: invalid HMAC401; wrong topic400; signed historical event200; duplicate200. Inbox completion, purchased evidence, operational and financial models remained unchanged. These were synthetic historical replays, not fresh provider-originated contract-create events.
- Admin2026-10 query validated with Shopify Toolkit. TypeScript, lint and schema parity passed.

Private receipts/signatures/customer identifiers remain ignored under Core .shopify. No credentials or private customer records are included in GitHub.

## Still open

Production-approved pricing provisioning/version changes, quantity-aware correction checkout acceptance, automatic worker scheduling/monitoring, a fresh provider contract-create event on permanent staging and nonzero-GST charged renewal acceptance remain incomplete. Wallet architecture, Wallet-funded renewals and top-up activation remain blocked. No requirement is promoted to PASS on this evidence alone.
