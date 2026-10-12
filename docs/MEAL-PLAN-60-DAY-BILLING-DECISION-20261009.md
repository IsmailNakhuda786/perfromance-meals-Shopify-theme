# Approved 60-day programme billing

User decision, 9 October 2026. Supersedes the earlier instruction that all five Meal Plan programmes must recur.

| Programme | Payment | Coverage | Renewal |
| --- | --- | --- | --- |
| 6 by 60 | Full approved programme price upfront | 60 days | None; customer chooses to repurchase |
| 6 by 60 Plus | Full approved programme price upfront | 60 days | None; customer chooses to repurchase |

Biweekly, Monthly, 2 Months and Ready Series prepaid term subscriptions retain their existing approved models. Names, contents, images and prices continue to come from the approved source. No new prices or delivery schedules are inferred here.

Jerome confirmed both programmes are period-based: the 60-day period starts on a stipulated Monday and ends after that period. It does not restart or recharge automatically. The customer chooses the stipulated Monday, as confirmed by the user. Do not automatically assign the next Monday from purchase time. Precise delivery dates must remain separate from calendar duration.

Catalogue extraction now records the two programmes as non-recurring, upfront, 60-day purchases. Billing policy is separate from display names so future changes can be applied deliberately.

## Verified development implementation — 11 October 2026

Native one-time checkout and authenticated selection/order reconciliation are implemented for these two programmes. Existing test orders #1008 and #1009 retain their original selections and 12 October–10 December inclusive programme dates, without a selling plan or subscription contract. No historical recurring contracts were changed.

Customers choose later published menus through owner-verified Core persistence. Four initial weeks plus four later weeks plus the final Monday–Thursday cover 44 served weekdays: 88 meals for Lunch & Dinner. Actual browser save/reload/account evidence is recorded in MEAL-PLAN-LATER-MENU-QA-20261011.md.

Fresh served meals are Monday–Friday, per the user's clarification. Plus's frozen-meal inclusion is retained; its quantities and delivery arrangement are MERCHANT DECISION REQUIRED. Do not infer these from calendar-day duration.

The five later weekly menus created in development use approved existing dishes/images and explicitly authorized staging combinations. They are not Jerome's production menu. Production weekly combinations and cutoffs remain merchant configuration. No theme publication or live-store change is authorized.

## Jerome clarification — 12 October 2026

Both 6 by 60 and 6 by 60 Plus include 44 weekdays × 2 meals = 88 weekday meals, plus 32 frozen meals per programme. Day 1 is the customer-selected available Monday. Frozen meals may be delivered according to menu selection or merchant provision, with no fixed weekday or invented weekly split. These inclusions are a confirmed business correction to the older Plus-only prototype wording. Record them for the #3 implementation gate after the current #1 persistence verification; do not alter historical paid orders or invent a delivery timetable.
