CREATE TABLE "PrepaidPricingApproval" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "variantGid" TEXT NOT NULL,
 "sellingPlanGid" TEXT NOT NULL,
 "snapshot" TEXT NOT NULL,
 "snapshotHash" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "PrepaidPricingApproval_variant_plan_key" ON "PrepaidPricingApproval"("shop", "variantGid", "sellingPlanGid");
CREATE INDEX "PrepaidPricingApproval_shop_customerGid_idx" ON "PrepaidPricingApproval"("shop", "customerGid");
CREATE TABLE "PrepaidPurchaseInbox" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "contractGid" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PENDING_VERIFY',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "completedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "PrepaidPurchaseInbox_shop_contractGid_key" ON "PrepaidPurchaseInbox"("shop", "contractGid");
CREATE INDEX "PrepaidPurchaseInbox_shop_customerGid_idx" ON "PrepaidPurchaseInbox"("shop", "customerGid");
CREATE INDEX "PrepaidPurchaseInbox_shop_state_createdAt_id_idx" ON "PrepaidPurchaseInbox"("shop", "state", "createdAt", "id");
