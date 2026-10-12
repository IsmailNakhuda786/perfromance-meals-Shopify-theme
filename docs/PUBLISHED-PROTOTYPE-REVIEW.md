# Published Meal Plan journey review — 2026-10-06

Primary published reference: https://dirt-gale-89313251.figma.site . Latest pushed source: 227c1a0efea28b0c122fdb1bbffb2f0944d3213f.

Reviewed both 6 by 60 and 6 by 60 Plus through programme selection, Plan & Meals, Menu, Your Details and the account-required subscription Review gate. Internal fixture details stayed in the prototype; no prototype order was placed. Neither programme is generic QA data or merely a headline. Both are real selectable 60-day programmes and require recurring native commerce under the user's approved business model.

Preserved source definitions:
- 6 by 60: 60-day programme · All-week coverage · 6kg+ weight-loss goal.
- 6 by 60 Plus: 60-day programme · All-week coverage · Weight loss + muscle support. Also includes Frozen weekend meals, Channel access, Weigh-in machine, Rewards.
- Both have Lunch & Dinner, four initial menu weeks and the named Meal Plan meal catalogue imported from src/data.ts.
- The three explicit cadences are Biweekly: every two weeks; Monthly: every month; 2 Months: every two months.
- Initial menu windows: Mon – Tue (two days), Wed – Thu (two days), Fri (one day); weekly choices are the union of the source WEEK_MENUS lunch/dinner IDs, with source names, images and quantities.

Exact conflicts, rather than inferred commerce:
- Published/source first step calls the 60-day programmes fixed-period and source kind is fixed, but the published Review explicitly says Meal Plans are subscription-based. User explicitly confirms all Meal Plans recurring. Fixed-period programme duration must not turn into one-time billing.
- Both programme descriptions say All-week coverage, but included coverage says Mon–Fri and menu windows cover only five weekdays. Plus mentions Frozen weekend meals without defining their contents/delivery windows. No weekend SKU or menu has been invented.
- Plan Type in the 60-day included panel inherits the earlier wizard meal-type state: default entry shows Balance Regular, CUT entry initializes Low Carb Regular, and switching from an earlier recurring plan can retain its selected type. No fixed per-programme type assignment is established by this inconsistent state behavior.
- The prototype enables Continue after the currently selected week's allocation is complete even when other weeks are empty; native validation requires all configured initial weeks. This validation is necessary to preserve meaningful saved selections rather than carry the prototype's incomplete-data bug.
- Source subscription highlight quantities can conflict with actual component lists (e.g. HCMIXSUB01 highlight 8 High Carb + 7 Just Protein vs component counts 6 + 9). Source quantities are preserved; do not silently alter either claim for production.

MERCHANT DECISION REQUIRED: exact recurring billing and delivery cadence for 6 by 60 and 6 by 60 Plus. The 60-day duration alone does not establish a renewal cadence. Native products remain requiresSellingPlan=true; absent allocations must fail closed, never enable one-time purchase. The rest of each programme is mapped and does not await a new name or a business-model decision.

Ready Series billing was explicitly confirmed by the user: prepaid full 3- or 6-month term, monthly fulfillment, automatic renewal at term boundary. Monthly installments are prohibited.
