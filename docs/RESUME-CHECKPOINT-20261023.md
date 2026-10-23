# Resume checkpoint — 23 October 2026

## Verified this run

- Exact manual prepaid-correction projections at255.20/493.60 inspected through the real calculation API; no contract commit/payment. Checkout propagation and actual exact renewals remain unverified.
- Future-renewal-stop backend, customer-token endpoint, durable intent/recovery and hidden account control implemented. Explicit confirmation, one-request client, timeout/late-response holds and unknown-outcome safety are covered.
- **432 Core tests pass**, plus TypeScript, lint, production schema mirror and local account-extension bundle. The UI Toolkit validator lacks bundled dependencies/type index and is not counted as passed.
- Additive renewal-audit migration applied to the development database only;24migrations now applied,14protected model hashes unchanged,0operation rows, activation off.
- Fresh native readback confirms both cancelled QA contracts left all9original paid fulfillment records and original order quantities/dates/statuses unchanged. Historical routing quarantine is preserved.
- Shopify pricing case71363301 contains written guidance on manual corrections; it does not prove completed exact-price integration. Wallet case71332405 has the approved eligibility follow-up sent; response pending.

## Next approved native test

The user approved one new correctly routed3-delivery subscription purchase, capped at255.20simulated SGD; known native255.18 remains a separate release hold. Test is to cover the authenticated future-renewal-stop control, unchanged paid deliveries and repeated-request safety. Final test payment stays with the user. No additional renewal charge is authorized.

Private restricted3-term form is prepared and Liquid-validated but not uploaded. It includes production stream/schema properties and is restricted to the QA account/product/3-term variant. Original QA product was freshly read asDRAFT with original255.20/493.60price policies. No new native product/theme/payment change has been made for this test.

The old development tunnel is unavailable. Shopify CLI was restarted for the existing development app; the initial accepted login could not be saved under restricted Mac permissions. An appropriately scoped elevated restart now waits for the replacement authorization. See ignored private development log for current session details. Do not delete CLI preferences or reset the project.

After login: verify preview, callbacks and test mode; temporarily expose only the existing QA product and upload only the private QA files to the unpublished theme; verify cart has exactly one3-term subscription, correct stream/schema markers, no Wallet credit and simulated total within cap; hand payment to user. Scope renewal-stop activation to the new contract/customer only after validated ingestion. Restore product/theme/flags after QA. No production publication.

## Safety

General top-ups, Wallet settlement, subscription sales and management, Rewards and automatic refund activation stay disabled. Original business rules, exact catalogue prices and paid entitlements are preserved. No assumed calendar dates/slots. Preserve unrelated dirty deployment/checkpoint/catalogue/theme-test work. Keep private native data, environments, auth sessions and local QA records outside public GitHub snapshots.
