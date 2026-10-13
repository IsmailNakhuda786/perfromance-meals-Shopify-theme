CREATE TABLE "WalletTopUpIntent" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "requestKey" TEXT NOT NULL,
 "currency" TEXT NOT NULL,
 "amountMinor" INTEGER NOT NULL,
 "productGid" TEXT NOT NULL,
 "variantGid" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PREPARED',
 "draftGid" TEXT,
 "checkoutUrl" TEXT,
 "orderGid" TEXT,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "WalletTopUpIntent_shop_customerGid_requestKey_key" ON "WalletTopUpIntent"("shop", "customerGid", "requestKey");
CREATE UNIQUE INDEX "WalletTopUpIntent_shop_draftGid_key" ON "WalletTopUpIntent"("shop", "draftGid");
CREATE UNIQUE INDEX "WalletTopUpIntent_shop_orderGid_key" ON "WalletTopUpIntent"("shop", "orderGid");
