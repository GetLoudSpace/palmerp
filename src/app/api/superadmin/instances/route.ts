import { NextResponse } from "next/server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { getMockTenants, saveMockTenants } from "@/lib/mockDb";
import { ProvisioningService } from "@/lib/provisioning";

const provisioningService = new ProvisioningService();

export async function GET() {
  try {
    // Select explícito sin deletedAt para evitar Invalid prisma.tenant.findMany si la columna soft-delete aún no está migrada en Supabase
    const tenants = await db.tenant.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        domain: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        users: {
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
        settings: { select: { key: true, value: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const auditLogs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({ success: true, tenants, auditLogs, source: "database" });
  } catch (error) {
    console.warn("DB no disponible (single-DB), fallback a mock JSON:", error);
    const mockTenants = getMockTenants();
    const mockAuditLogs = [
      { id: "al-1", tenant: "gastroshows", action: "USER_LOGIN", userId: "u2", details: "Renato García (admin@gastroshows.es) inició sesión en gastroshows.palmerp.es", ipAddress: "192.168.1.45", createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
      { id: "al-2", tenant: "sport2live", action: "CRM_CONTACT_CREATED", userId: "u4", details: "Alex Ruiz creó el contacto 'Federación de Tenis' (CIF: A88372619)", ipAddress: "82.34.12.98", createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
      { id: "al-3", tenant: "gastroshows", action: "MODE_ACTIVATED", userId: "u2", details: "El sector Atención al cliente fue activado por el administrador.", ipAddress: "192.168.1.45", createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { id: "al-4", tenant: "delish-catering", action: "INSTANCE_SUSPENDED", userId: "SYSTEM", details: "Instancia suspendida temporalmente por falta de pago.", ipAddress: "127.0.0.1", createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    ];
    return NextResponse.json({ success: true, tenants: mockTenants, auditLogs: mockAuditLogs, source: "mock" });
  }
}

function normalizeSlug(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

async function registerVercelDomain(domain: string): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const token = process.env.VERCEL_API_TOKEN || process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId) {
    console.warn("[vercel] VERCEL_TOKEN/VERCEL_PROJECT_ID no configurados — se omite registro automático de dominio. Añádelo manual en Vercel → Settings → Domains o configura las vars.");
    return { ok: false, skipped: true, error: "VERCEL_TOKEN/VERCEL_PROJECT_ID not set" };
  }
  try {
    let url = `https://api.vercel.com/v10/projects/${projectId}/domains`;
    if (teamId) url += `?teamId=${teamId}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: domain }),
    });
    if (!res.ok) {
      const errText = await res.text();
      // 409 = ya existe, se considera ok
      if (res.status === 409 || errText.includes("already exists")) return { ok: true };
      console.warn(`[vercel] Failed to register domain ${domain}:`, errText);
      return { ok: false, error: errText };
    }
    console.log(`[vercel] Domain ${domain} registrado en Vercel.`);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[vercel] Error registrando dominio ${domain}:`, msg);
    return { ok: false, error: msg };
  }
}

function serializeError(error: unknown): Record<string, unknown> {
  if (!error) return { message: String(error) };
  if (error instanceof AggregateError) {
    return {
      name: error.name,
      message: error.message,
      stack: (error as Error).stack,
      errors: (error as any).errors?.map((e: unknown) => (e instanceof Error ? { name: (e as Error).name, message: (e as Error).message, stack: (e as Error).stack, code: (e as any).code } : String(e))),
      cause: (error as any).cause ? String((error as any).cause) : undefined,
    };
  }
  if (error instanceof Error) {
    const anyErr = error as any;
    return { name: error.name, message: error.message, stack: error.stack, code: anyErr.code, cause: anyErr.cause ? String(anyErr.cause) : undefined, errors: Array.isArray(anyErr.errors) ? anyErr.errors.map((e: unknown) => (e instanceof Error ? { name: (e as Error).name, message: (e as Error).message, stack: (e as Error).stack } : String(e))) : undefined };
  }
  if (typeof error === "object") return error as Record<string, unknown>;
  return { value: String(error) };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Creación de instancia single-DB: INSERT en `Tenant` (no DB física)
    if (body.deploymentType) {
      if (body.deploymentType !== "SAAS") {
        return NextResponse.json({ success: false, error: "Solo SAAS (single-DB en Supabase) está habilitado. Ver migracion-multitenant-erp.md" }, { status: 400 });
      }

      const slug = normalizeSlug(body.slug);
      const name = String(body.name ?? "").trim();
      const adminEmail = String(body.adminEmail ?? "").trim().toLowerCase();
      const adminName = String(body.adminName ?? "").trim();
      const domainRaw = String(body.domain ?? "").trim();
      const timezone = String(body.timezone ?? "Europe/Madrid").trim() || "Europe/Madrid";
      const modes = Array.isArray(body.modes) ? body.modes : typeof body.modes === "string" ? body.modes.split(",").map((m: string) => m.trim()).filter(Boolean) : undefined;

      if (!slug || slug.length < 3) return NextResponse.json({ success: false, error: "Slug inválido: mínimo 3 caracteres (a-z, 0-9, -)." }, { status: 400 });
      if (!name || !adminName || !adminEmail) return NextResponse.json({ success: false, error: "Faltan campos obligatorios: name, adminName, adminEmail." }, { status: 400 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return NextResponse.json({ success: false, error: "Email de administrador no válido." }, { status: 400 });

      // Unicidad slug (DB única)
      try {
        const existing = await db.tenant.findUnique({ where: { slug } });
        if (existing) return NextResponse.json({ success: false, error: `Ya existe una instancia con slug "${slug}".` }, { status: 409 });
      } catch {
        const mockTenants = getMockTenants();
        if (mockTenants.some((t) => t.slug.toLowerCase() === slug.toLowerCase())) {
          return NextResponse.json({ success: false, error: `Ya existe una instancia con slug "${slug}" (mock).` }, { status: 409 });
        }
      }

      try {
        const result = await provisioningService.provision({
          slug, name, adminEmail, adminName, adminPassword: body.adminPassword,
          domain: domainRaw || undefined, timezone, modes, deploymentType: "SAAS",
        });
        if (!result.success) return NextResponse.json({ success: false, error: "Provisioning failed", details: result }, { status: 500 });
        // Registro automático en Vercel (fire-and-forget, no bloquea provisioning)
        const vercelDomain = domainRaw || `${slug}.palmerp.es`;
        const vercel = await registerVercelDomain(vercelDomain);
        return NextResponse.json({ ...result, source: "database", vercelDomain, vercelRegistered: vercel.ok, vercelSkipped: vercel.skipped, vercelError: vercel.error });
      } catch (provisionError: unknown) {
        const details = serializeError(provisionError);
        const msg = (details.message as string) || String(provisionError);
        console.error("[Superadmin single-DB] Provisioning error:", JSON.stringify(details, null, 2));
        const isInfraMissing = /DATABASE_URL|ECONNREFUSED|connect ECONNREFUSED|5432|AggregateError/i.test(msg + " " + JSON.stringify(details)) || (details as Record<string, unknown>).code === "ECONNREFUSED";

        if (isInfraMissing) {
          console.warn("[Superadmin single-DB] DATABASE_URL no disponible, fallback mock (dev sin Supabase):", msg);
          const mockTenants = getMockTenants();
          const newId = `t-${Date.now()}`;
          const now = new Date().toISOString();
          const newTenant = {
            id: newId, slug, name, domain: domainRaw || `${slug}.palmerp.es`, isActive: true, createdAt: now,
            users: [{ id: `u-${Date.now()}`, name: adminName, email: adminEmail, role: "ADMIN" as const, createdAt: now, password: body.adminPassword || undefined }],
          };
          saveMockTenants([newTenant, ...mockTenants] as never);
          return NextResponse.json({
            success: true, tenantId: newId, slug, source: "mock",
            warning: "Instancia creada en mock (sin Supabase). Configure DATABASE_URL (pooler Supabase) en Vercel para persistencia real.",
            details,
          });
        }
        return NextResponse.json({ success: false, error: msg, details }, { status: 500 });
      }
    }

    // Sync masiva legacy (mock) — mantenido para compatibilidad del frontend que hace POST {tenants}
    const { tenants } = body;
    if (!Array.isArray(tenants)) return NextResponse.json({ success: false, error: "Invalid tenants data" }, { status: 400 });
    saveMockTenants(tenants);
    try {
      for (const t of tenants as Array<{ id: string; isActive?: boolean; users?: Array<{ id: string; name: string; email: string; role: string; password?: string }> }>) {
        try {
          if (typeof t.isActive === "boolean") {
            await db.tenant.update({ where: { id: t.id }, data: { isActive: t.isActive } });
          }
        } catch (e) {
          console.warn("Could not sync tenant isActive", t.id, e);
        }

        // Sincroniza usuarios creados/editados desde el modal Superadmin
        if (Array.isArray(t.users)) {
          try {
            const existingUsers = await db.user.findMany({ where: { tenantId: t.id } });
            for (const u of t.users) {
              const emailNorm = String(u.email ?? "").trim().toLowerCase();
              if (!emailNorm || !u.name) continue;
              const roleNorm = String(u.role).toUpperCase() === "ADMIN" ? "ADMIN" : "STAFF";
              const hasRealPassword = typeof u.password === "string" && u.password.trim().length > 0 && u.password !== "••••••••";

              const byId = existingUsers.find((e) => e.id === u.id);
              const byEmail = existingUsers.find((e) => e.email.toLowerCase() === emailNorm);

              if (byId) {
                const data: Record<string, unknown> = { name: String(u.name).trim(), email: emailNorm, role: roleNorm as never };
                if (hasRealPassword) (data as Record<string, string>).passwordHash = await bcrypt.hash(String(u.password), 10);
                await db.user.update({ where: { id: byId.id }, data: data as never });
              } else if (byEmail) {
                const data: Record<string, unknown> = { name: String(u.name).trim(), role: roleNorm as never };
                if (hasRealPassword) (data as Record<string, string>).passwordHash = await bcrypt.hash(String(u.password), 10);
                await db.user.update({ where: { id: byEmail.id }, data: data as never });
              } else {
                const pwdPlain = hasRealPassword ? String(u.password) : crypto.randomBytes(12).toString("base64url");
                const hash = await bcrypt.hash(pwdPlain, 10);
                await db.user.create({
                  data: {
                    tenantId: t.id,
                    name: String(u.name).trim(),
                    email: emailNorm,
                    passwordHash: hash,
                    role: roleNorm as never,
                  },
                });
              }
            }
            // Eliminaciones: si un usuario existe en DB pero ya no está en la lista enviada, lo borramos (excepto si es el único ADMIN)
            const incomingIds = new Set((t.users as Array<{ id: string }>).map((u) => u.id));
            const incomingEmails = new Set((t.users as Array<{ email: string }>).map((u) => String(u.email).toLowerCase()));
            for (const eu of existingUsers) {
              const stillPresent = incomingIds.has(eu.id) || incomingEmails.has(eu.email.toLowerCase());
              if (!stillPresent) {
                const remainingAdmins = existingUsers.filter((x) => x.role === "ADMIN" && x.id !== eu.id).length + (t.users as Array<{ role: string }>).filter((x) => String(x.role).toUpperCase() === "ADMIN").length;
                if (eu.role === "ADMIN" && remainingAdmins === 0) continue; // nunca borrar último admin
                try {
                  await db.user.delete({ where: { id: eu.id } });
                } catch {}
              }
            }
          } catch (e) {
            console.warn("Could not sync users for tenant", t.id, e);
          }
        }
      }
    } catch (e) {
      console.warn("Could not sync tenants to DB (mock fallback)", e);
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const details = serializeError(error);
    console.error("[Superadmin] Top-level error:", JSON.stringify(details, null, 2));
    return NextResponse.json({ success: false, error: (details.message as string) || String(error), details }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, name, domain, isActive, maintenanceMode } = body;
    if (!tenantId || typeof tenantId !== "string") return NextResponse.json({ success: false, error: "Missing tenantId" }, { status: 400 });

    saveMockTenants(getMockTenants().map((t) => (t.id !== tenantId ? t : { ...t, name: typeof name === "string" ? name : t.name, domain: typeof domain === "string" ? domain : t.domain, isActive: typeof isActive === "boolean" ? isActive : t.isActive })));

    try {
      const tenant = await db.tenant.update({
        where: { id: tenantId },
        data: { ...(typeof name === "string" ? { name } : {}), ...(typeof domain === "string" ? { domain: domain || null } : {}), ...(typeof isActive === "boolean" ? { isActive } : {}) },
      });
      if (typeof maintenanceMode === "boolean") {
        await db.setting.upsert({
          where: { tenantId_key: { tenantId, key: "maintenance_mode" } },
          update: { value: String(maintenanceMode) },
          create: { tenantId, key: "maintenance_mode", value: String(maintenanceMode) },
        });
      }
      return NextResponse.json({ success: true, tenant });
    } catch (error) {
      console.warn("PATCH fallback mock", error);
      return NextResponse.json({ success: true, source: "mock" });
    }
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const tenantId = new URL(req.url).searchParams.get("tenantId");
    if (!tenantId) return NextResponse.json({ success: false, error: "Missing tenantId" }, { status: 400 });
    saveMockTenants(getMockTenants().filter((t) => t.id !== tenantId));
    try {
      await db.tenant.delete({ where: { id: tenantId } });
      return NextResponse.json({ success: true });
    } catch (error) {
      console.warn("DELETE fallback mock", error);
      return NextResponse.json({ success: true, source: "mock" });
    }
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}
