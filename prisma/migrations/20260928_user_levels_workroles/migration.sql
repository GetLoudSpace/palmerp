-- Niveles DEV/ADMIN/USUARIO + roles de trabajo + activo/inactivo
-- Idempotente. Migra datos legacy: STAFF→USUARIO, PROFESSOR→USUARIO+PROFESOR.

-- 1. Nuevas columnas
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "workRoles" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "extraModules" TEXT[] NOT NULL DEFAULT '{}';

-- 2. Etiqueta nueva primero: el UPDATE siguiente asigna 'USUARIO' y el parser
-- la valida aunque no haya filas afectadas.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'UserRole' AND e.enumlabel = 'USUARIO') THEN
      ALTER TYPE "UserRole" ADD VALUE 'USUARIO';
    END IF;
  END IF;
END $$;

-- 3. Mapear roles antiguos al nuevo enum
UPDATE "User" SET "role" = 'USUARIO' WHERE "role"::text IN ('STAFF', 'PROFESSOR');

-- 4. Profesores legacy (role PROFESSOR o con EduTeacherProfile) → workRoles {PROFESOR}
-- (solo si la tabla existe: en DBs sin módulo educación no hay nada que migrar)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'EduTeacherProfile') THEN
    UPDATE "User" u SET "workRoles" = ARRAY['PROFESOR']
    WHERE u."workRoles" = '{}' AND (
      u."role"::text = 'PROFESSOR'
      OR EXISTS (SELECT 1 FROM "EduTeacherProfile" p WHERE p."userId" = u."id")
    );
  END IF;
END $$;

-- 5. Recrear el enum solo con DEV/ADMIN/USUARIO
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole_new') THEN
    DROP TYPE "UserRole_new";
  END IF;
  CREATE TYPE "UserRole_new" AS ENUM ('DEV', 'ADMIN', 'USUARIO');
  -- El DEFAULT antiguo ('STAFF'::UserRole) no se puede convertir solo: se suelta y se repone.
  ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
  ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING "role"::text::"UserRole_new";
  ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USUARIO';
  ALTER TYPE "UserRole" RENAME TO "UserRole_old";
  ALTER TYPE "UserRole_new" RENAME TO "UserRole";
  DROP TYPE "UserRole_old";
END $$;
