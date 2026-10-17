-- CreateTable
CREATE TABLE "WalletCreditExpiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "walletEntryId" TEXT NOT NULL,
    "nativeCreditGid" TEXT NOT NULL,
    "nativeAccountGid" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "remainingMinor" INTEGER NOT NULL,
    "issuedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "reminderAt" DATETIME NOT NULL,
    "observedAt" DATETIME NOT NULL,
    "reminderState" TEXT NOT NULL DEFAULT 'PENDING',
    "deliveryKey" TEXT,
    "deliveryReference" TEXT,
    "notifiedAt" DATETIME,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletCreditExpiry_deliveryKey_key" ON "WalletCreditExpiry"("deliveryKey");

-- CreateIndex
CREATE INDEX "WalletCreditExpiry_shop_reminderState_reminderAt_idx" ON "WalletCreditExpiry"("shop", "reminderState", "reminderAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletCreditExpiry_shop_walletEntryId_key" ON "WalletCreditExpiry"("shop", "walletEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletCreditExpiry_shop_nativeCreditGid_key" ON "WalletCreditExpiry"("shop", "nativeCreditGid");

