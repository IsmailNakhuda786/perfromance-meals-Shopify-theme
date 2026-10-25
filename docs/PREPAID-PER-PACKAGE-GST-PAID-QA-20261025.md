# Per-package charged GST acceptance — 25 October 2026

Development only. Wallet top-ups remain disabled. This evidence does not approve launch.

| Check | Expected | Actual |
| --- | --- | --- |
| Two 3-delivery packages, initial test order #1029 | SGD 510.40 | SGD 510.40 |
| Included initial GST | SGD 42.14 | SGD 42.14 |
| Initial delivery | Free | Free |
| One approved simulated renewal, test order #1030 | SGD 510.40 | SGD 510.40 |
| Included renewal GST | SGD 42.14 | SGD 42.14 |
| Renewal delivery | Free | Free |
| Correction | SGD 0.01 per package, SGD 0.02 total | Saved per-item correction, initial and renewal |
| Fulfilment allocation per order | Three deliveries, quantity two each | Three deliveries, quantity two each |

Both orders are test orders; no real card or Wallet credit. One initial payment was submitted by the user; one approved simulated renewal was requested once with a stable idempotency key. Shopify's real subscription-create and billing-success events were observed in durable inboxes. Explicit bounded worker processing linked the original and renewal order to the correct customer/contract; replay retained the same records. Permanent automatic worker scheduling is still outstanding.

Native readback confirmed previously paid delivery records unchanged, and all nine protected Wallet/Gift Card/Rewards/cancellation financial-model snapshots unchanged. Future renewals on this new QA contract were cancelled; paid deliveries remain intact. No refund was issued.

Cleanup verified: QA product draft and unpublished; original three-entry isolated shipping profile restored; temporary Singapore GST collection removed; both new QA discounts deactivated; both QA preview files removed from the unpublished theme and their absence read back; temporary billing-success callback removed; normal preview restored without the intake/renewal QA flags and four callbacks reconnected exactly once. Hidden QA pricing versions and cancelled test records are retained as evidence. No production change or theme publication.

The new quantity-scaled mixed 3-/6-delivery paid GST scenario remains approved but not yet started: SGD 748.80 initial plus SGD 255.20 and SGD 493.60 simulated renewals. Remaining approved simulated cap SGD 1,497.60. Do not repeat orders #1029/#1030 or their renewal request. Temporary discounts and availability must be reopened deliberately; final initial payment remains a user handoff.

Engineering checkpoint b2adeb4: immutable explicit PER_PACKAGE approval, quantity-aware correction candidate, legacy approval compatibility. Full disposable Core suite 522/522, focused PostgreSQL intake/selling-plan suite 23/23, TypeScript and lint passed. Official theme check: zero errors, three pre-existing excessive-settings warnings. Toolkit Liquid validator was unavailable due to a missing dependency; CLI theme validation was used instead.

Next independent gap: the inactive paid-delivery draft planner still uses the strict undiscounted inspector. Add a separately authenticated registered-purchase-evidence path for accepted corrected payments; do not weaken the legacy inspector or alter native paid deliveries. This was identified but not implemented in this session.

Private raw proof remains in ignored .shopify journals; no credentials/customer identifiers are included here. Acceptance remains 1 PASS / 10 PARTIAL / 0 FAIL / 4 BLOCKED. Passing this scenario does not complete all subscription, fulfilment, Wallet or permanent-infrastructure requirements.
