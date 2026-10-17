CREATE TABLE "ReadyDeliveryDraft" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "operationalLineId" TEXT NOT NULL,
 "occurrence" INTEGER NOT NULL,
 "deliveryAt" TIMESTAMP(3) NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1,
 "state" TEXT NOT NULL DEFAULT 'DRAFT',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "ReadyDeliveryDraft_shop_operationalLineId_occurrence_key" ON "ReadyDeliveryDraft"("shop", "operationalLineId", "occurrence");
CREATE INDEX "ReadyDeliveryDraft_shop_customerGid_idx" ON "ReadyDeliveryDraft"("shop", "customerGid");
CREATE TABLE "ReadyDeliveryReminder" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "deliveryDraftId" TEXT NOT NULL,
 "deliveryRevision" INTEGER NOT NULL,
 "channel" TEXT NOT NULL,
 "hoursBefore" INTEGER NOT NULL,
 "scheduledAt" TIMESTAMP(3) NOT NULL,
 "deliveryAt" TIMESTAMP(3) NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'DRAFT',
 "deliveryKey" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "ReadyDeliveryReminder_deliveryKey_key" ON "ReadyDeliveryReminder"("deliveryKey");
CREATE UNIQUE INDEX "ReadyDeliveryReminder_occurrence_revision_channel_lead_key" ON "ReadyDeliveryReminder"("shop", "deliveryDraftId", "deliveryRevision", "channel", "hoursBefore");
CREATE INDEX "ReadyDeliveryReminder_shop_state_scheduledAt_idx" ON "ReadyDeliveryReminder"("shop", "state", "scheduledAt");
