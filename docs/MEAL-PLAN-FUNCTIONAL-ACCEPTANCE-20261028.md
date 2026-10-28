# Requirement 1 — authenticated Meal Plan persistence

## October 31 assessment: PASS

This is functional development-store acceptance. Permanent hosting, domain and deployment are deferred by the merchant; production rollout remains unaccepted separately. Native initial paid-programme/menu evidence from 11–12 October remains applicable and was not replaced by another payment test.

## Fresh signed-in customer journey

On 28 October the merchant approved an isolated paid-menu test on existing development Order #1009. Native read proof confirmed the original paid order, owner and programme mapping. A complete baseline preserved all existing menu revisions and 36 other protected store model groups.

The unpublished QA theme lacked configured programme choices. Its template was temporarily populated using the existing configured development template, under explicit approval. No product availability, menu data, price or publication change was made. The stopped Core server/expired tunnel was restored; app-proxy requests then reached Core normally. This distinguishes configuration/runtime failure from loss of stored selections.

1. Signed-in storefront restored the paid programme's second four-week block, 9 November–4 December, at 40/40 meals.
2. Changed only Week 5 Mon–Tue from three Herb meals plus one Korean BBQ meal to two of each, retaining four meals in that delivery window and 40 overall.
3. Saved through the authenticated app proxy, reloaded the page and verified independent PostgreSQL readback at revision 30. The customer-account My Plan page showed the same 2+2 choice.
4. Restored the original 3+1 choice through the same screen, saved and reloaded the customer account. PostgreSQL revision 33 exactly matched the original input selections and normalized menu.
5. Original menu-history entries were immutable. Six new menu-history revisions remain as the approved append-only QA audit trail. All 36 other protected model groups matched their baseline; the original paid selection/order mapping, programme dates, operational lines, Wallet and Rewards were unchanged. No payment, order creation, native fulfilment or billing mutation occurred.
6. Restored the unpublished QA theme's original template. The comparison theme remained unchanged. Top-ups, batch QA and billing-link activation remain disabled.

## Ownership, stale saves and persistence

Using the real development database and existing native Admin context, the same service rejected a foreign owner with 404, a foreign shop with 403 and the obsolete revision 27 with 409. No successful write occurred from these checks. This is server-side ownership/revision evidence, not a claim that a second customer's browser was signed in.

The existing programme-menu PostgreSQL regression passed all three cases, including closed-menu immutability, later/final-block quantities and concurrent revision protection. All 37 protected live development-store model groups remained unchanged by the disposable regression. Prior field-matched PostgreSQL import/readback and account startup recovery evidence are retained in the linked documents.

## Evidence

- docs/MEAL-PLAN-LATER-MENU-QA-20261011.md
- docs/POSTGRES-PERSISTENCE-QA-20261012.md
- docs/CORE-ACCOUNT-STARTUP-20261021.md
- Private journal: Core .shopify/paid-menu-acceptance-20261028.private.json
- Local screenshot: /private/tmp/pm-paid-menu-account-edited-20261028.png
- Local restored screenshot: /private/tmp/pm-paid-menu-account-restored-20261028.png

Acceptance covers authenticated saved choices, immutable paid programme identity/dates, menu revisions, reload/persistence and conflict/owner protection. It does not certify subscription payments, Wallet, complete physical fulfilment or permanent production recovery; those remain separate requirements. Core source functionality was preserved; no unnecessary refactor was needed to obtain this evidence.
