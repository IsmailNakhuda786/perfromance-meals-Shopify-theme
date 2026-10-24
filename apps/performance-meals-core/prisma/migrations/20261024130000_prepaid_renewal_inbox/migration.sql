CREATE TABLE "PrepaidRenewalInbox" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "purchaseEvidenceId" TEXT NOT NULL,
 "contractGid" TEXT NOT NULL,
 "attemptGid" TEXT NOT NULL,
 "idempotencyKey" TEXT NOT NULL,
 "renewalOrderGid" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PENDING_VERIFY',
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "completedAt" DATETIME
);
CREATE UNIQUE INDEX "PrepaidRenewalInbox_shop_attemptGid_key" ON "PrepaidRenewalInbox"("shop", "attemptGid");
CREATE INDEX "PrepaidRenewalInbox_shop_customerGid_idx" ON "PrepaidRenewalInbox"("shop", "customerGid");
CREATE INDEX "PrepaidRenewalInbox_shop_state_createdAt_id_idx" ON "PrepaidRenewalInbox"("shop", "state", "createdAt", "id");
