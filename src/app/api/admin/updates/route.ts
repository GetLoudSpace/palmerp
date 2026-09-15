import { NextResponse } from "next/server";
import { checkForUpdates } from "@/lib/fleet/upstream";
import { getLocalVersion } from "@/lib/fleet/version";
import { prisma } from "@/lib/db";

// GET → estado de actualización
export async function GET() {
  try {
    const local = getLocalVersion();
    const check = await checkForUpdates();

    // Último backup para consejo "haz backup antes"
    let lastBackup: { at: string | null; ageHours: number | null } = { at: null, ageHours: null };
    try {
      const last = await prisma.backupLog.findFirst({ orderBy: { createdAt: "desc" } });
      if (last) {
        const ageMs = Date.now() - last.createdAt.getTime();
        lastBackup = { at: last.createdAt.toISOString(), ageHours: Math.round((ageMs / 3600000) * 10) / 10 };
      }
    } catch {}

    // Último update aplicado (AuditLog)
    let lastUpdate: { at: string | null; details: string | null } = { at: null, details: null };
    try {
      const log = await prisma.auditLog.findFirst({ where: { action: "FLEET_UPDATE" }, orderBy: { createdAt: "desc" } });
      if (log) lastUpdate = { at: log.createdAt.toISOString(), details: log.details || null };
    } catch {}

    return NextResponse.json({
      success: true,
      local,
      upstream: check.upstream,
      updateAvailable: check.updateAvailable,
      behindByCommits: check.behindByCommits,
      reason: check.reason,
      lastBackup,
      lastUpdate,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

// POST → registra intención de update (no ejecuta git en serverless, solo audit + instrucciones)
// Body: { action: "record_update", version, commit }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = (body as { action?: string }).action || "record_update";

    if (action === "record_update") {
      const { version, commit, commitShort } = body as { version?: string; commit?: string; commitShort?: string };
      // Busca tenant para AuditLog (usa primero activo)
      let tenantId: string | null = null;
      try {
        const t = await prisma.tenant.findFirst({ where: { isActive: true }, select: { id: true } });
        tenantId = t?.id || null;
      } catch {}
      if (tenantId) {
        await prisma.auditLog.create({
          data: {
            tenantId,
            action: "FLEET_UPDATE",
            table: "Tenant",
            recordId: tenantId,
            details: `Update solicitado: v${version || "?"} @ ${commitShort || commit?.slice(0, 7) || "?"} — ver scripts/fleet-update.mjs --apply`,
            success: true,
          },
        });
      }
      return NextResponse.json({
        success: true,
        message: "Update registrado. En Vercel: git fetch upstream && git merge upstream/master && npm ci && npx prisma migrate deploy && git push. En MiniPC: node scripts/fleet-update.mjs --apply",
        nextSteps: [
          "git fetch upstream",
          "git merge upstream/master --no-edit",
          "npm ci --legacy-peer-deps",
          "npx prisma generate",
          "npx prisma migrate deploy",
          "npm run build",
          "git push origin master",
        ],
      });
    }

    return NextResponse.json({ success: false, error: "Acción no soportada" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
