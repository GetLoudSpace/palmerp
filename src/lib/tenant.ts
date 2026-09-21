import { headers } from "next/headers";
import db from "@/lib/db";

/**
 * Resolución centralizada de tenant_id a partir de subdominio/host.
 * Usado tanto en middleware (edge) como en server components / API routes.
 *
 * Arquitectura single-DB: subdominio → lookup en tabla `Tenant` (DB única) → tenantId.
 * Fallback solo en desarrollo/localhost sin subdominio → no tenant (ruta plataforma).
 */

export async function resolveTenantBySubdomain(subdomain: string) {
  const normalized = subdomain.trim().toLowerCase();
  if (!normalized || normalized === "www") return null;
  try {
    const tenant = await db.tenant.findUnique({ where: { slug: normalized } });
    if (!tenant) return null;
    if (!tenant.isActive) return { tenant, blocked: true as const };
    return { tenant, blocked: false as const };
  } catch {
    // DB no disponible en dev (mock fallback no resuelve tenant real)
    return null;
  }
}

/** Extrae tenantSlug de headers seteados por middleware (x-tenant-slug). */
export async function getTenantSlugFromHeaders(): Promise<string | null> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  return slug && slug.trim().length > 0 ? slug.trim().toLowerCase() : null;
}

// ==========================================
// INSTANCIA INDEPENDIENTE (single-tenant lock)
// ==========================================
// Tradicionalmente este ERP servía N tenants desde un dominio/VPS (single-DB +
// aislamiento lógico por tenantId). La arquitectura actual es UNA instancia
// independiente por cliente: este despliegue solo debe ver SU tenant.
//
// Fija PINNED_TENANT_SLUG=<slug> en el entorno del despliegue y:
//  - Toda resolución de tenant devuelve el pin (se ignora subdominio/JWT ajeno).
//  - El login rechaza credenciales de otro tenant (ver src/lib/auth.ts).
//  - /superadmin, /api/superadmin/* y POST /api/register quedan bloqueados
//    (salvo ALLOW_SUPERADMIN=true) en el middleware.
// Sin PINNED_TENANT_SLUG se mantiene el comportamiento multi-tenant legacy.

/** Slug fijado por entorno (servidor). Null = modo multi-tenant legacy. */
export function getPinnedTenantSlug(): string | null {
  const pin = process.env.PINNED_TENANT_SLUG;
  return pin && pin.trim() ? pin.trim().toLowerCase() : null;
}

/** ¿Consola superadmin/fleet permitida en este despliegue? Por defecto NO si hay pin. */
export function isSuperadminAllowed(): boolean {
  if (process.env.ALLOW_SUPERADMIN === "true") return true;
  if (process.env.ALLOW_SUPERADMIN === "false") return false;
  return getPinnedTenantSlug() === null; // legacy multi-tenant: sí; instancia pineada: no
}

/**
 * Aplica el pin a un slug candidato: si hay pin, SIEMPRE gana el pin.
 * Usar en cada punto donde se resuelva tenant (headers, JWT, body).
 */
export function enforcePinnedTenant(candidate: string | null | undefined): string | null {
  const pin = getPinnedTenantSlug();
  if (pin) return pin;
  return candidate && candidate.trim() ? candidate.trim().toLowerCase() : null;
}

/** Extrae tenantId de headers si middleware ya resolvió tenant (x-tenant-id). */
export async function getTenantIdFromHeaders(): Promise<string | null> {
  const h = await headers();
  const id = h.get("x-tenant-id");
  return id && id.trim().length > 0 ? id.trim() : null;
}

/** Legacy alias: mantiene compatibilidad con código que importaba getCurrentTenant */
export async function getCurrentTenant() {
  const slug = await getTenantSlugFromHeaders();
  if (!slug) return null;
  const res = await resolveTenantBySubdomain(slug);
  return res?.tenant ?? null;
}
