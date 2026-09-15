import { gzipSync, gunzipSync } from "node:zlib";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { encryptBuffer, sha256Hex, hasBackupKey } from "./crypto";
import { getProviders, retentionDateStr, type BackupDestination } from "./storage-provider";

export type BackupKind = "LOGICAL_JSON" | "PHYSICAL_DUMP";

export interface BackupResult {
  tenantSlug: string;
  tenantId: string;
  dateStr: string;
  artifacts: Array<{
    kind: BackupKind;
    fileKey: string;
    checksum: string;
    sizeBytes: number;
    destinations: Array<{ dest: BackupDestination; status: "success" | "failed"; error?: string }>;
  }>;
  overallStatus: "success" | "partial" | "failed";
}

// Recoge datos lógicos filtrados por tenantId (Single-DB compatible)
async function collectLogicalData(tenantId: string) {
  const [tenant, users, contacts, shops, orders, auditLogs] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.user.findMany({ where: { tenantId } }),
    prisma.contact.findMany({ where: { tenantId } }),
    prisma.shop.findMany({ where: { tenantId } }).catch(() => []),
    prisma.order.findMany({ where: { shop: { tenantId } } }).catch(() => []),
    prisma.auditLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 500 }).catch(() => []),
  ]);
  return { tenant, users, contacts, shops, orders, auditLogs, exportedAt: new Date().toISOString() };
}

// Genera physical dump via pg_dump si DATABASE_URL disponible y binario existe
function tryPhysicalDump(): Buffer | null {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  // Solo intentar si pg_dump existe en PATH (MiniPC sí, Vercel no → retorna null y el cron Vercel hará solo logical)
  try {
    execSync("which pg_dump", { stdio: "ignore" });
  } catch {
    return null;
  }
  try {
    // --no-owner --no-acl --clean --if-exists para portabilidad; filtrado no necesario en Fleet DB dedicada
    // En Single-DB el dump será completo (todas tenants) pero cifrado con clave cliente y restore filtra; aceptable
    const out = execSync(`pg_dump --no-owner --no-acl --clean --if-exists --dbname "$DATABASE_URL"`, {
      env: process.env as NodeJS.ProcessEnv,
      maxBuffer: 500 * 1024 * 1024, // 500MB
    });
    return out as Buffer;
  } catch (e) {
    console.warn("[backup] pg_dump failed, logical only:", e);
    return null;
  }
}

function buildFileKey(tenantId: string, dateStr: string, kind: BackupKind): string {
  const suffix = kind === "LOGICAL_JSON" ? "logical.json.gz.enc" : "physical.sql.gz.enc";
  return `tenants/${tenantId}/daily/${dateStr}.${suffix}`;
}

export async function runBackupForTenant(tenant: { id: string; slug: string }): Promise<BackupResult> {
  const dateStr = new Date().toISOString().split("T")[0]!;
  const artifacts: BackupResult["artifacts"] = [];
  const providers = getProviders();

  // --- 1) LOGICAL JSON ---
  let logicalEnc: Buffer | null = null;
  let logicalRawSize = 0;
  try {
    const data = await collectLogicalData(tenant.id);
    const json = JSON.stringify(data, null, 2);
    logicalRawSize = Buffer.byteLength(json, "utf-8");
    const gz = gzipSync(Buffer.from(json, "utf-8"));
    if (!hasBackupKey()) {
      console.warn("[backup] BACKUP_ENCRYPTION_KEY missing → skipping encrypt, storing gz only (dev mode)");
      logicalEnc = gz;
    } else {
      logicalEnc = encryptBuffer(gz);
    }
  } catch (e) {
    console.error("[backup] logical collect failed", tenant.slug, e);
  }

  if (logicalEnc) {
    const fileKey = buildFileKey(tenant.id, dateStr, "LOGICAL_JSON");
    const checksum = sha256Hex(logicalEnc);
    const destResults: BackupResult["artifacts"][number]["destinations"] = [];
    for (const p of providers) {
      if (!p.isConfigured()) {
        destResults.push({ dest: p.destination, status: "failed", error: "not configured (mock/skip)" });
        continue;
      }
      try {
        await p.upload(fileKey, logicalEnc, "application/octet-stream");
        destResults.push({ dest: p.destination, status: "success" });
      } catch (err) {
        destResults.push({ dest: p.destination, status: "failed", error: String(err) });
      }
    }
    // log en BackupLog por destino
    for (const dr of destResults) {
      try {
        await prisma.backupLog.create({
          data: {
            tenantId: tenant.id,
            destination: dr.dest as any,
            kind: "LOGICAL_JSON" as any,
            fileKey,
            checksum,
            sizeBytes: logicalEnc.length,
            encrypted: hasBackupKey(),
            status: dr.status === "success" ? ("SUCCESS" as any) : ("FAILED" as any),
            error: dr.error,
          },
        });
      } catch {}
    }
    artifacts.push({ kind: "LOGICAL_JSON", fileKey, checksum, sizeBytes: logicalEnc.length, destinations: destResults });
  }

  // --- 2) PHYSICAL DUMP (solo si MiniPC/agente o pg_dump disponible) ---
  const physBuf = tryPhysicalDump();
  if (physBuf) {
    try {
      const gz = gzipSync(physBuf);
      const enc = hasBackupKey() ? encryptBuffer(gz) : gz;
      const fileKey = buildFileKey(tenant.id, dateStr, "PHYSICAL_DUMP");
      const checksum = sha256Hex(enc);
      const destResults: BackupResult["artifacts"][number]["destinations"] = [];
      for (const p of providers) {
        if (!p.isConfigured()) {
          destResults.push({ dest: p.destination, status: "failed", error: "not configured" });
          continue;
        }
        try {
          await p.upload(fileKey, enc, "application/octet-stream");
          destResults.push({ dest: p.destination, status: "success" });
        } catch (err) {
          destResults.push({ dest: p.destination, status: "failed", error: String(err) });
        }
      }
      for (const dr of destResults) {
        try {
          await prisma.backupLog.create({
            data: {
              tenantId: tenant.id,
              destination: dr.dest as any,
              kind: "PHYSICAL_DUMP" as any,
              fileKey,
              checksum,
              sizeBytes: enc.length,
              encrypted: hasBackupKey(),
              status: dr.status === "success" ? ("SUCCESS" as any) : ("FAILED" as any),
              error: dr.error,
            },
          });
        } catch {}
      }
      artifacts.push({ kind: "PHYSICAL_DUMP", fileKey, checksum, sizeBytes: enc.length, destinations: destResults });
    } catch (e) {
      console.warn("[backup] physical encrypt/upload failed", e);
    }
  }

  // --- Retención: 7d LOCAL, 30d CLIENT_STORAGE, 90d PALMERP_VAULT (vault no borra) ---
  const retentionMap: Record<BackupDestination, number> = {
    LOCAL: 7,
    CLIENT_STORAGE: 30,
    PALMERP_VAULT: 90,
  };
  for (const p of providers) {
    if (p.destination === "PALMERP_VAULT") continue; // inmutable
    const days = retentionMap[p.destination];
    const oldDate = retentionDateStr(days);
    for (const kind of ["LOGICAL_JSON", "PHYSICAL_DUMP"] as const) {
      const oldKey = buildFileKey(tenant.id, oldDate, kind);
      try {
        await p.delete(oldKey);
      } catch {}
    }
  }

  const allSuccess = artifacts.length > 0 && artifacts.every((a) => a.destinations.every((d) => d.status === "success"));
  const anySuccess = artifacts.some((a) => a.destinations.some((d) => d.status === "success"));
  const overallStatus: BackupResult["overallStatus"] = allSuccess ? "success" : anySuccess ? "partial" : "failed";

  // AuditLog
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "BACKUP_RUN",
        table: "BackupLog",
        recordId: tenant.id,
        details: `Backup ${dateStr} status=${overallStatus} logical=${artifacts.find(a=>a.kind==="LOGICAL_JSON")?.destinations.map(d=>d.dest+":"+d.status).join(",")} physical=${artifacts.find(a=>a.kind==="PHYSICAL_DUMP") ? "yes" : "pg_dump not available (Vercel)"}`,
        success: overallStatus !== "failed",
        error: overallStatus === "failed" ? "all destinations failed" : undefined,
      },
    });
  } catch {}

  return { tenantSlug: tenant.slug, tenantId: tenant.id, dateStr, artifacts, overallStatus };
}

export async function runBackupAllTenants(): Promise<BackupResult[]> {
  const tenants = await prisma.tenant.findMany({ where: { isActive: true }, select: { id: true, slug: true } });
  const results: BackupResult[] = [];
  for (const t of tenants) {
    try {
      const r = await runBackupForTenant(t);
      results.push(r);
    } catch (e) {
      results.push({
        tenantSlug: t.slug,
        tenantId: t.id,
        dateStr: new Date().toISOString().split("T")[0]!,
        artifacts: [],
        overallStatus: "failed",
      });
      console.error("[backup] tenant failed", t.slug, e);
    }
  }
  return results;
}

// Verify helper: descifra y gunzip logical y valida JSON
export function verifyLogicalEnc(enc: Buffer): { ok: boolean; error?: string; count?: number } {
  try {
    const gz = hasBackupKey() ? (() => {
      // necesita clave para descifrar
      const { decryptBuffer } = require("./crypto");
      return decryptBuffer(enc);
    })() : enc;
    const json = gunzipSync(gz).toString("utf-8");
    const data = JSON.parse(json);
    return { ok: true, count: Object.keys(data).length };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
