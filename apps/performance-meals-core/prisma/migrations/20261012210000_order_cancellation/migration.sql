ALTER TABLE "CommercePolicy" ADD COLUMN "orderCancellationsEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "OrderCancellation" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "orderGid" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "currency" TEXT NOT NULL,
 "amountMinor" INTEGER NOT NULL,
 "contractGids" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PREPARED',
 "jobGid" TEXT,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "OrderCancellation_shop_orderGid_key" ON "OrderCancellation"("shop", "orderGid");
CREATE INDEX "OrderCancellation_shop_customerGid_state_idx" ON "OrderCancellation"("shop", "customerGid", "state");
