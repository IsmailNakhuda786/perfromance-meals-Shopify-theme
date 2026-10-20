# Unpublished14-item bundle paid-order QA —20October2026

User approved one development-only test: the approved Low Carb + Just Protein
Mixed Bundle at SGD109.80plus SGD5delivery, cappedSGD114.80, dummy gateway only,
no real card or Wallet. User performed the final payment click.

Before checkout, native product/variant and14component records exactly matched
the approved merchant sheet and quantities. Product remained DRAFT. Draft order
creation was guarded against repeats/unknown outcomes, used one native variant,
quantity1and required stream properties, with discounts disabled. No invoice email
was sent by Core. Full receipts/identities/checkout URL/screenshots remain private.

Independent native readback confirms COMPLETEDdraft, test=true, PAIDorder,
SGD114.80total including SGD5shipping and one successful bogus-gatewaySALE for
the full total. Core saved one VALIDATED ready_series operational line. Native
product/variant metadata and all14components are unchanged after purchase.

This is unpublished draft-checkout/order-routing evidence. Its SGD5shipping was
explicitly prepared on the draft; it is not a new native shipping-Function proof.
It does not prove all13bundles, inventory/component expansion, immutable production
bundle snapshots, subscription fulfilment or general activation.

## Callback race found and fixed

The real created/paid notification race exposed P2002 on the same OperationalLine.
One routing transaction succeeded; another attempted the same unique insert.
Core now permits one bounded fresh transaction only for OperationalLine or
WebhookReceipt unique conflicts. It re-reads/revalidates the winner, preserving
identity/quarantine checks and transactional selection binding. It does not repeat
Shopify reads, payments, credits or external mutations. Other failures propagate.

361Core tests/typecheck/lint pass;6focused PostgreSQL routing/ownership/concurrency
fixtures pass with scoped cleanup. Same-line created/paid/updated and duplicate
events leave one line and exactly the expected receipts. No new migration.

Development preview and its existing callbacks were restored before payment.
No production, theme publication, payment provider or paid service change. Wallet
top-ups and broader activation remain off.
