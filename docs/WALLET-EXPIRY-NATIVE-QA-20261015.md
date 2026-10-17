# Native Wallet expiry QA — 15 October 2026

User specifically approved one temporary SGD 1 development credit and expiry test. Only Performance Meals Development and the existing QA customer were used. Private receipts and the execution record remain under Core `.shopify/expiry-approved-qa.private.json`; they are excluded from Git.

Results:
- Verified zero native/Core balance before the test; top-ups disabled.
- Issued exactly one SGD 1 native test credit, with notifications off, and recorded its native receipt in Core.
- Registered the actual credit with its normal one-year Core term.
- A worker call immediately before expiry rejected the debit.
- A worker call immediately after expiry completed one SGD 1 native debit and one attributed Core expiry entry.
- Repeating the completed worker made no second debit.
- Final native and Core balances are SGD 0.00; reserved amount is zero; ledger balance and funding attribution agree.

The worker clock was simulated at the stored future expiry instant. The store clock and one-year policy were not changed. This verifies real native settlement and repeat protection, not a year of scheduler operation or protection during scheduler downtime.

The initial registration held because the process activation timestamp included milliseconds later than Shopify's second-resolution receipt. Recovery reused the saved credit and entry with a scoped process boundary one minute before that test entry. No second credit was issued. No shared runtime flag was enabled, and historical credits were not reinterpreted.

Remaining: reliable scheduler, overdue-credit checkout protection, reminder sender/delivery, food-only bonus settlement and complete paid package QA. Top-ups remain disabled. User approved one labelled reminder to the QA email once a suitable sender is configured; new service access/cost requires separate approval.
