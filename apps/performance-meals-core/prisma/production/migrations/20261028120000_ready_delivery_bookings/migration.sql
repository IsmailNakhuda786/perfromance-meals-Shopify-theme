-- CreateTable
CREATE TABLE "ReadyDeliveryPolicy" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "noticeHours" INTEGER NOT NULL,
    "holidayCalendar" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "ReadyDeliveryBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "orderGid" TEXT NOT NULL,
    "visitId" TEXT,
    "nativeProof" TEXT NOT NULL,
    "nativeHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PREPARING',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "ReadyDeliveryBookingRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ReadyDeliveryBooking_visitId_key" ON "ReadyDeliveryBooking"("visitId");

-- CreateIndex
CREATE INDEX "ReadyDeliveryBooking_shop_customerGid_state_idx" ON "ReadyDeliveryBooking"("shop", "customerGid", "state");

-- CreateIndex
CREATE UNIQUE INDEX "ReadyDeliveryBooking_shop_sourceKey_key" ON "ReadyDeliveryBooking"("shop", "sourceKey");

-- CreateIndex
CREATE INDEX "ReadyDeliveryBookingRequest_shop_bookingId_idx" ON "ReadyDeliveryBookingRequest"("shop", "bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadyBookingRequest_owner_request_key" ON "ReadyDeliveryBookingRequest"("shop", "customerGid", "requestKey");


CREATE INDEX "ReadyDeliveryBooking_shop_customerGid_orderGid_idx" ON "ReadyDeliveryBooking"("shop", "customerGid", "orderGid");
