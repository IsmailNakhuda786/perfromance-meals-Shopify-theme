> Current one-time Wallet review: [27 October acceptance](WALLET-ONE-TIME-ACCEPTANCE-20261027.md). The old20/50/100/200 and5–500 values below are historical disabled QA only; current approved packages are870→955,1740→1925 and2690→3090. Their unpaid native checkout preparation is verified, but paired settlement and complete native spending enforcement are not activated.

# Customer-funded Wallet top-ups

## Approved source

Customer commit: 58272e4e011d03249b196d392319ad22fa8dc0ca.
AccountPage defines “Top Up Wallet”, presets 20/50/100/200, and custom 5–500.
Preserve those customer labels. Card details belong in Shopify checkout, never
in Core or the account extension. Demo instant-success/WhatsApp receipts must
not appear before actual verified settlement or message delivery.

## Current implementation

Internal services only; no browser route, product, or payment action enabled.
walletTopUpsEnabled defaults false on every store. The server-owned native
product/variant and external-gateway allowlist is required, never taken from
customer request fields. No staging policy was activated.

Read-only order proof verifies the allowlisted store, authenticated customer,
exact native product/variant, one item/quantity, SGD amount, PAID state, no
cancellation or disputes, no refunds/discounts/tax/shipping adjustments and one successful
SALE/CAPTURE from an approved external gateway. Store Credit and Gift Card
payments cannot become customer-funded cash. Truncated evidence fails closed.

Settlement: PREPARED → CREDIT_PENDING → AWAITING_LEDGER → COMPLETED.
Unique shop/order, payment and credit receipt keys plus compare-and-set prevent
duplicate credits. Lost or mismatched financial responses stop in
RECONCILIATION_REQUIRED; no blind retry. A confirmed native credit followed by
a ledger failure retains AWAITING_LEDGER and resumes bookkeeping without another
native credit. The ledger stores both paid OrderTransaction and Store Credit
credit GIDs and sourceKind customer_funded. No secrets or card data stored.

Migration: 20261012200000_wallet_top_up_settlement, additive, applied only to
development PostgreSQL. SQLite and PostgreSQL schemas/migrations remain aligned.
Existing orders, Gift Card claims and Wallet balances preserved.

## Required before activation

Merchant agrees in principle to a dedicated checkout item and prefers an isolated, non-shippable checkout. Activation is conditional on proving all listed controls.
Determine supported exact custom-amount checkout construction, preserving the
existing shared cart. Do not emulate a variable product price in JavaScript.
Configure native product/variants, tax treatment, discount exclusion, no physical
delivery and exclusion from food free-delivery calculation only after approval.
Verify the exact native gateway identifiers rather than guessing them.
Add authenticated checkout initiation/settlement and verified paid-event hooks.
Credit only the customer identity verified on both intent and native paid order.
Protect against funding via promotional discounts, Gift Cards or existing Wallet
balance; preserve one customer/cart/checkout/order architecture.
Ask for a specific dev-store financial QA before issuing customer-funded credit.
Test successful/declined payment, duplicate delivery, account refresh, mixed-source
FIFO purchase and refund lifecycle independently. Fixtures do not prove these
native flows work.

## Native platform limits

Shopify documents that Store Credit works on initial subscription purchases but
not recurring subscription bills. This resolves feasibility for requirement #9;
it does not make subscription contract/payment QA complete.

Sources:
- https://help.shopify.com/en/manual/customers/store-credit
- https://shopify.dev/docs/api/admin-graphql/latest/mutations/storeCreditAccountCredit

GraphQL proof query validated against 2026-10. Focused tests and full Core tests
cover the guards; native top-up QA remains pending. No theme publication, payment
provider activation, production store access or Admin UI work.

## Conditions review

- Amounts: approved presets and 5–500 bounds are preserved in proof validation.
  Exact arbitrary-amount checkout needs a server-created native draft/custom line
  or an approved native variant strategy. Do not change a product price from a
  browser request, multiply penny products, or fabricate native order totals.
  The current proof intentionally accepts configured native variants only; it
  is not yet an arbitrary-amount checkout implementation.
- Payment: actual native capture, owner/currency/amount and exact native credit
  receipt required. Duplicate/concurrent and uncertain-response cases tested.
- Discounts: isolated draft checkout supports acceptAutomaticDiscounts false and
  allowDiscountCodesInCheckout false. Native zero-discount proof also required.
- Delivery/free delivery/rewards: isolate top-ups from food checkout and mark
  non-shippable. No top-up value may enter food thresholds or reward earning.
  These checkout/event filters are not yet enabled or tested natively.
- Wallet-funded top-up: Core refuses Store Credit/Gift Card funding. This prevents
  credit creation, but does NOT prevent a customer completing such a checkout.
  A supported native pre-payment restriction is an activation prerequisite.
  Shopify's official Functions availability says custom apps containing Functions
  require Plus; public App Store apps containing Functions are available across
  plans. Do not promise a custom-Function solution works on Jerome's unknown plan.
  Draft invoices alone are insufficient: Shopify explicitly permits signed-in
  customers to apply Store Credit to their invoice checkout.
- Refund/cancellation/dispute: initial/repeated funding proof refuses cancelled,
  refunded or disputed orders, including incomplete dispute evidence. A refund
  or chargeback after credit still requires a native reversal/reconciliation
  implementation; no negative or duplicate balance is invented. This remains
  incomplete and is an activation gate, not a passed condition.
- Reconciliation: durable native receipt and source-separated ledger are tested
  internally. Real paid top-up/native credit/browser/balance/lifecycle QA remains
  pending. The existing Gift Card-funded SGD 2.10 balance is preserved.

Sources for checkout feasibility:
- https://shopify.dev/docs/api/admin-graphql/latest/input-objects/DraftOrderInput
- https://shopify.dev/docs/api/admin-graphql/latest/objects/OrderDisputeSummary
- https://shopify.dev/docs/apps/build/functions
- https://shopify.dev/docs/apps/build/checkout/payments
- https://help.shopify.com/en/manual/customers/store-credit

No new payment-provider configuration or native financial action executed.

## Checkpoint validation

48 PostgreSQL-backed Core tests passed, including eight top-up checks.
Typecheck, lint, build, production-schema alignment and Shopify 2026-10 query
validation passed. Tests use isolated fixture shops and mocked native responses;
no native top-up order or credit was issued. Direct development database readback
confirms topUpsEnabled false, zero top-up settlements, fundedBalance 210 minor
(SGD 2.10), bonusBalance 0 and two existing recipient Wallet entries.
