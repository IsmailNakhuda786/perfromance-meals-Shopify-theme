# Food-only bonus mechanism: scoped calculation QA

User approved one temporary SGD1 food-only discount, limited to the existing development QA customer and existing Teriyaki Chicken & Brown Rice product. It allowed one use total/one use per customer, applied once per order, did not combine with other discounts and was not promoted. It was deactivated after testing; Shopify status Expired,0 uses. The previous top-up test discount stayed expired. No order, draft, payment, Wallet credit or provider change occurred.

Fresh native product reads verified the food, Gift Card and hidden non-shippable top-up references. Officially validated `draftOrderCalculate` operations produced:

| Calculation | Food discount | Total | Evidence |
| --- | --- | --- | --- |
| One meal + SGD10 delivery | SGD1 | SGD21.90 | Delivery unchanged |
| Two meals + SGD10 delivery | SGD1 total | SGD34.80 | One discount, not per item |
| Food + SGD25 Gift Card + SGD20.01 top-up + delivery | SGD1 | SGD66.91 | Gift Card/top-up line values and delivery unchanged |
| Gift Card + top-up without food | SGD0 | SGD45.01 | No food benefit; native shipping absent for non-shippable items |
| Meal + delivery without eligible customer | SGD0 | SGD22.90 | Customer restriction enforced |

Successful calculation results were preserved. An initial verification expected a shipping line even for the non-shippable negative control; Shopify correctly omitted it. The assertion was corrected to require zero shipping there, and only the remaining negative controls were run. No successful financial operation was repeated.

This proves a native product-discount restriction in these calculations, not an adopted Wallet payment mechanism. A product discount reduces food price rather than acting as monetary tender, so tax/accounting, discount combination policy, source-order reservation, actual paid-order settlement and reversals need review. Draft calculations do not support subscription checkout. No subscription or food-bonus spending acceptance is claimed. No public bonus redemption route is active. Native Store Credit expiry/source-priority differences are handled separately by the newly approved guarded Core-managed expiry investigation.

Private configuration/cleanup screenshots and calculation receipts are retained under Core .shopify. Do not upload customer details or checkout identifiers.
