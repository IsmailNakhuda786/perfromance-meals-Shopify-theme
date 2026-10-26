# Wallet platform review — 23 October 2026

Shopify Developer Support's written response in case **71332405** (Bijoy) was read in the authorized development-store Support Inbox. The response closes the earlier technical escalation; it is no longer merely awaiting acknowledgement.

## Confirmed boundaries

- Support has not identified an Advanced-plan architecture meeting the combined approved Wallet requirements.
- Native Store Credit spends earliest-expiring credit, not Core's customer-funded → Gift Card → food-only bonus → Reward source priority. Recording a preferred allocation after payment cannot enforce that allocation at checkout.
- Support did not confirm a supported Advanced mechanism combining credit-lot selection, food-only restrictions and final-submission expiry checks.
- Native Gift Cards can share an initial order with another payment method. This does not approve a custom Wallet/card transaction or automatic fallback after a Wallet failure.
- Native Store Credit and Gift Cards can contribute to an initial subscription purchase, but cannot fund recurring subscription bills.
- Redeemables requires both Plus and an invitation to a closed beta. Support cannot activate it on Advanced; a Payments Partner application does not guarantee admission.
- A payments app cannot use Admin API access or depend on another installed app for its payment function. A separate Core app does not by itself remove these restrictions. The development store is not evidence of production eligibility.
- For Core's own Functions, custom distribution requires Plus; App Store distribution has different availability. That is a distribution/plan decision, not proof of the Wallet payment design.

## Implementation consequence

Retain all approved business policies and keep top-ups/general custom Wallet checkout disabled. Do not recommend purchasing Plus as a guaranteed Wallet solution, implement an undocumented payment adapter, or present a Core-only ledger as checkout enforcement. No plan upgrade, payment setting, customer balance or production resource was changed by this review.

Existing native Store Credit history and the Core audit ledger remain preserved. Provider-neutral planning, recovery and internal concurrency controls can continue locally behind disabled flags. A supported payment adapter and its final-submission/expiry/recovery acceptance remain required before activation. The written review does not authorize lowering the customer's rules.

A native Gift Card-backed redemption mechanism, if investigated, is a separate proposal requiring end-to-end eligibility, expiry, abandoned-checkout, accounting and subscription-boundary proof. Native Gift Card support alone is not approval of that architecture.

## References

- Private case: Shopify Support Inbox, case 71332405 (do not include private transcripts or customer data in public backup).
- [Redeemables availability](https://shopify.dev/docs/apps/build/payments/redeemables/build-a-redeemables-payment-extension)
- [Payments extension restrictions](https://shopify.dev/docs/apps/build/payments/requirements#prohibited-actions)
- [Functions distribution and plan availability](https://shopify.dev/docs/apps/build/functions)

## Approved eligibility follow-up

The user authorized an eligibility-only enquiry. A reply was sent and visibly confirmed in case71332405 asking whether a reusable Core-related integration can qualify for Redeemables, who assesses eligibility before any Plus purchase, which required controls are supported, and how payment-app restrictions affect the permissible architecture. No application, purchase, access grant or payment/store change was made. 26 October follow-up: Support replied that Payments Partnerships decides eligibility through the general Payments Platform Application; Support cannot make an invitation decision or confirm the architecture. The form was inspected read-only. Its documentation-compatibility attestation cannot yet be truthfully made. A further authorized process-only question asks how to obtain assessment before that attestation; no application was submitted. See PAYMENTS-PARTNER-ASSESSMENT-PREPARATION-20261026.md.
