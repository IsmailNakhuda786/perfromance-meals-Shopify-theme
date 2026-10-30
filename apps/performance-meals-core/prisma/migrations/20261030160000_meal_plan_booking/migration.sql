-- CreateTable
CREATE TABLE "MealPlanDeliverySlot" (
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

-- CreateTable
CREATE TABLE "MealPlanDeliveryVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "orderGid" TEXT NOT NULL,
    "destinationKey" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'BOOKED',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProgrammeDeliveryBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "orderGid" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "batchHash" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'BOOKED',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProgrammeBookingRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "MealPlanDeliverySlot_shop_available_deliveryAt_idx" ON "MealPlanDeliverySlot"("shop", "available", "deliveryAt");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlanDeliverySlot_shop_slotKey_key" ON "MealPlanDeliverySlot"("shop", "slotKey");

-- CreateIndex
CREATE INDEX "MealPlanDeliveryVisit_shop_slotId_state_idx" ON "MealPlanDeliveryVisit"("shop", "slotId", "state");

-- CreateIndex
CREATE INDEX "MealPlanDeliveryVisit_shop_customerGid_orderGid_idx" ON "MealPlanDeliveryVisit"("shop", "customerGid", "orderGid");

-- CreateIndex
CREATE INDEX "ProgrammeDeliveryBooking_shop_visitId_state_idx" ON "ProgrammeDeliveryBooking"("shop", "visitId", "state");

-- CreateIndex
CREATE INDEX "ProgrammeDeliveryBooking_shop_customerGid_selectionId_idx" ON "ProgrammeDeliveryBooking"("shop", "customerGid", "selectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammeDeliveryBooking_shop_batchId_key" ON "ProgrammeDeliveryBooking"("shop", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammeBookingRequest_shop_customerGid_requestKey_key" ON "ProgrammeBookingRequest"("shop", "customerGid", "requestKey");

