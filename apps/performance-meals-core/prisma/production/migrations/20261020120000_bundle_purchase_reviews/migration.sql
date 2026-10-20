ALTER TABLE "OperationalLine" ADD COLUMN "bundleReviewId" TEXT;
CREATE TABLE "BundlePurchaseReview" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "productGid" TEXT NOT NULL,
 "variantGid" TEXT NOT NULL,
 "currency" TEXT NOT NULL,
 "quantity" INTEGER NOT NULL,
 "snapshot" TEXT NOT NULL,
 "snapshotHash" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'REVIEWED',
 "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "orderGid" TEXT,
 "orderLineGid" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "BundlePurchaseReview_shop_orderLineGid_key" ON "BundlePurchaseReview"("shop", "orderLineGid");
CREATE INDEX "BundlePurchaseReview_shop_customerGid_state_idx" ON "BundlePurchaseReview"("shop", "customerGid", "state");
