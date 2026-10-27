# Paid deliveries after stopping future renewals — 27 October 2026

A regression demonstrated that registered prepaid delivery preparation rejected every cancelled subscription, including a customer-confirmed stop of future billing. The confirmed stop must preserve already-paid deliveries.

Core now permits that path only with a completed, timestamped stop audit and a fresh read confirming the same native cancelled contract, owner, original order and exact package-line binding. Payment, quantity, schedule, ownership, refund/cancellation and dispatch checks remain required. Missing, incomplete, foreign or changed evidence fails closed. Turning off new stop requests does not erase a previously confirmed paid entitlement.

Verification: 574/574 full disposable Core tests; 27/27 focused PostgreSQL checks; TypeScript and lint pass. PostgreSQL fixtures used random namespaces and were removed; all 37 existing business-model snapshots stayed unchanged. A separate read-only check of the existing native QA stop audit confirmed the binding with one Shopify read, zero financial mutations and all nine protected data groups unchanged.

This fixes internal paid-term preparation. It does not activate customer booking, resume billing, change an existing paid delivery, issue a refund or prove the entire fulfilment journey. Top-ups remain disabled. Private receipts/logs remain outside Git.
