#!/usr/bin/env node
/**
 * backup-agent.mjs — Agente local MiniPC siempre ON (destino A fiable)
 * Corre a las 02:00 vía systemd timer, hace pull directo DATABASE_URL y sube a 3 destinos aunque Vercel caiga.
 * Cifrado solo clave cliente BACKUP_ENCRYPTION_KEY. Ambos artefactos logical + physical (pg_dump).
 *
 * Uso:
 *   node scripts/backup-agent.mjs --once
 *   node scripts/backup-agent.mjs --schedule  # loop daemon (no recomendado, usar systemd)
 *
 * Systemd:
 *   /etc/systemd/system/palmerp-backup.service + palmerp-backup.timer (OnCalendar=02:00)
 *   ExecStart=/usr/bin/node /opt/palmerp/scripts/backup-agent.mjs --once
 *
 * Env requeridos: DATABASE_URL, BACKUP_ENCRYPTION_KEY, BACKUP_LOCAL_DIR, CLIENT_BACKUP_S3_*, PALMERP_VAULT_*
 * También notifica heartbeat a control.palmerp.es si PALMERP_CONTROL_URL + FLEET_API_KEY están configurados.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import crypto from "node:crypto";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function resolveKey() {
  const raw = process.env.BACKUP_ENCRYPTION_KEY || process.env.BACKUP_ENCRYPTION_KEY_CLIENT || "";
  if (!raw) throw new Error("BACKUP_ENCRYPTION_KEY no configurada");
  let buf;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) buf = Buffer.from(raw, "hex");
  else if (Buffer.from(raw, "utf8").length === 32) buf = Buffer.from(raw, "utf8");
  else buf = crypto.createHash("sha256").update(raw, "utf8").digest();
  if (buf.length !== 32) buf = crypto.createHash("sha256").update(buf).digest();
  return buf;
}

function encryptBuffer(plain) {
  const key = resolveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function getTenants(prisma) {
  return prisma.tenant.findMany({ where: { isActive: true }, select: { id: true, slug: true, name: true } });
}

async function collectLogical(prisma, tenantId) {
  const [tenant, users, contacts, shops] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.user.findMany({ where: { tenantId } }),
    prisma.contact.findMany({ where: { tenantId } }),
    prisma.shop.findMany({ where: { tenantId } }).catch(() => []),
  ]);
  let orders = [];
  try { orders = await prisma.order.findMany({ where: { shop: { tenantId } } }); } catch {}
  let auditLogs = [];
  try { auditLogs = await prisma.auditLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 500 }); } catch {}
  return { tenant, users, contacts, shops, orders, auditLogs, exportedAt: new Date().toISOString(), source: "backup-agent" };
}

function tryPgDump() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  try { execSync("which pg_dump", { stdio: "ignore" }); } catch { return null; }
  try {
    const out = execSync(`pg_dump --no-owner --no-acl --clean --if-exists --dbname "$DATABASE_URL"`, { env: process.env, maxBuffer: 500 * 1024 * 1024 });
    return out;
  } catch (e) {
    console.warn("[agent] pg_dump failed:", e.message);
    return null;
  }
}

async function uploadLocal(fileKey, data) {
  const base = process.env.BACKUP_LOCAL_DIR || "/data/backups/palmerp";
  const full = path.join(base, fileKey);
  await fs.promises.mkdir(path.dirname(full), { recursive: true });
  await fs.promises.writeFile(full, data);
  console.log(`[agent][LOCAL] wrote ${full} ${data.length}B`);
}

async function uploadS3(fileKey, data, kind) {
  // Client S3
  const endpoint = process.env.CLIENT_BACKUP_S3_ENDPOINT || "";
  const bucket = process.env.CLIENT_BACKUP_S3_BUCKET || "";
  const accessKeyId = process.env.CLIENT_BACKUP_S3_ACCESS_KEY || process.env.CLIENT_BACKUP_S3_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.CLIENT_BACKUP_S3_SECRET_KEY || process.env.CLIENT_BACKUP_S3_SECRET_ACCESS_KEY || "";
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    console.warn("[agent][CLIENT_STORAGE] not configured skip");
    return { ok: false, error: "not configured" };
  }
  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({ region: process.env.CLIENT_BACKUP_S3_REGION || "auto", endpoint, credentials: { accessKeyId, secretAccessKey } });
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: fileKey, Body: data, ContentType: "application/octet-stream" }));
    console.log(`[agent][CLIENT_STORAGE] uploaded ${fileKey}`);
    return { ok: true };
  } catch (e) { console.warn("[agent][CLIENT_STORAGE] failed", e.message); return { ok: false, error: e.message }; }
}

async function uploadVault(fileKey, data) {
  const accountId = process.env.PALMERP_VAULT_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || "";
  const accessKeyId = process.env.PALMERP_VAULT_R2_ACCESS_KEY_ID || process.env.PALMERP_VAULT_R2_ACCESS_KEY || process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.PALMERP_VAULT_R2_SECRET_ACCESS_KEY || process.env.PALMERP_VAULT_R2_SECRET_KEY || process.env.R2_SECRET_ACCESS_KEY || "";
  const bucket = process.env.PALMERP_VAULT_R2_BUCKET_NAME || process.env.PALMERP_VAULT_R2_BUCKET || process.env.R2_BUCKET_NAME || "palmerp-vault";
  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn("[agent][VAULT] not configured skip");
    return { ok: false, error: "not configured" };
  }
  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({ region: "auto", endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
    const vaultKey = `vault/${fileKey}`;
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: vaultKey, Body: data, ContentType: "application/octet-stream" }));
    console.log(`[agent][VAULT] uploaded ${vaultKey}`);
    return { ok: true };
  } catch (e) { console.warn("[agent][VAULT] failed", e.message); return { ok: false, error: e.message }; }
}

async function heartbeat(results) {
  const url = process.env.PALMERP_CONTROL_URL || process.env.PALMERA_PLATFORM_URL || "";
  const key = process.env.FLEET_API_KEY || "";
  if (!url || !key) return;
  try {
    await fetch(`${url.replace(/\/$/, "")}/api/fleet/backup-heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ source: "backup-agent", at: new Date().toISOString(), results }),
    });
    console.log("[agent] heartbeat sent");
  } catch (e) { console.warn("[agent] heartbeat failed", e.message); }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error("DATABASE_URL required"); process.exit(1); }
  if (!process.env.BACKUP_ENCRYPTION_KEY) console.warn("BACKUP_ENCRYPTION_KEY missing → storing unencrypted (dev)");

  const pool = new pg.Pool({ connectionString: dbUrl, ssl: dbUrl.includes("supabase.co") ? { rejectUnauthorized: false } : undefined, max: 1 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const tenants = await getTenants(prisma);
    console.log(`[agent] ${tenants.length} tenants @ ${new Date().toISOString()}`);
    const dateStr = new Date().toISOString().split("T")[0];
    const allResults = [];

    for (const t of tenants) {
      const data = await collectLogical(prisma, t.id);
      const json = JSON.stringify(data, null, 2);
      const gz = gzipSync(Buffer.from(json, "utf-8"));
      const encLogical = process.env.BACKUP_ENCRYPTION_KEY ? encryptBuffer(gz) : gz;
      const logicalKey = `tenants/${t.id}/daily/${dateStr}.logical.json.gz.enc`;
      const logicalChecksum = sha256Hex(encLogical);

      await uploadLocal(logicalKey, encLogical);
      const clientRes = await uploadS3(logicalKey, encLogical, "logical");
      const vaultRes = await uploadVault(logicalKey, encLogical);

      // physical
      const phys = tryPgDump();
      let physKey = null, physChecksum = null;
      if (phys) {
        const gzPhys = gzipSync(phys);
        const encPhys = process.env.BACKUP_ENCRYPTION_KEY ? encryptBuffer(gzPhys) : gzPhys;
        physKey = `tenants/${t.id}/daily/${dateStr}.physical.sql.gz.enc`;
        physChecksum = sha256Hex(encPhys);
        await uploadLocal(physKey, encPhys);
        await uploadS3(physKey, encPhys, "physical");
        await uploadVault(physKey, encPhys);
      }

      // BackupLog
      try {
        await prisma.backupLog.create({ data: { tenantId: t.id, destination: "LOCAL", kind: "LOGICAL_JSON", fileKey: logicalKey, checksum: logicalChecksum, sizeBytes: encLogical.length, encrypted: Boolean(process.env.BACKUP_ENCRYPTION_KEY), status: "SUCCESS" } });
        if (physKey) await prisma.backupLog.create({ data: { tenantId: t.id, destination: "LOCAL", kind: "PHYSICAL_DUMP", fileKey: physKey, checksum: physChecksum, sizeBytes: 0, encrypted: Boolean(process.env.BACKUP_ENCRYPTION_KEY), status: "SUCCESS" } });
      } catch (e) { console.warn("[agent] BackupLog write failed", e.message); }

      allResults.push({ tenant: t.slug, logicalKey, logicalChecksum, physKey, clientOk: clientRes?.ok, vaultOk: vaultRes?.ok });
      console.log(`[agent] done ${t.slug} logical ${encLogical.length}B phys ${phys ? "yes" : "pg_dump not available"}`);
    }

    await heartbeat(allResults);
    console.log("[agent] all done");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

const once = process.argv.includes("--once") || !process.argv.includes("--schedule");
if (once) main().catch((e) => { console.error(e); process.exit(1); });
else {
  console.log("[agent] schedule mode: run every day 02:00 via systemd timer, not loop");
  main().catch(console.error);
}
