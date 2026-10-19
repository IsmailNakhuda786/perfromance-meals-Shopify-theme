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
