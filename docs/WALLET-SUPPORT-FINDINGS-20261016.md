# Wallet support findings — 16 October 2026

Development store: Performance Meals Development. User authorized the technical support conversation. No account, payment-provider or production changes were authorized or made.

## Advisor result

Ana stated after consulting support resources/specialist that Shopify's native Store Credit does not support:

- The required custom funding-source spending priority.
- API selection of a particular credit lot.
- Food-only credit restrictions.

For resumed checkouts, she confirmed the documented end-of-day expiry timing but could not identify a documented final-submission safeguard for an already-applied expired balance that preserves card payment. This is a documentation/acceptance gap, not proof that every native resumed checkout necessarily spends expired money.

Private screenshot: Core `.shopify/evidence/wallet-native-limitations-20261016.jpg`. Conversation reopened at the known Help Center conversation URL, currently browser3/tab9. Earlier case71105866 is the referenced closed case; a new active case reference and monitored written reply route have not yet been provided.

## Consequence

Keep customer-funded → Gift Card → bonus → Reward priority. Do not substitute earliest-expiry-first, and do not block the entire checkout to compensate for an overdue Wallet worker. Both alternatives were rejected by the user.

Core's ledger and guarded expiry implementation do not establish that native checkout enforces this combined policy. Do not enable top-ups or bonus settlement based on unit tests, a successful one-time payment, or a scheduler alone.

No Shopify Plus upgrade is justified by this answer. Ana has been asked whether Plus changes these specific capabilities and whether a documented alternative can satisfy the combined requirement. Any app recommendation must demonstrate server-side enforcement, resumed-checkout safety, card-only payment availability, source accounting, food-only bonus restrictions and exact reconciliation before adoption.

## Still requested

1. Written confirmation of any Plus-specific difference, if one exists.
2. A supported alternative with documented controls, rather than a feature-request acknowledgement.
3. Current case/escalation reference and an actual monitored reply route.

Continue catalogue, account, programme and non-financial Core work while this architectural constraint is resolved. Do not repeatedly ask the merchant to approve already-rejected compromises.

## Plus follow-up received

Ana subsequently confirmed that Shopify's documentation does not establish that Plus unlocks the specific required controls. She offered Sales/Support contact, but no supported architecture or alternative app was identified. No Sales contact or upgrade was authorized. Active case number/monitored reply route are still requested. Private latest screenshot: .shopify/evidence/wallet-support-plus-findings-20261016.jpg.
