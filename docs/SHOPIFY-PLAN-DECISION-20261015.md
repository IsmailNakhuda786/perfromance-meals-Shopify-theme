# Production plan recommendation — provisional

User asked us to recommend the production Shopify plan, without purchasing or changing billing.

Provisional commercial baseline: Grow, SGD132/month or SGD99/month billed annually, with five staff accounts. Basic has no additional staff accounts. Advanced does not unlock custom-app Functions. These are Shopify's listed Singapore prices on15 October2026, excluding separate app/backend costs and any applicable taxes: https://www.shopify.com/sg/pricing.

Custom-app Shopify Functions require Plus; App Store-distributed Functions can operate on other plans. Plus starts at USD2,300/month on a three-year term or USD2,500/month for one year. Do not tell the merchant that Grow has passed every Wallet requirement, or that Plus is already necessary. First demonstrate the overdue-Wallet checkout safeguard on the chosen distribution/plan route. References: https://shopify.dev/docs/apps/build/functions and https://www.shopify.com/sg/plus/pricing.

Read-only inspection of the installed ETP app confirms the existing top-up safeguard is active. Its offered conditions cover cart content/totals, customer tags/login/order count and location/language; no date or customer-metafield deadline condition is exposed. No rule was changed. A stale Core-updated customer tag would not prove protection during scheduler downtime.

Native Store Credit also cannot pay recurring subscription bills; upgrading the plan does not establish a supported renewal-tender path. Shopify's Store Credit documentation also lists third-party transaction fees for applicable newer stores. Confirm commercial fees before purchase, separately from technical acceptance: https://help.shopify.com/en/manual/customers/store-credit.

Recommendation sent to user in commentary: budget for Grow, defer purchasing until the final compatibility check. No upgrade, onboarding or payment-provider change was made.

## Approved free-plan capability test

User approved BoomGate installation and a free development-store test. Installation permissions matched the disclosed customer/owner contact-data reads, product/collection reads and checkout validation/payment/delivery customization editing (actual ancillary read: Locales). No billing acceptance or paid plan was requested.

Selecting Customer rule type created an OFF placeholder. It is saved as `PM Wallet expiry capability QA - INACTIVE`, payment customization117866580, hiding Store credit only for the existing QA email if ever activated. It remains OFF. The customer-metafield operators expose equality/contains/numeric comparisons; dynamic comparison values are customer names/email/phone and cart amounts, with no current shop date/time. A separate Time rule type is listed, but the inspected Customer editor does not demonstrate the required per-customer deadline comparison. No second rule was created or activated. Do not claim this candidate passed native expiry protection or that Grow is fully accepted. Existing ETP top-up rule remains active and untouched.

Private installation and inactive-rule screenshots are preserved under Core .shopify/evidence. No purchase, native credit/debit or payment-provider change occurred. The agent-created App Store tab is closed; the inactive rule editor is retained for the next session.


### Time-rule inspection

The Time editor was inspected on15 October. It exposes Shop date, Shop date with time, Shop time and customer tags/authentication, but no customer expiry metafield or dynamic customer deadline in that rule type. An automatically created empty Time placeholder117964884 remains OFF; exploratory condition edits were discarded. The prior Customer placeholder117866580 remains OFF. This UI does not establish the required deadline protection. No active payment rule/provider was changed. Vendor clarification is requested before treating BoomGate as a solution.

Vendor capability question was explicitly authorized and sent to qa@example.invalid through the connected Gmail account on15 October. No customer data, balances, credentials or store access was included. Awaiting response. No capability is assumed from sending the question.

## 16 October — vendor response and retained business policy

BoomGate support states its customer-deadline/current-date comparison is unavailable on every plan, and cannot reliably establish previously applied Store Credit in resumed checkout. Native Shopify expiresAt is supported but consumes earliest-expiring credits first. User expressly rejected changing source priority and rejected holding the customer's whole checkout while expired Wallet value is reconciled. Do not implement either rejected alternative or recommend Plus as a proven solution.

Official checkout validation supports server-side checks throughout checkout and shop.localTime.date; custom-app Functions require Plus, App Store-distributed Functions can work on other plans. These facts do not establish a card-preserving Wallet safeguard or solve food-only bonus enforcement. No extension, rule, scope or plan changed in this investigation. Further research must preserve card checkout, exact Wallet source priority and expired-value prevention together.

References checked16October:
- https://shopify.dev/docs/apps/build/functions/test-debug-functions
- https://shopify.dev/docs/api/functions/latest/cart-and-checkout-validation
- https://shopify.dev/docs/api/admin-graphql/latest/objects/Validation
