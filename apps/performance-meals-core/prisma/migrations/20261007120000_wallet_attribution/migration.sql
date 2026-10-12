ALTER TABLE "WalletEntry" ADD COLUMN "sourceKind" TEXT NOT NULL DEFAULT 'legacy_unknown';
ALTER TABLE "WalletEntry" ADD COLUMN "nativeTransactionGid" TEXT;
