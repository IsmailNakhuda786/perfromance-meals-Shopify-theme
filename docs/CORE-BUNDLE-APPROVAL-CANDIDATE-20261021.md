# Bundle checkout approval candidate — 21 October 2026

Default-off extension of the existing sign-in lab. Following the user’s specific approval, the candidate was uploaded through the existing development preview and tested on the existing QA customer/bundle. No app release, theme publication, completed order, payment or balance change occurred. Temporary customer/rule values were restored.

With `requireReviews` enabled in the existing exact-product QA configuration, the candidate compares each bundle's private review ID/hash, native variant/product and quantity with an app-owned customer approval document. Authentication is still mandatory. A cart-supplied ID/hash alone is not evidence. Missing/invalid native approval, another customer, ambiguous approval, duplicate use within one cart and changed configured bundle classification are rejected. The earlier sign-in-only mode remains compatible when `requireReviews` is omitted.

Customer definition validated by CLI and installed through the approved development preview:

```toml
[customer.metafields.app.bundle_review_approvals]
type = "json"
name = "Core bundle checkout approvals"
access.admin = "merchant_read"
```

The candidate reads this field from namespace `$app`. The value has version `bundle-review-approval-v1`, the native customer ID and up to 100 exact review references. Core's local projection checks ownership, stored snapshot hash and reviewed/unbound state; used reviews are omitted. It refuses truncation, duplicates and oversized documents. It performs no Shopify write. General production synchronization is not implemented or activated. The native definition was independently read back as JSON with merchant-read-only access.

Verification: 33 official Shopify WASM fixture tests pass, including the original 14 sign-in cases and 19 approval cases. The expanded 2026-07 Function input query passes Shopify Toolkit validation. Four Core projection tests pass. Order update regression coverage additionally holds changed original unit price/currency, missing price, corrupted stored snapshot and changed review state, retaining the original review for support. Unchanged original purchases stay validated even when today's catalogue price changes.

Important limits: app-owned approval authenticity is not atomic single-use authorization. A previously fetched native approval may remain present in two concurrent checkouts or after a Core/database change. Catalogue freshness, order binding, app-owned write permissions, propagation, resumed checkout and accelerated checkout require separate native verification. Post-payment quarantine is not proof of prevention. Therefore this candidate must stay inactive outside an explicitly approved isolated development test; no full checkout safeguard or production acceptance is claimed.

## Approved native unpaid comparison

The existing QA product remained DRAFT throughout. Three unpaid draft checkouts used the exact customer/product: correct quantity1 approval, absent review, and quantity2 with the quantity1 review. Native checkout displayed the review validation error for the latter two, while the exact approval loaded without that error. Withdrawing the temporary native approval and reopening the previously valid checkout displayed the review error too. No Pay now action was performed: final-submission rejection and concurrent checkout freshness are not claimed.

Cleanup independently verified: validation disabled, its original sign-in-only configuration restored, customer approval field absent again, product still DRAFT, three drafts OPEN with no order. The empty app-owned definition remains part of the default-off implementation. Four callbacks now point exactly once to the resumed development origin. Core review rollout and Wallet top-ups remain off.

384 Core tests, typecheck, lint and the production schema mirror pass. Thirteen focused tests pass on both SQLite and PostgreSQL, including the new approval projection and later-price regression. The isolated client initially needed regeneration; no production model/provider was changed. No temporary QA database namespace remains after test cleanup.

Next: native final-submission/concurrent/replayed checkout and catalogue freshness design remain separate gates; do not activate this partial safeguard generally. Continue independent lifecycle verification and preserve sanitized checkpoints.
