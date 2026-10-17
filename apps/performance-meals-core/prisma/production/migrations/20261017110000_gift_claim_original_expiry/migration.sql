-- Preserve original expiry for new claims; historical claims remain unchanged.
ALTER TABLE "GiftCardWalletClaim" ADD COLUMN "giftCardExpiresOn" TEXT;
