-- CreateTable
CREATE TABLE "RewardRuleActivation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "rulesVersion" TEXT NOT NULL,
    "effectiveAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "RewardRuleActivation_shop_effectiveAt_key" ON "RewardRuleActivation"("shop", "effectiveAt");

