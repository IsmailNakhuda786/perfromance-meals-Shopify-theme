# Ready Series / Meal Plan separation — 5 October 2026

> Historical phase report. The Core foundation phase supersedes the two-value product enum and unresolved mixed-cart policy: products now use ready_series / meal_plan / shared, Gift Cards use shared, and mixed carts are explicitly allowed. See CORE-FOUNDATION.md.

Scope: performance-meals-development.myshopify.com only. No app scaffold, Admin UI work, customer redesign or theme publication.

## A. Canonical model and trust boundary

Merchant-owned PRODUCT `performance.business_stream`, `single_line_text_field`, choices `ready_series` / `meal_plan`, storefront PUBLIC_READ, is the catalog source of truth. Every variant inherits its product. Do not use titles, handles, collection membership or tags as stream identity. A product cannot have variants from different business streams: split it into two products if that need arises. No variant override is created.

At add-to-cart, each theme product form carries private native line properties `_pm_business_stream` and `_pm_stream_schema_version=1`. Shopify preserves these as order-line customAttributes. Meal Plan also sends the initial structured `_pm_menu_selection` snapshot, with businessStream/schemaVersion per window. No single cart attribute is used because it cannot represent mixed carts accurately. No order tags are used as authority.

These client-submitted snapshots are transport evidence, not trusted authorization. A modified request can omit or forge them. Definition choices validate values when supplied but do not make the product field universally mandatory. Future server validation must compare each line against native product metadata, verify plan ownership and menu eligibility, quarantine missing/conflicting metadata, and preserve validated purchase-time identity. Do not dispatch kitchen work from unvalidated client properties. The implemented foundation is verified; complete operational enforcement REQUIRES CUSTOM APP — NEXT PHASE.

Future order summary: `performance.business_streams`, list.single_line_text_field, distinct validated streams, plus a versioned immutable line-to-stream/schedule mapping. These order fields are proposed, not created or written this phase. Mixed orders must generate separate stream records per order line, rather than a single mutually exclusive order type. Webhook processing must be idempotent, handle refunds/cancellations and retain the original validated mapping after product metadata changes or deletion.

## B. Native resources changed

Created one product metafield definition and seven product values. Added a choices-constrained business_stream field to three existing metaobject definitions; populated seven existing entries. Fields remain optional in native schema for safe migration, required by operational policy. No products, variants, selling plans, customers or collections were duplicated. No prices changed.

| QA product handle (inventory reference only) | Canonical value | Variants |
|---|---|---|
| pm-qa-low-carb-meal | ready_series | all |
| pm-qa-high-carb-meal | ready_series | all |
| pm-qa-protein-meal | ready_series | all |
| pm-qa-bundle | ready_series | all |
| pm-qa-subscription-bundle | ready_series | all |
| pm-qa-biweekly | meal_plan | all |
| pm-qa-fixed | meal_plan | all |

All three performance_bundle_item entries are ready_series. Both performance_menu_week and both performance_menu_window entries are meal_plan. Meal Plan windows intentionally reference existing Ready Series meal products as recipes; operational identity follows the programme/menu selection, not the reused recipe SKU.

The existing native Gift Card is shared infrastructure and is not one of the seven PM-tagged QA commerce products. Its binary assignment/redemption policy is MERCHANT DECISION REQUIRED. No arbitrary classification was applied to it or unrelated sample products.

## C–D. Native lifecycle tests

Ready Series order #1005: one QA single meal, SGD 17.50 including Singapore QA shipping. Shopify test=true. Native product value and order-line `_pm_business_stream` both ready_series; schema version 1. Product → cart → native checkout → completed order → Admin GraphQL verified.

Meal Plan order #1006: QA Fixed Meal Plan Balance Regular / Lunch & dinner, SGD 185.00 including Singapore QA shipping. Shopify test=true. Native product and order-line values both meal_plan, schema version 1. Four menu windows carry meal_plan/schemaVersion 1, six meals per window, 24 selections total. Product/metaobjects → builder → cart → native checkout → completed order → Admin GraphQL verified. Both orders belong to the same native customer; no duplicate customer was created. User performed the final dummy-gateway payment clicks.

Native private line properties are intentionally hidden in the shopper-facing checkout/order presentation. They are readable through the Admin API; future embedded Admin views should show validated stream records. No new order metafield persistence or custom Admin display is claimed.

## E–F. Mixed-cart observation / merchant decisions

Current theme and native checkout permit a Ready Series single meal and Meal Plan programme together. Both cart drawer and checkout displayed both lines. No mixed payment was submitted: the temporary single-meal line was removed before completing the Meal Plan-only test. Mixed-order metadata is therefore supported by the per-line model but not proven by a completed mixed order.

MERCHANT DECISION REQUIRED: allow, prevent, or allow with separate operational records after checkout. The storefront behavior was preserved; no new prohibition or fulfillment promise was introduced. If blocking is chosen, theme UI alone is insufficient for enforcement across direct cart/API routes; native validation/Shopify Function capabilities and plan availability must be assessed next phase. Shared gift-card stream allocation is a separate merchant decision.

## G. Subscriptions

Readback verifies Ready Series selling-plan group references only ready_series products, and Meal Plan group only meal_plan products. Ready Series 3-/6-month plans and Meal Plan biweekly plan remain native, unchanged. Do not infer classification from selling-plan names. Existing subscription order evidence was retained; no repeat subscription charge was made.

Contract inspection was attempted with a schema-valid subscriptionContracts query and failed with Shopify: “Access denied for subscriptionContracts field.” Current authorization does not grant read_own_subscription_contracts, and contract access also depends on the owning subscription provider. Contract-level persistent separation is NOT verified. REQUIRES CUSTOM APP — NEXT PHASE: compatible provider integration, validated contract-line identity, immutable stream snapshots on renewals, provider ownership/access, billing attempts, cancellations and pause state. Do not claim that selling-plan setup alone operates recurring subscriptions.

## H. Shared customer, separate histories

Use the native Shopify customer ID as the shared identity. Partition validated order lines, subscription contracts and operational records by canonical stream. One customer can have two independent histories; no duplicate account or inferred customer-wide exclusive stream flag. Native account order history remains combined. Dedicated activity tabs/actions require a customer account extension and app-backed validated data in a later phase.

## I. Meal Plan storage responsibility

| Data | Location / boundary |
|---|---|
| Programme, variants, price, billing allocation | Native products/variants/selling plans |
| Public menu weeks, dates, cutoffs, windows, recipe references | Existing native metaobjects with meal_plan metadata |
| Initial selections at purchase | Versioned native order-line snapshot; validate before operational use |
| Contract and billing facts | Native subscription provider contracts; app tracks validated associations |
| Weekly edits, selection revisions, per-cycle allocations and eligibility | Future app storage, keyed by customer/order line/contract/cycle/meal_plan |
| Pauses, rescheduling, cutoff enforcement, delivery runs and fulfillment state | Future app operational records; native fulfillment APIs remain source for actual fulfillment |
| Kitchen quantities, production batches, audit trail, retries | Future app storage with immutable versioned selection records |

Public metaobjects must not contain customer-specific selections or private operational state. Client clocks, menu properties and window labels do not enforce schedules. Menu references must resolve by store-specific mappings; validated operations must never reuse Ready Series fulfillment workflows merely because a recipe is a Ready Series product.

## J. Future Admin compatibility

The model supports separate Ready Series orders, subscriptions, fulfillment work, customer context and reporting; and separate Meal Plan subscribers, menus, selections, billing cycles, pauses, kitchen batches, fulfillment and reporting. Native Admin remains the commerce source. Embedded App Home can query validated per-stream records; order/customer Admin extensions can display contextual summaries. This is a data-contract compatibility assessment against the requested functional areas, not implemented or visually tested Admin UI. Admin prototype files were untouched.

## K. Migration safety

Retain canonical enum values and schema version across fresher.com.sg → Performance Meals. Use an explicit source-system/external-ID mapping ledger for products, variants, customers, orders, contracts and menu objects. Target Shopify IDs are store-local references, never business identity. Import source records with validated classification; quarantine ambiguous records, preserve provenance and reconcile references/customer identity before operational activation. Resolve source recipe/window identifiers to target native IDs. Historical orders lacking snapshots require reviewed mapping/backfill, not guessing from present-day product names. Subscription/payment migration depends on provider support and customer authorization; do not assume contracts or payment tokens transfer. No migration was executed.

## L–N. Release and boundaries

Branch shopify/theme-migration-v2. See the phase commit in Git for final SHA. Full integrated Theme Check: 103 files inventoried, 67 code files checked, zero errors/warnings/static failures. All 11 integrated tests passed. Both new orders are PAID test orders in SGD. Metadata/form changes were pushed only to unpublished QA theme performance-meals-homepage-runtime-check (146242797652); merchant defaults do not embed QA IDs. Existing development-store live theme was untouched. Nothing was published. Jerome’s live store and the Admin prototype were untouched. No custom app development began.
