# Cost-bounded prepaid schedule reads — 23 October 2026

The schedule reader now requests five fulfillment orders and twenty lines per initial page, then follows parent and child cursors. It retains the existing coverage limits of100fulfillment orders and250lines per fulfillment. It holds on missing/repeated cursors, incomplete/foreign responses, changed original order quantities, duplicate records and exceeded limits. It does not treat a partial page as complete and does not mutate deliveries or billing.

Ten focused schedule tests pass, including the sixth delivery on a second page and a target order line hidden beyond the first child page. All **437 Core tests**, TypeScript and lint pass. Both read operations validate against Admin2026-10.

Read-only native checks against the existing3-/6-delivery QA-order baselines match all9deliveries across3requests. Each request has native requested query cost63, with actual costs21/25/15. No native mutation occurred. This verifies baseline coverage, not the merchant calendar, delivery slot or permission to dispatch. Those acceptance flags remain false.

The separate new renewal-stop test remains an approved, single3-delivery simulated purchase capped at255.20SGD. Its unpaid checkout is255.18with free first/recurring shipping. The QA product is temporarily unlisted; only its3-term variant is assigned to the existing isolated profile, whose rates are unchanged. Restore that assignment, product availability and two private theme files after testing. No payment was made by the agent.
