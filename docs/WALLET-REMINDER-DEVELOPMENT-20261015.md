# Wallet reminder delivery preparation

A bounded internal reminder worker now uses the existing verified credit/source-lot preparation and persisted delivery claim. It records a provider receipt on acceptance; ambiguous sends become UNKNOWN and are excluded from automatic subsequent batches. SENT and DELIVERING records are also excluded. No timer, public route or shared activation has been installed.

A development-only Resend adapter is prepared. It is restricted to the approved QA customer identity and recipient, labels the subject/body as development test, supports a stable idempotency header, rejects missing/malformed configuration and refuses production mode. It does not log the API key or send customer IDs in the email body. Transport tests use mock responses; no email has yet been sent.

Resend's shared test sender requires the recipient to be the Resend account owner's email. User approved free account creation/terms. Google sign-in failed; regular signup is prepared with the approved email, awaiting user password entry and verification. No credentials or paid plan were created. Do not request an API key in chat. Arrange secure local configuration after signup.

Official references checked15 October2026:
- https://resend.com/pricing — free transactional allowance3000/month,100/day.
- https://resend.com/docs/dashboard/emails/idempotency-keys — provider duplicate keys last24 hours, so Core's permanent claim/hold remains necessary.
- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/knowledge-base/403-error-resend-dev-domain

A provider acceptance receipt is not proof of inbox delivery. The approved labelled test must be delivered and acknowledged separately. Scheduling, bonus-credit reminders and production sender/domain remain unverified. Top-ups stay disabled.


## Native sender verification completed

User created the approved free Resend account and explicitly approved a Sending-access key. The key is saved only in ignored Core .shopify/reminder-sender.private.json with0600 permissions; a byte comparison confirms it is absent from tracked files. Source/test fixtures use private runtime allowlist configuration rather than a personal email address. No full-access key, paid plan, verified production domain or production sender was configured.

One approved labelled sample message was accepted by Resend and its dashboard shows exactly one row marked Delivered. Private provider receipt is .shopify/approved-reminder-send.private.json; screenshot is /private/tmp/pm-reminder-delivered-20261015.png. The first network request was unconfirmed under sandbox restrictions. Recovery used the identical provider idempotency key/message within ten minutes, rather than creating a new delivery. It produced one acceptance receipt. No financial action occurred.

This is real adapter/provider delivery evidence with explicitly simulated credit information. It does not establish scheduled due-credit delivery, permanent hosting, Gift Card notification scheduling or production activation. The general reminder switch remains off.

Runtime allowlist configuration: WALLET_REMINDER_TEST_RECIPIENT and WALLET_REMINDER_TEST_CUSTOMER must match the explicitly approved development context. The private QA harness sets them; no shared sender activation was made. The development sender refuses production mode regardless of configuration.

Read-only Settings→Usage inspection confirms the Transactional plan is Free; pay-as-you-go remains disabled. No billing settings were changed. Evidence is preserved under Core .shopify/evidence/pm-resend-free-plan-20261015.png alongside the delivery screenshot.
