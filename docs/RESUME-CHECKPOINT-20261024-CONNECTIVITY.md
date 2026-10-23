# Resume checkpoint — recovered Core connectivity

Starting checkpoint `e066401`; development only. Current work is recorded in `CORE-CONNECTIVITY-RECOVERY-20261024.md` and both production-acceptance matrix files.

Completed: restored preview/callbacks; recovered existing orders #1020–#1023 with exact native payment/attempt ownership proof; linked renewals; two complete replays unchanged; all 18 native paid fulfilments preserved; signed synthetic HTTP replay 200 twice and invalid signature 401; current account My Plan renders recovered subscriptions and existing programmes. Corrected the earlier misinterpretation of gross recurring subtotal. Nonzero-GST calculation-only projections pass; temporary tax collection restored.

Tests: 463/463 disposable SQLite regression; seven new focused PostgreSQL tests pass. Full remote PostgreSQL runs hit connection/transaction timeouts, explicitly not a clean production database gate. TypeScript and lint must be checked before committing this checkpoint.

Status: 1 PASS / 10 PARTIAL / 0 FAIL / 4 BLOCKED. Top-ups disabled. No new orders, native charges/captures/refunds, Wallet changes or paid-delivery edits in this recovery session.

Next: prove a fresh provider-originated event using an authorized development action; implement permanent durable ingress/reconciliation and automatic native-proof-bound renewal association; finish production correction lifecycle and native GST subscription journey. Full Wallet priority/expiry/bonus architecture and Wallet renewals still depend on Shopify eligibility. Do not infer production readiness from the manual recovery.

Private current preview origin, process session and raw receipts live under Core `.shopify/recovery-resume-20261023.private.json`; they are deliberately excluded from public GitHub. The development tunnel is temporary and may need another existing-session refresh after stopping. Do not reset work or regenerate the project.

Unrelated working changes and untracked catalogue scripts remain preserved. No production deployment or payment-setting change is authorized by this checkpoint.
