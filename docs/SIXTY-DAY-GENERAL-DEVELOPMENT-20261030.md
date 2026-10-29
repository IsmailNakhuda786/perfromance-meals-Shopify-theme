# General 6 by 60 development controls — 30 October 2026

The batch service previously required one hard-coded QA selection. It now supports a bounded merchant programme list when development activation is explicitly enabled without that selector. A configured selector continues to narrow every list, allocation, change and customer read. Default-off and production-denied gates remain unchanged.

Merchant list paging uses stable created-time/ID ordering and rejects foreign/invalid cursors. An unknown selected programme can no longer silently fall back to another record. Every allocation/dispatch still requires fresh native paid-test-order proof, the original 88-weekday/32-frozen snapshot, validated routing and unchanged quantities. Each customer's progress remains independently owner-scoped; operator identity never reaches the customer DTO.

Evidence:

- General-owner disposable tests allocate two different customers' programmes independently, reject foreign native proof and cross-customer reads, preserve each allowance, page the list and reapply the narrower QA restriction.
- PostgreSQL programme group: 11 passed, including the concurrent full-allowance race. This repeats no actual 120-meal native test; all writes were disposable fixtures.
- Actual read-only merchant list found the two existing development programmes. Both are paid Shopify test orders and have saved entitlements. All37 real-shop model fingerprints remained unchanged. No new batch, dispatch or native mutation was made.
- Updated embedded-admin component passed Shopify's validator; general enabled admin mutation acceptance remains unclaimed. Normal customer/admin batch activation stays off.

Requirement3 remains PARTIAL for programme booking, stock/dish allocation and full fulfilment reconciliation. No automatic scheduling pattern or new merchant rule was inferred.

The old test-loader race left19 fake rows in nine customer-booking UUID namespaces. A read-only audit checked the fixture naming/owner, a private recovery copy was saved, and only those reviewed disposable rows were removed. All37 real development-shop model hashes were unchanged. This cleanup did not remove paid customer records.
