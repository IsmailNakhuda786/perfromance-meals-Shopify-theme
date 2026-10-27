# One-time Wallet acceptance — 27 October 2026

Scope: Shopify-paid top-ups and one-time food purchases only. Ready Series recurring billing is unchanged. Full merchant rules remain required; no reduced-scope launch is approved. General top-ups stay disabled.

## Decision

| Requirement | Acceptance | Evidence and exact remaining work |
| --- | --- | --- |
| #6 Wallet spending, source priority and expiry | BLOCKED | Native mixed Store Credit/card payment was previously demonstrated, but native earliest-expiry consumption conflicts with principal → Gift Card → bonus → Rewards. Food-only bonus and final-payment source control have no supported confirmed adapter. Core calculations and draft state machines are not checkout enforcement. |
| #7 Wallet top-ups | BLOCKED | Three approved unpaid native checkouts now verified; approved amount/bonus plans and paid-order verification exist. Live approved-package intent/payment-event settlement, principal/bonus issuance, supported restricted bonus spending, circular-funding controls and post-credit reversal/recovery acceptance remain incomplete. No paid top-up or bonus was issued. |

## Ordinary API permissions versus platform approval

| Capability | Supported boundary | Shortest compliant next action |
| --- | --- | --- |
| Shopify receives payment for a non-shippable top-up item | Standard checkout can take payment. Draft creation needs ordinary draft-order access; checkout preparation is not payment proof. | Finish the guarded approved-package intent and settlement path once the spendable-credit architecture is established. Do not wire old SGD5–500 settlement to new packages. |
| Issue ordinary monetary Store Credit | `storeCreditAccountCredit` needs `write_store_credit_account_transactions`; credit can have expiry. No Payments Partner approval is required for that ordinary Admin mutation. | Use only where native credit's unrestricted eligibility and spending order satisfy the approved policy. Do not issue the bonus as unrestricted cash. |
| Native balance plus another payment method | Native one-time mixed funding has existing development purchase evidence. Customers cannot choose an arbitrary partial Store Credit amount. | Native checkout is sufficient for a simple cash balance. It does not establish a custom Core-selected source split. |
| Principal-first source selection | Shopify spends earliest-expiring issuances. Debit input exposes an amount, not a credit-lot selector. Extra ordinary scopes cannot change that policy. | Retaining the exact rule needs a Shopify-approved externally controlled payment architecture. Adopting earliest-expiry would be a business-rule change and is not authorized. |
| Bonus only for food | Native Store Credit has no documented per-issuance product/shipping restriction. Payment customization hides/reorders/renames methods; it does not implement a credit-lot allocator. | Keep bonus out of unrestricted native Store Credit. A product discount is a different price/accounting mechanism, not an accepted equivalent Wallet payment. No compliant full-rule alternative is confirmed. |
| Expiry and reminders | Native issuance expiry is available; Core reminder preparation/sending exists. Core-only timers cannot guarantee final-payment enforcement when an old checkout resumes. Native expiry also retains Shopify's spending order. | Use native expiry where policy fits; exact priority plus expiry requires the approved payment adapter. Automatic reminders need an operational scheduler. |
| Prevent top-up circular funding/discounts | Existing draft input disables discounts. The15October authenticated funded off/on/off comparison passed Store Credit/Gift Card hiding, and the valid-discount bypass test passed on the protected invoice checkout. | Preserve those passed controls; do not reissue test credit merely to repeat them. Accept any changed checkout path and resumed-submission behaviour separately. Core refusing later credit is not pre-payment prevention. |
| Refund/chargeback after credit | Initial proof rejects refunded/disputed orders. Existing lifecycle audit holds incidents; it is not automatic safe reversal after money has been spent. | Implement receipt-bound reversal/reconciliation with manager-reviewed spent-credit exceptions. Do not invent negative balances or duplicate native debits. |
| Custom payment integration | Redeemables installation is Plus-only and invite-only beta. Payments-partner review is separate; buying Plus or adding Admin scopes is insufficient. Payment-extension API/additional-app restrictions also apply. | Obtain written eligibility and architecture determination, then formal approvals/review. Do not claim the current Core Admin app can simply become a payment provider. |

A complete Wallet satisfying the unchanged combined requirements is **not confirmed supported on the ordinary/Advanced plan assessed in case71332405**. Development-store capabilities are not a production-plan approval. Plus alone is not a complete answer. The current request to Shopify explicitly excludes recurring payments.

Official references, reviewed27October2026:
- [Store Credit checkout and expiry](https://help.shopify.com/en/manual/customers/store-credit)
- [Credit mutation and ordinary permission](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/storeCreditAccountCredit)
- [Debit input fields](https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/StoreCreditAccountDebitInput)
- [Payment Customization operations](https://shopify.dev/docs/api/functions/2026-10/payment-customization)
- [Functions distribution/plan availability](https://shopify.dev/docs/apps/build/functions)
- [Redeemables eligibility](https://shopify.dev/docs/apps/build/payments/redeemables/build-a-redeemables-payment-extension)
- [Payment-extension restrictions](https://shopify.dev/docs/apps/build/payments/requirements#prohibited-actions)

## Approved unpaid native checkout evidence

| Customer pays | Principal plan | Food-only bonus plan | Planned total | Actual unpaid checkout |
| --- | --- | --- | --- | --- |
| SGD870 | SGD870 | SGD85 | SGD955 | SGD870; one non-shippable, non-taxable top-up; zero delivery, tax and discounts |
| SGD1,740 | SGD1,740 | SGD185 | SGD1,925 | SGD1,740; same isolation |
| SGD2,690 | SGD2,690 | SGD400 | SGD3,090 | SGD2,690; same isolation |

Exactly three customer-bound drafts were created under explicit approval. Fresh native readbacks verify customer, product, variant, amount and no order. All three Shop Pay checkouts visibly show the correct totals and the saved test Visa. The middle checkout button displayed only “Pay now”; a too-strict amount-in-button assertion was corrected by verifying the visible SGD1,740 total. No discrepancy in price was found. No discount or payment-setting changes were made.

This is unpaid checkout preparation evidence only. Saved-card visibility does not by itself prove the provider is in test mode or authorize payment. The existing15October funded positive control remains valid evidence for its tested invoice path; current Shop Pay absence alone does not extend it to every checkout path. No email was sent, payment submitted, order completed, Wallet credit issued or top-up policy activated. Seven protected financial-model snapshots remained unchanged. Draft IDs, checkout links and screenshots remain private.

Existing native safeguard evidence: [15October funded payment controls and discount bypass](WALLET-MERCHANT-RULES-20261015.md). These passed checks were not repeated.

## Demonstrated safeguard fix

A regression reproduced acceptance of a same-owner/same-total draft with a different product or variant. Native draft receipts now carry exact product/variant IDs; creation and settlement compare them to the server-owned catalogue. Missing/malformed native identities fail closed. Nine focused adapter/intent checks and33 related Wallet checks passed; TypeScript and lint passed. Both modified GraphQL operations validated against Admin API2026-10. The previous583-test complete suite remains the last full-suite baseline; it was not rerun unnecessarily.

## Support and next acceptance gate

The owner's urgent message was posted and visibly confirmed in existing case71332405, asking for a written one-time Wallet determination and reply before31October. Partner-context chat was opened through the owning organization's Help link; advisor Joseph joined and was asked to confirm Partner authentication, responsible team and escalation reference. No new reference or approval is claimed without a response. No payment application or agreement was submitted.

Before a controlled end-to-end test: establish the supported adapter and required access; verify final-cart eligibility/expiry and source reservations; finish principal/bonus settlement, native receipts and authenticated paid-event linkage; prove reversal and uncertain-result recovery. Then present the exact customer, amounts, test provider, payment/credit limits and cleanup for separate approval. The requested flow is top-up → verified payment → correct split credit → eligible one-time purchase → Wallet/card remainder → expiry/reversal safeguards. No payment is authorized by this preparation.
