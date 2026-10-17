-- AlterTable
ALTER TABLE "WalletCreditExpiry" ADD COLUMN     "enforcementMode" TEXT NOT NULL DEFAULT 'NATIVE_OBSERVED',
ADD COLUMN     "expiredMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expiryAllocations" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "expiryLedgerEntryId" TEXT,
ADD COLUMN     "expiryState" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "nativeExpiryDebitGid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WalletCreditExpiry_nativeExpiryDebitGid_key" ON "WalletCreditExpiry"("nativeExpiryDebitGid");

