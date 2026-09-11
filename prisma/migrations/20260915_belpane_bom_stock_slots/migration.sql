-- Belpane: stock ingredientes + movimientos + franjas configurables + código 4 dígitos
-- Idempotente

-- CoreProduct stock
ALTER TABLE "CoreProduct" ADD COLUMN IF NOT EXISTS "stockQty" DECIMAL(10,3) NOT NULL DEFAULT 0.00;
ALTER TABLE "CoreProduct" ADD COLUMN IF NOT EXISTS "lowStockThreshold" DECIMAL(10,3);

-- StockMovement table
CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "coreProductId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "qty" DECIMAL(10,3) NOT NULL,
  "uom" TEXT NOT NULL DEFAULT 'kg',
  "reason" TEXT,
  "orderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "StockMovement_coreProductId_fkey" FOREIGN KEY ("coreProductId") REFERENCES "CoreProduct"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StockMovement_tenantId_createdAt_idx" ON "StockMovement"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_coreProductId_createdAt_idx" ON "StockMovement"("coreProductId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_orderId_idx" ON "StockMovement"("orderId");

-- PickupWindow table (franjas configurables por punto)
CREATE TABLE IF NOT EXISTS "PickupWindow" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pickupPointId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "start" TEXT NOT NULL,
  "end" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 30,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PickupWindow_pickupPointId_fkey" FOREIGN KEY ("pickupPointId") REFERENCES "PickupPoint"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "PickupWindow_pickupPointId_idx" ON "PickupWindow"("pickupPointId");
CREATE INDEX IF NOT EXISTS "PickupWindow_pickupPointId_isActive_idx" ON "PickupWindow"("pickupPointId", "isActive");

-- Order new columns
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pickupWindowId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pickupDate" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pickupCode" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "verifiedById" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_pickupWindowId_fkey') THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_pickupWindowId_fkey" FOREIGN KEY ("pickupWindowId") REFERENCES "PickupWindow"("id") ON DELETE SET NULL;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_pickupCode_key" ON "Order"("pickupCode");
CREATE INDEX IF NOT EXISTS "Order_pickupWindowId_idx" ON "Order"("pickupWindowId");
CREATE INDEX IF NOT EXISTS "Order_pickupCode_idx" ON "Order"("pickupCode");
