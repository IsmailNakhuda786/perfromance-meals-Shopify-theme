ALTER TABLE "WalletEntry" ADD COLUMN "nativeSourceTransactionGid" TEXT;
CREATE UNIQUE INDEX "WalletEntry_shop_nativeTransactionGid_key" ON "WalletEntry"("shop", "nativeTransactionGid");
CREATE UNIQUE INDEX "WalletEntry_shop_nativeSourceTransactionGid_key" ON "WalletEntry"("shop", "nativeSourceTransactionGid");
