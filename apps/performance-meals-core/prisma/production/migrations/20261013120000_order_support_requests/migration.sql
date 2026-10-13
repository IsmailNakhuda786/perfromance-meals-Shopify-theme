CREATE TABLE "OrderSupportRequest" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "orderGid" TEXT NOT NULL,
 "orderName" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'REQUESTED',
 "evidence" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "OrderSupportRequest_shop_orderGid_key" ON "OrderSupportRequest"("shop", "orderGid");
CREATE INDEX "OrderSupportRequest_shop_customerGid_createdAt_idx" ON "OrderSupportRequest"("shop", "customerGid", "createdAt");
