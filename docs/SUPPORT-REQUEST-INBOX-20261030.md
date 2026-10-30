# Merchant Support inbox — 30 October 2026

Customers already had a durable Support-request action. A missing merchant read workflow is now implemented at `/app/support-requests`, with an authenticated, shop-scoped bounded list and stable pagination. Core home shows its link only when the development feature flag is enabled.

The inbox projects only the request label/status, receipt date and recorded payment/dispatch/cancellation facts. It does not expose raw customer identities or funding payloads, treat historical evidence as current order state, approve a request, cancel an order or issue a refund/credit. Invalid historical evidence is shown for review without hiding the customer request. POST is rejected; responses prohibit caching.

`CORE_SUPPORT_INBOX_ENABLED=true` enables the development-only read screen. Activation is default-off and rejected in production. No database migration or financial permission was needed. Existing development PostgreSQL readback found one request; read replay was stable and all37 protected Core model fingerprints stayed unchanged, with zero writes or native mutations.

Focused request/inbox/history regression:13 passed. Full disposable Core regression:702 passed,1 PostgreSQL-only skip,0 failures. TypeScript, lint and the new App Home screen component validation passed. Positive embedded Shopify admin acceptance displayed the existing request for Order #1009, including its original recorded total, paid state, dispatch state and funding-review warning. The page exposes no action forms or customer-identity payload. Screenshot: `/private/tmp/pm-support-inbox-verified-20261030.png`. The temporary preview flag is restored off after acceptance. This does not complete manager approval, Support adjustments, late rescheduling or refund acceptance.


## Merchant access ownership clarified

The merchant's store owner will assign and revoke staff roles in the existing Admin panel, isolated to that store. No fixed developer-managed manager list is required. The prototype compatibility review follows the 15-point functional work; see [confirmed access model](MERCHANT-OWNED-ACL-DECISION-20261030.md). This inbox does not yet grant adjustment approval authority.
