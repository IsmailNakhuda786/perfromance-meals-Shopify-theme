-- CreateTable
CREATE TABLE "WalletCreditExpiry" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "walletEntryId" TEXT NOT NULL,
    "nativeCreditGid" TEXT NOT NULL,
    "nativeAccountGid" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "remainingMinor" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reminderAt" TIMESTAMP(3) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "reminderState" TEXT NOT NULL DEFAULT 'PENDING',
    "deliveryKey" TEXT,
    "deliveryReference" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletCreditExpiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletCreditExpiry_deliveryKey_key" ON "WalletCreditExpiry"("deliveryKey");

-- CreateIndex
CREATE INDEX "WalletCreditExpiry_shop_reminderState_reminderAt_idx" ON "WalletCreditExpiry"("shop", "reminderState", "reminderAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletCreditExpiry_shop_walletEntryId_key" ON "WalletCreditExpiry"("shop", "walletEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletCreditExpiry_shop_nativeCreditGid_key" ON "WalletCreditExpiry"("shop", "nativeCreditGid");

