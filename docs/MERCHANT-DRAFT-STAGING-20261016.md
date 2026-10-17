# Merchant catalogue draft staging —16October2026

Development store only: performance-meals-development.myshopify.com. Native SDK checks verified store/currency before every catalogue read. All GraphQL operations passed official2026-10 schema validation.

Created and independently read back28 merchant-named dish products as DRAFT. Existing58 products were field-matched before/after and preserved. No individual prices, photos or nutritional figures were supplied or inferred. Each dish has ready_series classification, nutrition_pending=true and price/nutrition-pending tags. The missing boolean nutrition_pending definition was added for editable Shopify data. Draft status prevents purchases.

Then created13 approved bundle configurations and8 prepaid subscription configurations as DRAFT. Exact approved whole-package prices were assigned; subscriptions have only3months/6months variants and require a selling plan. One-month comparison prices were not made purchasable. Readable exact contents and quantities are stored in editable inclusions, with meal_count preserved. Delivery-included boolean definition/value added; no shipping settings changed. No native selling plan, calendar, contract or publication was created. Component/image/calendar-pending tags remain.

Before/after checks preserve all86 previously existing products, including the28 newly staged dishes. New total107 products,49 new merchant DRAFT records. This is catalogue staging, not checkout, pricing/tax, inventory, media or fulfilment acceptance.

Native draft records use deterministic handles based on exact merchant source title and SHA256 prefix. Receipts and full readbacks are private in ignored work/merchant-drafts-20261016: draft-state.json, stage-before.json, stage-after.json, package-state.json, package-before.json, package-after.json. Core private .shopify/stage-merchant-*-20261016.private.mjs scripts retain the guarded operations. Do not blindly rerun package creation: inspect those receipts and fresh native handles first. No existing product was updated and no theme/app was published/deployed.

Remaining: verified component references, approved individual pricing, real image mapping, nutrition source/basis handling, tax-inclusive checkout proof and stock availability. Ready Series calendar/contract acceptance remains pending. These records must remain DRAFT until reviewed and explicitly activated.

Follow-up: independent check confirms each3-/6-month term maps to its own exact approved price for all8subscription configurations. Draft-only assembly review resolves all28dish variants and21package contents using verified creation/readback receipts. This does not write native bundle component metaobjects or activate stock/purchases. Private component-assembly-review.json preserves all quantities and source digest; the normal review gate continues to reject drafts unless explicit managed-draft review is selected.

## Native component references completed

With user-approved development write_metaobjects/read_metaobject_definitions access, Core reads the existing performance_bundle_item definition and checks product/variant reference definitions. All21new draft packages now reference the exact native dish/quantity components:47unique component records and50owner references (21products +29variants). Complete product/variant pagination and prior-reference checks prevent overwriting different contents. Native readback verifies every reference and component field; old objects/unrelated products are unchanged. Quantities/terms/prices remain the approved values, all49products remain DRAFT, and no catalogue publication occurred. Private evidence: work/merchant-components-20261016/{before,after,assembly-plan,attachment-state}.json.

## Individual price staging completed

23managed DRAFT dish prices now match exact-name public Fresher source observations from16October. Native readback verifies all23prices and preserves the84other products and every non-price field on the23targets. No image/name/serving assumptions were included. Five unmatched prices remain pending; Admin can edit all products normally. Public evidence: theme-tools/fresher-individual-prices-20261016.json. Private execution/readback: work/merchant-drafts-20261016/individual-price-{state,before,after}.json. The source manifest is initial import evidence, not hard-coded storefront pricing.

## Real photography attached

23exact-name source product photos visually reviewed and attached to managed draft products without replacing existing media. Native readback confirms23READY images with matching owner/alt text. Public sourceURL/hash evidence is preserved; identity relies on the exact source product association, not inferred ingredients. Five unresolved photo matches remain drafts without invented substitutions. Nothing published.
