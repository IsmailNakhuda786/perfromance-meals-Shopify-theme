ALTER TABLE "CommercePolicy" ADD COLUMN "walletTopUpsEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "WalletTopUpSettlement" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "orderGid" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "currency" TEXT NOT NULL,
 "amountMinor" INTEGER NOT NULL,
 "paymentGid" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PREPARED',
 "creditGid" TEXT,
 "ledgerEntryId" TEXT,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "WalletTopUpSettlement_shop_orderGid_key" ON "WalletTopUpSettlement"("shop", "orderGid");
CREATE UNIQUE INDEX "WalletTopUpSettlement_shop_paymentGid_key" ON "WalletTopUpSettlement"("shop", "paymentGid");
CREATE UNIQUE INDEX "WalletTopUpSettlement_shop_creditGid_key" ON "WalletTopUpSettlement"("shop", "creditGid");
CREATE INDEX "WalletTopUpSettlement_shop_customerGid_state_idx" ON "WalletTopUpSettlement"("shop", "customerGid", "state");
