-- CreateTable
CREATE TABLE "RewardRuleActivation" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "rulesVersion" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardRuleActivation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RewardRuleActivation_shop_effectiveAt_key" ON "RewardRuleActivation"("shop", "effectiveAt");

