> Superseding Gift Card expiry clarification:17October and subsequent merchant replies require converted Wallet credit to retain the original Gift Card expiry. The fresh-year wording in the historical15October bullet below is obsolete; current code uses the original date. See wallet-credit-policy.ts and GIFT-CARD-CLAIM-ACCEPTANCE-20261026.md.

# Wallet rules confirmed 15 October 2026

These confirmations supersede conflicting prototype tiers and earlier spending-order rules. They do not authorize activating an unverified payment flow.

## Approved business policy

- One customer-visible Wallet. Internal source attribution is necessary for Rewards, expiry and audit.
- Spend customer-funded principal, then Gift Card-funded credit, then bonus, then redeemed Reward credit. Retain the earlier oldest-credit rule within each category. Do not rewrite historical debit allocations.
- Bonus is food-only: Ready Series and Meal Plans; no delivery, Gift Cards or further top-ups. Bonus and Reward-funded purchases earn no new points. Only original customer money allocated to food qualifies under the separate Rewards rules.
- New top-up packages replace the old advertised presets: pay SGD870 / receive SGD955 (principal870 + bonus85); pay1740 / receive1925 (principal1740 + bonus185); pay2690 / receive3090 (principal2690 + bonus400). Six/twelve/eighteen-month labels describe typical usage, not different expiry periods.
- Each new top-up/bonus, Reward credit and Support refund credit expires after one year. Gift Cards expire one year after issuance; a valid named-recipient claim transfers the full remaining value and starts a fresh one-year Wallet term from claiming.
- Send a reminder one month before expiry for every credit type. Expiry/reminder infrastructure is not yet active.

## Implementation and native evidence

The versioned credit policy implements package amounts, a source-priority planning engine, food-only bonus constraints, calendar-year terms in Singapore time and calendar-month reminder dates. The current package draft-preparation path takes server-owned package amounts, not customer-supplied bonus/expiry values. The historical disabled QA path is retained for existing intents; it does not advertise the old tiers.

125 isolated Core tests, typecheck, lint and backend build pass. Native `draftOrderCalculate` independently confirms870/1740/2690 with zero shipping, tax and discounts on the existing hidden non-shippable top-up variant. No new draft/order or package credit was created.

The separately approved temporary SGD1 test credit enabled a controlled browser comparison on the same authenticated development customer and existing unpaid SGD20.01 draft. ETP rule active: Store Credit/Gift Card controls absent. Rule inactive: Apply store credit SGD1 and Gift Card entry present. Rule restored active: both absent again; Test Payment Gateway remains. The SGD1 was then removed using a matching native debit. Original native balance0 and Core Wallet/Rewards/ledger counts were unchanged. No order/payment completed. Private native receipts/screenshots are retained under Core .shopify, not public source.

The separately approved customer-scoped SGD1 order-discount test also passed. The valid, single-use code reduced a calculation-only positive control from SGD20.01 to SGD19.01. Applying that same code to the protected unpaid invoice checkout left its total at SGD20.01. The code was then deactivated; Shopify displays Expired. No checkout was completed. A final read-only native credit readiness check passed after cleanup. This verifies the tested draft-invoice path, not every future checkout path or completed-payment settlement.

The new read-only approved-package paid-order verifier independently checks all three package payments, retaining principal/bonus separation and rejecting adjusted totals, wrong owners, disputes and non-cash funding. Focused payment-policy tests, typecheck and lint pass. It is not connected to credit issuance; legacy settlement rejects these larger package amounts.

## Technical gates remaining

- Shopify consumes native Store Credit by earliest expiry, whereas the approved policy prioritizes funding source. Do not claim that changing Core attribution alone changes native credit-lot consumption.
- Shopify’s aggregate Store Credit cannot alone enforce that only the bonus portion buys food rather than delivery/Gift Cards. A supported pre-payment enforcement path remains required before issuing package bonus.
- The policy planner and current package-preparation service are not connected to an activated customer top-up route or paired principal/bonus settlement. Do not route new packages into the legacy principal-only settlement, which would under-credit them.
- Expiry persistence, native/Core reconciliation of expiration, durable reminder delivery, unknown-response recovery and exceptional reversals still require implementation/verification. No historical credits were silently re-dated.
- Native successful/declined/failed top-up payment, bonus issuance, spending and lifecycle acceptance remain pending. Top-ups stay disabled.

Official platform evidence:
- https://help.shopify.com/en/manual/customers/store-credit#store-credit-expiration-dates
- https://shopify.dev/docs/api/admin-graphql/latest/objects/StoreCreditAccountCreditTransaction
- https://shopify.dev/docs/api/admin-graphql/latest/input-objects/StoreCreditAccountCreditInput

## 16 October — source priority reconfirmed

User explicitly retained exact source priority after being offered native earliest-expiring-first: customer-funded principal → Gift Card → food-only bonus → Reward credit, oldest within each category. Do not replace this with native expiry ordering.

BoomGate support confirms its rule editor cannot compare individual customer deadlines to current shop time on any plan and cannot reliably guard previously applied Store Credit when a checkout resumes. Official Shopify documentation confirms native credit consumption is earliest-expiry-first (https://help.shopify.com/en/manual/customers/store-credit#store-credit-expiration-dates). Native expiresAt therefore does not implement the selected source priority. No historical balance migration or debit/re-credit is authorized. Core-managed expiry remains gated pending a proven checkout safeguard; top-ups stay disabled. A custom Function remains a research candidate, not a proven fix or justification to purchase Plus.
