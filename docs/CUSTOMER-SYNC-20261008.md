# Customer design synchronization — 8 October 2026

Approved customer source: `58272e4e011d03249b196d392319ad22fa8dc0ca`.
Starting Shopify branch: `shopify/theme-migration-v2`; starting commit: `b766afb5e2bdca377a17d1116a3fdca7993e2052`.
Only deployment target: Performance Meals Development, unpublished theme `146242797652`.

## Preservation and implementation

The original investigation, `editorial-deltas.md`, `source-commerce-deltas.md`, and original authoritative brief were accessible and used. No replacement migration, clone, reset, stash, or source branch checkout was performed.

The preservation checkpoint is `../sync-20261008/`: starting patch, all 23 unfinished files, SHA-256 manifest, full local theme archive and remote readback. All 13 protected Core/documentation/migration/catalogue-tool/test files still match that checkpoint byte-for-byte. Existing reviewed theme palette and prepaid guards are retained in the theme commit; the unfinished Core work is excluded.

Implemented:

- Six-band Ready Series Overview and About, seven-band Meal Plan About, six-band Customer Stories. Copy, imagery and CTA destinations are editable section blocks. Representative stories remain explicitly unverified.
- Approved Home experience-card photographs and Parent About photographs, with merchant image overrides and accessible descriptions.
- Ready Series cream split ordering hero, native collection mode navigation, warm bundle presentation, approved benefits composition, native bundle quantities/contents and expandable cart contents.
- Five Meal Plan programme links: Biweekly, Monthly, 2 Months, 6 by 60, 6 by 60 Plus. Initial builder selection resolves existing native product names; no new billing contracts or products were created.
- Rewards information remains visible to anonymous customers. Canonical tiers, earning rates, redemption values, 90-day validity and Ready Series single/bundle eligibility remain informational. Unverified referral amounts and ancillary perks are excluded. No simulated earning, wallet settlement or redemption.
- Accessible Gift Card selection state, responsive cart summary, and CSS palette replacement that preserves escaped Tailwind selectors.
- Unverified prepaid allocations cannot populate the global subscription chooser. Existing native allocation, account, cart, signature, persistence and stream guards remain intact.

24 JPEG files and one PNG file copied from the previously decoded approved image audit are packaged under `theme/assets/sync-*`. Provenance and source URL mappings remain in `work/design-sync/editorial-assets.json`, `shared-assets.json` and the investigation's `image-audit.json`. Native catalogue media are not overwritten with generic or guessed product photos.

React/Vite source, imports/reference material, PDFs, spreadsheets, pasted briefs, prototype demo customer/wallet state, screenshots, export/download tooling and local synthetic fixtures are excluded from the theme output. The existing Core app build is a separate legitimate Shopify integration, not a React storefront.

## Verification and limits

- Integrated validation: 142 files; 77 checked template/schema/reference units; no failures/findings.
- Theme tests: 26 passed. These include native purchase JSON, one-time versus recurring eligibility, private cart properties, programme links, anonymous Rewards content and CSS selector regression.
- Official Shopify CLI Theme Check: zero errors, three `ExcessiveSettingsCount` warnings (About, Meal Plan landing, Rewards). These are nonblocking maintainability warnings; section schemas remain upload-valid.
- Existing Core regression tests: 9 passed. Typecheck, lint and production-schema consistency passed. Direct React Router production compilation passed without running the endpoint-writing configuration script; existing generated account endpoint was preserved. Build reports existing React Router future-flag notices and empty API route chunks.
- Browser: 48 route/viewport checks at actual 1440, 768 and 390 CSS pixels, including Home, About, both Ready editorials, three Ready collections, Meal overview/about/builder/stories, Rewards, Gift Cards, cart, search and native product presentation. No horizontal document overflow, missing page headings or broken loaded images found. Mobile menu verified. Evidence: `work/design-sync/responsive.json`, `ready-1440.png`, `ready-768.png`, `ready-390.png`, `mobile-menu.png`.
- Local rendering uses synthetic fixtures. It does not prove native catalogue completeness, subscription contracts, account extensions, checkout or wallet settlement. No new test orders were created. Pinned prototype was rendered as a read-only local reference; this is not a full pixel-diff certification of every dynamic state.

## Remote protection and remaining differences

The fresh pre-deployment readback matched the checkpoint: 118 files, role `UNPUBLISHED`, updated `2026-10-07T13:28:28Z`. The selective upload excludes `config/settings_data.json`, `sections/header-group.json`, `templates/page.meal-plan-builder.json` and remote-only `layout/password.liquid`. The five live dev-theme Meal Plan product bindings and merchant menu/settings are therefore preserved. No deletion, publication or other theme/store is authorized.

Fresh native preview corrects the stale three-meal observation: all 12 approved individual meal names, 13 approved bundle cards across their source groups and five subscription families are visible. The five family names are Just Protein, Low Carb Meals, High Carb Meals, Low Carb + Just Protein and High Carb + Just Protein. Repeated bundle display names occur in the approved source groups, so they are not collapsed. All five Meal Plan programme names appear in the preserved native builder configuration; the 6 by 60 Plus landing link selects the correct programme. This phase creates no products or catalogue replacements. Remaining native data/media gaps include the missing Egg White & Avocado Toast listing image, distinct listing/detail media associations and unresolved subscription contents/allocation verification. No generic fixture image is uploaded as a product.

Remaining visual differences: product details/listing image associations and unverified reviews remain dependent on approved native media/data; benefits use the existing merchant icon characters rather than the source SVGs; source subscription term controls stay unavailable without verified prepaid allocations; shipping-progress/promotional claims remain checkout-authoritative; new native Shopify customer accounts cannot be freely restyled by theme CSS; unverified testimonial/referral/perk content is intentionally not represented as active functionality. No exhaustive pixel-perfect approval is claimed.

Protected functional work for the later gate: prepaid term billing with monthly fulfillment; exact 60-day Meal Plan billing/delivery coverage; subscription/account management; native funded-money and bonus-wallet settlement separation; durable Core hosting/database; customer account activation; verified reviews and shipping/promotion eligibility.

MERCHANT DECISION REQUIRED only for genuinely missing business values or approvals: unresolved 60-day billing/delivery interval details, authoritative conflicting subscription quantities, final referral/ancillary reward rules, and testimonial approval. Ready Series upfront-term billing and Gift Card renewal-charge limitation are already decided and are not reopened.

The exact original 14 Customer + Core acceptance criteria were not present in the accessible original brief or investigation documents. That gate remains **unverifiable**, not passed and not replaced with invented criteria. Admin UI and the functional completion gate were not started. Jerome's store was untouched.

## Reviewed file inventory

`work/design-sync/reviewed-files.json` enumerates the scoped commit files; `push-files.json` enumerates the 56 selective theme files. Changed groups are `theme/sections`, associated page/collection JSON templates, `theme/snippets/{cart-content,product-card,product-purchase-form}.liquid`, theme JavaScript/CSS, locale/schema/layout dependencies, CSS builder and customer-sync regression tests. Final remote verification: 56 uploaded files match their local MD5 checksums, remote theme has 143 files and remains UNPUBLISHED, updated 2026-10-08T17:07:10Z. All four protected remote files are unchanged. Initial upload rejected a duplicate block display name; corrected in a focused commit and successful two-file retry, with a new integration constraint check. Subsequent focused uploads restored the distinct Home photo and approved Meal Plan hero and clarified checkout-authoritative delivery wording. Native preview checks covered 45 route/viewport combinations without Liquid errors or document overflow, followed by updated hero checks at all three widths and mobile menu/cart checks. Native add-to-cart produced Teriyaki Chicken & Brown Rice at SGD 12.90 in the cart drawer/page. No checkout or new order was created. Ready Series subscription cards have zero enabled purchase buttons. The Meal Plan builder visibly reports a save failure and remains a functional blocker; no persistence success is claimed. Native customer account links retain Shopify identity; account-extension management was not retested. Evidence: work/design-sync/native-responsive.json, deployment-proof.json, native-ready-desktop.png, native-menu-mobile.png and native-cart-mobile.png. Final Git SHA is reported after this documentation commit.

Final programme follow-up: pinned source headlines, descriptions and duration labels restored; stale fixed wording corrected to recurring under the locked business requirement. All five cards verified at 390/768/1440 pixels with no overflow or Liquid errors. Evidence: `work/design-sync/native-programmes.json`. Catalogue/data tools were not executed.
