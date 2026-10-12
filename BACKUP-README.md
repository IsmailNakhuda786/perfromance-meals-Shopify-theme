# Performance Meals development backup

Safe public snapshot of the existing Shopify OS 2.0 Liquid theme and Performance
Meals Core app, including unfinished local work. Theme source is in theme/; Core
source, customer-account extension, schemas and migrations are in
apps/performance-meals-core/. Tests and merchant/development documentation are
included. Development reference helpers are in development-reference/.

This snapshot is not a deployment or acceptance claim. No Shopify resources or
payment settings were changed. Original development branch/worktree is preserved.

Source history was intentionally excluded to avoid exposing private QA identities
or generated historical exports. QA emails and native customer/transaction
identifiers in copied files are anonymized; configure real values privately for
your own development store. Never run reference helpers against a live store.

.env files, database contents, node_modules, build/cache/login state, raw QA
responses, screenshots and generated packages are excluded. Restore dependencies
using the included package manifests/lockfiles; regenerate builds as documented.
Environment-variable names are documented below; supply credentials privately.

See BACKUP-MANIFEST.json for the complete captured-file inventory and hashes.
