# Gift Card development email adapter — 18 October 2026

Internal adapter for the existing durable Gift Card reminder batch. It has no
route, timer, worker, native mutation or automatic sender activation. No real email
was sent during this implementation, and no secret configuration was changed.
Production invocation is rejected both when creating the adapter and when sending.

The batch verifies the native card is still enabled, unclaimed/has remaining value,
assigned to the same named recipient, within the approved original expiry and due
for its one-month reminder. The development adapter independently validates the
bound QA recipient/customer, SGD amount, real unexpired date and stable delivery key.
It sends clearly labelled test content through the existing Resend service interface
only when explicitly supplied a key/recipient and actually invoked by a future test.
It includes no Gift Card code, customer ID or payment request. The original expiry
is displayed, with no new year from claiming. Shared sender is development-only.

Separate ignored local values would be required for a future approved email test:
GIFT_CARD_REMINDER_TEST_RECIPIENT and GIFT_CARD_REMINDER_TEST_CUSTOMER. The adapter
receives the sending-only key through its trusted caller; no key is hardcoded,
written to docs or read from an account page. GIFT_CARD_EXPIRY_REMINDERS_ENABLED
remains a distinct default-off batch gate. Do not enable general sending or copy a
production/customer recipient into this development adapter.

Tests use mocked native/provider responses and an isolated SQLite outbox. Wrong
recipient, expired/invalid dates, malformed amounts, production mode, invalid
receipts and timeouts cannot become successful deliveries. Batch integration saves
one provider receipt, holds an uncertain send UNKNOWN and proves re-running does
not send either record again. No provider idempotency window is treated as authority
for retrying an uncertain historical delivery.

Remaining acceptance: approved real Gift Card reminder QA, production sender/domain,
automatic issuance/outbox registration and reliable scheduling. This change advances
#8 preparation, not live customer notification acceptance. Wallet top-ups stay off.
