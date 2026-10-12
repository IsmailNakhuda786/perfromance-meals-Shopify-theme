ALTER TABLE "CommercePolicy" ADD COLUMN "giftCardClaimsEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "GiftCardWalletClaim" (
 "id" TEXT NOT NULL, "shop" TEXT NOT NULL, "giftCardGid" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL, "currency" TEXT NOT NULL, "amountMinor" INTEGER NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PREPARED', "debitGid" TEXT, "creditGid" TEXT, "ledgerEntryId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "GiftCardWalletClaim_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GiftCardWalletClaim_shop_giftCardGid_key" ON "GiftCardWalletClaim"("shop", "giftCardGid");
CREATE UNIQUE INDEX "GiftCardWalletClaim_shop_debitGid_key" ON "GiftCardWalletClaim"("shop", "debitGid");
CREATE UNIQUE INDEX "GiftCardWalletClaim_shop_creditGid_key" ON "GiftCardWalletClaim"("shop", "creditGid");
CREATE INDEX "GiftCardWalletClaim_shop_customerGid_state_idx" ON "GiftCardWalletClaim"("shop", "customerGid", "state");
