CREATE TABLE "CoreWalletRedemptionDraft" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "currency" TEXT NOT NULL,
 "attemptId" TEXT NOT NULL,
 "state" TEXT NOT NULL,
 "revision" INTEGER NOT NULL,
 "payload" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "CoreWalletRedemptionDraft_shop_attemptId_key" ON "CoreWalletRedemptionDraft"("shop", "attemptId");
CREATE INDEX "CoreWalletRedemptionDraft_shop_customerGid_state_idx" ON "CoreWalletRedemptionDraft"("shop", "customerGid", "state");
