# Gift Card claim acceptance — 26 October 2026

Development-only, user-approved SGD 1 named-recipient test. No real charge, customer email, production change or top-up activation.

## Native evidence

- User performed the final Redeem click in the customer account preview.
- Shopify Gift Card remaining value: SGD 0; exactly SGD 1 credited to the intended QA Wallet.
- Core claim COMPLETED with matching native Gift Card debit, Store Credit credit and one source-attributed ledger entry.
- Original Gift Card expiry 26 October 2027 retained in the claim and computed credit term (Singapore end of day). No new year was assigned on claiming.
- Replay through the real claim service with all financial methods replaced by failing sentinels returned alreadyCompleted; zero financial calls.
- Native and Core Wallet balances both SGD 1 before cleanup; ledger and source attribution matched.
- Approved cleanup removed only that test credit, retained the credit/debit audit records and deactivated the test Gift Card. Native and Core balances returned to SGD 0 with no reservations. Rewards, top-up settlements, operational lines, delivery drafts and reservations remained unchanged during cleanup.

## Demonstrated UI failure corrected

An account refresh temporarily clears account data. The Gift Card view incorrectly treated that unknown state as a disabled merchant policy and hid the success message. It now distinguishes loading/error from a confirmed disabled policy, preserves the result during refresh, and offers no redemption control until account data is loaded. Three component render tests cover loading/error, persistent success, and policy/Wallet gates.

## Verification and limits

558/558 disposable Core tests pass; TypeScript and lint pass. Shopify component validator could not run because its bundled TypeScript dependency is missing; no validator success claimed. Existing native claim flow was verified before the display-only change; no second transfer was performed to test display changes.

Original expiry retention is proven in the immutable claim/term. This test did not create a WalletCreditExpiry row because Core-managed expiry remains disabled. It does not prove native checkout expiry enforcement, permanent scheduling, automatic reminders or the unresolved Wallet architecture. Requirement 8 remains PARTIAL, not PASS.

Private receipts and card code remain in ignored .shopify files; no secrets are included here. Cleanup journal state COMPLETED. Next work: persistent combined delivery visits/capacity, Wallet platform eligibility, and permanent recovery/scheduler acceptance.
