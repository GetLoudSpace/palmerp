import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getTenantSlugFromHeaders } from "@/lib/tenant";
import { getToken } from "next-auth/jwt";

async function resolveSlug(req?: NextRequest) {
  const headerSlug = await getTenantSlugFromHeaders();
  if (headerSlug) return headerSlug;
  try {
    const token: any = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
    if (token?.tenantSlug) return String(token.tenantSlug).toLowerCase();
  } catch {}
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const slug = await resolveSlug(req);
    if (!slug) return NextResponse.json({ success: true, modes: [] });
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
    const slug = await resolveSlug(req);
    if (!slug) return NextResponse.json({ success: true, modes: [] });
    const tenant = await db.tenant.findUnique({ where: { slug } });
    if (!tenant) return NextResponse.json({ success: false, error: "Tenant not found" }, { status: 404 });
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
