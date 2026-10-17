# Core-first Wallet and checkout investigation — 17 October 2026

## Approved direction

User approved investigating a Core-controlled Wallet for ongoing support and reuse
across clients. Prefer first-party implementation where Shopify supports it.
Third-party tests do not establish a production dependency. No new provider, paid
subscription, plan purchase, historical credit migration or transfer is authorized.
Top-ups remain disabled. Existing native Wallet records/balances remain unchanged.

## Verified platform findings

- Native Store Credit cannot choose the required funding-source priority. Relabeling
  the ledger cannot change which native credit Shopify actually consumes.
- Shopify's redeemables payment tutorial states invite-only closed beta, Plus-only
  installation and enablement for both Partner and test shop. Buying Plus alone
  neither grants access nor proves the proposed Wallet is an accepted use case.
- Payments access requires Partner application and app review; approval is not
  automatic and there is no promised approval deadline.
- Payment extension requirements prohibit other Shopify APIs and requiring an
  additional merchant app. Line items, order ID and checkout ID are not available
  through the Payments Apps API. Adding a payments extension directly to the
  current Admin-API Core app is therefore NOT an established supported design.
- Provider session callbacks do not prove which food/delivery/Gift Card/top-up lines
  were bought. Food-only bonus and exact attribution require authoritative final
  checkout proof. A client attribute or signed earlier quote alone is insufficient.
- Product discounts change prices rather than acting as monetary tender. The
  prior bonus-discount calculation is not an adopted Wallet payment mechanism.
- A temporary native Gift Card does not itself prove owner restrictions, food-only
  spending, final-cart binding, expiry, abandonment recovery or no double spending.
  No card bridge, new provider or debit/re-credit migration was implemented.

Official sources reviewed17October2026:
- https://shopify.dev/docs/apps/build/payments
- https://shopify.dev/docs/apps/build/payments/redeemables/build-a-redeemables-payment-extension
- https://shopify.dev/docs/apps/build/payments/requirements
- https://shopify.dev/docs/apps/build/payments/payments-extension-review
- https://shopify.dev/docs/apps/build/payments/configuration
- https://help.shopify.com/en/manual/customers/store-credit

## Safe independent Core preparation

Existing source-lot allocator is preserved and hardened against impossible or
ambiguous UTC timestamps and unsupported monetary totals. Order remains principal
→ Gift Card → food-only bonus → Reward, FIFO within each source. Principal covers
non-food first; bonus cannot pay delivery or Gift Cards.

New`core-wallet-redemption.ts` is a PURE provider-neutral draft/state machine,
not a durable fund reservation or payment gateway. There is no public endpoint or
connection to balances, native settlement, expiry timers or activation flags.

It binds store/customer/currency, cart/ledger revisions and canonical line amounts;
limits validity to allocated-credit expiry; refuses stale/changed submissions;
preserves unknown outcomes after timeout; permits only definitive zero-value
rejection to release; holds partial/late/conflicting outcomes; recognises the same
receipt once; rejects misordered events and changed allocation snapshots.

Tests DO NOT establish atomic database reservation, provider authentication,
cross-checkout double-spend protection, Shopify eligibility or native settlement.
Before activation: transactional lot locks/CAS plus authenticated supported payment
adapter. Do not create another spendable balance or silently reinterpret history.
A snapshot digest is consistency evidence, not customer authentication.

## Technical questions for Shopify Payments/Support

These are platform questions, not a repeat merchant questionnaire:

1. Can redeemables support a named-customer closed-loop Wallet combining principal,
   claimed Gift Card, Reward and food-only promotional value? Is dev access possible?
2. What plan and approvals apply when reusing it across multiple client stores?
3. What first-party service/app boundary can coexist with Core's Admin API usage
   without violating restrictions on other APIs or requiring additional apps?
4. How can payment handling obtain authoritative final food/delivery/discount/GST
   and product-eligibility data despite the missing cart/order/checkout IDs, with
   secure binding against cart changes or replay?
5. Can Wallet cover part of checkout and a normal card the rest? Can Wallet fail
   while card checkout stays available?
6. What are the authorisation/capture/void, late callback, partial failure and
   resumed-checkout expiry semantics? How is uncertain settlement reconciled?
7. Are initial subscription payments and automatic renewals supported separately?

No application, agreement, new access request or new support message was submitted
for this brief. Check existing support authorisation against the actual destination
before sending. No plan recommendation is established from these findings alone.

## Core-owned shipping candidate

`docs/verification/core-delivery-input-202610.graphql` passes official2026-10
Delivery Customization input-schema validation. It requests native line subtotal,
total and allocated discounts, product/plan metadata and delivery groups/options.

`core-delivery-options.ts` is an offline decision adapter, NOT an active Function.
It subtracts allocated discounts from subtotal and requires agreement with native
total; excludes prepaid/Gift Card/top-up values; charges ordinary food separately;
uses75/125inclusive boundaries and never multiplies native line totals twice.
Unknown GST basis, conflicting money, foreign/duplicate/split lines, multiple
ordinary-food groups or missing rates return HELD/no decisions.

Remaining gates: captured native order/line-discount inputs; verified inclusive
GST/shipping tax; plan/distribution; CLI scaffold/build/runner; native normal/mixed/
draft/resumed checkout QA; verified multiple-ordinary-group policy. No rate was
created. Shipy's original-price failure stays pending; QA rules remain inactive.

https://shopify.dev/docs/api/functions/2026-10/delivery-customization


## Support readback and inclusive-price progress

Latest existing Shopify Support recap explicitly says technical review has not
been completed and no documented combined solution/workaround confirmed. This is
pending review, not a completed rejection of every possible architecture. No new
support message was sent. User-approved development inclusive-price setting is now
on and API-verified;0tax native calculations preserve four product totals. This
does not yet prove nonzeroGST and does not activate the shipping decision adapter.
