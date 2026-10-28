# Atomic provisional Ready Series rescheduling — 28 October2026

## Engineering completed

Added a default-off, server-only development transaction for moving an entire combined visit. Previously releasing capacity and reserving a new slot were separate operations; the new transaction moves both together or rolls everything back. Existing reserve/release wrappers preserve their activation gates and use transaction-local helpers.

The move validates owner, original immutable visit/membership/reservation, paid package entitlement and configured notice before both dates. Stable slot locks precede draft locks. It releases exactly one old place, increments every member draft revision, supersedes old draft reminders, creates the replacement reminder set and reserves one new place. Other occurrences, quantities and billing remain unchanged. Retries return only the exact existing replacement; a manually released visit or corrupt release history cannot create a new booking. Closed/full/stale targets, missing paid proof and inconsistent reminder states retain the original state.

## Verification

- Full disposable regression:612 passed,1 PostgreSQL-only skip,0 failed (613 total).
- TypeScript and lint passed.
- PostgreSQL:17 reservation/reschedule cases plus1 separately added edge case passed. Both runs independently preserved all37 real development-store model fingerprints. The skipped full-suite case was not rerun by this focused group; its prior separate evidence remains separate.
- Merchant separately approved a provisional Core-only test on paid development Order#1031. Fresh native reads verified its two package types, exact shared Singapore destination and complete absence of dispatch. Only opaque destination identity entered Core; no address was copied into visit records.
- Created two clearly labelled provisional slots on11/12November09:00–12:00Singapore time, with two occurrence2 draft members. Closing the replacement slot made the move fail with all prior state intact. Reopening allowed both packages to move together using one capacity place. Replay retained the same visit and counts. Each old four-message reminder set was superseded and each replacement set retained exactly four draft messages.
- Removed all temporary slots, reservations, visits, members, reminders and drafts. All37 protected Core model fingerprints and the native order fingerprint matched baseline exactly. No native Shopify mutation, actual booking, dispatch, message, billing, payment, Wallet or Rewards change occurred.

## Remaining acceptance boundary

This is an internal provisional transaction with actual native-linked QA evidence, not an enabled customer booking journey. It returns bookingConfirmed=false and has no customer endpoint. Requirement13 remains PARTIAL: authenticate the eventual customer command, fetch authoritative merchant policy and fresh native dispatch/destination at that boundary, bind the real physical delivery occurrence, then complete customer/UI/native acceptance before activation. Ready Series recurring billing remains held and Wallet top-ups stay disabled.

Private evidence: Core .shopify/reschedule-native-qa-20261028.private.json (RESTORED), reschedule-postgres-20261028.private.json and reschedule-postgres-edge-20261028.private.json. Private record details and credentials are excluded from public backup.
