# Full dish-linked 6 by 60 allowance — 30 October 2026

User specifically approved the full dish-linked programme test on paid development Order #1009. The backend acceptance passed, using only the saved customer choices:29 weekday sources totalling88 meals, plus32 frozen Greek Chicken meals from a customer-selected dish. No menu editing or substitute catalogue was used.

Core allocated the120 meals in one clearly labelled temporary QA batch, rejected stale/unknown/excess allocation requests, and replayed the original allocation without adding meals. The approved simulated Core dispatch then recorded88weekday/32frozen; customer-owned progress returned those totals, and dispatch replay did not increase them. No native Shopify fulfilment or payment occurred.

The weekly allowance reached the user's1% reserve after backend verification. **The full120-meal customer-screen readback was not completed and is not marked PASS.** The separate two-batch booking/customer rescheduling journey already passed, as documented in MEAL-PLAN-BOOKING-ACCEPTANCE-20261030.md.

Guarded restoration completed: all44 protected Core model groups and complete native order history matched their originals. No real meals, customer message, financial mutation, Wallet, Rewards or menu changes. Private journal `.shopify/full-dish-native30.private.json` is RESTORED and must never be replayed. Read-only preparation is `.shopify/full-dish-proposal30.private.json`; approval persists for completing the same identified acceptance after allowance refresh, with a fresh journal and renewed source proof.

Normal preview41642 restored with flags off; origin https://charged-pike-simplified-instance.trycloudflare.com. Callback restoration: `.shopify/full-dish-normal-reconnect30.private.log`. Full native test logs remain private under `.shopify/full-dish-native-*.private.log`.

Next: finish the full chosen-dish customer-screen completion/exhaustion check in a fresh isolated test, restore it and assess requirement3 against its remaining functional criteria. Do not repeat completed prepaid charges or re-open settled business questions. Wallet top-ups remain disabled. No blanket production acceptance is claimed.
