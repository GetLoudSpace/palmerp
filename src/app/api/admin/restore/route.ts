import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptBuffer } from "@/lib/backup/crypto";
import { getProvider } from "@/lib/backup/storage-provider";
import { gunzipSync } from "node:zlib";

// GET ?tenantId= → lista últimos BackupLog
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenantId");
    const where: Record<string, unknown> = {};
    if (tenantId) (where as { tenantId: string }).tenantId = tenantId;
    const logs = await prisma.backupLog.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ success: true, logs });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

// POST { tenantId, fileKey, dryRun?: boolean }
// - si dryRun true: descifra + gunzip + valida JSON, no restaura
// - si dryRun false: solo logical JSON upsert (physical requiere psql manual)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, fileKey, dryRun = true } = body as { tenantId: string; fileKey: string; dryRun?: boolean };
    if (!tenantId || !fileKey) return NextResponse.json({ success: false, error: "tenantId y fileKey requeridos" }, { status: 400 });

    // Intentar leer del LOCAL primero, luego CLIENT_STORAGE, luego VAULT
    // Por ahora solo verificamos existencia en BackupLog y pedimos al cliente subir el .enc para restore
    // Flujo seguro: cliente debe proporcionar el .enc descifrable con su BACKUP_ENCRYPTION_KEY
    const log = await prisma.backupLog.findFirst({ where: { tenantId, fileKey } as never });
    if (!log) return NextResponse.json({ success: false, error: "BackupLog no encontrado" }, { status: 404 });

    // Si el cliente envió el buffer en body (base64), lo validamos
    const encBase64 = (body as { encBase64?: string }).encBase64;
    if (encBase64) {
      try {
        const enc = Buffer.from(encBase64, "base64");
        const gz = decryptBuffer(enc);
        const json = gunzipSync(gz).toString("utf-8");
        const data = JSON.parse(json);
        if (dryRun) {
          return NextResponse.json({
            success: true,
            dryRun: true,
            ok: true,
            preview: {
              tenant: data.tenant?.slug,
              users: data.users?.length,
              contacts: data.contacts?.length,
              orders: data.orders?.length,
              exportedAt: data.exportedAt,
            },
          });
        }
        // Restore lógico: upsert tenant/users/contacts básicos (no destructivo, solo añade si falta)
        // Nunca borra, solo crea lo que no existe por id/email
        let restored = 0;
        for (const u of (data.users as Array<{ email: string; name: string; passwordHash?: string; role?: string }>) || []) {
          try {
            const exists = await prisma.user.findFirst({ where: { tenantId, email: u.email } });
            if (!exists && u.email) {
              await prisma.user.create({ data: { tenantId, name: u.name || u.email, email: u.email, passwordHash: u.passwordHash || "!", role: (u.role as never) || "STAFF" } });
              restored++;
            }
          } catch {}
        }
        await prisma.auditLog.create({
          data: { tenantId, action: "BACKUP_RESTORE", table: "BackupLog", recordId: log.id, details: `Restore dryRun=false fileKey=${fileKey} restoredUsers=${restored}`, success: true },
        });
        return NextResponse.json({ success: true, restoredUsers: restored });
      } catch (e) {
        return NextResponse.json({ success: false, error: `Descifrado/validación falló (¿BACKUP_ENCRYPTION_KEY correcta?): ${String(e)}` }, { status: 400 });
      }
    }

    // Sin buffer, solo informamos que necesita subir el .enc
    return NextResponse.json({
      success: true,
      dryRun: true,
      message: "Envía { encBase64 } (contenido .enc en base64) para dryRun/verify. Physical dump (.physical.sql.gz.enc) requiere restauración manual: descifra → gunzip → psql $DATABASE_URL < dump.sql",
      log,
      hint: "Para obtener el .enc: descarga de LOCAL (/data/backups/palmerp), CLIENT_STORAGE o VAULT (vault/tenants/...). Luego descifra localmente con BACKUP_ENCRYPTION_KEY.",
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
