# 6 by 60 menu ownership and delivery allocation — 30 October 2026

The merchant-facing user clarified the outstanding allocation rule directly:

- Customers choose their overall meals from the menu available for their package.
- Jerome's team decides which of those chosen dishes/meals are delivered on each delivery day.
- Staff allocation must use the customer's saved choices; it must not substitute a new staff-chosen menu or treat the 88 weekday/32 frozen entitlement alone as a dish selection.

The linked prototype was inspected in the browser at https://audio-circus-95652837.figma.site/ through Meal Plan → Order → 6 by 60 → Continue to menu. It shows customer meal choices, repeatable dishes and quantity-limited menu windows. This inspection confirms the selection interaction only. Its sample prices, plan names, counts and dates do not override the previously approved Fresher catalogue, actual programme entitlement or merchant business decisions.

Remaining engineering: connect per-dish dispatch allocation to immutable saved customer-menu revisions, conserve purchased counts and selected quantities, show unresolved choices for Support rather than inventing them, and verify operational scheduling/stock handling. No allocation or paid-menu change was made during this inspection.


Follow-up direct confirmation: the team uses the customer's already-selected dishes for the32 frozen meals. There is no separate customer frozen-selection step. Frozen quantities use their own32-meal allowance and do not consume weekday selected quantities. The dish-linked batch journey is now implemented and accepted in scoped development QA; see SIXTY-DAY-DISH-ALLOCATION-20261030.md.
