ALTER TABLE "CommercePolicy" ADD COLUMN "orderCancellationsEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "OrderCancellation" (
 "id" TEXT NOT NULL,
 "shop" TEXT NOT NULL,
 "orderGid" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "currency" TEXT NOT NULL,
 "amountMinor" INTEGER NOT NULL,
 "contractGids" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PREPARED',
 "jobGid" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "OrderCancellation" ADD CONSTRAINT "OrderCancellation_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "OrderCancellation_shop_orderGid_key" ON "OrderCancellation"("shop", "orderGid");
CREATE INDEX "OrderCancellation_shop_customerGid_state_idx" ON "OrderCancellation"("shop", "customerGid", "state");
