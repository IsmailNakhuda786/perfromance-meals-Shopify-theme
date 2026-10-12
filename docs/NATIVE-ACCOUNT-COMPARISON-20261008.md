# Native customer account comparison — review checkpoint

Source: approved customer commit `58272e4e011d03249b196d392319ad22fa8dc0ca`, `src/pages/AccountPage.tsx`. User approved preparing a Shopify-native comparison before deployment. This document compares implementation responsibilities; it is not a rendered visual preview or proof of completed functionality.

| Approved Figma section | Shopify-native implementation to compare | Current implementation / remaining work |
| --- | --- | --- |
| Dashboard | Branded full-page account extension, native layout components; actual customer name, plan summary, monetary wallet, points and next billing only from verified records | Existing extension does not implement Dashboard. Source customer name, 1,234 points, plan week and generated next-billing date are illustrative and must not be ported as live data. |
| My Plan | Preserve Meal Plan / Ready Series context, approved programme names and real subscription details; saved selections from authenticated Core | Existing extension lists saved Meal Plan windows only. It does not establish native subscription-management actions or full Ready Series account presentation. |
| Order History | Shopify native order index and order status, shared customer and original order | Preserve unified order history. Do not recreate prototype orders or divide customer history into separate department accounts. |
| Wallet | Native account components displaying independently attributed funded, Gift Card funded and bonus ledger data | Existing endpoint exposes funded and bonus aggregates; it does not separately project Gift Card-funded balance. Preserve in-progress ledger attribution work; do not display an invented split. Top-up and settlement require verified native payment proof. |
| Rewards | Native full-page sections for verified points, earning/redemption and transaction history | Existing endpoint exposes an enablement flag, not a complete persistent rewards balance/history. Prototype demonstrations are not working reward transactions. |
| Gift Cards | Native issuance/redemption plus authenticated Core conversion where verified; preserve Gift Cards label | Do not simulate conversion or reveal full codes. Purchased Gift Cards stay shared commerce; Gift Cards cannot fund recurring renewal charges under the verified Shopify limitation. |
| Settings | Native Shopify profile, addresses and supported payment/preference management | Do not port hard-coded Jerome contact details or prototype success messages. Custom reminder/menu preferences need a real persisted implementation. |

## Visual boundaries for the forthcoming browser comparison

Preserve approved labels, section order, content hierarchy and Performance Meals branding where Shopify supports them. Native customer-account extensions use Shopify web components and inherited merchant branding, with no custom CSS override. Exact Figma sticky tabs, black identity strip, typography, border geometry and spacing must therefore be compared explicitly rather than claimed pixel-identical.

Use a development preview, show desktop/tablet/mobile captures, and separate supported visual adaptation from unavailable functionality. This checkpoint does not approve deployment. No new account UI was deployed.

Official references:
- https://shopify.dev/docs/apps/build/customer-accounts/full-page-extensions
- https://shopify.dev/docs/api/customer-account-ui-extensions/latest/web-components
- https://shopify.dev/docs/apps/build/customer-accounts

## Resume next

1. Prepare the actual native-component development preview and screenshots for user review before deployment.
2. Verify the already-uploaded individual cart layout in browser; commit only the relevant cart files after verification.
3. Finish source catalogue imagery audit and remaining subscription/persistence work, retaining existing QA evidence.
4. Preserve the existing dirty Core/schema/test/migration work; do not reset, stash, discard or commit it as though newly verified.

The broader Customer/Core task remains incomplete. Permanent Core hosting/PostgreSQL, authenticated Meal Plan persistence, complete prepaid/recurring contract QA, wallet settlement/conversion/renewal verification and persistent rewards still require completion. No Admin UI work is authorized in this phase.
