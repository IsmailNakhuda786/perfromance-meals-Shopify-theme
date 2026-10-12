-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanDraft" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "programmeGid" TEXT NOT NULL,
    "variantGid" TEXT NOT NULL,
    "sellingPlanGid" TEXT,
    "selections" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlanDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanSelection" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "programmeGid" TEXT NOT NULL,
    "variantGid" TEXT NOT NULL,
    "sellingPlanGid" TEXT,
    "businessStream" TEXT NOT NULL DEFAULT 'meal_plan',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "selections" TEXT NOT NULL,
    "selectionHash" TEXT NOT NULL,
    "cutoffAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REVIEWED',
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderGid" TEXT,
    "orderLineGid" TEXT,
    "contractGid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlanSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalLine" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "orderGid" TEXT NOT NULL,
    "orderLineGid" TEXT NOT NULL,
    "customerGid" TEXT,
    "productGid" TEXT,
    "variantGid" TEXT,
    "businessStream" TEXT,
    "department" TEXT,
    "validationStatus" TEXT NOT NULL,
    "validationReason" TEXT,
    "selectionId" TEXT,
    "contractGid" TEXT,
    "fulfillmentState" TEXT NOT NULL DEFAULT 'UNASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookReceipt" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanOperation" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'REQUESTED',
    "cycleReference" TEXT,
    "deliveryAt" TIMESTAMP(3),
    "fulfillmentGid" TEXT,
    "productionReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationMapping" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceCustomerId" TEXT,
    "sourceSubscriptionId" TEXT,
    "sourceOrderId" TEXT,
    "targetGid" TEXT,
    "appRecordId" TEXT,
    "businessStream" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "migratedAt" TIMESTAMP(3),
    "historicalReference" TEXT,

    CONSTRAINT "MigrationMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerWallet" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "fundedBalance" INTEGER NOT NULL DEFAULT 0,
    "bonusBalance" INTEGER NOT NULL DEFAULT 0,
    "fundedReserved" INTEGER NOT NULL DEFAULT 0,
    "bonusReserved" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletEntry" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "sourceEvent" TEXT NOT NULL,
    "sourceGid" TEXT,
    "fundedDelta" INTEGER NOT NULL,
    "bonusDelta" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletReservation" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "checkoutReference" TEXT NOT NULL,
    "fundedMinor" INTEGER NOT NULL,
    "bonusMinor" INTEGER NOT NULL,
    "nativeLineSnapshot" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'RESERVED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercePolicy" (
    "shop" TEXT NOT NULL,
    "walletEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rewardsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bonusTiers" TEXT,
    "bonusExpiry" TEXT,
    "refundRules" TEXT,
    "referralRules" TEXT,
    "giftCardRenewals" BOOLEAN,
    "rewardsRules" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercePolicy_pkey" PRIMARY KEY ("shop")
);

-- CreateIndex
CREATE UNIQUE INDEX "MealPlanDraft_shop_customerGid_key" ON "MealPlanDraft"("shop", "customerGid");

-- CreateIndex
CREATE INDEX "MealPlanSelection_shop_customerGid_idx" ON "MealPlanSelection"("shop", "customerGid");

-- CreateIndex
CREATE INDEX "MealPlanSelection_shop_orderGid_idx" ON "MealPlanSelection"("shop", "orderGid");

-- CreateIndex
CREATE INDEX "OperationalLine_shop_businessStream_validationStatus_idx" ON "OperationalLine"("shop", "businessStream", "validationStatus");

-- CreateIndex
CREATE INDEX "OperationalLine_shop_customerGid_idx" ON "OperationalLine"("shop", "customerGid");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalLine_shop_orderLineGid_key" ON "OperationalLine"("shop", "orderLineGid");

-- CreateIndex
CREATE INDEX "PlanOperation_shop_selectionId_idx" ON "PlanOperation"("shop", "selectionId");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationMapping_shop_sourceSystem_sourceType_sourceId_key" ON "MigrationMapping"("shop", "sourceSystem", "sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerWallet_shop_customerGid_currency_key" ON "CustomerWallet"("shop", "customerGid", "currency");

-- CreateIndex
CREATE INDEX "WalletEntry_shop_customerGid_currency_idx" ON "WalletEntry"("shop", "customerGid", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "WalletEntry_shop_sourceEvent_key" ON "WalletEntry"("shop", "sourceEvent");

-- CreateIndex
CREATE INDEX "WalletReservation_shop_customerGid_state_idx" ON "WalletReservation"("shop", "customerGid", "state");

-- CreateIndex
CREATE UNIQUE INDEX "WalletReservation_shop_checkoutReference_key" ON "WalletReservation"("shop", "checkoutReference");

