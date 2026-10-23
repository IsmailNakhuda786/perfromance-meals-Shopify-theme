CREATE TABLE "SubscriptionRenewalStop" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "contractGid" TEXT NOT NULL,
 "originOrderGid" TEXT NOT NULL,
 "bindingHash" TEXT NOT NULL,
 "requestKey" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'REQUESTING',
 "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "confirmedAt" TIMESTAMP(3),
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "SubscriptionRenewalStop_shop_contractGid_key" ON "SubscriptionRenewalStop"("shop", "contractGid");
CREATE INDEX "SubscriptionRenewalStop_shop_customerGid_state_idx" ON "SubscriptionRenewalStop"("shop", "customerGid", "state");
