# Normal storefront shipping QA — 19 October 2026

User approved temporarily making three clearly labelled QA copies available in
the password-protected development Online Store, without completed orders.
The previous draft-checkout targets were merchant catalogue drafts, so dedicated
copies preserved those original records. No theme publication or live-store work.

## Native normal checkout evidence

| Cart | Food/package subtotal SGD | Only delivery option SGD | Total SGD |
| --- | ---: | ---: | ---: |
|3ordinaryQAmeals at25|75.00|5.00|80.00|
|5ordinaryQAmeals at25|125.00|0.00|125.00|
|25ordinary +255.20prepaidQAvariant|280.20|10.00|290.20|
|PrepaidQAvariant only|255.20|0.00|255.20|

These used a normal storefront cart and its native checkout, not invoice drafts.
The same checkout was resumed after cart quantity/contents changed; native shipping
recalculated correctly. Singapore QA destination selected, no payment entered or
completion requested. Collection was back to zeroGST for these four normal-cart
checks; separate four nonzeroGSTdraft checks are in GST-CHECKOUT-QA-20261019.md.
No selling plan was selected; prepaid-product classification is not subscription
contract, recurring billing or true prepaid subscription acceptance.

Original cart was saved before mutation and restored in one batched add: Signature5
Non-Beef x1 and Teriyaki Chicken & Brown Rice x1,61.89food subtotal. Independent
readback compares exact variantIDs, quantities and line amounts; no duplicate add.
One interrupted WebMCP add response was read back before any retry, proving the
threeQAmeals were present and avoiding a second addition.

## Isolation and cleanup

Three QA copies only; ordinary test prices25/50and copied prepaid prices. Existing
isolated profile/rates reused; no published merchant product profile or rate changed.
Rule allowed only the three copyIDs during testing. Original rule configuration
restored with enabled=false; all copies returnedDRAFT with copied original prices.
Independent readback verifies all three original merchant records preserved.
All three OnlineStorepublication associations removed through the observed UI;
each shows not published anywhere. Copied profile membership removed; original
profile displays3entries and unchanged0/5/10rates. Independent native readback
after publication cleanup confirms all3originals preserved and all3copiesDRAFT
with original copiedprices. Original cart readback matches both savedvariants,
quantities and line amounts. Temporary setup is restored.

## Remaining acceptance

Normal discount-code path, normal combinedGST, wider multi-group shipping and
native subscription checkout remain. Production profiles/rates and supported
production app distribution/plan require acceptance. No overall production pass.
Private checkout receipts/screenshots and copy-state files remain outside Git.

## Resumed normal discount and GST acceptance

Reused the same approved isolated copies and shipping profile. The existing
SGD1code remains restricted to the existing QA customer and one-time purchases,
with one-use limits unchanged. Temporarily activated it, completed no order,
and deactivated it afterward (Expired status, no code use).

| Normal storefront cart | Order discount SGD | Only delivery option SGD | Gross total SGD | Included GST SGD |
| --- | ---: | ---: | ---: | ---: |
|75ordinary|1|10|84|0(collection off)|
|125ordinary|1|5|129|0(collection off)|
|125ordinary, temporary GST on|1|5|129|10.65|
|75ordinary +255.20prepaid, GST on|1|10|339.20|28.01|
|Same mixed cart, coupon removed, GST on|0|5|335.20|27.67|

Native checkout returned ready_for_complete with exactly one correct shipping
option in each case. No completion tool or payment button was used. The mixed
coupon case proves allocated order discounts can move the ordinary-food portion
below75without prepaid value subsidising delivery. Removing the code restores5.
Exact per-line discount allocation is not exposed by the checkout receipt and is
not inferred here.

Important evidence distinction: native checkout's machine receipt omits included
tax when prices are inclusive. The expanded visible order summary independently
shows10.65,28.01and27.67included tax; receipt totals alone do not prove nonzeroGST.

Cleanup verified: Singapore collection removed, existing tax checkboxes untouched;
shipping Function disabled with original allowlist; profile restored to3original
entries and unchanged0/5/10rates; copiesDRAFTwith original copiedprices; both
temporarily available copies unpublished again (third was never republished).
Independent readback confirms3merchant originals unchanged. Original cart variants,
quantities, line amounts and61.89total restored exactly; a timed-out address update
was read back before retry. Private receipts and screenshots stay outside Git.

Normal discount/combinedGST gates now have development evidence. Native selling
plans/subscription groups, broader delivery groups, production profiles and
supported production distribution remain open; no overall production acceptance.
