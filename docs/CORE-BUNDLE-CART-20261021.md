# Bundle review to cart — 21 October 2026

Default-off storefront connection to the signed Core app proxy. The canonical theme setting remains false. A separately approved unpublished development preview is being prepared; no production acceptance is claimed.

Before an ordinary Ready Series bundle enters the cart, the browser requests a signed-customer nonce, then a native Core review. It compares the product, variant, SGD unit price, meal count and complete component identities/quantities with the displayed catalogue. It submits only the returned private review ID and hash alongside existing cart properties. Missing authentication, incomplete configuration or changed catalogue data blocks that action.

Quantity changes request a fresh quantity-bound review and use the native line key, preserving every unrelated property. Cart submissions wait for queued changes and do not post stale updates[] values. An Enter-key submit saves an unsaved quantity before proceeding. A failed quantity review prevents the checkout submission. Lost review responses are not automatically retried.

Verification: 19 focused module/Liquid tests; 71 total theme tests; 100 Liquid files checked with zero project Theme Check findings; isolated mocked Chrome checks cover add proof, changed catalogue, expired authentication, preserved properties, duplicate change events, Enter-key changes and failed-review checkout blocking. All 374 isolated Core tests pass; typecheck passes. Shopify Toolkit Liquid validation remains unavailable because its bundled @shopify/theme-check-common dependency is missing; it is not counted as a pass.

Limits: client checks are not a server-side checkout enforcement boundary. Ordinary/accelerated/direct checkout bypass, native cart pricing and actual signed app-proxy behaviour still require development acceptance. No paid order or existing order is modified by this implementation. General bundle-review activation remains off; Wallet top-ups remain disabled.

Native preview preparation caught an existing nested stylesheet tag in home-hero.liquid that the local checker missed. Its stylesheet is now top-level, preserving both layout branches. The unpublished preview repair upload succeeded; this is not a live theme change.

## Native unpaid acceptance

The user approved an unpublished development-theme preview, the existing QA customer/bundle, and temporary availability of its 14 linked meals. The first preview exposed that Shopify hides draft referenced products: incomplete component identities correctly prevented a usable bundle. After the specifically approved 15-product availability change, all 14 references rendered correctly at SGD109.80.

Actual signed app-proxy/Core/cart proof now verifies quantity1 → quantity2 → quantity1. Three distinct durable reviews preserve14items and10980minor-unit price, remain REVIEWED and have no order attached. Shopify-rendered private cart attributes matched the new review after each saved quantity. Both the cart update action and an immediate checkout submit preserved the quantity-bound review. Unpaid native checkout opened with one bundle. Its existing non-Singapore delivery destination produced a shipping-availability message; this is not shipping acceptance. Checkout status was incomplete. No payment credentials were entered, final Pay now was never clicked, and no order or Wallet transaction was created.

Cleanup: the original empty cart is restored; all15products are back to DRAFT and zero sales channels in the exact filtered Admin set. Independent native readback confirms all14linked meals are DRAFT. The unpublished QA theme setting is off, and Core has resumed with BUNDLE_REVIEW_ENABLED=false (endpoint independently returns404; four current callbacks verified). No published theme or production store was changed.

Cart markup now carries the saved review ID/hash for native readback. With review rollout enabled, the theme's checkout submit also refuses bundle lines lacking that proof. This remains a browser guard, not proof of server-side enforcement against direct or accelerated checkout bypass. General rollout stays off pending those gates.
