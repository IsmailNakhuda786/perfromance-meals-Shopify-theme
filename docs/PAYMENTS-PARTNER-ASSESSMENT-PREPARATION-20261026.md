# Core Wallet: payments-partner assessment preparation

26 October 2026. Draft preparation only. No application, agreement, plan purchase or payment change has been submitted.

## Official route and current limit

Shopify Developer Support states that Payments Partnerships decides eligibility/invitations through the [Payments Platform Application](https://www.shopify.com/paymentsplatformapplication). The official page links a Google form hosted inside Shopify’s Google organization. Google hosts the form; it is not a proposed Core runtime service.

Support cannot approve the architecture or invitation in its ticket. Plus alone does not unlock the Redeemables beta. Native Store Credit cannot enforce the required combined Wallet controls, and initial subscription funding must be distinguished from recurring billing.

The form requires confirmation that the developer documentation works for the proposed payment solution. That is not yet established for Core, so this confirmation must not be checked as though feasibility were proven. An authorized technical follow-up was sent asking for an assessment route before making this attestation and whether the general payment-partner form is appropriate for an early-stage closed-loop Wallet software developer. Response pending.

## Proposed technical description for review

Core is a reusable commerce-operations application under development, initially for a Singapore meal merchant. The proposed Wallet holds merchant-specific value and must choose credit sources before payment: customer-funded principal, Gift Card-derived credit, food-only bonus, then Reward credit, FIFO within each source. Gift Card conversion retains the original card expiry. Credit expiry and source restrictions must be enforced at final payment submission, including resumed checkout. Bonus credit cannot pay delivery, Gift Cards or top-ups and cannot earn points.

Required capabilities include exactly-once verified-payment top-up settlement, source-preserving audit/recovery, partial Wallet plus card payment with card-only checkout preserved, and an explicitly supported recurring subscription funding mechanism. A provider-neutral draft ledger/state machine is not presented as a functioning or approved Shopify payment adapter. The payment integration must comply with Admin API and dependency restrictions rather than relying on a prohibited second-app dependency.

## Required business information not inferred

| Application field | Required input/status |
| --- | --- |
| Partner Account Name / Partner ID | Exact business-owned Partner account and ID |
| Main contact name/email | Applicant’s chosen authorized contact |
| Emergency support name/email | Responsible support contact |
| Business model and differentiation | Technical description above, subject to business approval |
| Existing merchant count | Actual supported merchants; development prospects are not live merchants |
| Estimated annual total GMV / Shopify GMV | Applicant’s real estimates with currency and basis |
| Market size, product and geography | Business estimate; no invented market sizing |
| Website / countries supported | Applicant’s real website and actual/proposed markets clearly distinguished |
| Payment methods | Proposed Wallet / Gift Cards and Redeemables, not a claim of existing approved support |
| Merchant pricing model | Business decision: subscription/transaction/other commercial terms |
| Status page | Actual status-page URL or truthful not-yet-live disclosure |
| Company/product deck | Optional approved business material |
| Internal Shopify referral | Only if there is an actual referral |
| Revenue Share Agreement acknowledgement | Business review required; no agreement accepted |
| Documentation compatibility attestation | Unconfirmed; assessment-process clarification requested |
| No one-to-one build support acknowledgement | Applicant review required |

The signed-in Google identity is recorded on upload/submission; do not transmit company/customer records, credentials, test identities or private payment evidence. Any eventual application must be reviewed concretely and separately authorized. No admission date or launch feasibility is guaranteed.
