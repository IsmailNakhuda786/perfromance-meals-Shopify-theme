# PostgreSQL persistence QA — 12 October 2026

Scope: completion requirement #1 only, with infrastructure dependencies recorded. No theme publication, live-store changes or Admin UI implementation.

## Preserved checkpoint

Resumed eeaeb939da63c012b41f995be3f9289220e47059 on shopify/theme-migration-v2. Existing Wallet/catalogue work was preserved. Original SQLite and private environment configuration remain retained; protected snapshots exclude OAuth tokens. The fresh export was imported without overwriting any conflicting records.

## Repeatable verification

Run `node scripts/test-postgres.mjs .env.postgres-development` from Core. An isolated generated client avoids changing the running app's client. Internal fixture namespaces must be empty before running; the tests remove only their own fixture records. Shopify API responses are mocked in these service tests, so they do not count as actual checkout or subscription-contract evidence.

Ten focused PostgreSQL tests passed, including create, independent read, edit, save, immutable paid dates, owner checks, stale revisions, concurrent saves and mixed-order classification. The full Core suite passed 22 tests against PostgreSQL; typecheck, lint and production-schema consistency passed. Build passed with the current development backend origin; this is not a permanent production release.

## Running development app

The reversible setup command selects SQLite or PostgreSQL from the configured database URL. Shopify CLI predev/dev now uses the matching schema, including the direct migration connection. Original private configuration retained in ignored .env.sqlite-checkpoint-20261012. The installed app remains Performance Meals Core in My Store 2, only performance-meals-development.myshopify.com. No new app/store was created.

The app reopened with SGD, Asia/Singapore and Order events Connected. OAuth reauthentication created its session in PostgreSQL; no credentials were printed or committed.

## Actual browser → Core → PostgreSQL proof

The authenticated 6 by 60 Plus paid programme restored its existing menu. Edited the open Week 2 Mon–Tue selection from 3 Chilli Lime Chicken & Cauliflower Rice + 1 Lemon Herb Turkey Breast to 2 + 2. Save returned Selections saved to your account. Full reload restored 2 + 2. Independent PostgreSQL readback found block 0 revision 7, SAVED, and matching quantities. Every field of the original paid selection matched the protected pre-switch export; dates remain 12 October–10 December. No new order, checkout or payment was created. Closed Week 1 remained disabled.

Evidence: work/period-qa/postgres-paid-menu-restored-20261012.png (ignored local screenshot).

## Remaining gate

Permanent commercial-compatible hosting and hosted-runtime acceptance remain incomplete. The working app is still exposed through a development tunnel. The approved 15-point checklist remains the acceptance tracker; no missing 14-point checklist is invented. Frozen-meal entitlement clarification is recorded for #3 and has not been mixed into this #1 implementation.

The native customer-account My Plan page was independently reopened using the current extension preview. Both 6 by 60 and Plus showed their original dates, all saved weekday blocks and the new Week 2 2+2 selection. A stale development tunnel in the account bundle was found and fixed: predev now generates the endpoint from Shopify CLI APP_URL before compilation. A regression test verifies development origin selection and separate production configuration. Native account evidence: work/period-qa/postgres-native-account-20261012.png.

User decision: keep hosting development-only for now. #1 is verified within the development-store scope; permanent production hosting and hosted acceptance stay deferred under #14. No paid hosting or plan upgrade was created.
