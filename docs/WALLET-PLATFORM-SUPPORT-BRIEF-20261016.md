# Shopify Wallet feasibility — support brief

Purpose: obtain an authoritative supported checkout architecture before enabling paid Wallet top-ups. Draft only; not sent. No customer identities, balances, credentials or production-store access are included.

We are developing a merchant app and Liquid storefront. The Wallet must preserve these requirements together:

1. Spend customer-funded principal first, then Gift Card-derived credit, food-only promotional bonus, then Reward credit; oldest credit within each source category.
2. Each issued credit expires after one calendar year. Gift Card conversion creates a fresh one-year Wallet term.
3. Expired value cannot be spent, including when a customer resumes a checkout started before expiry or the application scheduler is unavailable.
4. The customer can still complete checkout by card when Wallet reconciliation is delayed.
5. Bonus credit can pay eligible food only, never delivery, Gift Cards or top-ups; it cannot generate Rewards.
6. Prevent top-up purchases funded by existing Store Credit/Gift Cards and prevent duplicate issuance on retries.

Verified constraints:

- Shopify documents that store-credit debits consume earliest-expiring credit first, rather than a merchant-selected funding category.
- The tested App Store payment customization provider states it cannot compare individual customer deadlines with current shop time or reliably establish Store Credit already applied to a resumed checkout.
- Checkout-wide validation that also stops card-only purchases is unacceptable to the merchant.
- Native store-credit balances do not provide food-only restrictions for one source portion.

Please confirm:

A. Is there an officially supported native-checkout mechanism that satisfies all six requirements without changing native expiry/source consumption behaviour after the fact?
B. Can server-side payment customization remove or invalidate Store Credit that was applied before the deadline, at final order submission, while leaving card payment available? Which documented API/behaviour guarantees this?
C. Does a supported API let an app choose which credit lot is consumed, or enforce a product-only restriction on a particular lot?
D. If this combination is unsupported, please state the exact limitation and whether a different supported app distribution/Shopify plan changes it. We do not want to recommend Plus without demonstrated compatibility.

No change to payment providers, billing plans, published themes, balances or transactions is authorized by this brief.

Official references reviewed16October2026:
- https://shopify.dev/docs/api/customer/latest/objects/StoreCreditAccountCreditTransaction
- https://shopify.dev/docs/api/functions/latest/payment-customization
- https://shopify.dev/docs/api/checkout-ui-extensions/latest
- https://help.shopify.com/en/manual/customers/store-credit
