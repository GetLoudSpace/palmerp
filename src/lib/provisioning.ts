import crypto from "node:crypto";
import db from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * TIPOS DE DESPLIEGUE — ARQUITECTURA SINGLE-DB (Vercel + Supabase)
 *
 * SAAS: Instancia lógica dentro de la DB única compartida (columna tenant_id + RLS).
 *       ES EL ÚNICO MODO ACTIVO. Crear instancia = INSERT en `tenants` + seed con tenant_id.
 *
 * CLOUD_PRIVATE / ON_PREMISE: reservados para futuro multi-servidor físico.
 *       Actualmente bloqueados — toda la plataforma corre en 1 proyecto Vercel + 1 Supabase.
 */
export type DeploymentType = "SAAS" | "CLOUD_PRIVATE" | "ON_PREMISE";

export interface ProvisioningOptions {
  slug: string;
  name: string;
  adminEmail: string;
  adminName: string;
  adminPassword?: string;
  domain?: string;
  timezone?: string;
  modes?: string[];
  deploymentType: DeploymentType;
}

const DEFAULT_MODES: string[] = [];

/**
 * ProvisioningService — SINGLE DB
 *
 * Ya NO crea bases de datos físicas por tenant (desmontado según migracion-multitenant-erp.md).
 * El aislamiento es por `tenant_id` + RLS en una única DB Supabase.
 * Toda creación es un `INSERT` en la tabla `Tenant` del PrismaClient singleton.
 */
export class ProvisioningService {
  async provision(options: ProvisioningOptions) {
    const { deploymentType } = options;

    switch (deploymentType) {
      case "SAAS":
        return await this.provisionSaaS(options);
      case "CLOUD_PRIVATE":
        throw new Error("CLOUD_PRIVATE no disponible: despliegue single-DB en Vercel/Supabase. Ver migracion-multitenant-erp.md");
      case "ON_PREMISE":
        return await this.generateOnPremiseKit(options);
      default:
        throw new Error(`Unsupported deployment type: ${deploymentType}`);
    }
  }

  /**
   * SAAS single-DB:
   * Inserta Tenant + User admin + Settings usando el PrismaClient singleton (DATABASE_URL única).
   * No crea BBDD física, no invoca prisma db push por tenant — las migraciones se ejecutan 1 sola vez sobre la DB única.
   */
  private async provisionSaaS(options: ProvisioningOptions) {
    const slug = options.slug.trim().toLowerCase();
    const existing = await db.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new Error(`Ya existe una instancia con slug "${slug}".`);
    }

    const adminPassword = options.adminPassword || crypto.randomBytes(18).toString("base64url");
    const passwordHash = await bcrypt.hash(adminPassword, 10);

     const tenant = await db.tenant.create({
      data: {
        slug,
        name: options.name.trim(),
        domain: options.domain?.trim() || `${slug}.palmerp.es`,
        isActive: true,
      },
    });

    const user = await db.user.create({
      data: {
        tenantId: tenant.id,
        name: options.adminName.trim(),
        email: options.adminEmail.trim().toLowerCase(),
        passwordHash,
        role: "ADMIN",
      },
    });

    const settings: [string, string][] = [
      ["company_name", options.name.trim()],
      ["company_email", options.adminEmail.trim().toLowerCase()],
      ["company_timezone", options.timezone?.trim() || "Europe/Madrid"],
      ["maintenance_mode", "false"],
      ["palmera_active_modes", JSON.stringify(options.modes?.length ? options.modes : DEFAULT_MODES)],
      ["data_transfer_policy", JSON.stringify({ default: "deny", requiresExplicitApiGrant: true })],
    ];

    for (const [key, value] of settings) {
      await db.setting.upsert({
        where: { tenantId_key: { tenantId: tenant.id, key } },
        update: { value },
        create: { tenantId: tenant.id, key, value },
      });
    }

    await db.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "INSTANCE_CREATED",
        table: "Tenant",
        recordId: tenant.id,
        details: `Instancia '${tenant.name}' (${tenant.slug}) creada via superadmin (single-DB)`,
        success: true,
      },
    });

    return {
      success: true,
      tenantId: tenant.id,
      slug: tenant.slug,
      databaseName: null as string | null, // single-DB: no DB por tenant
      deploymentType: "SAAS" as const,
      source: "database" as const,
      generatedPassword: options.adminPassword ? undefined : adminPassword,
      adminUserId: user.id,
    };
  }

  /**
   * ON_PREMISE: solo genera un kit de instrucciones; no provisiona infra local.
   * Mantido para compatibilidad futura multi-servidor, pero no usado en single-DB.
   */
  private async generateOnPremiseKit(options: ProvisioningOptions) {
    const adminPassword = options.adminPassword || crypto.randomBytes(18).toString("base64url");

    const kit = {
      env_vars: {
        PALMERA_INSTANCE_SLUG: options.slug,
        PALMERA_INSTANCE_NAME: options.name,
        PALMERA_INSTANCE_ADMIN_EMAIL: options.adminEmail,
        PALMERA_INSTANCE_ADMIN_NAME: options.adminName,
        PALMERA_INSTANCE_ADMIN_PASSWORD: adminPassword,
        PALMERA_INSTANCE_DOMAIN: options.domain || `${options.slug}.palmerp.es`,
        PALMERA_INSTANCE_TIMEZONE: options.timezone || "Europe/Madrid",
        PALMERA_INSTANCE_MODES: (options.modes || DEFAULT_MODES).join(","),
      },
      note: "Modo ON_PREMISE es kit de instalación para servidor dedicado futuro. En arquitectura single-DB actual use deploymentType=SAAS",
      instructions: "Instalar Docker, copiar el archivo .env y ejecutar 'npm run instance:provision' (legado, no necesario en Vercel/Supabase single-DB)",
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      kit,
      deploymentType: "ON_PREMISE" as const,
    };
  }

  // --- Métodos legacy desmontados (kept as stubs for búsqueda grep, no usados) ---
  /** @deprecated Single-DB: no se crea DATABASE por tenant */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private buildDatabaseUrl(_adminUrl: string, _dbName: string): string {
    throw new Error("buildDatabaseUrl deshabilitado en arquitectura single-DB (ver migracion-multitenant-erp.md)");
  }
  /** @deprecated Single-DB: no se crea DATABASE por tenant */
  private async ensureDatabase(_adminUrl: string, _dbName: string): Promise<void> {
    throw new Error("ensureDatabase deshabilitado en arquitectura single-DB");
  }
  /** @deprecated Single-DB: migraciones se ejecutan 1 vez sobre DB única */
  private runPrismaDbPush(_databaseUrl: string): void {
    throw new Error("runPrismaDbPush deshabilitado en arquitectura single-DB — ejecute `npx prisma migrate deploy` una vez sobre DATABASE_URL");
  }
  /** @deprecated Reemplazado por provisionSaaS single-DB */
  private async seedInstance(): Promise<unknown> {
    throw new Error("seedInstance deshabilitado — provisionSaaS crea directamente Tenant/User/Settings");
  }
}
