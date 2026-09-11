-- Migration: soft deletes (deletedAt) y tablas e-commerce faltantes en DB prod anterior a 2026-09
-- Idempotente: usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

-- 1) Columnas soft-delete
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- 2) Tablas e-commerce por si la DB es anterior al feat shop (2026-08). Crear si no existen.
CREATE TABLE IF NOT EXISTS "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "coverImage" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'MINIMAL',
    "templateId" TEXT NOT NULL DEFAULT 'obrador-tradicional',
    "theme" JSONB,
    "customHtml" TEXT,
    "customCss" TEXT,
    "customDomain" TEXT UNIQUE,
    "domainStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "domainVerifyToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Shop_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Shop_tenantId_idx" ON "Shop"("tenantId");
CREATE INDEX IF NOT EXISTS "Shop_customDomain_idx" ON "Shop"("customDomain");

-- Nota: Product, PickupPoint, Order, OrderLine, ShopAISession, CoreProduct, BomLine también pueden faltar;
-- si la DB es muy antigua, ejecuta `npx prisma db push` local con DATABASE_URL de prod (pooler) para sincronizar,
-- o aplica el schema completo via `prisma/migrations` generados. Este archivo cubre el error inmediato Tenant.deletedAt.
