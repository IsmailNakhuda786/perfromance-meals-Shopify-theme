-- CreateTable
CREATE TABLE "CustomerWallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "fundedBalance" INTEGER NOT NULL DEFAULT 0,
    "bonusBalance" INTEGER NOT NULL DEFAULT 0,
    "fundedReserved" INTEGER NOT NULL DEFAULT 0,
    "bonusReserved" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WalletEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "sourceEvent" TEXT NOT NULL,
    "sourceGid" TEXT,
    "fundedDelta" INTEGER NOT NULL,
    "bonusDelta" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WalletReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "checkoutReference" TEXT NOT NULL,
    "fundedMinor" INTEGER NOT NULL,
    "bonusMinor" INTEGER NOT NULL,
    "nativeLineSnapshot" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'RESERVED',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CommercePolicy" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "walletEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rewardsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bonusTiers" TEXT,
    "bonusExpiry" TEXT,
    "refundRules" TEXT,
    "referralRules" TEXT,
    "giftCardRenewals" BOOLEAN,
    "rewardsRules" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerWallet_shop_customerGid_currency_key" ON "CustomerWallet"("shop", "customerGid", "currency");

-- CreateIndex
CREATE INDEX "WalletEntry_shop_customerGid_currency_idx" ON "WalletEntry"("shop", "customerGid", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "WalletEntry_shop_sourceEvent_key" ON "WalletEntry"("shop", "sourceEvent");

-- CreateIndex
CREATE INDEX "WalletReservation_shop_customerGid_state_idx" ON "WalletReservation"("shop", "customerGid", "state");

-- CreateIndex
CREATE UNIQUE INDEX "WalletReservation_shop_checkoutReference_key" ON "WalletReservation"("shop", "checkoutReference");

