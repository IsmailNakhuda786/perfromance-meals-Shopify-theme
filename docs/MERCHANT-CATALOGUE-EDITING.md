# Editing products and packages

Products, prices, photographs and nutrition are Shopify data. The source sheets and import manifests preserve the initial setup evidence; they are not the storefront's runtime price list.

## Individual products

Use Shopify Admin → Products. Open the product to change its name, price, photograph or description. Add new products or archive products through Shopify's normal controls. Do not delete a product used in an active package without first reviewing that package's contents and existing customer commitments.

The new merchant catalogue is currently staged as unpublished drafts. A price of zero on an unresolved draft is a setup placeholder, not an approved free product. Complete and review that record before activation. Existing products remain preserved.

## Bundle contents

Package contents reference actual product variants and quantities through Shopify custom data. They are not copied into the theme as a fixed list of dish names. Use the package's `performance.bundle_contents` entries to review its component records. Each component contains a product, variant, quantity and business stream. Product and variant content references must remain consistent.

Changing a component name follows the referenced product. Changing a component quantity changes package contents; review the package's meal count and advertised price at the same time. A component's individual selling price does not recalculate the approved whole-package price automatically.

The initial thirteen bundle configurations and eight prepaid configurations are staged with reviewed contents. Prepaid configurations contain only three- and six-month variants. A one-month comparison figure must not become a purchasable subscription.

## Nutrition

Nutrition fields and the pending flag are editable product data. Source labels are preserved separately with deck and image hashes. A source label is not approval of its serving basis or an estimate of a whole meal.

Keep `performance.nutrition_pending` true while the serving basis is unconfirmed. The theme hides the unconfirmed nutrition figures. Enter the merchant-confirmed basis, weight and servings only when supplied; do not use the source's zero-weight or incorrect container-count placeholders. Values written with a less-than sign must retain that meaning rather than being rounded to zero or one.

## Activation review

Publishing the development theme or app is outside the current work authorization. The staged merchant products also remain drafts pending catalogue review and purchase acceptance. Before activating a package, check its component availability, exact price, GST treatment, delivery policy and purchase mode. Ready Series delivery-calendar decisions and native subscription checkout acceptance remain open.

Historical orders and paid menu selections must retain their original evidence. Editing today's catalogue is not permission to rewrite a customer's earlier purchase or credit history.
