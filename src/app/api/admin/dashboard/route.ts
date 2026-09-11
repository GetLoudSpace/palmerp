import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
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
    const body = await req.json();
    const layout = body.layout ?? body;
    if (!validateLayout(layout)) {
      return NextResponse.json({ success: false, error: "Invalid layout" }, { status: 400 });
    }
    const slug = await resolveSlug(req);
    if (!slug) return NextResponse.json({ success: true, layout });
    const tenant = await db.tenant.findUnique({ where: { slug } });
    if (!tenant) return NextResponse.json({ success: true, layout });
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
