# Approved source and native resource naming

Latest fetched customer `main`: `227c1a0efea28b0c122fdb1bbffb2f0944d3213f`. No source-name changes appeared when comparing the relevant pages with this commit. Internal handles/GIDs remain separate from display names; existing IDs preserve historical order evidence. No new order or final production prices were invented.

## Source ownership

- Ready Series: `src/pages/ReadySeriesPage.tsx` → MEALS, PREDEFINED_BUNDLES, SUBSCRIPTION_PRODUCTS and subscription meal details.
- Meal Plan: `src/pages/MealPlanWizardPage.tsx` → programme labels and the four plan options; its imported `src/data.ts` MEALS is the separate Meal Plan menu catalogue.
- Gift Card, Rewards and other page content retain their own approved page sources.
- Old `kind: fixed` values are obsolete billing metadata. All five Meal Plan programme names are preserved and all five map to recurring commerce. 6 by 60 / 6 by 60 Plus are marketing/programme display names, never separate billing types or departments.

`docs/MERCHANT-SETUP-MANIFEST.json` records all 12 Ready Series meals/images, 13 bundle offers, 10 subscription variants and five Meal Plan programmes. Its prototype prices remain reference content, not approved final commercial configuration.

## Native mapping rules

Ready Series subscriptions: five native product display names — Just Protein, Low Carb Meals, High Carb Meals, Low Carb + Just Protein, High Carb + Just Protein — each with source Beef/Non-Beef variants. The 3 months / 6 months term selection belongs to native selling plans; preserve source terms rather than embedding QA text or inventing economics.

Bundles: source category and offer identity must remain distinct. Signature 5 and Essential 10 may each be represented as a native product with Beef/Non-Beef variants, giving exactly the source's complete offer labels, e.g. Signature 5 — Non-Beef. Keep Low Carb Meals and High Carb Meals category identities separate despite repeated offer names. 9 Flavours of the Month, JP Variety Bundle of 10, 7 Low Carb + 7 Just Protein and 7 High Carb + 7 Just Protein keep their exact source names. Fulfilment contents must be variant-specific and source-backed; a title change alone does not prove equivalence.

Meal Plan products: Biweekly, Monthly, 2 Months, 6 by 60, 6 by 60 Plus. Native Meal plan option values: Low Carb Regular, Low Carb Regular+, Balance Regular, Balance Regular+. Meal frequency labels remain source-backed. Every product requires a native recurring plan; old fixed fields are ignored. Do not collapse the marketing programme names out of the catalogue.

## Existing dev-store correction and verification

| Internal handle | Corrected display mapping | Status |
|---|---|---|
| pm-qa-low-carb-meal | Spicy Korean Beef Bulgogi | Approved Ready Series source sample matching existing image; source nutrition restored |
| pm-qa-high-carb-meal | Thai Basil Pork Rice Bowl | Approved Ready Series source sample matching existing image; source nutrition restored |
| pm-qa-protein-meal | Teriyaki Chicken & Brown Rice | Approved Ready Series source sample matching existing image; source nutrition restored |
| pm-qa-bundle | Signature 5 + Beef/Non-Beef → exact complete source offer labels | Draft; incorrect six-meal sample contents cleared; full source fulfilment/image mapping pending |
| pm-qa-subscription-bundle | Just Protein + Beef/Non-Beef | Draft; incorrect six-meal contents cleared; 14-meal source-specific fulfilment mapping pending |
| pm-qa-biweekly | Biweekly + source plan/frequency options | Recurring required; Shopify Subscriptions-owned plan, every 2 weeks |
| pm-qa-fixed | Monthly + source plan/frequency options | Recurring required; menu_weeks corrected to 4; Shopify Subscriptions-owned monthly plan; four-week menu coverage pending |

Generic QA product/vendor/description/highlight/inclusion/image-alt/selling-plan display text was removed from these seven native resources. Existing images for the three single meals match their approved source image IDs. Existing programme/bundle images are retained without claiming they are a complete approved source-image mapping; do not continue subscription QA until that mapping and contents are complete. Internal test prices, tags, handles and SKUs remain technical staging identifiers. They are not replacements for customer display names and must not become production catalogue identifiers by copying QA seeding scripts.

Native readback confirms Biweekly group 1222049876 / plan 1878032468 and Monthly group 1222082644 / plan 1878065236 are owned by Shopify Subscriptions (app 66228322305). Billing intervals are WEEK × 2 and MONTH × 1 respectively. No discount was invented. The old unowned Biweekly group was detached from the product, preserved rather than deleted. The Ready Series manual term plans remain unowned and are not contract/renewal evidence. Prices were unchanged; no variants/products/orders were deleted; #1007 was not rewritten.

The native Shopify Subscriptions Management page was added to the dev-store customer account configuration and saved. Its navigation label is Subscriptions, alongside Orders and Profile. This does not activate the unfinished Core extension or publish a storefront theme. A real signed-in customer subscription/contract and renewal test is still pending. Screenshots are in the workspace outputs folder: Shopify-Subscriptions-Biweekly-20261006.png, Shopify-Subscriptions-Monthly-20261006.png and Shopify-Subscriptions-Account-20261006.png.

Focused audit command: `node theme-tools/verify-source-catalog.mjs work/naming-audit/final.json`. It rejects non-source product/variant names, fixture display text and one-time Meal Plans. Readback: seven checked, zero naming failures, SGD. It intentionally reports subscriptionQaReady=false until the listed dependencies are satisfied.

## Conflicts / unfinished source coverage

The old staging bundle six-meal contents do not match any approved offer. They were quarantined rather than treated as production references. Remaining subscription products and bundle offers and the other three Meal Plan programmes are mapped in the source manifest but not all created in the dev store. Rebuild only the native resources needed for the next valid flow, using that manifest; never run the old generic QA seeder again. No production naming convention or final prices should be inferred from old fixtures.

Historical reports and order snapshots retain their original labels as evidence. They are not the current catalogue or approved business model.

Native staging meal-frequency values still use legacy sentence casing (Lunch only / Lunch & dinner); the manifest now records the exact source labels Lunch Only / Lunch & Dinner. Correct native casing before final source-equivalence QA. Audit scope is the seven mapped products, not every orphan metaobject or all default dev-store resources.
