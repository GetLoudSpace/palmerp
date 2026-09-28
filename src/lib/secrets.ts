// src/lib/secrets.ts
// Vault de credenciales por tenant: cifrado AES-256-GCM, solo servidor.
//
// - La clave NUNCA sale del servidor (CREDENTIALS_ENCRYPTION_KEY, fallback BACKUP_ENCRYPTION_KEY).
// - En DB (tabla Setting) solo se guarda `enc:v1:<base64(iv|tag|ct)>`, jamás plaintext.
// - Ninguna API devuelve el valor: el cliente solo ve `configured: true/false`.
// - El descifrado ocurre solo en memoria del servidor, justo antes de usar la cred
//   (enviar WhatsApp, leer Google Calendar). Nunca se loguea el valor.
import crypto from "node:crypto";

const ENC_PREFIX = "enc:v1:";

function resolveKey(): Buffer {
  const raw =
    process.env.CREDENTIALS_ENCRYPTION_KEY ||
    process.env.BACKUP_ENCRYPTION_KEY ||
    process.env.BACKUP_ENCRYPTION_KEY_CLIENT ||
    "";
  if (!raw) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY no configurada. Genera una con: openssl rand -base64 32"
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  try {
    const b64 = Buffer.from(raw, "base64");
    if (b64.length === 32) return b64;
  } catch {
    // sigue al hash
  }
  if (Buffer.from(raw, "utf8").length === 32) return Buffer.from(raw, "utf8");
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

export function hasSecretsKey(): boolean {
  return Boolean(
    process.env.CREDENTIALS_ENCRYPTION_KEY ||
      process.env.BACKUP_ENCRYPTION_KEY ||
      process.env.BACKUP_ENCRYPTION_KEY_CLIENT
  );
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
}

/** Cifra un valor en claro → `enc:v1:...` listo para guardar en Setting.value. */
export function encryptSecret(plain: string): string {
  const key = resolveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Descifra `enc:v1:...` → valor en claro (solo memoria servidor).
 *  Acepta legacy en claro (migración progresiva): lo devuelve tal cual. */
export function decryptSecret(stored: string): string {
  if (!isEncryptedSecret(stored)) return stored; // legacy plaintext → se re-cifra al próximo guardado
  const key = resolveKey();
  const bundle = Buffer.from(stored.slice(ENC_PREFIX.length), "base64");
  if (bundle.length < 28) throw new Error("Secreto cifrado corrupto");
  const iv = bundle.subarray(0, 12);
  const tag = bundle.subarray(12, 28);
  const ciphertext = bundle.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/**
 * Lee varias claves del vault y las devuelve descifradas (solo memoria servidor).
 * - Valor corrupto o llave rotada → `null` (se trata como no configurado, sin romper).
 * - Sin DB → todo `null` (el llamador cae a env o a degradado).
 */
export async function readVault(
  tenantId: string,
  keys: readonly string[]
): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = Object.fromEntries(keys.map((k) => [k, null]));
  try {
    const { default: db } = await import("@/lib/db");
    const rows = await db.setting.findMany({ where: { tenantId, key: { in: [...keys] } } });
    for (const row of rows) {
      try {
        out[row.key] = decryptSecret(row.value) || null;
      } catch {
        out[row.key] = null;
      }
    }
  } catch {
    // sin DB: todo null
  }
  return out;
}
