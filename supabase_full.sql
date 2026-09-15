-- ============================================================
-- PalmERP Core — SQL completo para Supabase (SQL Editor)
-- Generado desde prisma/schema.prisma (2026-09-15)
-- Cómo usar:
--   1. Supabase Dashboard → tu proyecto → SQL Editor → New query
--   2. Pega TODO este archivo y pulsa Run (puedes ejecutarlo 2 veces, es idempotente)
--   3. Verifica: Table Editor → deberías ver Tenant, User, Contact, Shop, etc.
-- NOTA: Si ya ejecutaste el antiguo supabase_init.sql, este archivo lo amplía
--   sin borrar datos (usa IF NOT EXISTS + DO blocks).
-- Alternativa recomendada (si tienes DATABASE_URL):
--   npm install && npx prisma db push
-- ============================================================

-- ---------- ENUMS (idempotentes) ----------
DO $$ BEGIN CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF', 'DEV', 'PROFESSOR'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ContactType" AS ENUM ('INDIVIDUAL', 'COMPANY'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ArtworkStatus" AS ENUM ('AVAILABLE', 'CONSIGNED', 'RESERVED', 'SOLD', 'LOANED', 'DESTROYED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ConsignmentStatus" AS ENUM ('ACTIVE', 'CLOSED', 'OVERDUE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ModeType" AS ENUM ('RESTAURANTE', 'HOTEL', 'LOGISTICA', 'FINANZAS', 'CREATIVO', 'TECNOLOGICO', 'DIRECCION', 'GESTION_EQUIPO', 'VENTAS', 'ATENCION_CLIENTE', 'COMUNICACION', 'GESTION_PROYECTOS'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DataTransferDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ProductType" AS ENUM ('STORABLE', 'CONSUMABLE', 'SERVICE', 'MANUFACTURED_KIT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUST'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ShopMode" AS ENUM ('MINIMAL', 'CUSTOM'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'READY', 'DELIVERED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EduLevel" AS ENUM ('INICIACION', 'BASICO', 'INTERMEDIO', 'AVANZADO'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EduTier" AS ENUM ('ALUMNO', 'ARTISTA'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EduGoalScope" AS ENUM ('COURSE', 'TRIMESTER_1', 'TRIMESTER_2', 'TRIMESTER_3'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EduGoalStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'ACHIEVED', 'POSTPONED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EduExerciseType" AS ENUM ('TECHNIQUE', 'CHORD', 'RHYTHM', 'THEORY', 'WARMUP', 'HOMEWORK'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EduLessonStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "SongStatus" AS ENUM ('IDEA', 'WRITING', 'DEMO', 'PRODUCING', 'MIX', 'MASTER', 'READY', 'PUBLISHED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "AudioStage" AS ENUM ('DEMO', 'PRODUCING', 'MIX', 'MASTER', 'STEMS'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ReleaseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LIVE', 'TAKEDOWN'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "BackupDestination" AS ENUM ('LOCAL', 'CLIENT_STORAGE', 'PALMERP_VAULT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "BackupKind" AS ENUM ('LOGICAL_JSON', 'PHYSICAL_DUMP'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "BackupStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Si vienes del supabase_init.sql antiguo, falta el valor PROFESSOR:
-- (solo se ejecuta si no existe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PROFESSOR' AND enumtypid = '"UserRole"'::regtype) THEN
    ALTER TYPE "UserRole" ADD VALUE 'PROFESSOR';
  END IF;
END $$;

-- ---------- CORE: Tenant / User / Contact ----------
CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "domain" TEXT UNIQUE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'STAFF',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("tenantId", "email")
);

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "token" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Contact" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "phoneNormalized" TEXT,
  "email" TEXT,
  "contactType" "ContactType" NOT NULL DEFAULT 'INDIVIDUAL',
  "companyName" TEXT,
  "cif" TEXT,
  "billingStreet" TEXT, "billingZip" TEXT, "billingCity" TEXT, "billingState" TEXT, "billingCountry" TEXT,
  "notes" TEXT,
  "isCollector" BOOLEAN NOT NULL DEFAULT false,
  "collectorPrefs" TEXT,
  "allergies" TEXT[] NOT NULL DEFAULT '{}',
  "favoriteTable" TEXT,
  "passportNumber" TEXT,
  "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

-- Columnas nuevas si ya tenías Contact creado con el SQL antiguo:
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- ---------- ARTE ----------
CREATE TABLE IF NOT EXISTS "Artwork" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
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
  "images" TEXT[] NOT NULL DEFAULT '{}',
  "notes" TEXT,
  "signatureStatus" TEXT,
  "collectorId" TEXT REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Consignment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "galleryId" TEXT NOT NULL REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate" TIMESTAMP(3),
  "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  "status" "ConsignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ConsignmentLine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "consignmentId" TEXT NOT NULL REFERENCES "Consignment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "artworkId" TEXT NOT NULL REFERENCES "Artwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "returnedAt" TIMESTAMP(3),
  "soldAt" TIMESTAMP(3),
  "salePrice" DECIMAL(10,2),
  UNIQUE("consignmentId", "artworkId")
);

CREATE TABLE IF NOT EXISTS "Certificate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "artworkId" TEXT NOT NULL UNIQUE REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "verificationCode" TEXT NOT NULL UNIQUE,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pdfUrl" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Setting" (
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  PRIMARY KEY ("tenantId", "key")
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "table" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "details" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ApiTransferGrant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("tenantId", "direction", "peerSlug", "resource")
);

CREATE TABLE IF NOT EXISTS "ApiTransferLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "grantId" TEXT,
  "direction" "DataTransferDirection" NOT NULL,
  "peerSlug" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "recordCount" INTEGER NOT NULL DEFAULT 0,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- CATÁLOGO / STOCK ----------
CREATE TABLE IF NOT EXISTS "CoreProduct" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
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
  "stockQty" DECIMAL(10,3) NOT NULL DEFAULT 0.00,
  "lowStockThreshold" DECIMAL(10,3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "CoreProduct" ADD COLUMN IF NOT EXISTS "stockQty" DECIMAL(10,3) NOT NULL DEFAULT 0.00;
ALTER TABLE "CoreProduct" ADD COLUMN IF NOT EXISTS "lowStockThreshold" DECIMAL(10,3);

CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "coreProductId" TEXT NOT NULL REFERENCES "CoreProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "type" "StockMovementType" NOT NULL,
  "qty" DECIMAL(10,3) NOT NULL,
  "uom" TEXT NOT NULL DEFAULT 'kg',
  "reason" TEXT,
  "orderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "BomLine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "parentId" TEXT NOT NULL REFERENCES "CoreProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "ingredientId" TEXT NOT NULL REFERENCES "CoreProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "quantity" DOUBLE PRECISION NOT NULL,
  "uom" TEXT NOT NULL DEFAULT 'kg',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- SHOP / E-COMMERCE ----------
CREATE TABLE IF NOT EXISTS "Shop" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "logo" TEXT,
  "coverImage" TEXT,
  "mode" "ShopMode" NOT NULL DEFAULT 'MINIMAL',
  "templateId" TEXT NOT NULL DEFAULT 'obrador-tradicional',
  "theme" JSONB,
  "sections" JSONB,
  "customHtml" TEXT,
  "customCss" TEXT,
  "customDomain" TEXT UNIQUE,
  "domainStatus" "DomainStatus" NOT NULL DEFAULT 'PENDING',
  "domainVerifyToken" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "businessContext" TEXT,
  "paymentProvider" TEXT DEFAULT 'CASH',
  "redsysMerchantCode" TEXT,
  "redsysTerminal" TEXT DEFAULT '1',
  "redsysSecretKey" TEXT,
  "redsysEnv" TEXT DEFAULT 'test',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "sections" JSONB;
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "businessContext" TEXT;
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT DEFAULT 'CASH';
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "redsysMerchantCode" TEXT;
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "redsysTerminal" TEXT DEFAULT '1';
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "redsysSecretKey" TEXT;
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "redsysEnv" TEXT DEFAULT 'test';

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "coreProductId" TEXT REFERENCES "CoreProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(8,2) NOT NULL,
  "image" TEXT,
  "maxDaily" INTEGER NOT NULL DEFAULT 50,
  "currentStock" INTEGER NOT NULL DEFAULT 50,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PickupPoint" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "schedule" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PickupWindow" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pickupPointId" TEXT NOT NULL REFERENCES "PickupPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "label" TEXT NOT NULL,
  "start" TEXT NOT NULL,
  "end" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 30,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "pickupPointId" TEXT REFERENCES "PickupPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "pickupWindowId" TEXT REFERENCES "PickupWindow"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "pickupDate" TIMESTAMP(3),
  "pickupCode" TEXT UNIQUE,
  "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT,
  "customerPhoneNormalized" TEXT,
  "contactId" TEXT REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "paymentProvider" TEXT,
  "paymentStatus" TEXT,
  "paymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);
-- Columnas nuevas si venías del SQL antiguo (Order mínimo):
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pickupWindowId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pickupDate" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pickupCode" TEXT UNIQUE;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "verifiedById" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerPhoneNormalized" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "contactId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_pickupWindowId_fkey') THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_pickupWindowId_fkey" FOREIGN KEY ("pickupWindowId") REFERENCES "PickupWindow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_contactId_fkey') THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "OrderLine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(8,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS "ShopAISession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shopId" TEXT NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "messages" JSONB NOT NULL,
  "snapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- EDUCACIÓN ----------
CREATE TABLE IF NOT EXISTS "EduStudent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "contactId" TEXT NOT NULL UNIQUE REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "tutorContactId" TEXT REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "instruments" TEXT[] NOT NULL DEFAULT '{}',
  "primaryInstrument" TEXT,
  "levelByInstrument" JSONB,
  "musicalTastes" TEXT[] NOT NULL DEFAULT '{}',
  "favArtists" TEXT[] NOT NULL DEFAULT '{}',
  "favSongs" TEXT[] NOT NULL DEFAULT '{}',
  "availablePracticeMinPerDay" INTEGER,
  "tier" "EduTier" NOT NULL DEFAULT 'ALUMNO',
  "isArtist" BOOLEAN NOT NULL DEFAULT false,
  "portalToken" TEXT NOT NULL UNIQUE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "EduSkill" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "instrument" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  UNIQUE("tenantId", "instrument", "key")
);

CREATE TABLE IF NOT EXISTS "EduRoom" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "capacity" INTEGER DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("tenantId", "name")
);

CREATE TABLE IF NOT EXISTS "EduCalendarLink" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT,
  "googleCalendarId" TEXT,
  "googleAccessToken" TEXT,
  "googleRefreshToken" TEXT,
  "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
  "lastSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("tenantId", "userId", "googleCalendarId")
);

CREATE TABLE IF NOT EXISTS "EduLesson" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "studentId" TEXT NOT NULL REFERENCES "EduStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "instrument" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "durationMin" INTEGER NOT NULL DEFAULT 45,
  "status" "EduLessonStatus" NOT NULL DEFAULT 'SCHEDULED',
  "taughtSkills" TEXT[] NOT NULL DEFAULT '{}',
  "notes" TEXT,
  "homeworkExerciseIds" TEXT[] NOT NULL DEFAULT '{}',
  "songIds" TEXT[] NOT NULL DEFAULT '{}',
  "ratingFocus" INTEGER,
  "nextGoals" TEXT,
  "teacherId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "roomId" TEXT REFERENCES "EduRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "googleEventId" TEXT,
  "googleCalendarId" TEXT,
  "googleSyncStatus" TEXT,
  "googleSyncError" TEXT,
  "whatsappSentAt" TIMESTAMP(3),
  "whatsappMessageId" TEXT,
  "batchToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EduSkillAssessment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL REFERENCES "EduStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "skillId" TEXT NOT NULL REFERENCES "EduSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "assessedBy" TEXT,
  "lessonId" TEXT REFERENCES "EduLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EduCourseGoal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "studentId" TEXT NOT NULL REFERENCES "EduStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "instrument" TEXT,
  "scope" "EduGoalScope" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "targetDate" TIMESTAMP(3),
  "status" "EduGoalStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EduTerm" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "courseYear" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "scope" "EduGoalScope" NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("tenantId", "courseYear", "scope")
);

CREATE TABLE IF NOT EXISTS "EduExercise" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "title" TEXT NOT NULL,
  "type" "EduExerciseType" NOT NULL DEFAULT 'TECHNIQUE',
  "instrument" TEXT NOT NULL,
  "level" "EduLevel" NOT NULL DEFAULT 'BASICO',
  "difficulty" INTEGER NOT NULL DEFAULT 3,
  "estimatedMin" INTEGER NOT NULL DEFAULT 10,
  "skillKeys" TEXT[] NOT NULL DEFAULT '{}',
  "description" TEXT,
  "tabContent" TEXT,
  "tabUrl" TEXT,
  "mediaUrls" TEXT[] NOT NULL DEFAULT '{}',
  "sourceUrl" TEXT,
  "sourceType" TEXT,
  "isCurated" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EduSong" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "title" TEXT NOT NULL,
  "artist" TEXT NOT NULL,
  "genre" TEXT,
  "level" "EduLevel" NOT NULL DEFAULT 'BASICO',
  "instrument" TEXT,
  "instruments" TEXT[] NOT NULL DEFAULT '{}',
  "key" TEXT,
  "capo" INTEGER,
  "skillKeys" TEXT[] NOT NULL DEFAULT '{}',
  "externalUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EduSharedResource" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "token" TEXT NOT NULL UNIQUE,
  "lessonId" TEXT REFERENCES "EduLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "studentId" TEXT NOT NULL REFERENCES "EduStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "exerciseId" TEXT REFERENCES "EduExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "songId" TEXT REFERENCES "EduSong"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "batchToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EduOutboxMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "studentId" TEXT NOT NULL REFERENCES "EduStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "lessonId" TEXT,
  "channel" TEXT NOT NULL DEFAULT 'WHATSAPP_CLOUD',
  "waMessageId" TEXT,
  "toPhone" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "link" TEXT,
  "batchToken" TEXT,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EduArtistProfile" (
  "studentId" TEXT NOT NULL PRIMARY KEY REFERENCES "EduStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "stageName" TEXT,
  "bio" TEXT,
  "avatarUrl" TEXT,
  "socials" JSONB,
  "distributor" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EduSongProject" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "artistId" TEXT NOT NULL REFERENCES "EduStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "title" TEXT NOT NULL,
  "genre" TEXT,
  "instrument" TEXT,
  "status" "SongStatus" NOT NULL DEFAULT 'IDEA',
  "bpm" INTEGER,
  "key" TEXT,
  "capo" INTEGER,
  "projectId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "EduLyric" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "songProjectId" TEXT NOT NULL REFERENCES "EduSongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "version" INTEGER NOT NULL DEFAULT 1,
  "content" TEXT NOT NULL,
  "coWriters" TEXT[] NOT NULL DEFAULT '{}',
  "language" TEXT DEFAULT 'es',
  "isExplicit" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "EduLyricVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lyricId" TEXT NOT NULL REFERENCES "EduLyric"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "version" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "diff" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EduAudioAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "songProjectId" TEXT NOT NULL REFERENCES "EduSongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "stage" "AudioStage" NOT NULL DEFAULT 'DEMO',
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT,
  "mimeType" TEXT,
  "durationSec" INTEGER,
  "waveform" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  "deletedBy" TEXT
);

CREATE TABLE IF NOT EXISTS "EduRelease" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "songProjectId" TEXT NOT NULL REFERENCES "EduSongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "releaseDate" TIMESTAMP(3),
  "distributor" TEXT,
  "upc" TEXT,
  "isrc" TEXT,
  "platforms" TEXT[] NOT NULL DEFAULT '{}',
  "coverUrl" TEXT,
  "status" "ReleaseStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EduStreamStat" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "songProjectId" TEXT NOT NULL REFERENCES "EduSongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "platform" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "plays" INTEGER NOT NULL DEFAULT 0,
  "listeners" INTEGER,
  "revenue" DECIMAL(10,4),
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("songProjectId", "platform", "date")
);

CREATE TABLE IF NOT EXISTS "EduTrash" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "restoredAt" TIMESTAMP(3),
  "deletedBy" TEXT
);

CREATE TABLE IF NOT EXISTS "EduExerciseSearchCache" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "queryHash" TEXT NOT NULL,
  "query" JSONB NOT NULL,
  "results" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("tenantId", "queryHash")
);

CREATE TABLE IF NOT EXISTS "EduTeacherProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "instruments" TEXT[] NOT NULL DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- BACKUP ----------
CREATE TABLE IF NOT EXISTS "BackupLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "destination" "BackupDestination" NOT NULL,
  "kind" "BackupKind" NOT NULL,
  "fileKey" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "encrypted" BOOLEAN NOT NULL DEFAULT true,
  "status" "BackupStatus" NOT NULL DEFAULT 'SUCCESS',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- ÍNDICES ----------
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_tenantId_email_idx" ON "PasswordResetToken"("tenantId", "email");
CREATE INDEX IF NOT EXISTS "Contact_tenantId_idx" ON "Contact"("tenantId");
CREATE INDEX IF NOT EXISTS "Contact_tenantId_email_idx" ON "Contact"("tenantId", "email");
CREATE INDEX IF NOT EXISTS "Contact_phoneNormalized_idx" ON "Contact"("phoneNormalized");
CREATE INDEX IF NOT EXISTS "Artwork_tenantId_idx" ON "Artwork"("tenantId");
CREATE INDEX IF NOT EXISTS "Artwork_status_idx" ON "Artwork"("status");
CREATE INDEX IF NOT EXISTS "Consignment_tenantId_idx" ON "Consignment"("tenantId");
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "CoreProduct_tenantId_idx" ON "CoreProduct"("tenantId");
CREATE INDEX IF NOT EXISTS "StockMovement_tenant_created_idx" ON "StockMovement"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_product_created_idx" ON "StockMovement"("coreProductId", "createdAt");
CREATE INDEX IF NOT EXISTS "Shop_tenantId_idx" ON "Shop"("tenantId");
CREATE INDEX IF NOT EXISTS "Product_shopId_idx" ON "Product"("shopId");
CREATE INDEX IF NOT EXISTS "Order_shopId_createdAt_idx" ON "Order"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_pickupCode_idx" ON "Order"("pickupCode");
CREATE INDEX IF NOT EXISTS "EduStudent_tenant_active_idx" ON "EduStudent"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "EduLesson_tenant_date_idx" ON "EduLesson"("tenantId", "date");
CREATE INDEX IF NOT EXISTS "EduLesson_student_date_idx" ON "EduLesson"("studentId", "date");
CREATE INDEX IF NOT EXISTS "BackupLog_tenant_created_idx" ON "BackupLog"("tenantId", "createdAt");

-- ---------- RLS (single-DB multitenant) ----------
-- La app usa DATABASE_URL (service_role/postgres) que bypassea RLS por defecto.
-- Estas policies solo se aplican cuando conectas con rol autenticado o con FORCE.
-- Además todo el código debe filtrar WHERE "tenantId" = $tenantId (defensa en profundidad).
-- Helper por transacción: SELECT set_config('app.tenant_id', $1, true);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User','Contact','Setting','AuditLog','PasswordResetToken','Artwork','Consignment',
    'ApiTransferGrant','ApiTransferLog','CoreProduct','StockMovement','Shop',
    'EduStudent','EduSkill','EduSkillAssessment','EduCourseGoal','EduTerm','EduExercise','EduSong',
    'EduRoom','EduCalendarLink','EduLesson','EduSharedResource','EduOutboxMessage','EduArtistProfile',
    'EduSongProject','EduRelease','EduStreamStat','EduTrash','EduExerciseSearchCache','EduTeacherProfile','BackupLog'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    EXCEPTION WHEN others THEN NULL;
    END;
    IF t IN ('EduSkillAssessment','EduExerciseSearchCache') THEN
      -- tenantId TEXT sin FK, misma lógica
      EXECUTE format('CREATE POLICY tenant_isolation ON %I USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::text) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::text);', t);
    ELSE
      EXECUTE format('CREATE POLICY tenant_isolation ON %I USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::text) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::text);', t);
    END IF;
  END LOOP;
END $$;

-- ---------- SEED MÍNIMO (opcional, descomenta para crear tenant de prueba) ----------
-- INSERT INTO "Tenant" ("id", "slug", "name", "updatedAt") VALUES ('tenant_demo', 'demo', 'Demo', NOW())
-- ON CONFLICT ("id") DO NOTHING;
