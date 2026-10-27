-- Registro de envíos de Educación en servidor (compartido entre dispositivos).
-- Añade emisor/snapshot de clase y permite envíos sin ficha Prisma (clases locales).
-- Idempotente y tolerante a DBs donde la tabla aún no existe (se crea con db push).

DO $$ BEGIN
  IF to_regclass('"EduOutboxMessage"') IS NOT NULL THEN
    ALTER TABLE "EduOutboxMessage" ALTER COLUMN "studentId" DROP NOT NULL;

    ALTER TABLE "EduOutboxMessage" ADD COLUMN IF NOT EXISTS "userId" TEXT;
    ALTER TABLE "EduOutboxMessage" ADD COLUMN IF NOT EXISTS "senderName" TEXT;
    ALTER TABLE "EduOutboxMessage" ADD COLUMN IF NOT EXISTS "lessonLabel" TEXT;
    ALTER TABLE "EduOutboxMessage" ADD COLUMN IF NOT EXISTS "instrument" TEXT;
    ALTER TABLE "EduOutboxMessage" ADD COLUMN IF NOT EXISTS "origin" TEXT NOT NULL DEFAULT 'CLOUD';
    ALTER TABLE "EduOutboxMessage" ADD COLUMN IF NOT EXISTS "recipientLabel" TEXT;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'EduOutboxMessage_userId_fkey'
    ) THEN
      ALTER TABLE "EduOutboxMessage"
        ADD CONSTRAINT "EduOutboxMessage_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- El CHECK antiguo no existe; solo aseguramos índices de consulta del panel.
    CREATE INDEX IF NOT EXISTS "EduOutboxMessage_tenantId_userId_createdAt_idx"
      ON "EduOutboxMessage" ("tenantId", "userId", "createdAt");
    CREATE INDEX IF NOT EXISTS "EduOutboxMessage_tenantId_origin_createdAt_idx"
      ON "EduOutboxMessage" ("tenantId", "origin", "createdAt");
  END IF;
END $$;
