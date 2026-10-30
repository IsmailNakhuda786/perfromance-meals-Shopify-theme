# Meal Plans booking engine — 30 October 2026

Status: implemented behind development-only flags; the approved development migration and isolated PostgreSQL tests have passed; staff/customer booking acceptance is still pending because the temporary tunnel failed DNS resolution. Requirement 3 remains PARTIAL. No paid programme was booked or rescheduled by this work.

## Confirmed rules

Meal Plans and Ready Series use separate delivery-capacity limits. Within a brand, batches from the same customer, paid order and destination arriving in the same slot consume one driver visit. This implementation does not merge different orders or different brands. Staff arrange the initial physical batch delivery; customers may move the whole unsent visit with the configured notice period before both dates. A missing notice/holiday policy is a hold, never an invented default. Saturday, published Singapore holidays, merchant closed dates and unverified years are unavailable.

## Implemented

- Four additive tables: MealPlanDeliverySlot, MealPlanDeliveryVisit, ProgrammeDeliveryBooking and ProgrammeBookingRequest; mirrored SQLite/PostgreSQL migrations. No existing table/column changes.
- Server-only staff booking and explicit slot creation. The customer endpoint permits rescheduling only and derives customer/store identity from Shopify's verified customer-account token.
- Fresh native paid/test/owner/product/quantity proof and validated Singapore shipping destination. Only original v2 customer-selected dish batches can be booked. A destination hash is retained; raw addresses are not copied into booking records or customer responses.
- Original programme, batch and committed-menu checks under the same locks used by menu/allocation changes. Slot locks ordered before transfers, with atomic capacity updates and whole-visit revision checks.
- Two batches join one visit; source priority and meal allocation are not affected. Cancel one unsent box retains the visit place; cancel the last releases it. Dispatch retains consumed capacity and prevents moving the sent portion. Disabling customer controls does not disable these lifecycle hooks when storage readiness remains on.
- Request receipts and an owner-scoped lookup recover uncertain responses. The client retains its original request key, prevents a new choice while the previous outcome is uncertain and never retries a change on a timer.
- Staff controls in the existing delivery-batches QA screen and an independent customer account panel with Singapore dates, notice text, whole-visit confirmation and paginated replacement slots.
- All new customer/shop records included in privacy inventory and operational recovery snapshot version 6. Versions 1–5 retain compatibility with empty new tables. OAuth sessions remain excluded.

## Verification completed

- Complete disposable regression: 745 tests collected, 741 passed, four PostgreSQL-only skips, zero failures.
- Focused booking/route/client/menu/privacy/recovery/readiness group: 60 passed, three PostgreSQL-only skips, zero failures.
- TypeScript, lint (zero warnings), production schema consistency, diff checks passed.
- Shopify Admin 2026-10 query validation passed; customer-account 2026-07 and embedded App Home 1.0 component validation passed.
- New read-only destination query actually passed on existing paid development Order #1009: exact customer and paid/test order matched, complete Singapore destination returned. No native or Core mutation.
- Existing paid-menu, weekday/frozen entitlement and Wallet regression checks retained.

Private logs are in Core .shopify/meal-plan-booking-*.private.log and excluded from GitHub.

## Not yet accepted

The four approved tables have been applied to the working development database. No new native charge, credit, dispatch, customer message or paid booking was created. PostgreSQL verification: 25/25 booking, dish and paid-menu checks passed, with the original40 model groups unchanged and all four new tables empty after cleanup. Two additional concurrency checks passed (duplicate requests and reschedule-versus-cancellation), with all44 model groups unchanged. The customer-account API now distinguishes a definite rejected change (new slot choice permitted) from an uncertain database outcome (retain the original key and recover its receipt). The user has separately approved temporary staff/customer bookings on paid test #1009; the earlier dish-only acceptance was restored and must not be replayed.

MEAL_PLAN_BOOKING_ENABLED, MEAL_PLAN_BOOKING_STORAGE_READY and the existing dish/batch gates are off by default. Customer controls additionally require a matching MEAL_PLAN_BOOKING_QA_CUSTOMER. Storage readiness must remain enabled after migration while bookings exist, even when customer controls are disabled, so cancellation/dispatch preserve capacity. Production preflight rejects unaccepted activation.

No automatic stock reservation, cross-order consolidation, new reminder channel, production permission or native fulfilment completion is implied. General Meal Plan/6 by 60 customer journeys still require operational acceptance; this engineering does not make the entire requirement PASS.


Final QA attempt: the approved2weekday/3frozen batches and two temporary slots were prepared, but the embedded browser reported that the tunnel address could not be resolved. No booking or customer move was submitted; no journey PASS is claimed. Guarded restoration completed with all44 protected model groups exactly unchanged, no native mutations and no financial changes. Private journal `.shopify/meal-booking-native30.private.json` is RESTORED; do not replay it. The same approved visual test remains the next task after a working preview is restored.
