# Bundle review snapshot — 20 October 2026

Internal, inactive preparation/binding seam; no public route, checkout activation or historical backfill.

A native catalogue read captures bundle component product/variant references, quantities, labels, price, currency and stated meal count. Complete native metaobject evidence is required. Review hashes bind the snapshot to shop, customer, quantity and review identity.

Binding is designed to share the original order-routing transaction. It rejects changed catalogue evidence before first binding, changed price/quantity/identity, reuse by another order and corrupted stored evidence. A replay for the same already-bound original order returns its saved contents even after catalogue edits. Atomic compare-and-set prevents two orders claiming one review.

Order routing now binds explicitly opted-in review properties in the same transaction as the operational line. Existing orders without review properties retain their original routing. Storefront review integration remains inactive. The nullable OperationalLine review field and additive migrations preserve legacy rows. Order #1014 is not retroactively treated as proof of this path. No native purchase, Wallet transaction or development database migration was performed for this change.

Verification: Shopify Toolkit Admin 2026-10 query validation passed; 367 isolated SQLite Core tests passed, including six new native-evidence/binding fixtures; TypeScript passed; production schema mirror passed. Lint passed after replacing a control-character regex with explicit character-code validation. PostgreSQL concurrency and real authenticated checkout integration remain pending.

Account preview: restarted the existing local development preview and opened the CLI-generated customer-account bootstrap. Saved programme menus, Rewards history, Gift Card and Settings sections loaded successfully after temporary diagnostics were removed. No account mutations were submitted.
