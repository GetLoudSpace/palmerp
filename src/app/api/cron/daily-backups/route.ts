import { NextResponse } from "next/server";
import { runBackupAllTenants } from "@/lib/backup/runner";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Triple backup 3-2-1: LOCAL 7d / CLIENT_STORAGE 30d / PALMERP_VAULT 90d (vault inmutable)
    // Cron 02:30 Europe/Madrid (vercel.json: "30 2 * * *")
    // Ambos artefactos: LOGICAL_JSON (siempre Vercel) + PHYSICAL_DUMP (solo agente local con pg_dump)
    // Cifrado solo clave cliente BACKUP_ENCRYPTION_KEY
    const results = await runBackupAllTenants();

    const count = results.length;
    const success = results.filter((r) => r.overallStatus === "success").length;
    const partial = results.filter((r) => r.overallStatus === "partial").length;
    const failed = results.filter((r) => r.overallStatus === "failed").length;

    return NextResponse.json({
      success: failed === 0,
      count,
      summary: { success, partial, failed },
      results,
      note: "Triple backup: LOCAL 7d, CLIENT_STORAGE 30d, PALMERP_VAULT 90d. Physical dump solo agente local si pg_dump disponible.",
    });
  } catch (error) {
    console.error("Backup Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
