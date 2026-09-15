import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST heartbeat desde agente local o cron Vercel
// Body: { source: "backup-agent"|"vercel-cron", at, results: BackupResult[] }
// Auth: Bearer FLEET_API_KEY o CRON_SECRET (reusa)
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const fleetKey = process.env.FLEET_API_KEY;
    const cronSecret = process.env.CRON_SECRET;
    const token = auth.replace(/^Bearer\s+/i, "");
    if (fleetKey && token !== fleetKey && cronSecret && token !== cronSecret) {
      // si hay fleetKey configurado, exigirlo; si no, permitir sin auth en dev
      if (process.env.NODE_ENV === "production" && fleetKey) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { source, results } = body as { source?: string; results?: unknown };

    // Guardar como AuditLog global (tenantId = primer tenant o system)
    try {
      const tenants = await prisma.tenant.findMany({ select: { id: true }, take: 1 });
      const tenantId = tenants[0]?.id;
      if (tenantId) {
        await prisma.auditLog.create({
          data: {
            tenantId,
            action: "BACKUP_HEARTBEAT",
            table: "BackupLog",
            recordId: "fleet",
            details: `heartbeat source=${source || "unknown"} results=${JSON.stringify(results).slice(0, 2000)}`,
            success: true,
          },
        });
      }
    } catch {}

    return NextResponse.json({ success: true, receivedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const logs = await prisma.backupLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
    const grouped = new Map<string, (typeof logs)[number]>();
    for (const l of logs) {
      const k = `${l.tenantId}:${l.fileKey}`;
      if (!grouped.has(k)) grouped.set(k, l);
    }
    // Semáforo: para cada tenant, último backup <24h verde, 24-48h amarillo, >48h rojo
    const tenants = await prisma.tenant.findMany({ where: { isActive: true }, select: { id: true, slug: true, name: true } });
    const now = Date.now();
    const status = tenants.map((t) => {
      const last = logs.filter((l) => l.tenantId === t.id && l.status === "SUCCESS").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const ageMs = last ? now - last.createdAt.getTime() : Infinity;
      const ageH = ageMs / 3600000;
      const color = !last ? "red" : ageH < 24 ? "green" : ageH < 48 ? "yellow" : "red";
      return { tenantId: t.id, slug: t.slug, name: t.name, lastBackupAt: last?.createdAt || null, lastFileKey: last?.fileKey || null, ageHours: last ? Math.round(ageH * 10) / 10 : null, color };
    });
    return NextResponse.json({ success: true, status, recentLogs: Array.from(grouped.values()).slice(0, 20) });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
