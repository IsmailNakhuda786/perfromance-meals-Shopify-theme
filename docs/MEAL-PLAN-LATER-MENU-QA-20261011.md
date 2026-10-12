# Paid 60-day later-menu QA — 11 October 2026

Store: performance-meals-development.myshopify.com only. Theme 146242797652 remains unpublished. Customer source: 58272e4e011d03249b196d392319ad22fa8dc0ca. No Admin UI development.

## Native test data

Created five performance_menu_week records, handles pm-stage-week-2026-11-09, -2026-11-16, -2026-11-23, -2026-11-30, -2026-12-07, and fifteen performance_menu_window records (Mon–Tue, Wed–Thu, Fri). Existing four weeks were preserved. Dates and combinations are staging configuration, authorized by the user; approved existing native meal products supply names and images. No generic replacement products were created.

Weeks 5–8 contribute 40 meals. Week 9 is clipped to programme end, Thursday 10 December, contributing eight meals; Friday is excluded. Calendar period remains 12 October–10 December, inclusive.

## Actual browser evidence

- #1008, 6 by 60, Low Carb Regular / Lunch & Dinner: later 40 meals and final eight saved. Final block restored 8/8 after full reload. Native customer account displays all blocks and actual meal names.
- #1009, 6 by 60 Plus, Balance Regular / Lunch & Dinner: later 40 meals saved and restored after full reload. Independently edited Week 5 Mon–Tue from four Herb Grilled Chicken & Brown Rice to three plus one Korean BBQ Beef & Purple Rice; saved, reloaded and verified in native account. Final eight saved and restored.
- Native account shows both programmes, original dates and No automatic renewal, with all initial/later/final meals. Original paid selections remain unchanged; later selections are append-only Core revisions.
- Save Changes uses authenticated paid-menu persistence and does not add to cart, checkout or charge. No new QA order was created in this session.
- Screenshots: work/period-qa/paid-programme-account.png and final-four-days.png (local ignored evidence).

## Validation

Core tests: 21 passed. Typecheck, lint, production schema consistency and build passed. Theme tests: 31 passed; integrated validation: 145 files, 80 checks, zero findings. Shopify CLI app configuration validation passed with no issues. Order events reconnected and visibly confirmed Connected. Theme Check has zero errors and three existing ExcessiveSettingsCount warnings (About, Meal Plan landing, Rewards).

## Remaining boundaries

Permanent hosted runtime remains incomplete: browser writes were verified against development SQLite/tunnel; the resulting 72-record snapshot was subsequently imported and independently field-matched in Neon PostgreSQL. Actual recurring Ready Series/Meal Plan contracts and management actions remain independently unverified by this test; period purchases must not be counted as subscription proof.

Figma files were rechecked directly: MealPlanWizardPage.tsx includes Frozen weekend meals; performance-meals-req.md Section 20 explicitly calls support frozen weekend meals an informational inclusion. Neither defines quantity or delivery weekday. Inclusion was preserved; these specific fulfillment values remain unresolved, without invented defaults.

The user confirmed the source Thursday 1pm Singapore cutoff, editable through Shopify. All nine native menu records now use the preceding Thursday at 13:00 Singapore (05:00Z), with readback verified. Week 1 is closed and immutable; Week 2 was edited to three Chilli Lime Chicken & Cauliflower Rice plus one Lemon Herb Turkey Breast, saved and restored after reload. Closed week values are retained as immutable snapshots; server tests reject tampering while permitting later-week edits. No original order snapshot or paid programme dates were changed.

Implementation checkpoint committed as a7afcf5 on shopify/theme-migration-v2. Pre-existing wallet and catalogue work remains uncommitted and preserved. All existing local wallet work was preserved. Jerome's live store and Admin prototype were untouched.

## Merchant availability and persistence boundary

Merchant configuration governs dates offered to new purchases. Paid customer start/end dates cannot be changed through the menu-save endpoint. Retain dated menu records for paid programmes; do not delete or repurpose their historical records when publishing future menus. The protected operational export now includes menu revisions so migration does not lose later choices. All five production migrations applied to the new database. Protected version-2 export (OAuth credentials excluded) imported atomically; independent PostgreSQL readback field-matched all 72 records, including 58 menu revisions. Original SQLite database and paid order snapshots were retained. Version-1 snapshots remain supported without modifying historical files.

## Infrastructure and recurring-subscription audit

The owning Vercel workspace is visibly Hobby. Official Hobby terms restrict commercial use; no permanent commercial Core deployment was created there. The connector still returns scope-specific 403, while the existing browser session can reach Storage. No locally installed Vercel CLI was found for the suggested fallback. Neon official documentation currently lists Free at 1 GB per project, 100 CU-hours per project/month, 5 GB egress and 10 branches; quota exhaustion suspends compute rather than approving a paid upgrade. The actual Marketplace flow requests accepting legal terms and disclosed account-data sharing before its plan configuration step. The user explicitly approved the Neon terms and disclosed sharing. Created performance-meals-core-development on the explicitly Free plan in Singapore (sin1), with optional Neon Auth disabled. The Marketplace confirmed successful provisioning. No paid plan was selected. Credentials saved in ignored .env.postgres-development with mode 0600. Migrations and operational import/readback passed; running Core was not switched. PostgreSQL-backed hosted runtime QA remains pending; provisioning and imported records do not by themselves complete permanent persistence. Evidence: work/period-qa/neon-created.png.

Native customer-account Subscriptions page was opened and displayed No subscriptions purchased. No pause/skip/cancel result is claimed. Existing one-time period orders are preserved as period evidence only.

Final meal-plan asset update succeeded after CLI reauthorization, targeting only existing theme 146242797652; CLI returned role unpublished. No theme was published.
