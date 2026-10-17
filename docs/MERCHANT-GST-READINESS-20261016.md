# Merchant GST-inclusive pricing readiness

Read-only development check,16October2026. No tax settings, registrations or prices changed.

Shopify's native Shop.taxesIncluded flag is false. All57new merchant draft variants have taxable=true and remain DRAFT. The price-tax query passed official2026-10 schema validation. Native receipt is private in work/merchant-drafts-20261016/tax-readback.json.

Jerome's supplied bundle and prepaid prices include GST. The development store's exclusive-tax mode therefore does not establish the intended final checkout total. The flag alone is not proof that an extra tax amount is currently charged: actual registration, market and checkout evidence still need inspection.

Before catalogue activation:

- Verify the authorised store's applicable tax configuration with the merchant.
- Check that an approved GST-inclusive package total does not receive unintended additional tax at checkout.
- Verify the displayed included GST against native tax lines and order totals.
- Verify ordinary-food shipping thresholds separately from delivery-included packages.
- Use only identified development QA; do not activate registrations or modify production settings as part of this read-only review.

Five individual draft prices are still unresolved; zero values there are staging placeholders, not approved free products.23individual prices and29package variant prices already match their reviewed source values. Tax configuration is separate from that base-price verification. No full pricing/shipping acceptance is claimed.

## Native calculation evidence — resumed checkpoint

Four `draftOrderCalculate` calls, using existing draft variants and a Singapore QA destination, returned approved base prices: SGD 11.90 individual, SGD 109.80 mixed bundle, SGD 255.20 prepaid variant, and SGD 267.10 mixed prepaid/individual. Each returned `taxesIncluded: false` and SGD 0 tax. This is not evidence of a correct GST-inclusive breakdown or merchant tax registration. No draft order, payment, tax registration or setting was created/changed. Shipping was not selected, so returned totals exclude delivery. The prepaid variant calculation did not select a selling plan and is not subscription checkout verification.

The new pure Core quote reviewer distinguishes base-price matching, inclusive/exclusive tax evidence and offered shipping fees. It always marks checkout and subscription acceptance false. It rejects mismatched line identities/quantities, malformed money/currencies, duplicate rates and tax exceeding total. Actual private receipts were reviewed with this checker; sanitized findings are recorded here and in the delivery policy. Private rate handles and QA address remain out of version control.
