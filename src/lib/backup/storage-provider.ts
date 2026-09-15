import fs from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { uploadFile as uploadToR2, deleteFile as deleteFromR2 } from "@/lib/storage";

// Tipos de destino alineados con prisma enum BackupDestination
export type BackupDestination = "LOCAL" | "CLIENT_STORAGE" | "PALMERP_VAULT";

export interface BackupProvider {
  destination: BackupDestination;
  upload(fileKey: string, data: Buffer, contentType?: string): Promise<void>;
  delete(fileKey: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  isConfigured(): boolean;
}

// ---- A) LOCAL: disco del MiniPC siempre ON (destino A) ----
class LocalFsProvider implements BackupProvider {
  destination: BackupDestination = "LOCAL";
  private baseDir: string;
  constructor() {
    this.baseDir = process.env.BACKUP_LOCAL_DIR || process.env.BACKUP_DEST_A_PATH || "/data/backups/palmerp";
  }
  isConfigured(): boolean {
    return true; // siempre disponible, fallback crea dir
  }
  private fullPath(fileKey: string): string {
    // fileKey ya viene como tenants/<id>/daily/xxx.enc
    return path.join(this.baseDir, fileKey);
  }
  async upload(fileKey: string, data: Buffer): Promise<void> {
    const full = this.fullPath(fileKey);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, data);
  }
  async delete(fileKey: string): Promise<void> {
    const full = this.fullPath(fileKey);
    try {
      await fs.promises.unlink(full);
    } catch {
      // no existe → no error
    }
  }
  async list(prefix: string): Promise<string[]> {
    const dir = path.join(this.baseDir, prefix);
    try {
      const entries: string[] = [];
      const walk = async (d: string, rel: string) => {
        const items = await fs.promises.readdir(d, { withFileTypes: true });
        for (const it of items) {
          const relPath = path.join(rel, it.name);
          if (it.isDirectory()) await walk(path.join(d, it.name), relPath);
          else entries.push(relPath);
        }
      };
      await walk(dir, prefix);
      return entries;
    } catch {
      return [];
    }
  }
}

// ---- B) CLIENT_STORAGE: bucket propiedad del cliente (destino B) ----
class ClientS3Provider implements BackupProvider {
  destination: BackupDestination = "CLIENT_STORAGE";
  private client: S3Client | null = null;
  private bucket: string | null = null;

  constructor() {
    const endpoint = process.env.CLIENT_BACKUP_S3_ENDPOINT || process.env.R2_CLIENT_ENDPOINT || "";
    const accessKeyId = process.env.CLIENT_BACKUP_S3_ACCESS_KEY || process.env.CLIENT_BACKUP_S3_ACCESS_KEY_ID || "";
    const secretAccessKey = process.env.CLIENT_BACKUP_S3_SECRET_KEY || process.env.CLIENT_BACKUP_S3_SECRET_ACCESS_KEY || "";
    const bucket = process.env.CLIENT_BACKUP_S3_BUCKET || process.env.R2_CLIENT_BUCKET || "";
    const region = process.env.CLIENT_BACKUP_S3_REGION || "auto";
    if (endpoint && accessKeyId && secretAccessKey && bucket) {
      this.client = new S3Client({
        region,
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: false,
      });
      this.bucket = bucket;
    }
  }

  isConfigured(): boolean {
    return Boolean(this.client && this.bucket);
  }

  async upload(fileKey: string, data: Buffer, contentType = "application/octet-stream"): Promise<void> {
    if (!this.client || !this.bucket) throw new Error("CLIENT_STORAGE no configurado (CLIENT_BACKUP_S3_*)");
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: fileKey, Body: data, ContentType: contentType }));
  }

  async delete(fileKey: string): Promise<void> {
    if (!this.client || !this.bucket) return;
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: fileKey }));
    } catch {}
  }

  async list(prefix: string): Promise<string[]> {
    if (!this.client || !this.bucket) return [];
    try {
      const res = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }));
      return (res.Contents || []).map((o) => o.Key || "").filter(Boolean);
    } catch {
      return [];
    }
  }
}

// ---- C) PALMERP_VAULT: bucket central Palmerp inmutable 90d (destino C) ----
class PalmerpVaultProvider implements BackupProvider {
  destination: BackupDestination = "PALMERP_VAULT";
  private client: S3Client | null = null;
  private bucket: string | null = null;

  constructor() {
    // Reusa vars R2 pero con prefijo PALMERP_VAULT_ separado
    const accountId = process.env.PALMERP_VAULT_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || "";
    const accessKeyId = process.env.PALMERP_VAULT_R2_ACCESS_KEY_ID || process.env.PALMERP_VAULT_R2_ACCESS_KEY || process.env.R2_ACCESS_KEY_ID || "";
    const secretAccessKey = process.env.PALMERP_VAULT_R2_SECRET_ACCESS_KEY || process.env.PALMERP_VAULT_R2_SECRET_KEY || process.env.R2_SECRET_ACCESS_KEY || "";
    const bucket = process.env.PALMERP_VAULT_R2_BUCKET_NAME || process.env.PALMERP_VAULT_R2_BUCKET || process.env.R2_BUCKET_NAME || "palmerp-vault";
    if (accountId && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.bucket = bucket;
    }
  }

  isConfigured(): boolean {
    return Boolean(this.client && this.bucket);
  }

  async upload(fileKey: string, data: Buffer, contentType = "application/octet-stream"): Promise<void> {
    // Si no hay vault configurado, fallback a R2 genérico de storage.ts (misma cuenta)
    if (!this.isConfigured()) {
      // fileKey ya es tenants/... usamos uploadFile con tenant dummy prefix evita duplicar
      // extrae tenantId de fileKey tenants/<id>/...
      const m = fileKey.match(/^tenants\/([^/]+)\//);
      const tenantId = m ? m[1] : "vault";
      const inner = fileKey.replace(/^tenants\/[^/]+\//, `vault/${tenantId}/`);
      const res = await uploadToR2(tenantId, inner, data, contentType);
      if (res === null) throw new Error("PALMERP_VAULT no configurado y R2 genérico tampoco (mock mode)");
      return;
    }
    // vault prefix: vault/<slug>/...
    // fileKey viene como tenants/<id>/daily/... → lo pasamos tal cual con prefix vault/
    const vaultKey = `vault/${fileKey}`;
    await this.client!.send(new PutObjectCommand({ Bucket: this.bucket!, Key: vaultKey, Body: data, ContentType: contentType }));
  }

  async delete(_fileKey: string): Promise<void> {
    // Vault es inmutable 90d, no borrar desde cliente. No-op.
    return;
  }

  async list(prefix: string): Promise<string[]> {
    if (!this.client || !this.bucket) {
      // fallback list via R2 not available → vacío
      return [];
    }
    try {
      const res = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: `vault/${prefix}` }));
      return (res.Contents || []).map((o) => o.Key || "").filter(Boolean);
    } catch {
      return [];
    }
  }
}

// Factory
export function getProviders(): BackupProvider[] {
  return [new LocalFsProvider(), new ClientS3Provider(), new PalmerpVaultProvider()];
}

export function getProvider(dest: BackupDestination): BackupProvider {
  const map: Record<BackupDestination, BackupProvider> = {
    LOCAL: new LocalFsProvider(),
    CLIENT_STORAGE: new ClientS3Provider(),
    PALMERP_VAULT: new PalmerpVaultProvider(),
  };
  return map[dest];
}

// Helper retención: calcula fecha hace N días en YYYY-MM-DD
export function retentionDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0]!;
}
