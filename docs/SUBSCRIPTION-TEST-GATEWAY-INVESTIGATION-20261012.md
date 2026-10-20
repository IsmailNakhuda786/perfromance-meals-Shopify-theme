# Native subscription testing: current development-store limitation

**20October authority note:** early finite/non-renewing statements below are
historical and superseded. Current approved Ready Series billing is3/6calendar
months with automatic renewal; delivery uses the approved monthly calendar,
short-month/availability adjustments and an independent billing schedule.
See RESUME-CHECKPOINT-20261020.md for current payment/draft integration.
The Singapore setup question has now been submitted to Shopify Support with
user approval; human technical guidance is pending. No provider settings changed.

## Final Support correction —20October2026

After the prior checkpoint, the user supplied Logan's corrected final answer:
placeholder onboarding may be attempted ONLY for a development store that will
never process real payments. Shopify cannot supply values or guarantee Singapore
format/verification acceptance. The earlier blanket assertion that placeholders
are unsupported was withdrawn. Setup still accepts Payments terms; no setup,
identity/bank submission or provider activation is approved by this clarification.
The user ended the chat. Ticket/transcript reference has not yet been supplied.
Do not re-open the settled business question or invent verification details.

Native calculation-only work can continue separately: this does not require a
payment method, contract commit or billing.20October resumed native probes verify
exact3-/6-term projections for the first approved draft configuration, with no
warnings and the original product/contract set unchanged. See the second-run
checkpoint for wider calculation coverage. This does not prove paid checkout.

## Verified state

### Latest update: owner-operated development store, Singapore address

The user clarified this is Movies Khan's personal development environment; Jerome will separately purchase/onboard his production store. Work will be deployed/migrated later, rather than converting this test store into Jerome's live business. Development test orders, identities and payment settings are not production migration data.

The user changed the business entity/address to Singapore. Independent read-only native API now confirms shop-address country SG, currency SGD and partnerDevelopment true. User reports Shopify Payments now appears with **Complete setup**, but has not been configured/activated; Test Payment Gateway remains active. The earlier PK/no-visible-option finding below is historical and superseded.

**New primary-source evidence:** Shopify Developer Support Expert Alan_G stated on 8 April 2026 that initial onboarding is required before test mode becomes available on dev stores, but placeholder data may be used for a store that will never process real payments. Subsequent KYC requests may remain incomplete for that dev-only scenario, with test charges supported even when real charges are disabled. This is Shopify support guidance on its developer forum, not a guarantee of this Singapore form's validation requirements. The example discusses US identity fields; no Singapore identifiers, bank details or merchant identity are invented or submitted here. See [the support response](https://community.shopify.dev/t/shopify-payments-on-dev-store/23573/9) and [the author's Developer Support profile](https://community.shopify.dev/u/Alan_G).

Therefore: skipping initial setup entirely is not documented; avoiding fully verified live-merchant onboarding has a documented development-only support path. Confirm Singapore-specific test-field requirements with Shopify before submission. No paid-plan purchase is selected or established as necessary for this partner dev store. Provider activation, terms acceptance, setup submission and transactions still require separate approval.

Remaining provider question: for this SG/SGD dev-only store under My Store 2, which **Shopify-approved Singapore test values** and steps allow initial Payments setup followed immediately by test mode, without live processing, paid billing or real merchant KYC? The existing setup form was not inspected because browser review blocks shared Shopify Admin access; its exact required fields and activation side effects remain unverified.

### Historical initial readback

- Authorized store: `performance-meals-development.myshopify.com`.
- User manually confirmed Shopify Test Payment Gateway is active and no Shopify Payments setup/manage/test-mode option is visible. No settings changed.
- Read-only native API on 12 October: currency SGD, `shopAddress.countryCodeV2 = PK`, `plan.partnerDevelopment = true`, plan display name Advanced. Advanced is a feature level, not proof of a purchased plan.
- SGD currency and Singapore customer market do not establish Shopify Payments eligibility. The public shop-address country readback is not proof of legal entity or payment-account country.
- Pakistan is absent from the Shopify Payments supported-country list; Singapore is present. This is a possible explanation for the missing option, not a confirmed account-specific diagnosis.

## Officially documented options

1. **Shopify Payments in test mode.** Shopify explicitly directs subscription-order testing to this option; developer tutorials demonstrate it on dev stores. Complete setup is now visible following the user's SG change. Follow the development-only support guidance above, with Singapore-specific test-field confirmation and approval before submission. Merchant Help says paid-plan/setup requirements apply to Shopify Payments testing; that statement does not prove this partner dev store must be purchased or converted, and dev-store docs separately permit provider test mode.
2. **Eligible subscription provider with supported sandbox/test integration.** Shopify lists Shopify Payments, PayPal Express, Authorize.net, Adyen and Stripe for third-party subscription apps, subject to country/provider terms. Inclusion in that list does not establish a free sandbox that works through native Shopify checkout on this specific store. No substitute provider is selected or activated. PayPal Reference Transactions approval and provider-specific limitations must be considered; a sandbox account alone is not checkout/renewal proof.
3. **Non-transaction development while gateway access is unresolved.** Continue source mapping, finite policy checks, authenticated native contract-read code, error handling and Core reconciliation tests. Mock responses are software tests only. They cannot replace actual payment, native contract creation or scheduled fulfillment evidence.

Shopify also provides generated selling-plan demo data for development stores. Its documentation says these demo plans show the Admin/storefront presentation and that resulting subscription contracts will not generate additional orders. That is not proof of real gateway support, Core ownership, approved Performance Meals prices or renewal capability. Do not substitute generic demo products for the approved catalogue or create a new store just to obtain them.

Shopify Test Payment Gateway is explicitly incompatible with subscription products. Its one-time checkout success cannot prove prepaid native subscription payment or recurring renewal support. Finite Ready Series plans still use subscription selling plans to schedule repeated deliveries, even though only one charge is authorized. No one-time workaround or external checkout is introduced.

## Historical support question before the SG change

For partner development store `performance-meals-development.myshopify.com` under My Store 2, Shopify Test Payment Gateway is active, SGD is the store currency, and the shop-address country currently reads PK. Shopify Payments is absent from payment settings. What is the supported **no-paid-plan, no-real-charge** method to test native prepaid subscription checkout and monthly fulfillment on this existing dev store? Can Shopify Payments test mode be enabled for this store, and what precise dev-store country/eligibility configuration is required? Do not change billing or activate a live provider. If unsupported, please confirm the limitation and identify any officially supported subscription sandbox provider for this configuration.

This question is prepared only; it has not been sent to anyone.

## Independent Core development

`app/services/prepaid-verification.server.ts` adds a read-only, allowlisted native contract inspection. It checks Core ownership, shared customer/original test-order identity, SGD, exact product/variant/plan references, monthly delivery, full-term billing and a single billing-cycle cap. It explicitly keeps transaction amount, actual scheduled fulfillments, operational reconciliation and expiry/no-recharge behavior pending. It never charges, creates a contract, changes settings or marks a product verified. Three focused mocked-response tests cover both terms and reject incorrect billing, unlimited renewal, mismatched identity, non-test orders, missing/truncated data and unauthorized stores.

Validation: 25 Core tests pass (including the three new mocked contract checks), typecheck and lint pass, build succeeds. Build reports existing React Router v8 future-flag notices; no framework upgrade is introduced. Native GraphQL query validates against API 2026-10. These results are not payment or fulfillment acceptance.

## Remaining acceptance

No 3- or 6-month native subscription transaction, new subscription order, contract creation, monthly fulfillment schedule, renewal payment or Core live reconciliation has passed in this phase. Existing five products still need valid Core-owned selling plans and exact approved-price allocation readback. Ready Series must not recharge; actual recurring-renewal payment testing applies to the separately approved Meal Plan models. Theme remains unpublished; no live store or Admin UI changes.

## Sources

- [Test gateway incompatibility and Shopify Payments test mode](https://help.shopify.com/en/manual/checkout-settings/test-orders/payments-test-mode)
- [Development-store provider test-mode limitations](https://shopify.dev/docs/apps/build/stores/development-stores)
- [Developer tutorial requiring Shopify Payments test mode on a dev store](https://shopify.dev/docs/apps/build/checkout/product-offers/create-a-post-purchase-subscription)
- [Supported subscription gateways](https://help.shopify.com/en/manual/products/purchase-options/subscriptions/considerations)
- [Shopify Payments supported countries](https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries)
- [Merchant Shopify Payments test requirements](https://help.shopify.com/en/manual/payments/shopify-payments/testing-shopify-payments)
- [Generated selling-plan data and order-generation limitations](https://shopify.dev/docs/apps/build/stores/generated-test-data)


##20October specialist and calculation-API follow-up

Specialist Logan confirms Singapore also requires initial Shopify Payments setup
before test mode is available. Exact Singapore verification/test values and whether
setup activates live processing or accepts payment terms remain unanswered; asked
explicitly, with no authorization to activate or submit identity/bank information.

Official contract-building guide currently describes a calculation/commit API with
paymentMethod none. However, its subscriptionContractCreateCalculate and calculation
result types fail the pinned2026-10 Toolkit schema validation as unavailable. No
calculation, contract commit or billing attempt was executed; the experimental
operation was removed. Do not silently switch API versions or treat this as a proven
native alternative. Confirm native schema availability before further implementation.
Source:https://shopify.dev/docs/apps/build/purchase-options/subscriptions/contracts/build-a-subscription-contract


Independent native read-only capability check then confirms both calculation
operation names DO exist on the development app's API. Thus the Toolkit schema
and current native schema differ: do not describe the API as unsupported based
only on the Toolkit failure. The SDK response did not expose an API-version header;
the client remains pinned2026-10. No calculation mutation was executed. Next:
validate a calculation-only candidate against native introspection and confirm all
inputs/projected totals before any development execution. Never commit or bill as
part of that isolated calculation check. This cannot replace actual paid checkout QA.
