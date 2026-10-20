# Resume checkpoint — 20 October 2026 — bundle review preservation

Source branch `shopify/theme-migration-v2`; latest implementation checkpoint `1e85b50`.
Public sanitized backup branch `backup/customer-core-20261012`, commit `af1be13fdfc52c74f25ea620769e1fac48bcd05a`: 832 files / 829 manifest entries, zero SHA-256 mismatches. Source history and private credentials/receipts remain excluded.

## Completed this run

- Restored local Core preview and customer-account bootstrap. Saved plans/menus, Rewards and account sections loaded after temporary diagnostics were removed. No account save, purchase, redemption or credit.
- Implemented native immutable bundle review snapshots and opt-in atomic original-order binding. Existing orders remain on their original path; historical orders were not backfilled.
- Added default-off signed app-proxy review endpoint. `BUNDLE_REVIEW_ENABLED` remains unset; no storefront integration/activation.
- Additive development PostgreSQL migration applied; all 26 existing tables retained their record counts. Seven scoped PostgreSQL fixtures passed and cleaned up.
- Read-only actual unpublished Mixed Bundle comparison: 14 component records / 14 meals / SGD 109.80. No review/order created.
- 371 isolated SQLite Core tests, TypeScript, lint and production schema checks passed. Both GraphQL queries validated with Shopify Toolkit at 2026-10.

## Remaining gates

Authenticated storefront review/cart connection and actual opt-in checkout binding remain unverified. No second bundle purchase is authorized or needed merely to repeat prior QA. Existing paid Order #1014 remains preserved.

Continue independent #4/#5/#15 work. Native subscription checkout/contract/renewal still requires supported payment setup. Multi-delivery Function enforcement awaits authoritative native schedule binding. Wallet top-ups/general Rewards/automatic cancellation remain off. No production/theme release/provider setup or new paid service.

Usage rule: pause at 95% used five-hour allowance (5% left); weekly at 99% used. Do not stop solely because one checkpoint completes. Ask only genuine unresolved decisions, in plain language, without repeating Jerome's confirmed answers.
