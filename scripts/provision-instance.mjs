import "dotenv/config";
import crypto from "node:crypto";
import process from "node:process";
import bcrypt from "bcryptjs";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// SINGLE-DB: Este script ahora inserta en la DB única compartida (tenant_id + RLS).
// No crea bases de datos físicas por tenant. Ver migracion-multitenant-erp.md
// Uso: npm run instance:provision -- --slug foo --name "Foo S.L." --admin-email admin@foo.es ...

const DEFAULT_MODES = ["VENTAS", "COMUNICACION", "GESTION_PROYECTOS"];

function parseArgs() {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = process.argv[index + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, "true");
      continue;
    }
    args.set(key, next);
    index += 1;
  }
  return args;
}

function required(value, label) {
  if (!value || String(value).trim().length === 0) {
    throw new Error(`Missing required value: ${label}`);
  }
  return String(value).trim();
}

function normalizeSlug(value) {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (slug.length < 3) throw new Error("Instance slug must contain at least 3 valid characters.");
  return slug;
}

async function seedSingleDb(databaseUrl, instance) {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    const passwordHash = await bcrypt.hash(instance.adminPassword, 10);
    await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.upsert({
        where: { slug: instance.slug },
        update: { name: instance.name, domain: instance.domain, isActive: true },
        create: { slug: instance.slug, name: instance.name, domain: instance.domain, isActive: true },
      });
      await tx.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: instance.adminEmail } },
        update: { name: instance.adminName, passwordHash, role: "ADMIN" },
        create: { tenantId: tenant.id, name: instance.adminName, email: instance.adminEmail, passwordHash, role: "ADMIN" },
      });
      const settings = [
        ["company_name", instance.name],
        ["company_email", instance.adminEmail],
        ["company_timezone", instance.timezone],
        ["maintenance_mode", "false"],
        ["palmera_active_modes", JSON.stringify(instance.modes)],
        ["data_transfer_policy", JSON.stringify({ default: "deny", requiresExplicitApiGrant: true })],
      ];
      for (const [key, value] of settings) {
        await tx.setting.upsert({
          where: { tenantId_key: { tenantId: tenant.id, key } },
          update: { value },
          create: { tenantId: tenant.id, key, value },
        });
      }
    });
    console.log("Tenant seeded in single shared DB (tenant_id + RLS).");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function registerVercelDomain(domain) {
  const token = process.env.VERCEL_API_TOKEN || process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    console.log("[vercel] VERCEL_API_TOKEN or VERCEL_PROJECT_ID not set. Skipping Vercel domain registration.");
    return;
  }

  try {
    let url = `https://api.vercel.com/v10/projects/${projectId}/domains`;
    if (teamId) {
      url += `?teamId=${teamId}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[vercel] Failed to register domain ${domain}:`, errText);
    } else {
      console.log(`[vercel] Domain ${domain} registered successfully on Vercel.`);
    }
  } catch (error) {
    console.warn(`[vercel] Error registering domain ${domain}:`, error.message);
  }
}

async function main() {
  const args = parseArgs();
  const slug = normalizeSlug(required(args.get("slug") || process.env.PALMERA_INSTANCE_SLUG, "--slug or PALMERA_INSTANCE_SLUG"));
  const name = required(args.get("name") || process.env.PALMERA_INSTANCE_NAME, "--name or PALMERA_INSTANCE_NAME");
  const adminEmail = required(args.get("admin-email") || process.env.PALMERA_INSTANCE_ADMIN_EMAIL, "--admin-email or PALMERA_INSTANCE_ADMIN_EMAIL").toLowerCase();
  const adminName = required(args.get("admin-name") || process.env.PALMERA_INSTANCE_ADMIN_NAME, "--admin-name or PALMERA_INSTANCE_ADMIN_NAME");
  const adminPassword = args.get("admin-password") || process.env.PALMERA_INSTANCE_ADMIN_PASSWORD || crypto.randomBytes(18).toString("base64url");
  const domain = args.get("domain") || process.env.PALMERA_INSTANCE_DOMAIN || `${slug}.palmera.io`;
  const timezone = args.get("timezone") || process.env.PALMERA_INSTANCE_TIMEZONE || "Europe/Madrid";
  const modes = (args.get("modes") || process.env.PALMERA_INSTANCE_MODES || DEFAULT_MODES.join(",")).split(",").map((m) => m.trim()).filter(Boolean);

  const databaseUrl = required(process.env.DATABASE_URL, "DATABASE_URL (single Supabase DB, pooler txn mode)");

  // Legacy guard: if user still passes PLATFORM_DATABASE_URL / database-name flags, warn and ignore
  if (process.env.PALMERA_PLATFORM_DATABASE_URL || args.get("database-name") || args.get("database-url")) {
    console.warn("[deprecation] PALMERA_PLATFORM_DATABASE_URL / --database-* ignorados en arquitectura single-DB. Usando DATABASE_URL única.");
  }

  await seedSingleDb(databaseUrl, { slug, name, domain, adminEmail, adminName, adminPassword, timezone, modes });
  await registerVercelDomain(domain);

  console.log("");
  console.log("Instance provisioned successfully (single-DB).");
  console.log(`Slug: ${slug}`);
  console.log(`Domain: ${domain}`);
  console.log(`Tenant isolated via tenant_id + RLS. No separate DATABASE created.`);
  if (!args.get("admin-password") && !process.env.PALMERA_INSTANCE_ADMIN_PASSWORD) {
    console.log(`Generated admin password: ${adminPassword}`);
  }
  console.log("");
  console.log("Next: ensure RLS policies are deployed: `npx prisma migrate deploy` + apply prisma/migrations/*_rls/migration.sql");
}

main().catch((error) => {
  console.error(error.message);
  if (error.stack) console.error(error.stack);
  process.exit(1);
});
