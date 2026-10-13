import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getTenantSlugFromHeaders, enforcePinnedTenant } from "@/lib/tenant";
import { getToken } from "next-auth/jwt";

async function resolveSlug(req?: NextRequest) {
  // Instancia pineada: siempre su tenant, se ignora header/JWT ajeno.
  const pinned = (process.env.PINNED_TENANT_SLUG || "").trim().toLowerCase();
  if (pinned) return pinned;
  const headerSlug = enforcePinnedTenant(await getTenantSlugFromHeaders());
  if (headerSlug) return headerSlug;
  try {
    const token: any = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
    const fromJwt = enforcePinnedTenant(token?.tenantSlug ? String(token.tenantSlug).toLowerCase() : null);
    if (fromJwt) return fromJwt;
  } catch {}
  // Fallback single-instance local (sin subdominio): evita 401 en localhost/apex
  const instanceFallback =
    (process.env.PALMERA_INSTANCE_SLUG || "").trim().toLowerCase() ||
    (process.env.NEXT_PUBLIC_PINNED_TENANT_SLUG || "").trim().toLowerCase() ||
    null;
  if (instanceFallback) return instanceFallback;
  return null;
}

export async function GET(req: NextRequest) {
  try {
    // Lectura para TODOS los usuarios logueados (el sidebar la necesita para
    // pintar el menú según rol). Sin sesión → 401, nunca 403 de middleware:
    // esta ruta ya no mapea al módulo "settings" (ver pathToModule).
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const slug = await resolveSlug(req);
    // Sin tenant resuelto NO devolver success:true+vacío: el sidebar lo interpreta
    // como "cero modos" y SOBRESCRIBE el localStorage bueno dejándolo como fresh install.
    // success:false + 200 → el cliente conserva su estado local sin disparar GlobalErrorPopup.
    if (!slug) return NextResponse.json({ success: false, error: "No tenant resolved (missing session/subdomain)" }, { status: 200 });
    const tenant = await db.tenant.findUnique({ where: { slug } });
    if (!tenant) return NextResponse.json({ success: false, error: "Tenant not found" }, { status: 404 });
    const setting = await db.setting.findUnique({
      where: { tenantId_key: { tenantId: tenant.id, key: "palmera_active_modes" } },
    });
    const modes = setting ? JSON.parse(setting.value) : [];
    return NextResponse.json({ success: true, modes: Array.isArray(modes) ? modes : [] });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Escritura SOLO ADMIN/DEV del tenant (antes no exigía nada: cualquiera
    // podía reescribir los modos activos).
    const session = await getServerSession(authOptions);
    const u = session?.user as unknown as { role?: string; tenantId?: string } | undefined;
    if (!u?.tenantId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    if (u.role !== "ADMIN" && u.role !== "DEV") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const slug = await resolveSlug(req);
    if (!slug) return NextResponse.json({ success: true, modes: [] });
    const tenant = await db.tenant.findUnique({ where: { slug } });
    if (!tenant) return NextResponse.json({ success: false, error: "Tenant not found" }, { status: 404 });
    if ((tenant as { id: string }).id !== u.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const modes = Array.isArray(body.modes) ? body.modes : [];
    await db.setting.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: "palmera_active_modes" } },
      update: { value: JSON.stringify(modes) },
      create: { tenantId: tenant.id, key: "palmera_active_modes", value: JSON.stringify(modes) },
    });
    return NextResponse.json({ success: true, modes });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
