# Privacy intake and audit gate — 19 October 2026

The user approved retaining a minimal payment audit trail without names, email
addresses or postal addresses. This is not a merchant-approved legal retention
period, an assertion of irreversible anonymisation, or permission to erase a real
customer during QA. Native transaction references must remain access-controlled.

## Corrected safety boundary

The previous authenticated compliance handler immediately deleted Wallet/Rewards
ledger and cancellation records, removing duplicate-payment protection, but omitted
newer Gift Card, top-up, menu and reminder tables. Shop erasure also used multiple
independent transactions. This was neither complete erasure nor a safe audit policy.

Verified customer export, customer erasure and shop erasure notifications now
persist a PENDING_REVIEW operation plus a delivery receipt atomically. Repeated
deliveries reuse the same bound request. Reusing its identifier with another
customer/topic fails. Unknown topics, invalid customer IDs, unsafe numeric IDs,
foreign stores and missing delivery IDs cannot create requests. The official
Shopify webhook authentication boundary remains first. Invalid input returns400;
persistence failures remain retryable. Payload email/phone/address data is not
copied into the queue. Customer ID is retained only to process the pending request.

Read-only customer inventory covers all19direct customer models plus indirect
selection operations and migration mappings. All26current models have an explicit
classification, tested against the canonical schema. Inventory returns counts,
not customer/menu/checkout contents. No migration, real erasure, export delivery,
native credit/debit or external message was performed.

## Remaining production gate

Intake acknowledgment does **not** complete the request. No automated erasure
worker, audit projection, financial in-flight reconciliation, request export,
deadline monitor or production compliance acceptance is claimed. The remaining
execution must remove personal data and reminders while preserving the approved
minimal receipt/deduplication evidence; pending or unknown financial outcomes need
review before erasure. The merchant must approve required retention periods and
any legal hold. Pending requests require operational review within Shopify's
documented deadline, rather than remaining indefinitely in this queue.

Official reference: [Shopify privacy-law compliance](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance).

## Verification

Eight isolated SQLite-backed tests cover full-schema classification, scoped newer
records, durable export/shop/customer request intake, replay protection, invalid
input, concurrent duplicate deliveries and authentication-before-persistence.
An existing settled credit can be replayed after intake without changing its
Wallet balance or creating another ledger entry. This proves safe **pending
intake**, not post-erasure settlement safety. No customer record was erased.
