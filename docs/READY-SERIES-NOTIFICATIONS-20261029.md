# Ready Series delivery and renewal notifications — 29 October 2026

## Delivery message journey verified

The user approved one isolated development reminder email for existing test Order #1031. Seven temporary slots and a two-package Core booking were prepared; the 72-hour due time was simulated. No native delivery, payment, renewal, Wallet or Rewards change occurred.

The guarded sender verified the current paid native occurrence, exact customer/destination, confirmed Core booking revision, all visit members and current due reminder rows. It saved a durable claim before contacting the provider. Exactly one clearly labelled development email was accepted by Resend for the approved QA recipient, covering both packages in one visit. The two corresponding member reminders were marked sent under one provider receipt. Replay returned that saved result with zero extra sends and no record changes. Provider acceptance is proven; inbox receipt is not separately asserted.

All temporary slots, policy, calendar, booking and message records were then removed under the approval. All 37 existing shop-scoped model fingerprints matched the original baseline; the three booking tables were empty. The provider receipt and cleanup journal remain in ignored private QA files. No public sender, scheduler or WhatsApp message was activated. Normal development customer controls and Wallet top-ups remained disabled.

A timeout/uncertain provider response stays held, even beyond provider idempotency retention. A sent reminder can survive a legitimate reschedule only when its committed sender receipt covers that exact delivery, revision, channel and stage. A bare or corrupted SENT marker still rejects and preserves the original booking. Full regression exposed this gap and the corrected guard passed the 49-test focused regression.

## Renewal reminders implemented

Human confirmations on 29 October establish:

- One calendar month, fourteen days, seven days and forty-eight hours before the scheduled billing timestamp.
- Final notice at midnight Singapore time at the start of renewal day; the email still displays the actual scheduled charge time.
- After a messaging outage, one catch-up per channel covers missed unsent stages, followed by the remaining normal reminders.

Calendar-month subtraction uses Singapore civil dates and clamps short months, including leap years. Delivery dates never determine billing notices. Recovery retains the first prepared catch-up timestamp, does not repeat stages with a verified receipt and holds uncertain/in-progress sends instead of creating a catch-up duplicate.

Core reads native ACTIVE status, next billing date, customer/app ownership, package quantities, GST-inclusive prices, included delivery and persistent per-package price corrections. Changed prices/discounts, incomplete evidence and past-due billing hold before sending. Paused/cancelled schedules suppress messages; a read-only check against an existing cancelled Shopify QA subscription returned INACTIVE with zero planned messages.

Durable notice preparation and guarded sending are implemented behind default-off, development-only customer/contract scopes. Both sender and recovery tests cover saved receipts, cancellation/date changes, wrong ownership, concurrent calls and uncertain responses. Actual renewal sending through Shopify's active-contract journey has not been demonstrated; the successful external email test above is specifically the delivery notice journey.

## Remaining gates

- General merchant/customer activation and production recipient resolution are not approved.
- A production email sender/domain and permanent execution schedule remain an infrastructure gate, excluded from the October 31 functional assessment but required before launch.
- WhatsApp Business/provider access, recipient permissions and approved templates remain dependent on Jerome's setup. Prepared content is not proof of WhatsApp delivery.
- Dispatch/reconciliation and customer Support workflows remain separate fulfilment acceptance work.
- All financial/platform blockers for Wallet remain unchanged. These notification services neither authorize payments nor enable top-ups.
