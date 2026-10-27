# Approved-package funding pipeline — 27 October 2026

## Completed engineering

Default-off, development-only, QA-customer-scoped checkout/intake/verification/accounting orchestration supports870→955,1740→1925 and2690→3090. It uses existing PlanOperation and WebhookReceipt audit storage; no schema migration, balance migration or production configuration change is required.

Existing Shopify SDK-authenticated ORDERS_PAID and ORDERS_UPDATED handlers call the package pipeline only when explicitly enabled. Webhook fields are routing hints, never payment proof. Fresh native draft/order reads bind exact customer, product, variant, amount, currency, isolated non-shippable item and one approved external capture. Discounts, Store Credit/Gift Card/manual funding, incomplete payment, refunds and disputes fail closed. Recognized package events do not earn food Rewards or create food fulfilment rows.

Deterministic checkout IDs, compare-and-set, durable event receipts and transactional unique order/payment claims protect retries and concurrency. Copied hints on unrelated orders cannot consume or poison the original intent. Lost draft responses require reconciliation instead of blind recreation. Native read failures retain the event for retry. A failed accounting transaction rolls back both receipt claims and both source allocations. Later refunds/disputes retain the original accounting and hold it for explicit review; no native debit, negative balance or duplicate replacement credit is invented.

Principal and promotional bonus are separate immutable-source allocations in the funding audit. Both remain **non-spendable and unissued**. Bonus is explicitly food-only. No CustomerWallet, WalletEntry, native Store Credit, payment capture or refund is created by verification. Issuance timestamps/expiry are unset until actual approved issuance; payment verification must not silently start or extend an unissued credit's validity.

## Verification and limits

Ten new pipeline cases and authenticated-route boundary coverage pass. Full disposable regression595/595, TypeScript and lint pass. Tests include simulated failed commits, duplicate captures across intents, concurrency, changed identities/amounts, partial refunds, chargebacks and unknown results. The existing three successful unpaid native checkouts were not repeated. No flag was enabled in the running app, no new live checkout/payment/credit was created and no Shopify configuration was changed. Ten focused PostgreSQL checks also pass; all37 existing development business-model hashes remained unchanged. Disposable records were removed. No new model/table or migration was needed.

This completes verified-payment intake and pending source accounting, **not actual customer Wallet settlement or native checkout enforcement**. Fresh provider webhook acceptance, permanent queue/audit scheduling, native principal/restricted-bonus issuance, safe post-issuance reversal and end-to-end spending remain unaccepted. No payment adapter has been invented. Requirements6/7 remain BLOCKED for full acceptance.

## Architecture and exact next approval

Use the [one-time architecture decision table](WALLET-ONE-TIME-ACCEPTANCE-20261027.md). Ordinary draft/order and Store Credit permissions can support checkout and basic cash credit; they do not change native earliest-expiry spending or add food-only restrictions to one credit source. Payment Functions do not select Store Credit lots. The full unchanged rule set has no confirmed ordinary/Advanced architecture. Redeemables requires Plus plus a separate closed-beta invitation; a plan purchase alone is insufficient.

Next action is written Payments Partnerships eligibility/architecture determination under71332405: confirm the permissible payment-app/Core boundary, authoritative final food/delivery proof, principal-first/source restrictions, one-time Wallet/card split and expiry at submission. The Payments Partner application is the documented formal process, but its documentation-compatibility attestation remains unproven. Request the exact pre-application channel or truthful early-stage submission procedure; do not tick the attestation, accept agreements, submit the application or purchase Plus without separate review/authorization. General Partner Support has said it cannot directly route that review. No approval is claimed.

Recurring Ready Series billing is unchanged. Top-ups remain disabled. Native payment/credit QA requires separate authorization after the supported issuance architecture is established.
