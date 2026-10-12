# Gift Card → recipient Wallet verification

## Development evidence — 12 October 2026

Store: `performance-meals-development.myshopify.com` only.

Native test order **#1010**, `gid://shopify/Order/1001`, is PAID, test=true,
SGD 25.00, one native Gift Card line. Customer identity is the existing shared
customer; recipient email is the approved QA recipient. The line's
`_pm_business_stream` is `shared`.

Readback also shows **UNFULFILLED**, unfulfilledQuantity=1. The unfiltered native
Gift Card API returned no card associated with #1010; pagination was complete.
The recipient reported no Gift Card email. The checkout thank-you message alone
does not prove issuance. Existing legacy PKR Gift Card data was untouched.

After the user fulfilled the existing line, native readback confirmed issued
Gift Card `gid://shopify/GiftCard/1002`, enabled, balance SGD 25.00,
linked to test order #1010 and recipient
`gid://shopify/Customer/1003`. The user confirmed receipt of the email.
Issuance now passes; no replacement card or additional purchase was needed.

**Not accepted yet:** recipient claim, native Gift Card debit, matching
native Store Credit credit, customer-visible spending, partial redemption and
remaining balance. No credit has been fabricated from the paid order.

Shopify documents dev-store transaction limitations:
https://shopify.dev/docs/apps/build/stores/development-stores
An API fixture or mocked test must never be substituted for native checkout
settlement acceptance.

## Implemented safeguards

- Official authenticated customer-account endpoint; customer identity comes
  from the verified session, never a submitted customer ID.
- `giftCardClaimsEnabled` defaults false. No global/production enablement.
- Exact named native recipient match and SGD required; missing recipient,
  expired/disabled/empty cards reject.
- Gift Card codes are masked in the account form and never persisted/echoed.
  Sensitive JSON request bodies are bounded before parsing.
- One durable claim per shop/card. Confirm native debit before native credit;
  confirm both native receipts before recording Gift Card-funded ledger value.
- Uncertain native responses stop for reconciliation rather than blind retries.
  Durable transaction IDs retain the audit trail; completed retries cannot
  credit twice.
- Additive SQLite/PostgreSQL migrations. No existing QA data or orders reset.
- Native account claim form preserves Gift Cards / Redeem a Gift Card / Gift
  Card Code / Redeem labels. It remains unavailable while the feature is off.

## Next native checks

1. #1010 fulfillment/issuance verified without another purchase or real payment.
2. Issued SGD card recipient and balance verified using Core's own scopes.
3. Enable only the approved dev-store test once prerequisites are satisfied.
4. Recipient enters the code directly; verify debit, matching store-credit credit,
   durable Gift Card-funded ledger entry, and duplicate-claim protection.
5. Separately verify supported native checkout spending and reconcile debits.
   The current Core ledger does not yet mirror native checkout spending.
6. Disable claim access if the platform cannot support the native operation;
   preserve exact failure evidence and #1010.

Local validation: 36 Core tests passed; lint/typecheck and production-schema check
passed. Native account components passed Shopify Toolkit validation for API
2026-07 after correcting event typing. These checks are not financial QA acceptance.

## Recipient claim completed

The recipient used the authenticated native account claim form. Core claim
`3f45525c-3c63-4c7f-806b-4abd608931ba` is COMPLETED for SGD 25. Native readback:

- Gift Card `1002`: SGD 0.00 remaining.
- Native debit `gid://shopify/GiftCardDebitTransaction/1004` recorded.
- Native credit `gid://shopify/StoreCreditAccountCreditTransaction/1005`:
  SGD 25.00, owner `gid://shopify/Customer/1003`.
- Native Store Credit account `987955284`: SGD 25.00.
- One matching Gift Card-funded ledger entry, fundedBalance=2500, bonusBalance=0.

No second purchase or replacement Gift Card was created. Native checkout spending,
partial-balance claims, native duplicate attempts and ambiguous-response recovery
remain separate acceptance checks. Earlier pending-claim notes describe the
pre-transfer checkpoint and are superseded by this evidence.

The user initially perceived no result because Wallet still had placeholder text.
The next change reads its balance from Shopify and renders the real ledger history;
it does not treat cached ledger totals as authoritative checkout balance.

## Rendered recipient Wallet verified

Recipient screenshot on 12 October shows Wallet Balance SGD 25.00 and exactly one
Gift Card history entry for SGD 25.00, dated 12/10/2026. The earlier zero-balance
screenshot belonged to a different signed-in customer, confirmed by its native
profile email. No balance was moved between customer identities.

Evidence: user attachment codex-clipboard-fa564bb1-d049-48c9-bfbd-25da4a0b12ce.png.
Checkout spending and matching Core debit reconciliation remain unverified.

## Wallet-funded purchase verified — order #1011

Approved cap SGD 25. Existing Teriyaki Chicken & Brown Rice: SGD 12.90;
Singapore Delivery: SGD 10.00; total SGD 22.90. Recipient selected native
Store Credit, Shopify showed SGD 0.00 due, and user clicked Complete order.
No card details, real card charge, provider activation or billing change.

Native readback confirms:
- Order `gid://shopify/Order/1006`, #1011, PAID, SGD 22.90.
- Gateway shopify_store_credit; native payment SUCCESS / SALE.
- Debit `gid://shopify/StoreCreditAccountDebitTransaction/1007`: SGD -22.90,
  ORDER_PAYMENT, linked to that order and the original recipient identity.
- Native Store Credit balance SGD 2.10. Core PostgreSQL fundedBalance=210.
- Exactly one Core purchase debit; repeated reconciliation returns the same entry.
- Line stream remains ready_series. Original Gift Card sale #1010 remains shared.

Shopify marks #1011 test:false for this native Store Credit payment.
It was an authorized dev-store QA purchase using credit originating solely from
test Gift Card order #1010. Do not misreport it as a Test Payment Gateway order.

Recipient confirmed rendered balance SGD 2.10, credit SGD 25 and debit SGD -22.90.
The served preview still labels the debit Gift Card; code now labels it Purchase.
Updated bundle rendering remains to be checked.

Account reads reconcile validated native paid-order debits before reading
the Core history. Failed/ambiguous history reads are exposed as pending, while
the displayed monetary balance remains a fresh Shopify read.

Business decision confirmed: oldest funded credit first for future mixed
customer-top-up / Gift Card balances. Mixed-source FIFO allocation remains
to be implemented; reconciliation fails closed when attribution is ambiguous.
Refunds, top-ups, renewals and other 15-point requirements remain open.

## Oldest-funded-credit-first implementation

Additive migration 20261012190000_wallet_fifo_allocations adds persisted debit
allocation evidence. Each allocation identifies its original funded credit and
amount. Confirmed Core credits are consumed in creation-time order with ID as a
stable tie-breaker. Customer-funded and Gift Card-funded balances retain separate
audit totals even when a single native payment consumes both. Bonus is excluded.
Unknown funding, ambiguous legacy deductions, invalid allocations and insufficient
funds fail closed. The existing #1011 single-credit evidence remains valid.

PostgreSQL fixture verification covers the remaining SGD 2.10 of an older Gift
Card credit before SGD 2.90 of a newer customer-funded credit on a SGD 5 debit,
with correct source totals and one native debit record. This is code/database
verification, not a new native financial test. Customer top-up, mixed native
checkout, refund/reversal and large-history recovery acceptance remain pending.
Earlier mixed-FIFO implementation-pending notes are superseded by this section.

40 Core tests, typecheck, lint and production-schema checks pass. Core is still
development-only; no theme publication or live-store changes.

## Operational routing readback

#1011 is VALIDATED in Core with businessStream ready_series and department
ready_series. The missing historical #1010 operational line was reconciled from
a fresh, validated native Core CLI order read through the existing Core writer.
It is now VALIDATED with businessStream shared and department gift_card_sales.
No native order, financial transaction or customer identity was recreated.

The account also marks history pending whenever its reconciled funded total
differs from Shopify's actual balance. It continues displaying the native
balance rather than falsely claiming complete history after an unhandled
refund, manual credit or other lifecycle event.

## Rendered account confirmation — 12 October 2026

The recipient provided a screenshot of the refreshed native account Wallet:
SGD 2.10 balance, Purchase −SGD 22.90, and Gift Card +SGD 25.00.
Evidence: codex-clipboard-813ce287-61c9-4ecf-8cfe-2b1f43212929.png.
This independently confirms the corrected purchase label and rendered history
for the existing #1010/#1011 flow; no additional financial action was performed.
The expired development tunnel was replaced; the extension endpoint returned
HTTP 200 before this confirmation. No theme publication occurred.
