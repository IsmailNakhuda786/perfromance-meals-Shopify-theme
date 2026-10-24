DROP INDEX "PrepaidPurchaseEvidence_shop_contractGid_key";
CREATE UNIQUE INDEX "PrepaidPurchaseEvidence_contract_line_key" ON "PrepaidPurchaseEvidence"("shop", "contractGid", "originalLineGid");
CREATE INDEX "PrepaidPurchaseEvidence_shop_contractGid_idx" ON "PrepaidPurchaseEvidence"("shop", "contractGid");
DROP INDEX "PrepaidRenewalEvidence_shop_attemptGid_key";
DROP INDEX "PrepaidRenewalEvidence_shop_renewalOrderGid_key";
CREATE UNIQUE INDEX "PrepaidRenewalEvidence_attempt_purchase_key" ON "PrepaidRenewalEvidence"("shop", "attemptGid", "purchaseEvidenceId");
CREATE UNIQUE INDEX "PrepaidRenewalEvidence_order_purchase_key" ON "PrepaidRenewalEvidence"("shop", "renewalOrderGid", "purchaseEvidenceId");
