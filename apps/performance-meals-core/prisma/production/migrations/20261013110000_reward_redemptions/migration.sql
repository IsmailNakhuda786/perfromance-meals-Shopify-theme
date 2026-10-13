CREATE TABLE "RewardRedemption" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "requestKey" TEXT NOT NULL,
 "rulesVersion" TEXT NOT NULL,
 "points" INTEGER NOT NULL,
 "amountMinor" INTEGER NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PREPARED',
 "nativeTransactionGid" TEXT,
 "ledgerEntryId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "RewardRedemption_shop_customerGid_requestKey_key" ON "RewardRedemption"("shop", "customerGid", "requestKey");
CREATE UNIQUE INDEX "RewardRedemption_shop_nativeTransactionGid_key" ON "RewardRedemption"("shop", "nativeTransactionGid");
CREATE INDEX "RewardRedemption_shop_customerGid_state_idx" ON "RewardRedemption"("shop", "customerGid", "state");
