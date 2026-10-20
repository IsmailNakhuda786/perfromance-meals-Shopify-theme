# Ordinary-food delivery fees —20October2026

## Confirmed business rule

User chose a fee per actual delivery. SGD80ordinary food split into two separate
SGD40deliveries costs SGD10+10delivery, not the SGD5whole-order tier. Each delivery
uses ordinary food after allocated discounts: below75→10;75to below125→5;125or
more→free. Prepaid packages remain delivery-inclusive and do not qualify ordinary
food for reduced/free delivery. Gift Cards/top-ups remain excluded.

## Implemented internal calculation

Core accepts an explicit trusted mapping of native checkout group IDs to verified
physical delivery references. It calculates each delivery separately. Several
technical groups representing one physical delivery share one fee; the stable
first group carries that fee, the remaining groups require configured zero rates.
Missing/duplicate/foreign/malformed mappings or unavailable rates return HELD and
no decisions. Native quantities/totals and allocated discounts are still used once.

The isolated Function wrapper does NOT accept these mappings from browser data or
shop-wide configuration. Its multi-ordinary-group path remains HELD until native
schedule binding is implemented and proven. No Function upload/activation, shipping
rate/profile change, checkout, purchase or payment was performed for this update.

The read-only order audit now returns unknown chargeMatches/expectedFeeMinor when
ordinary-food scheduling is unverified; its single-delivery estimate stays labelled
as an estimate. An internal caller may explicitly provide verified single-delivery
context. Shipping-line count alone is never treated as physical delivery count.
No existing order or historical audit evidence was rewritten.

## Verification and remaining gate

360Core tests, typecheck/lint and25official locally compiled WASM fixtures pass.
Source snapshots and reviewed hashes are synchronized. Production schema consistency
check passes; no schema/migration change. The first runner attempts exposed its
isolated-app/PATH requirements, then passed in the existing isolated generated app.
CLI automatic upgrade attempted after one build and failed for OS permissions; no
upgrade was accepted or forced. Final fixture run used CI mode with auto-upgrade off.

Remaining: authoritative native delivery mapping, split-line value/quantity allocation,
per-delivery native subscription/group checkout acceptance and production distribution.
This update does not establish native multi-delivery enforcement or mark#5complete.
