# Development inclusive-price QA — 17 October 2026

User specifically approved enabling “Include sales tax in product price and shipping
rate” in Performance Meals Development only. This checkbox changed fromofftoon
and was saved. Other tax configuration, Singapore registration, shipping-tax
checkbox, payments, product prices, shipping rules and production were unchanged.

Fresh Admin API2026-10readback confirms expected dev store, SGD, Asia/Singapore and
Shop.taxesIncluded=true. Query schema validated by official toolkit. Shopify Admin
continues to show Singapore “Not collecting” and assumes0% because no regional tax
registration exists. No registration number or invented tax rate was entered.

Native draftOrderCalculate calls used the existing unpublished taxable merchant
variants. Fresh native prices/status/taxability were read first. No draft/order was
created, invoice sent or transaction performed. Calculations excluded automatic
discounts and did not request shipping, so they are NOT delivery-fee acceptance.

| Calculation | Current native base price | Calculated total | Included flag | Tax |
| --- | --- | --- | --- | --- |
| Individual draft meal | SGD11.90 | SGD11.90 | true | SGD0.00 |
| Mixed bundle | SGD109.80 | SGD109.80 | true | SGD0.00 |
| Ready Series prepaid | SGD255.20 | SGD255.20 | true | SGD0.00 |
| Prepaid plus individual meal | SGD267.10 | SGD267.10 | true | SGD0.00 |

These prove saved inclusive-price configuration and current zero-tax price
preservation only. Nonzero inclusive GST breakdown/rounding, shipping GST, genuine
native subscription checkout and supported mixed-cart shipping remain acceptance
gates. Do not mark tracker#5complete or set a shipping-verification activation flag.

Receipts/scripts remain in ignored Core.shopify files. Setting screenshot:
/private/tmp/pm-dev-inclusive-price-setting-20261017.png. No sensitive identifiers
or credentials are required for the public test report.
