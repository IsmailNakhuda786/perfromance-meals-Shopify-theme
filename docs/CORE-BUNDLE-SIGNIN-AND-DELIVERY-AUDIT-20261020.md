# Bundle sign-in and delivery audit — 20 October 2026

The user explicitly confirmed that ordinary Ready Series bundle purchases require sign-in. Theme collection cards, product forms and quick-view controls now present the sign-in action for guests. Native purchase fields and signed-in bundle add-to-cart remain. Individual-food guest purchase controls remain available. Accelerated checkout is hidden on blocked guest bundle forms. The capture guard rejects guest bundle form submission without interfering with ordinary/Gift Card forms.

This is presentation and local cart verification, not server-enforced native checkout acceptance. Core's signed review route remains disabled. Direct native cart/checkout bypass protection and authenticated review/cart integration remain gates before activation. No Shopify settings, Theme publication or deployment.

Local browser evidence: guest sign-in CTA displayed; signed-in Add to cart opened the local cart with one bundle at SGD 59.90 (fixture price, not merchant catalogue pricing). No Shopify cart or order was created. Screenshot is private temporary QA evidence.

Independent read-only shipping audit now accepts trusted physical-delivery allocations. It conserves each native discounted food line total exactly, computes a separate tier per delivery and excludes prepaid value. Missing, duplicated, foreign or overallocated mappings are rejected. No mapping is inferred from shipping-line count. This does not modify the checkout Function or activate shipping enforcement.

Verification: 373 isolated Core tests; TypeScript/lint; 52 Theme tests; local Theme Check: 98 files checked, zero findings. Shopify Toolkit Liquid validator could not launch because its bundled theme-check dependency is missing; the existing project Theme Check ran successfully instead. Seven PostgreSQL bundle tests from the preceding checkpoint remain valid; no subsequent schema changes.
