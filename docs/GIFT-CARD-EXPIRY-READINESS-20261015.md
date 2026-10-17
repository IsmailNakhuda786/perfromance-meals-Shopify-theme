# Gift Card expiry readiness — 15 October 2026

Added a read-only native policy review for issued Gift Cards, using the verified issue timestamp, named recipient, enabled state, remaining SGD balance and native expiry date. New cards distinguish correct one-year configuration, missing expiry, merchant-set dates requiring review, exhausted/disabled cards, and missing recipient evidence. Singapore calendar boundaries determine reminder candidates and expiry; the candidate result is not email-send authorization. Historical cards remain unchanged and receive no invented replacement expiry.

The Admin GraphQL query passes official2026-10 validation with read_gift_cards/read_customers scopes. Four focused tests cover invalid native evidence, historical preservation, recipient checks and the one-month/Singapore end-of-day boundary. A read-only SDK call against the existing completed development Gift Card claim returned HISTORICAL_UNCHANGED and left the five Wallet ledger entries unchanged. No card update, financial transfer or email occurred.

User explicitly approved development-only write_gift_cards access. It is added to the existing app configuration, and the running CLI development preview reports that scope auto-granted. This is not authorization to update an existing card: a separately identified native QA case remains required. No application release or payment-provider change occurred.

Setting expiry on newly issued cards, durable unclaimed-card reminders and their notification receipts remain outstanding. Shopify documents giftCardUpdate as requiring write_gift_cards: https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/giftCardUpdate.


## Approved writer and native QA

Default-off applyApprovedGiftCardExpiry writes only the one-year expiry for a new, enabled, positive-balance card with the expected named recipient and no merchant-set expiry. It rereads the native card, leaves historical cards untouched, refuses conflicting expiry/recipient evidence and does not change value or send notifications. A repeat on the correct expiry makes no write. GraphQL mutation validates against2026-10. Production preflight refuses activation pending full acceptance.

User separately approved development write_customers access for named-recipient assignment and one SGD1 test card's issuance/expiry/deactivation. Native access read confirmed read_gift_cards,write_gift_cards,write_customers. The test created exactly one named-recipient card with no scheduled notification, wrote the correct one-year date once, confirmed a repeat made no update and deactivated that same card. Native readback confirms unavailable/deactivated with its expiry retained. Existing cards and Wallet balances were untouched. Private evidence: Core .shopify/gift-expiry-approved-qa.private.json. No card code was requested or recorded.

The writer remains unconnected to automatic order issuance and disabled in shared runtime; the approved scope is retained in development configuration. This QA does not mark Gift Card lifecycle/refund/recovery or reminders fully accepted.
