# Core bundle sign-in — native development QA, 20 October 2026

## Authorization and scope

User explicitly approved uploading the local-tested Function to Performance Meals Development, granting checkout-validation access and temporarily activating a rule for the existing QA bundle. Unpaid comparisons only; no completed order, payment, theme publication or production action.

Core configuration now requests read_validations/write_validations. The Rust candidate was copied to core-bundle-signin-qa and uploaded through app dev, without an app release. Shopify confirmed the Function belongs to Core, uses cart_checkout_validation at2026-07 and the requested scopes were granted. App config validation passed with zero issues.

## Native observations

- Created one validation, initially disabled, with exact QA-product allowlist and app-owned configuration. No existing validations were present. blockOnFailure=false prevents an unrelated runtime failure from turning this QA candidate into a broad checkout outage.
- Existing Mixed Bundle remained DRAFT, one variant at SGD109.80. Prepared one guest draft checkout with SGD5 delivery, total114.80. The native money string114.8 was reconciled to11480minor units; the original draft was reused, with no second create.
- Temporarily enabled the one-product rule. Signed-in imtechhs QA checkout displayed the normal test gateway form and Pay now control. No payment fields were entered or final action clicked.
- Signed out of this development customer account, reloaded the same checkout and observed the exact server validation message: “Sign in to purchase Ready Series bundles.” This establishes the rule reacts to authentication, not merely a remembered contact email.
- Captured private signed-in and guest screenshots. Began restoring the same QA customer sign-in; any verification code is entered by the user directly.
- Disabled the rule afterward. Independent native readback: one validation exists, zero enabled; product still unpublished at109.80. The checkout remains unpaid; no order created.

The official API documents [draft checkout support](https://shopify.dev/docs/api/functions/2026-07/cart-and-checkout-validation). This result covers the one draft checkout tested, not normal storefront, accelerated checkout, every bundle or recurring renewal acceptance.

## Build and remaining gates

The first preview startup stopped before upload because build metadata was incomplete; fixed by including the generated schema and the locked Rust compile command. An isolated temporary official Rust toolchain and existing MacOSX15.4 SDK were used process-locally; system PATH/SDK settings were not changed.

The source matches the14fixture local WASM candidate. Default-off exact-product configuration remains required. The saved bundle-review route is still disabled; review/cart attachment, native bypass/quantity-change protection and wider storefront checkout acceptance remain separate gates. Wallet top-ups, general Rewards and automatic cancellation remain off.

No payment-provider settings, shipping rates, GST settings, balances or production resources changed. One unpaid QA draft and one disabled validation are intentionally retained for auditable follow-up. Do not complete or pay that draft.
