# Performance Meals Core

An embedded, single-merchant Shopify app built from Shopify CLI's React Router TypeScript template. Customer commerce remains in the native Liquid theme. This app provides private Meal Plan drafts, locked menu selections, signed customer endpoints, order-line routing and future operational/migration records. It contains a minimal connection screen, not the future departmental Admin UI.

## Development

Node 22.12 or later. Use the verified My Store 2 app linked in `shopify.app.toml`; never run initialization or reset to create another app/store.

1. `npm ci`
2. Copy `.env.example` to `.env`; keep credentials out of Git.
3. `npm run setup` applies versioned Prisma migrations. Never reset an existing database.
4. Run `shopify app dev --store performance-meals-development.myshopify.com --skip-dependencies-installation` from this app directory using the project CLI.
5. After the CLI provides its HTTPS tunnel origin, run `PERFORMANCE_MEALS_APP_URL=https://<trusted-app-origin> npm run configure:account`. This creates an ignored build-time endpoint module for the account extension. Reconfigure it whenever the tunnel changes. Use a stable development tunnel for repeatable testing.
6. Open the embedded app in the development store. `Connect order events` idempotently registers app-owned, shop-specific create/update subscriptions using the official SDK. `Sync pending checkouts` reconciles native orders against this app's locked selections; it does not create orders, take payment, or import historical commerce.
7. Open the customer account extension from the CLI dev console. This preview is not a released customer-account navigation page.

Development uses persistent local SQLite. Do not copy its sessions, tokens, customer state or QA identifiers into a production deployment.

## Checks

- `npm test`: server rules, nonce isolation, durable draft revisions, locked review, mixed native order routing, spoof quarantine and idempotency.
- `npm run typecheck`
- `npm run lint`
- `node_modules/.bin/tsc --project extensions/performance-meals-account/tsconfig.json`
- `PERFORMANCE_MEALS_APP_URL=https://<trusted-app-origin> npm run build`
- `shopify app config validate --json`

The CLI-generated `shopify.d.ts` is excluded from ESLint and included in extension TypeScript validation. Compiled extension bundles are also excluded from source linting.

## Production prerequisites

Choose a trusted permanent HTTPS app host. Set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL, PERFORMANCE_MEALS_APP_URL, DATABASE_URL, ALLOWED_SHOP and approved scopes through the host's encrypted environment configuration. The allowlist remains the exact dev store until installation on another store is explicitly authorized.

For SQLite, mount a persistent database volume, restrict file permissions, provide encrypted backups and run one app instance. Before multiple instances, migrate the Prisma provider/migrations to the chosen managed database and test restoration. Do not run production against ephemeral container storage. `docker-start` applies migrations before starting the server; the Docker build requires the trusted HTTPS origin as a build argument. Container execution was not verified in this workspace.

Release the app configuration/extensions only after production hosting and customer-data access requirements are satisfied. Activate the My Plan customer-account page in Shopify's account editor/navigation. Keep the storefront theme unpublished until separate merchant approval.

Subscription lifecycle/contract ownership, production/kitchen schedules, rewards rules and fresher.com.sg migration remain documented future integrations, not fabricated local commerce.

See ../../docs/CORE-FOUNDATION.md for the full data contract and phase results.
