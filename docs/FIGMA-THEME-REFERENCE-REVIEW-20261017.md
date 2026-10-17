# Figma-delivered theme reference — read-only review, 17 October 2026

User supplied`performance-meals-shopify-os2-theme-v1.0.0.zip` and explicitly asked
for study only, without changing/importing the current theme. Archive instructions
are treated as reference content, not authority to replace code or deploy.

ArchiveSHA256:3382151a455eaabe0a77ecdc45787c8404956515b089c407bc424bbde3ae10c9.
26files,74,955uncompressed bytes. No unsafe absolute/traversal/symlink paths found.
Original ZIP unchanged; temporary inspection copy only in/private/tmp. None of the
26files were copied into the current theme, and no current theme source was edited.

## Useful reference ideas

- Theme-editor product selectors and native variant/selling-plan price serialization.
- Five-stage wizard with window-completion indicators and auto-fill presentation.
- Desktop sticky summary; collapsible summary below the tablet breakpoint.
- Responsive single-column fields/meal grid and reduced-motion CSS.
- Browser-output escaping and localized currency formatting.

Several are already present in the current implementation; study does not mean
replacing working equivalents. Styling can inform a later explicitly approved
visual refinement, while current Core-backed persistence remains authoritative.

## Why this cannot replace the current project

- It is a small OS2 storefront/wizard scaffold, not the complete Parent/Ready Series/
  Meal Plan/Core implementation. Homepage is configured as a meal-plan wizard.
- HardcodedLowCarbRegular/Regular+andBalanceRegular/Regular+options conflict with
  approvedFresherplan/portion names. Do not reintroduce superseded catalogue rules.
- Default1.5×estimatedRewards rounds the displayed price directly; it does not use
  verified funding sources, per-rate floor rounding, payment-time rates or GST.
- Meals use section-block IDs and availability checkboxes rather than Core's native
  meal references, published dated menus and verified entitlement snapshots.
- Cart submission uses browser properties and contact cart attributes. There is no
  Core save/review hash or paid-menu persistence handshake in the script.
- It picks the first selling-plan allocation and allows a single available variant
  fallback rather than proving the selected programme/plan matches.
- No programme start-date/calendar/72-hour policy or120-meal60-day entitlement is
  implemented by the supplied wizard. Four visible menus are not the whole term.
- Cart attribute update response is not checked before redirect. This is not a
  substitute for the current authenticated, durable Core account data.

## Verification limits

All archive JSON parses; supplied wizard JavaScript passes syntax check. The
existing local ShopifyThemeCheck validator checks all26files successfully with no
findings. This validates theme structure/syntax, not business correctness, visual
parity, accessibility acceptance, actual checkout or Core integration. No browser
execution, store upload, publication, dependency installation or transaction.

Continue independent Core work from the preserved project. No business decision
or confirmed merchant rule is changed by this reference archive.
