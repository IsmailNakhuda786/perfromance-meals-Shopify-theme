# Quantity-aware prepaid pricing — unpaid native QA, 25 October 2026

The customer approved a development-only per-item correction comparison. No order or payment was submitted.

| Cart | Gross SGD | Correction SGD | Native cart and checkout SGD | Delivery | GST |
| --- | ---: | ---: | ---: | ---: | ---: |
| One three-delivery package | 255.21 | 0.01 | 255.20 | 0 | 0 |
| Two three-delivery packages | 510.42 | 0.02 | 510.40 | 0 | 0 |
| One three- plus one six-delivery package | 748.83 | 0.03 | 748.80 | 0 | 0 |

The same per-package automatic discount settings (`appliesOnEachItem: true`) were used across these quantities. No manual quantity-specific discount resizing was required. Native cart quantity is package count; fulfilment/order quantities are a separate native representation.

All checkouts were left unpaid. The cart was cleared; the QA product returned to draft/unpublished; both variants left the isolated profile, restoring its original three products; both temporary discounts expired; original selling-plan prices restored; both temporary theme files removed and absence read back. Existing QA subscriptions still have exactly their original initial/renewal orders and one billing attempt each.

This does not prove the setting persists through a paid contract or renews correctly. The customer separately approved fresh isolated pricing versions, two test purchases and corresponding renewals, capped at SGD2,518.40 simulated money. Initial payments require user handoff. That follow-up remains pending; this document claims only the unpaid comparison above.
