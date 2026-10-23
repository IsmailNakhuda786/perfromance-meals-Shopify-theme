CREATE TABLE "SubscriptionRenewalStop" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "contractGid" TEXT NOT NULL,
 "originOrderGid" TEXT NOT NULL,
 "bindingHash" TEXT NOT NULL,
 "requestKey" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'REQUESTING',
 "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "confirmedAt" DATETIME,
 "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "SubscriptionRenewalStop_shop_contractGid_key" ON "SubscriptionRenewalStop"("shop", "contractGid");
CREATE INDEX "SubscriptionRenewalStop_shop_customerGid_state_idx" ON "SubscriptionRenewalStop"("shop", "customerGid", "state");
