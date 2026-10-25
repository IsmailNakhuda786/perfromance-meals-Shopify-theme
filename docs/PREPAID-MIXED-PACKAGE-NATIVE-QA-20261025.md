# Mixed prepaid-package native QA — 25 October 2026

Development store only; user submitted the initial test payment. All amounts are simulated Shopify test money.

| Evidence | Expected SGD | Actual SGD |
| --- | ---: | ---: |
| Initial order #1026, one 3-delivery plus one 6-delivery package | 748.80 | 748.80 |
| Three-delivery renewal #1027 | 255.20 | 255.20 |
| Six-delivery renewal #1028 | 493.60 | 493.60 |

Initial corrections total0.03; renewal corrections0.01/0.02 persisted. Delivery0; GST0 in this setup. This does not establish charged nonzero-GST acceptance or correct all recurring-price displays.

Two native contracts share the initial order. Core has four validated lines: two original package lines and one renewal per contract. Each contract has exactly two native orders and one uniquely keyed billing attempt. Actual provider success callbacks were durably received; explicitly invoked workers and replay preserved all records. The original mixed order allocates three/six fulfilment entitlements of quantity1; each renewal preserves its corresponding quantity. Shared original order rows must be filtered by their contract, not asserted to all belong to one contract.

Both QA contracts cancelled after verification; no refund. Six earlier paid native orders and their24 fulfilment records remain unchanged. Original mixed and renewal delivery records also unchanged. Nine Wallet/Rewards/financial models compare unchanged against the pretest snapshot. No real payments or Wallet credits.

Cleanup: QA product draft/unpublished; both variants removed from isolated profile (original3 products restored); both temporary discounts expired; plan prices restored255.20/493.60; two QA-only theme files removed; fifth QA callback deleted; normal preview restored with renewal feature off and four callbacks refreshed. Raw proof and identifiers remain ignored locally under Core .shopify/mixed-*20261025.private.*.

Production acceptance remains1 PASS/10 PARTIAL/0 FAIL/4 BLOCKED. General exact-price correction provisioning/display, automatic purchase registration, permanent worker hosting, Wallet architecture/expiry and Wallet-funded renewals remain blockers. Wallet top-ups remain disabled.
