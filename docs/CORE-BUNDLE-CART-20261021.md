# Bundle review to cart — 21 October 2026

Default-off storefront connection to the signed Core app proxy. The canonical theme setting remains false. A separately approved unpublished development preview is being prepared; no production acceptance is claimed.

Before an ordinary Ready Series bundle enters the cart, the browser requests a signed-customer nonce, then a native Core review. It compares the product, variant, SGD unit price, meal count and complete component identities/quantities with the displayed catalogue. It submits only the returned private review ID and hash alongside existing cart properties. Missing authentication, incomplete configuration or changed catalogue data blocks that action.

Quantity changes request a fresh quantity-bound review and use the native line key, preserving every unrelated property. Cart submissions wait for queued changes and do not post stale updates[] values. An Enter-key submit saves an unsaved quantity before proceeding. A failed quantity review prevents the checkout submission. Lost review responses are not automatically retried.

Verification: 19 focused module/Liquid tests; 71 total theme tests; 100 Liquid files checked with zero project Theme Check findings; isolated mocked Chrome checks cover add proof, changed catalogue, expired authentication, preserved properties, duplicate change events, Enter-key changes and failed-review checkout blocking. All 374 isolated Core tests pass; typecheck passes. Shopify Toolkit Liquid validation remains unavailable because its bundled @shopify/theme-check-common dependency is missing; it is not counted as a pass.

Limits: client checks are not a server-side checkout enforcement boundary. Ordinary/accelerated/direct checkout bypass, native cart pricing and actual signed app-proxy behaviour still require development acceptance. No paid order or existing order is modified by this implementation. General bundle-review activation remains off; Wallet top-ups remain disabled.

Native preview preparation caught an existing nested stylesheet tag in home-hero.liquid that the local checker missed. Its stylesheet is now top-level, preserving both layout branches. The unpublished preview repair upload succeeded; this is not a live theme change.
