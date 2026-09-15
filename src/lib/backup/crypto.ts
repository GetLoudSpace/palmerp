import crypto from "node:crypto";

/**
 * Cifrado solo con clave del cliente (BACKUP_ENCRYPTION_KEY).
 * Palmerp vault guarda opaco .enc — sin clave cliente no se puede descifrar.
 * Formato: base64( iv 12B | authTag 16B | ciphertext )
 * Key: 32 bytes (256 bits) derivada de BACKUP_ENCRYPTION_KEY (base64 o hex o raw)
 */
function resolveKey(): Buffer {
  const raw = process.env.BACKUP_ENCRYPTION_KEY || process.env.BACKUP_ENCRYPTION_KEY_CLIENT || "";
  if (!raw) throw new Error("BACKUP_ENCRYPTION_KEY no configurada (clave solo del cliente requerida)");
  // soporta base64, hex, o raw utf8; normaliza a 32 bytes vía sha256 si no es 32B exactos
  let buf: Buffer;
  if (/^[A-Za-z0-9+/=]{32,}$/.test(raw) && raw.length >= 44) {
    try {
      const b64 = Buffer.from(raw, "base64");
      if (b64.length === 32) buf = b64;
      else buf = crypto.createHash("sha256").update(b64).digest();
    } catch {
      buf = crypto.createHash("sha256").update(raw).digest();
    }
  } else if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    buf = Buffer.from(raw, "hex");
  } else {
    // raw string o longitud no estándar → hash a 32B
    if (Buffer.from(raw, "utf8").length === 32) buf = Buffer.from(raw, "utf8");
    else buf = crypto.createHash("sha256").update(raw, "utf8").digest();
  }
  if (buf.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY debe derivar a 32 bytes");
  return buf;
}

export function encryptBuffer(plain: Buffer): Buffer {
  const key = resolveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv | tag | ciphertext, todo base64 para transporte si se necesita, pero aquí devolvemos binario
  return Buffer.concat([iv, tag, enc]);
}

export function decryptBuffer(encBundle: Buffer): Buffer {
  const key = resolveKey();
  if (encBundle.length < 28) throw new Error("Bundle cifrado demasiado corto");
  const iv = encBundle.subarray(0, 12);
  const tag = encBundle.subarray(12, 28);
  const ciphertext = encBundle.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function sha256Hex(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function hasBackupKey(): boolean {
  return Boolean(process.env.BACKUP_ENCRYPTION_KEY || process.env.BACKUP_ENCRYPTION_KEY_CLIENT);
}
