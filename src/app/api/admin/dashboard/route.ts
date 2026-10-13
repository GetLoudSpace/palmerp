import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getTenantSlugFromHeaders } from "@/lib/tenant";
import { getToken } from "next-auth/jwt";
import { defaultDashboardLayout, validateLayout } from "@/lib/dashboard/registry";

async function resolveSlug(req?: NextRequest) {
  const headerSlug = await getTenantSlugFromHeaders();
  if (headerSlug) return headerSlug;
  try {
    const token = await getToken({ req: req as unknown as Record<string, unknown>, secret: process.env.NEXTAUTH_SECRET } as never);
    const t = token as unknown as Record<string, unknown> | null;
    if (t && typeof t["tenantSlug"] === "string") return String(t["tenantSlug"]).toLowerCase();
  } catch {}
  return null;
}

const SETTING_KEY = "palmera_dashboard_layout";

export async function GET(req: NextRequest) {
  try {
    // Lectura para TODOS los logueados (el panel /admin la necesita).
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const slug = await resolveSlug(req);
    if (!slug) return NextResponse.json({ success: true, layout: defaultDashboardLayout });
    const tenant = await db.tenant.findUnique({ where: { slug } });
    if (!tenant) return NextResponse.json({ success: true, layout: defaultDashboardLayout });
    const setting = await db.setting.findUnique({
      where: { tenantId_key: { tenantId: tenant.id, key: SETTING_KEY } },
    });
    if (!setting) return NextResponse.json({ success: true, layout: defaultDashboardLayout });
    try {
      const parsed = JSON.parse(setting.value);
      if (validateLayout(parsed)) return NextResponse.json({ success: true, layout: parsed });
    } catch {}
    return NextResponse.json({ success: true, layout: defaultDashboardLayout });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Escritura SOLO ADMIN/DEV del tenant (el layout del servidor es global;
    // cada usuario conserva además su copia local).
    const session = await getServerSession(authOptions);
    const u = session?.user as unknown as { role?: string; tenantId?: string } | undefined;
    if (!u?.tenantId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    if (u.role !== "ADMIN" && u.role !== "DEV") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const layout = body.layout ?? body;
    if (!validateLayout(layout)) {
      return NextResponse.json({ success: false, error: "Invalid layout" }, { status: 400 });
    }
    const slug = await resolveSlug(req);
    if (!slug) return NextResponse.json({ success: true, layout });
    const tenant = await db.tenant.findUnique({ where: { slug } });
    if (!tenant) return NextResponse.json({ success: true, layout });
    if ((tenant as { id: string }).id !== u.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await db.setting.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: SETTING_KEY } },
      update: { value: JSON.stringify(layout) },
      create: { tenantId: tenant.id, key: SETTING_KEY, value: JSON.stringify(layout) },
    });
    return NextResponse.json({ success: true, layout });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
