CREATE TABLE "RewardsAccount" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "points" INTEGER NOT NULL DEFAULT 0,
 "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
 "revision" INTEGER NOT NULL DEFAULT 0,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "RewardsAccount_shop_customerGid_key" ON "RewardsAccount"("shop", "customerGid");
CREATE TABLE "RewardsEntry" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "customerGid" TEXT NOT NULL,
 "sourceEvent" TEXT NOT NULL,
 "orderGid" TEXT,
 "rulesVersion" TEXT NOT NULL,
 "kind" TEXT NOT NULL,
 "pointsDelta" INTEGER NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "RewardsEntry_shop_sourceEvent_key" ON "RewardsEntry"("shop", "sourceEvent");
CREATE INDEX "RewardsEntry_shop_customerGid_createdAt_idx" ON "RewardsEntry"("shop", "customerGid", "createdAt");
