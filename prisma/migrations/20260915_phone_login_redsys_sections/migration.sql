-- Phone login + Redsys + sections + contact link
-- Idempotente

ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT;
CREATE INDEX IF NOT EXISTS "Contact_phoneNormalized_idx" ON "Contact"("phoneNormalized");
CREATE INDEX IF NOT EXISTS "Contact_tenantId_phoneNormalized_idx" ON "Contact"("tenantId", "phoneNormalized");

ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "sections" JSONB;
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT DEFAULT 'CASH';
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "redsysMerchantCode" TEXT;
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "redsysTerminal" TEXT DEFAULT '1';
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "redsysSecretKey" TEXT;
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "redsysEnv" TEXT DEFAULT 'test';

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerPhoneNormalized" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "contactId" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_contactId_fkey') THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL;
  END IF;
END $$;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;
CREATE INDEX IF NOT EXISTS "Order_contactId_idx" ON "Order"("contactId");
CREATE INDEX IF NOT EXISTS "Order_customerPhoneNormalized_idx" ON "Order"("customerPhoneNormalized");
