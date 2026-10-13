# Confirmed customer cancellation policy — 12 October 2026

This supersedes the earlier blanket no-customer-refunds clarification.

Ready Series individual purchases, bundles and prepaid terms, plus Meal Plan
programmes/recurring subscriptions, can be cancelled within 48 elapsed hours of
Shopify order placement only if no delivery has ever been dispatched. Card,
Gift Card and Wallet-paid food purchases are covered. Eligible cancellation
refunds the full paid total including delivery into the customer's Wallet and
stops future automatic renewals. No refund to the original card is requested.

Any single dispatch blocks automatic order cancellation and automatic refund
immediately. Customers contact support about disputes/remaining programme value.
Stopping an ongoing subscription does not itself restore Wallet money.
Exceptional payment reversals, chargebacks and authorised Admin adjustments must
remain auditable and cannot duplicate credit or invent unsupported balances.

The eligibility policy, durable execution states, native cancellation adapter,
renewal ownership verification, receipt reconciliation and native account
confirmation UI are implemented. Unknown dispatch history fails closed.
Execution is disabled by default. Development-only QA is restricted to approved
Order #1011 through the server-owned qaCancellationOrderName policy field.
Native end-to-end cancellation/refund acceptance remains pending; do not equate
unit tests or granted access scopes with a successful Shopify refund.

Confirmed mappings: Shopify Fulfilled counts as dispatched. Any single successful
fulfillment locks automatic cancellation, even if that fulfillment is later
cancelled or returned. Incomplete historical evidence requires review. Orders
containing both food and a purchased Gift Card go through support; Core must not
automatically cancel the Gift Card or refund its value along with food.

Use native cancellation/refund-to-store-credit receipts rather than issuing an
additional manual Wallet credit. Preserve original paid order/customer identity,
source attribution and retries. A policy result is not native refund evidence.

The native adapter uses orderCancel with storeCreditRefund, without expiry or
an additional storeCreditAccountCredit call. Native receipts must match the
customer, original order, SGD total and stopped renewals before completion.
Cancelled native fulfillment history is ambiguous and cannot reopen eligibility.
SUCCESS fulfillment observations persist as dispatch evidence in Core.

Mutation attempts persist before sending. Lost responses become reconciliation
cases, never automatic financial retries. Read-only recovery can finish only
after native cancellation, full Wallet receipt and renewal shutdown are proven.
Contracts owned by another subscription app, missing contract mappings and
subsequent renewal orders without a verified original-order relationship require
support/integration work; Core never cancels an unrelated contract.

Native Wallet debit reverts restore the original recorded funding sources.
Partial reversals without source allocation evidence stay under reconciliation.
Promotional balances remain separate. Customer-account history labels positive
native returns as Refund. Top-ups remain disabled.

API reference: https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/orderCancel
