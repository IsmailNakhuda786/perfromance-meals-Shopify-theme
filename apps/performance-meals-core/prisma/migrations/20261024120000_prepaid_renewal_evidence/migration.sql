CREATE TABLE "PrepaidPurchaseEvidence" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "contractGid" TEXT NOT NULL,
 "originalOrderGid" TEXT NOT NULL,
 "originalLineGid" TEXT NOT NULL,
 "snapshot" TEXT NOT NULL,
 "snapshotHash" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "PrepaidPurchaseEvidence_shop_contractGid_key" ON "PrepaidPurchaseEvidence"("shop", "contractGid");
CREATE UNIQUE INDEX "PrepaidPurchaseEvidence_shop_originalLineGid_key" ON "PrepaidPurchaseEvidence"("shop", "originalLineGid");
CREATE INDEX "PrepaidPurchaseEvidence_shop_customerGid_idx" ON "PrepaidPurchaseEvidence"("shop", "customerGid");
CREATE TABLE "PrepaidRenewalEvidence" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "contractGid" TEXT NOT NULL,
 "purchaseEvidenceId" TEXT NOT NULL,
 "attemptGid" TEXT NOT NULL,
 "renewalOrderGid" TEXT NOT NULL,
 "snapshot" TEXT NOT NULL,
 "snapshotHash" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PENDING_LINK',
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "completedAt" DATETIME
);
CREATE UNIQUE INDEX "PrepaidRenewalEvidence_shop_attemptGid_key" ON "PrepaidRenewalEvidence"("shop", "attemptGid");
CREATE UNIQUE INDEX "PrepaidRenewalEvidence_shop_renewalOrderGid_key" ON "PrepaidRenewalEvidence"("shop", "renewalOrderGid");
CREATE INDEX "PrepaidRenewalEvidence_shop_customerGid_idx" ON "PrepaidRenewalEvidence"("shop", "customerGid");
CREATE INDEX "PrepaidRenewalEvidence_shop_state_createdAt_id_idx" ON "PrepaidRenewalEvidence"("shop", "state", "createdAt", "id");
