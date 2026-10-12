CREATE TABLE "MealPlanMenuRevision" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "selectionId" TEXT NOT NULL,
 "block" INTEGER NOT NULL,
 "revision" INTEGER NOT NULL,
 "state" TEXT NOT NULL,
 "inputSelections" TEXT NOT NULL,
 "selections" TEXT NOT NULL,
 "cutoffAt" DATETIME NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "MealPlanMenuRevision_shop_selectionId_block_revision_key" ON "MealPlanMenuRevision"("shop", "selectionId", "block", "revision");
CREATE INDEX "MealPlanMenuRevision_shop_customerGid_selectionId_idx" ON "MealPlanMenuRevision"("shop", "customerGid", "selectionId");
