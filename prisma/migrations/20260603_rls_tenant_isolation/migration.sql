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
