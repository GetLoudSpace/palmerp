
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF', 'DEV');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "ArtworkStatus" AS ENUM ('AVAILABLE', 'CONSIGNED', 'RESERVED', 'SOLD', 'LOANED', 'DESTROYED');

-- CreateEnum
CREATE TYPE "ConsignmentStatus" AS ENUM ('ACTIVE', 'CLOSED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ModeType" AS ENUM ('RESTAURANTE', 'HOTEL', 'LOGISTICA', 'FINANZAS', 'CREATIVO', 'TECNOLOGICO', 'DIRECCION', 'GESTION_EQUIPO', 'VENTAS', 'ATENCION_CLIENTE', 'COMUNICACION', 'GESTION_PROYECTOS');

-- CreateEnum
CREATE TYPE "DataTransferDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('STORABLE', 'CONSUMABLE', 'SERVICE', 'MANUFACTURED_KIT');

-- CreateEnum
CREATE TYPE "ShopMode" AS ENUM ('MINIMAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "contactType" "ContactType" NOT NULL DEFAULT 'INDIVIDUAL',
    "companyName" TEXT,
    "cif" TEXT,
    "billingStreet" TEXT,
    "billingZip" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingCountry" TEXT,
    "notes" TEXT,
    "isCollector" BOOLEAN NOT NULL DEFAULT false,
    "collectorPrefs" TEXT,
    "allergies" TEXT[],
    "favoriteTable" TEXT,
    "passportNumber" TEXT,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artwork" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "creationYear" INTEGER NOT NULL,
    "medium" TEXT NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "depth" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "status" "ArtworkStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "images" TEXT[],
    "notes" TEXT,
    "signatureStatus" TEXT,
    "collectorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "status" "ConsignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentLine" (
    "id" TEXT NOT NULL,
    "consignmentId" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "salePrice" DECIMAL(10,2),

    CONSTRAINT "ConsignmentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfUrl" TEXT NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("tenantId","key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiTransferGrant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "direction" "DataTransferDirection" NOT NULL,
    "peerSlug" TEXT NOT NULL,
    "peerDomain" TEXT,
    "resource" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "notes" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiTransferGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiTransferLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "grantId" TEXT,
    "direction" "DataTransferDirection" NOT NULL,
    "peerSlug" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiTransferLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "productType" "ProductType" NOT NULL DEFAULT 'STORABLE',
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "cost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "uom" TEXT NOT NULL DEFAULT 'ud',
    "isSellable" BOOLEAN NOT NULL DEFAULT true,
    "isPurchasable" BOOLEAN NOT NULL DEFAULT true,
    "isComponent" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomLine" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "uom" TEXT NOT NULL DEFAULT 'kg',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BomLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "coverImage" TEXT,
    "mode" "ShopMode" NOT NULL DEFAULT 'MINIMAL',
    "templateId" TEXT NOT NULL DEFAULT 'obrador-tradicional',
    "theme" JSONB,
    "customHtml" TEXT,
    "customCss" TEXT,
    "customDomain" TEXT,
    "domainStatus" "DomainStatus" NOT NULL DEFAULT 'PENDING',
    "domainVerifyToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "coreProductId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(8,2) NOT NULL,
    "image" TEXT,
    "maxDaily" INTEGER NOT NULL DEFAULT 50,
    "currentStock" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupPoint" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "schedule" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickupPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "pickupPointId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopAISession" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopAISession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_tenantId_email_idx" ON "PasswordResetToken"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Contact_tenantId_idx" ON "Contact"("tenantId");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE INDEX "Contact_tenantId_email_idx" ON "Contact"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Contact_createdAt_idx" ON "Contact"("createdAt");

-- CreateIndex
CREATE INDEX "Contact_contactType_idx" ON "Contact"("contactType");

-- CreateIndex
CREATE INDEX "Artwork_tenantId_idx" ON "Artwork"("tenantId");

-- CreateIndex
CREATE INDEX "Artwork_status_idx" ON "Artwork"("status");

-- CreateIndex
CREATE INDEX "Artwork_collectorId_idx" ON "Artwork"("collectorId");

-- CreateIndex
CREATE INDEX "Consignment_tenantId_idx" ON "Consignment"("tenantId");

-- CreateIndex
CREATE INDEX "Consignment_galleryId_idx" ON "Consignment"("galleryId");

-- CreateIndex
CREATE INDEX "Consignment_status_idx" ON "Consignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentLine_consignmentId_artworkId_key" ON "ConsignmentLine"("consignmentId", "artworkId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_artworkId_key" ON "Certificate"("artworkId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationCode_key" ON "Certificate"("verificationCode");

-- CreateIndex
CREATE INDEX "Certificate_verificationCode_idx" ON "Certificate"("verificationCode");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_table_createdAt_idx" ON "AuditLog"("table", "createdAt");

-- CreateIndex
CREATE INDEX "ApiTransferGrant_tenantId_isEnabled_idx" ON "ApiTransferGrant"("tenantId", "isEnabled");

-- CreateIndex
CREATE INDEX "ApiTransferGrant_peerSlug_resource_idx" ON "ApiTransferGrant"("peerSlug", "resource");

-- CreateIndex
CREATE UNIQUE INDEX "ApiTransferGrant_tenantId_direction_peerSlug_resource_key" ON "ApiTransferGrant"("tenantId", "direction", "peerSlug", "resource");

-- CreateIndex
CREATE INDEX "ApiTransferLog_tenantId_createdAt_idx" ON "ApiTransferLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiTransferLog_grantId_idx" ON "ApiTransferLog"("grantId");

-- CreateIndex
CREATE INDEX "ApiTransferLog_peerSlug_resource_idx" ON "ApiTransferLog"("peerSlug", "resource");

-- CreateIndex
CREATE INDEX "CoreProduct_tenantId_idx" ON "CoreProduct"("tenantId");

-- CreateIndex
CREATE INDEX "CoreProduct_tenantId_productType_idx" ON "CoreProduct"("tenantId", "productType");

-- CreateIndex
CREATE INDEX "CoreProduct_tenantId_isSellable_idx" ON "CoreProduct"("tenantId", "isSellable");

-- CreateIndex
CREATE INDEX "CoreProduct_tenantId_isComponent_idx" ON "CoreProduct"("tenantId", "isComponent");

-- CreateIndex
CREATE INDEX "BomLine_parentId_idx" ON "BomLine"("parentId");

-- CreateIndex
CREATE INDEX "BomLine_ingredientId_idx" ON "BomLine"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_customDomain_key" ON "Shop"("customDomain");

-- CreateIndex
CREATE INDEX "Shop_tenantId_idx" ON "Shop"("tenantId");

-- CreateIndex
CREATE INDEX "Shop_customDomain_idx" ON "Shop"("customDomain");

-- CreateIndex
CREATE INDEX "Product_shopId_idx" ON "Product"("shopId");

-- CreateIndex
CREATE INDEX "Product_shopId_isActive_idx" ON "Product"("shopId", "isActive");

-- CreateIndex
CREATE INDEX "Product_coreProductId_idx" ON "Product"("coreProductId");

-- CreateIndex
CREATE INDEX "PickupPoint_shopId_idx" ON "PickupPoint"("shopId");

-- CreateIndex
CREATE INDEX "Order_shopId_createdAt_idx" ON "Order"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_shopId_status_idx" ON "Order"("shopId", "status");

-- CreateIndex
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");

-- CreateIndex
CREATE INDEX "ShopAISession_shopId_idx" ON "ShopAISession"("shopId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consignment" ADD CONSTRAINT "Consignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consignment" ADD CONSTRAINT "Consignment_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentLine" ADD CONSTRAINT "ConsignmentLine_consignmentId_fkey" FOREIGN KEY ("consignmentId") REFERENCES "Consignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentLine" ADD CONSTRAINT "ConsignmentLine_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiTransferGrant" ADD CONSTRAINT "ApiTransferGrant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiTransferLog" ADD CONSTRAINT "ApiTransferLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoreProduct" ADD CONSTRAINT "CoreProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomLine" ADD CONSTRAINT "BomLine_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CoreProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomLine" ADD CONSTRAINT "BomLine_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "CoreProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_coreProductId_fkey" FOREIGN KEY ("coreProductId") REFERENCES "CoreProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupPoint" ADD CONSTRAINT "PickupPoint_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pickupPointId_fkey" FOREIGN KEY ("pickupPointId") REFERENCES "PickupPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopAISession" ADD CONSTRAINT "ShopAISession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration: RLS tenant isolation for single-DB architecture (Vercel + Supabase)
-- Ver migracion-multitenant-erp.md §2.4 y §3
-- Aplica a todas las tablas de negocio con columna `tenantId` / `tenant_id`.
-- Uso Supabase Postgres: enable RLS + policy tenant_isolation using (tenant_id = current_setting('app.tenant_id', true)::uuid)
-- NOTA: `Tenant` queda EXCLUIDA de RLS estricta (superadmin necesita listar todos los tenants). Se rodea con servicio privilegiado.
-- Las migraciones se ejecutan UNA SOLA VEZ sobre DATABASE_URL única: `npx prisma migrate deploy`

-- Helper: set app.tenant_id per transaction con `SELECT set_config('app.tenant_id', $1, true)` (local=true) antes de cada query.
-- Defensa en profundidad: además de RLS, todo código debe filtrar WHERE tenant_id = $tenantId.

-- 1) Habilitar RLS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Artwork" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiTransferGrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiTransferLog" ENABLE ROW LEVEL SECURITY;

-- 2) Forzar RLS también para table owner (Supabase postgres role) — si usas service_role, este fuerza.
-- En Supabase, si conectas como `postgres` superuser RLS no aplica por defecto; FORCE hace que sí aplique.
-- Si tu DATABASE_URL usa `postgres` superuser en local dev, puedes comentar estas líneas en dev.
-- En producción Supabase, descomentar para garantía.
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Contact" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Setting" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Artwork" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Consignment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ApiTransferGrant" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ApiTransferLog" FORCE ROW LEVEL SECURITY;

-- 3) Policies: tenant isolation (TEXT cuid, no uuid). La columna Prisma se mapea a "tenantId" (camelCase) — en Postgres es "tenantId" TEXT.
-- Supabase recomendación: current_setting('app.tenant_id', true)::text permite NULL-safe si no está seteado => bloquea acceso. Usamos ::text porque Tenant.id es cuid() TEXT, no uuid (evita 42883 text = uuid).
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['User','Contact','Setting','AuditLog','PasswordResetToken','Artwork','Consignment','ApiTransferGrant','ApiTransferLog']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::text) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::text);', t);
  END LOOP;
END $$;

-- 4) Índices: asegurar tenantId como primera columna en índices compuestos (ya existe @@index([tenantId]) en schema, pero reforzamos)
-- Prisma ya genera índices; este bloque es idempotente con IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX IF NOT EXISTS "Contact_tenantId_idx" ON "Contact"("tenantId");
CREATE INDEX IF NOT EXISTS "Setting_tenantId_key_idx" ON "Setting"("tenantId", "key");
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_tenantId_idx" ON "PasswordResetToken"("tenantId");
CREATE INDEX IF NOT EXISTS "Artwork_tenantId_idx" ON "Artwork"("tenantId");
CREATE INDEX IF NOT EXISTS "Consignment_tenantId_idx" ON "Consignment"("tenantId");
CREATE INDEX IF NOT EXISTS "ApiTransferGrant_tenantId_idx" ON "ApiTransferGrant"("tenantId");
CREATE INDEX IF NOT EXISTS "ApiTransferLog_tenantId_idx" ON "ApiTransferLog"("tenantId");

-- 5) Comentario para auditoría de seguridad
COMMENT ON POLICY tenant_isolation ON "User" IS 'RLS: solo filas donde tenantId = app.tenant_id (set_config local por transacción)';
COMMENT ON POLICY tenant_isolation ON "Contact" IS 'RLS: solo filas donde tenantId = app.tenant_id (set_config local por transacción)';
