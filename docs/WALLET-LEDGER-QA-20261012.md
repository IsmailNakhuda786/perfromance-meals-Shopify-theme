# Wallet ledger development checkpoint

Scope: completion requirement #6, permanent source-separated ledger and authenticated readback. Payment configuration is left unchanged. This does not complete Wallet funding, checkout settlement, Gift Card conversion, rewards or renewal spending.

## Implemented

- Preserve the existing SQLite/PostgreSQL attribution and native-proof migrations, WalletEntry fields, settlement-hook code and its tests. Native transaction references have store-scoped unique indexes. Historical records remain explicitly `legacy_unknown`; their sources are not guessed.
- Read-only `readWalletLedger` scopes every query and pagination cursor to the allowlisted shop, authenticated Shopify customer GID and currency. It returns customer-funded, Gift Card-funded and bonus source totals separately, transaction history, pagination and a comparison against stored balances.
- The existing native customer-account endpoint supplies its verified session-token customer identity. It now returns `walletLedger` alongside existing balances. Optional `walletCurrency` and `walletAfter` retrieve further history pages; invalid/foreign cursors return a generic bad-request response without revealing another customer's records.
- History responses omit internal settlement event and native transaction references. Private/no-store response headers and existing CORS authentication remain.
- `settlementVerified` remains false. Ledger arithmetic and saved identifiers cannot establish that a native payment or Gift Card debit occurred. Existing wallet/rewards enablement flags remain unchanged; no spending controls are enabled.

## Verification

Three new database-backed tests use an isolated randomly named internal fixture namespace and clean up only its records. They verify durable readback through a second database client, source separation, customer/currency isolation, drift detection, unknown historical attribution, 55-entry pagination with no duplicates, and rejection of foreign cursors/unauthorized stores. They do not credit any real dev-store customer or create Shopify products, orders or payments.

The full Core suite passes 31 tests; the new pagination cases also pass independently. Typecheck, lint and production-schema consistency pass. Authenticated browser display of new history and native funding/settlement remain unverified. No Figma layout changes, deployment, theme publication or Admin UI changes were made.

## Remaining gate

Finish the customer-account history presentation using approved labels/design, verify it in a real authenticated session, and independently validate native funding/debit/refund evidence before attaching financial settlement hooks. Do not mark requirements #6–#10 complete on database or mocked-response checks alone. No new merchant business rules are assumed.
