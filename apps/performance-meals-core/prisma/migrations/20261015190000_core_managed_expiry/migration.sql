-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WalletCreditExpiry" (
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
    "enforcementMode" TEXT NOT NULL DEFAULT 'NATIVE_OBSERVED',
    "expiryState" TEXT NOT NULL DEFAULT 'PENDING',
    "expiredMinor" INTEGER NOT NULL DEFAULT 0,
    "expiryAllocations" TEXT NOT NULL DEFAULT '[]',
    "nativeExpiryDebitGid" TEXT,
    "expiryLedgerEntryId" TEXT,
    "reminderState" TEXT NOT NULL DEFAULT 'PENDING',
    "deliveryKey" TEXT,
    "deliveryReference" TEXT,
    "notifiedAt" DATETIME,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_WalletCreditExpiry" ("amountMinor", "createdAt", "currency", "customerGid", "deliveryKey", "deliveryReference", "expiresAt", "id", "issuedAt", "nativeAccountGid", "nativeCreditGid", "notifiedAt", "observedAt", "remainingMinor", "reminderAt", "reminderState", "revision", "shop", "sourceKind", "updatedAt", "walletEntryId") SELECT "amountMinor", "createdAt", "currency", "customerGid", "deliveryKey", "deliveryReference", "expiresAt", "id", "issuedAt", "nativeAccountGid", "nativeCreditGid", "notifiedAt", "observedAt", "remainingMinor", "reminderAt", "reminderState", "revision", "shop", "sourceKind", "updatedAt", "walletEntryId" FROM "WalletCreditExpiry";
DROP TABLE "WalletCreditExpiry";
ALTER TABLE "new_WalletCreditExpiry" RENAME TO "WalletCreditExpiry";
CREATE UNIQUE INDEX "WalletCreditExpiry_nativeExpiryDebitGid_key" ON "WalletCreditExpiry"("nativeExpiryDebitGid");
CREATE UNIQUE INDEX "WalletCreditExpiry_deliveryKey_key" ON "WalletCreditExpiry"("deliveryKey");
CREATE INDEX "WalletCreditExpiry_shop_reminderState_reminderAt_idx" ON "WalletCreditExpiry"("shop", "reminderState", "reminderAt");
CREATE UNIQUE INDEX "WalletCreditExpiry_shop_walletEntryId_key" ON "WalletCreditExpiry"("shop", "walletEntryId");
CREATE UNIQUE INDEX "WalletCreditExpiry_shop_nativeCreditGid_key" ON "WalletCreditExpiry"("shop", "nativeCreditGid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

