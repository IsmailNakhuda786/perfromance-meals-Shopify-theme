CREATE TABLE "RewardRuleVersion" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "shop" TEXT NOT NULL,
 "version" TEXT NOT NULL,
 "rules" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "RewardRuleVersion_shop_version_key" ON "RewardRuleVersion"("shop", "version");
