CREATE TABLE "ReadyDeliverySlot" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "slotKey" TEXT NOT NULL,
 "deliveryAt" DATETIME NOT NULL,
 "deliveryEndsAt" DATETIME NOT NULL,
 "capacity" INTEGER NOT NULL,
 "reserved" INTEGER NOT NULL DEFAULT 0,
 "available" BOOLEAN NOT NULL DEFAULT true,
 "revision" INTEGER NOT NULL DEFAULT 1,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "ReadyDeliverySlot_shop_slotKey_key" ON "ReadyDeliverySlot"("shop", "slotKey");
CREATE INDEX "ReadyDeliverySlot_shop_available_deliveryAt_idx" ON "ReadyDeliverySlot"("shop", "available", "deliveryAt");
CREATE TABLE "ReadyDeliverySlotReservation" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "slotId" TEXT NOT NULL,
 "deliveryDraftId" TEXT NOT NULL,
 "deliveryRevision" INTEGER NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'RESERVED',
 "releasedAt" DATETIME,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ReadySlotReservation_draft_revision_key" ON "ReadyDeliverySlotReservation"("shop", "deliveryDraftId", "deliveryRevision");
CREATE INDEX "ReadyDeliverySlotReservation_shop_slotId_state_idx" ON "ReadyDeliverySlotReservation"("shop", "slotId", "state");
