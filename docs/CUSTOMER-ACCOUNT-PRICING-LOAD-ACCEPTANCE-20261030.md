# Customer account pricing and loading acceptance — 30 October 2026

Development-only read journeys. No payment, credit, renewal change, Support request, dispatch or production change was performed.

## Demonstrated failure and fix

The combined account request took 46.6 seconds during measured development observation. Native cancellation/Support history alone consumed about 25.1 seconds. The customer screen times out at 30 seconds, so it displayed an account-loading error even though the backend eventually completed.

The current client explicitly requests the account summary without Support history. Support history now loads independently only when Order History opens, through an authenticated, private, GET-only endpoint. Older clients retain their original account-response contract. Both views retain ownership checks; no automatic cancellation or refund action was introduced.

The separate panel bounds its token/fetch wait, cleans up on unmount and does not accept late results after interruption. A failed history read cannot hide plans, Wallet or the rest of the account. Ten recent orders are shown with an explicit pointer to native order history for older purchases.

## Exact price explanation

Core verifies the complete native contract against immutable purchase evidence before showing a net package amount. Verification covers shop/customer/app/contract/original-order identity, variants, selling plans, quantity, monthly term, currency, included delivery, complete discounts and persistent per-package correction. Missing, expired, limited, rejected or changed economics show a review message instead of an invented price.

The customer sees the confirmed package total and the difference between Shopify's gross recurring subtotal and the automatic adjustment. Native checkout UI has not been overwritten. Cancelled/paused contracts do not advertise another scheduled charge date.

Actual read-only verification: nine existing development contracts matched their saved economics, including SGD255.20, SGD493.60 and SGD510.40 for two packages. All 37 protected model fingerprints were unchanged. Native mutations and Core writes: zero during this inspection.

## Customer integration evidence

- Refreshed Shopify account successfully loaded its Dashboard, Wallet balance and linked plans after the loading fix.
- My Plan displayed nine verified package prices and one correctly unverified historical test contract, with no false future-renewal date on stopped contracts.
- Order History independently loaded ten owned native orders, #1034 through #1025, with Support-review controls. No review button was submitted; the account was then returned to My Plan.
- Screenshots saved locally: /private/tmp/pm-account-pricing-verified-20261030.png and /private/tmp/pm-order-support-history-verified-20261030.png. These contain development-account context and are not included in the public backup.
- Admin GraphQL2026-10 and Customer Account2026-07 validators passed. Existing event-field narrowing and missing-argument validation issues in the complete account component were corrected.

## Limits

This closes the observed account-loading failure and the Core account's exact-price disclosure subjourney. It does not change Shopify's gross-subtotal label, accept general price-correction provisioning, approve Wallet spending or complete every customer-account financial journey. Full requirements2 and12 remain PARTIAL. Permanent tunnel/host reliability remains outside the functional deadline, and the temporary origin can expire.


## Mobile read/navigation acceptance

At390×844, all seven sections—Dashboard, My Plan, Order History, Wallet, Rewards, Gift Cards and Settings—were opened in the real Shopify account preview. Every section retained a390px document/scroll width with no horizontal overflow or whole-account load error. Navigation wrapped and the verified-price explanation remained readable. This is read/navigation evidence; no financial or Support action was submitted. Mobile screenshot: /private/tmp/pm-account-mobile-20261030.png; detailed width checks remain local. The temporary viewport override was reset after testing.
