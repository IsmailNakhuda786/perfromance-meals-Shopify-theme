# Native storefront commerce QA

This tooling targets only `performance-meals-development.myshopify.com`. It does not create an Admin app or change a live/client store. Requires Shopify CLI store authorization; tokens are managed by CLI and are never written to these files.

The CLI is installed locally at work/shopify-cli/node_modules/.bin/shopify. These source scripts operate from the repository root using work/commerce-qa as the execution/state directory. Copy the scripts there before a resumed setup. Retain work/commerce-qa/created.json: it checkpoints each created resource and prevents duplicate creation after interruption. Do not delete state or rerun against a different store. Inspect native records before any additional execution.

Validated API version: 2026-10. audit.graphql inventories resources; environment.graphql verifies the dev plan/currency/account mode; readback.graphql verifies native references and selling-plan policies. operations.json contains validated mutation documents. seed.mjs creates missing merchant-owned definitions and seven DRAFT test products; connect.mjs writes values/references, creates plans/content and activates test-data visibility, and must only run after explicit approval for staging data visibility. media.mjs attaches approved source images only to QA products.

No product, page, collection or menu deletions are included. Existing sample product records are preserved. Only QA resources use the pm-qa prefix/pm-storefront-qa tag. The existing native Gift Card is selected in the draft theme. Its 10-denomination variant inventory policy was changed from DENY to CONTINUE for staging QA because tracked stock was zero; the other three denominations were preserved. gift-readback.graphql and gift-availability.graphql document this exception.

The four changed theme data-selection files live under work/commerce-qa/configured-theme. They select test programme products, the native gift card and the supplementary menu only; they should not be copied into a production package as merchant defaults.

Integration boundaries: bundle component metafields display predefined contents but do not decompose inventory. Native Shopify Bundles configuration is needed for one-time component inventory. Recurring component inventory and renewal/contract operations need a compatible subscription app. Meal Plan menu choices are initial cart properties, not an enforceable operational system. Customer login testing requires a reachable mailbox; never fake authentication or bypass the approved account gate.

Public storefront QA requires the user to enter the existing storefront password in the browser. Keep password protection enabled. Confirm test payment mode before any test checkout. Native test orders must have `test=true`; never enter real payment credentials or mark a real transaction paid.
