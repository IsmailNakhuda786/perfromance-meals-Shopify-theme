# Performance Meals Core deployment

Status: deployment architecture prepared and locally built, not provisioned or deployed. The native Shopify theme remains the storefront. This backend only supports Shopify-specific operational state and the existing customer-account extension; it is not an external Admin platform.

## Hosting blocker verified 2026-10-07

The existing workspace is on Vercel Hobby. Vercel restricts Hobby to personal/non-commercial use, so it is unsuitable for the commercial Performance Meals Core deployment. The connector also returns 403 for the owning workspace. No paid upgrade, new project or database was created. A commercial-use-compatible no-cost hosting plan and independently verified PostgreSQL installation terms are required before provisioning; otherwise paid hosting needs explicit approval. Prepared Vercel configuration is a candidate architecture, not an approved production deployment.

Sources: https://vercel.com/docs/plans/hobby ; https://vercel.com/legal/terms .

## Prepared deployment candidate

Dedicated Vercel project for `apps/performance-meals-core`, React Router SSR, Node 22.12 or later, official `@vercel/react-router` preset, Singapore `sin1`. Do not reuse or overwrite either approved prototype project. `vercel.json` runs `npm run build:production`. A stable HTTPS origin is required before releasing Shopify app configuration or customer-account extensions. Keep the development store allowlist explicit.

PostgreSQL: ordinary portable Prisma schema and SQL migration under `prisma/production`. Local development uses the existing SQLite schema and database. Production builds generate the PostgreSQL client and deploy its migrations before the app build. Do not run PostgreSQL client generation against an active SQLite development process; regenerate the appropriate client when switching environments.

Neon through the existing Vercel workspace is the preferred candidate after reviewing alternatives. On 2026-10-06 Vercel's billing-plan API returned `free_v3`: Free, no payment method required, 1 GB/project, 100 projects, 100 CU-hours/project, up to 2 CU. Official announcement confirms 1 GB storage. Resource caps are service-availability constraints, not permission to upgrade. Provisioning was not completed: automatic approval review rejected account creation because the exact workspace and no-upgrade terms were not sufficiently established. No paid plan, payment method, database or integration was created.

Prisma Postgres was reviewed but not selected: its current FAQ characterizes Free as evaluation-only, and marketplace limits differ from the pricing page. Free tiers do not establish a production SLA. Verify final Neon onboarding plan, caps, terms, region and upgrade behavior before submitting installation. Do not accept a paid plan or automatic paid upgrade.

Sources: https://vercel.com/docs/frameworks/frontend/react-router ; https://neon.com/blog/neon-free-plan-1-gb-per-project ; https://www.prisma.io/docs/postgres/faq .

## Environment configuration

Store values as encrypted Vercel environment variables. Keep separate deployment projects/credentials/databases for staging and Jerome's future production installation. Never copy staging customer state into Jerome's environment.

- `SHOPIFY_API_KEY`: corresponding installed Shopify application client ID.
- `SHOPIFY_API_SECRET`: secret from that application, server-only.
- `SHOPIFY_APP_URL`: stable HTTPS origin, no path or tunnel.
- `PERFORMANCE_MEALS_APP_URL`: same origin; build-generated public account endpoint.
- `DATABASE_URL`: pooled PostgreSQL connection with provider-required TLS, server-only.
- `DIRECT_DATABASE_URL`: direct PostgreSQL migration connection, server-only.
- `ALLOWED_SHOP`: exactly the authorized store domain.
- `SCOPES`: approved minimal native Shopify scopes from app TOML.
- `NODE_ENV=production`; no credentials in Git, documentation, screenshots or logs.

Preflight fails closed for missing variables, SQLite production connections, placeholder/tunnel origins and mismatched account/backend origins. `/health` returns generic 200/503 JSON and no-store; its database probe consumes provider resources, so avoid high-frequency external polling.

## State migration, preserving evidence

1. Stop local writers during the final transfer; retain the original SQLite database securely.
2. With the SQLite client and explicit authorized `ALLOWED_SHOP`, run `node scripts/transfer-operational-state.mjs export /protected/path/snapshot.json`. The destination must not exist. The snapshot is mode 0600, contains private operational/customer references, and belongs outside Git.
3. Provision separate staging PostgreSQL, configure encrypted variables, run `npm run setup:production` and PostgreSQL schema validation.
4. With the PostgreSQL client/connection and the same store allowlist, run the script in `import` mode. It imports atomically, rejects foreign-store rows and conflicting existing IDs, and never overwrites destination records. Inspect protected row counts and #1007 reference readback.
5. OAuth sessions/tokens are deliberately excluded; reauthenticate the installed Shopify app on the permanent origin.
6. Verify health, app proxy, signed customer-account access, webhooks and saved selections before changing released Shopify URLs. Retain source evidence until migration QA passes.

The transfer script export was exercised locally. PostgreSQL import is prepared but unexecuted and unverified without a database. #1007 remains historical evidence; its former one-time Meal Plan is not proof of the approved recurring architecture.

## Release and rollback

Use a dedicated staging Shopify configuration with the stable origin, correct auth callbacks, app proxy and webhook endpoints. Validate/build the app and extension before deploying app configuration. Do not release `example.com` or a tunnel as a permanent endpoint. Never publish the storefront theme as part of app deployment. Verify new customer session persistence and a Shopify Subscriptions-owned contract before production readiness sign-off.

The optional Docker path also generates the PostgreSQL client and runs the same preflight/migrations; it does not use SQLite for production. Set the public build origin using `PERFORMANCE_MEALS_APP_URL`, with secrets provided only at runtime. Docker execution has not been tested in this phase.

Keep a known working code deployment and provider backups/export plan. Free-plan backup retention and caps must be verified; no production backup/SLA is claimed here. Database outages must leave native one-time commerce available, while saving/reviewing Meal Plans and wallet actions fail closed without exposing database details.
