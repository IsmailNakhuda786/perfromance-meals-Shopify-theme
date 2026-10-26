CREATE TABLE "ReadyDeliveryVisit" (
 "id" TEXT NOT NULL PRIMARY KEY, "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL, "orderGid" TEXT NOT NULL,
 "destinationKey" TEXT NOT NULL, "slotId" TEXT NOT NULL,
 "reservationId" TEXT NOT NULL, "plan" TEXT NOT NULL,
 "packageCount" INTEGER NOT NULL, "state" TEXT NOT NULL DEFAULT 'RESERVED',
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "ReadyDeliveryVisit_reservationId_key" ON "ReadyDeliveryVisit"("reservationId");
CREATE INDEX "ReadyDeliveryVisit_shop_customerGid_state_idx" ON "ReadyDeliveryVisit"("shop", "customerGid", "state");
CREATE TABLE "ReadyDeliveryVisitMember" (
 "id" TEXT NOT NULL PRIMARY KEY, "customerGid" TEXT NOT NULL, "shop" TEXT NOT NULL, "visitId" TEXT NOT NULL,
 "deliveryDraftId" TEXT NOT NULL, "deliveryRevision" INTEGER NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'RESERVED'
);
CREATE UNIQUE INDEX "ReadyVisitMember_draft_revision_key" ON "ReadyDeliveryVisitMember"("shop", "deliveryDraftId", "deliveryRevision");
CREATE INDEX "ReadyDeliveryVisitMember_shop_visitId_state_idx" ON "ReadyDeliveryVisitMember"("shop", "visitId", "state");
