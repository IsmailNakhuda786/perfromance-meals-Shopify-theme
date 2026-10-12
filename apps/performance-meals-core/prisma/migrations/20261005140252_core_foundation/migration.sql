-- CreateTable
CREATE TABLE "MealPlanDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "programmeGid" TEXT NOT NULL,
    "variantGid" TEXT NOT NULL,
    "sellingPlanGid" TEXT,
    "selections" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MealPlanSelection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "programmeGid" TEXT NOT NULL,
    "variantGid" TEXT NOT NULL,
    "sellingPlanGid" TEXT,
    "businessStream" TEXT NOT NULL DEFAULT 'meal_plan',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "selections" TEXT NOT NULL,
    "selectionHash" TEXT NOT NULL,
    "cutoffAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REVIEWED',
    "reviewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderGid" TEXT,
    "orderLineGid" TEXT,
    "contractGid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OperationalLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "orderGid" TEXT NOT NULL,
    "orderLineGid" TEXT NOT NULL,
    "customerGid" TEXT,
    "productGid" TEXT,
    "variantGid" TEXT,
    "businessStream" TEXT,
    "department" TEXT,
    "validationStatus" TEXT NOT NULL,
    "validationReason" TEXT,
    "selectionId" TEXT,
    "contractGid" TEXT,
    "fulfillmentState" TEXT NOT NULL DEFAULT 'UNASSIGNED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WebhookReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PlanOperation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'REQUESTED',
    "cycleReference" TEXT,
    "deliveryAt" DATETIME,
    "fulfillmentGid" TEXT,
    "productionReference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MigrationMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceCustomerId" TEXT,
    "sourceSubscriptionId" TEXT,
    "sourceOrderId" TEXT,
    "targetGid" TEXT,
    "appRecordId" TEXT,
    "businessStream" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "migratedAt" DATETIME,
    "historicalReference" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "MealPlanDraft_shop_customerGid_key" ON "MealPlanDraft"("shop", "customerGid");

-- CreateIndex
CREATE INDEX "MealPlanSelection_shop_customerGid_idx" ON "MealPlanSelection"("shop", "customerGid");

-- CreateIndex
CREATE INDEX "MealPlanSelection_shop_orderGid_idx" ON "MealPlanSelection"("shop", "orderGid");

-- CreateIndex
CREATE INDEX "OperationalLine_shop_businessStream_validationStatus_idx" ON "OperationalLine"("shop", "businessStream", "validationStatus");

-- CreateIndex
CREATE INDEX "OperationalLine_shop_customerGid_idx" ON "OperationalLine"("shop", "customerGid");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalLine_shop_orderLineGid_key" ON "OperationalLine"("shop", "orderLineGid");

-- CreateIndex
CREATE INDEX "PlanOperation_shop_selectionId_idx" ON "PlanOperation"("shop", "selectionId");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationMapping_shop_sourceSystem_sourceType_sourceId_key" ON "MigrationMapping"("shop", "sourceSystem", "sourceType", "sourceId");
