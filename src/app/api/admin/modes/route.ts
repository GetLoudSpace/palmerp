import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getTenantSlugFromHeaders } from "@/lib/tenant";

export async function GET() {
  try {
    const slug = await getTenantSlugFromHeaders();
    if (!slug) return NextResponse.json({ success: false, error: "No tenant" }, { status: 400 });
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

export async function POST(req: Request) {
  try {
    const slug = await getTenantSlugFromHeaders();
    if (!slug) return NextResponse.json({ success: false, error: "No tenant" }, { status: 400 });
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
