-- CreateTable
CREATE TABLE "GiftCardExpiryReminder" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "giftCardGid" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "expiresOn" TEXT NOT NULL,
    "reminderAt" TIMESTAMP(3) NOT NULL,
    "remainingMinor" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "deliveryKey" TEXT,
    "deliveryReference" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCardExpiryReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardExpiryReminder_deliveryKey_key" ON "GiftCardExpiryReminder"("deliveryKey");

-- CreateIndex
CREATE INDEX "GiftCardExpiryReminder_shop_state_reminderAt_idx" ON "GiftCardExpiryReminder"("shop", "state", "reminderAt");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardExpiryReminder_shop_giftCardGid_key" ON "GiftCardExpiryReminder"("shop", "giftCardGid");

