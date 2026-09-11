import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || "palmerp-storage";

// Configurar el cliente S3 compatible para Cloudflare R2
export const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "https://dummy.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: R2_ACCESS_KEY || "dummy",
    secretAccessKey: R2_SECRET_KEY || "dummy",
  },
});

/**
 * Sube un archivo a Cloudflare R2 dentro del path del tenant.
 */
export async function uploadFile(
  tenantId: string, 
  filePath: string, 
  fileBuffer: Buffer, 
  contentType: string = "application/octet-stream"
) {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    console.warn("[Storage] Variables R2 no configuradas. Saltando subida (mock mode).");
    return null;
  }

  const key = `tenants/${tenantId}/${filePath.replace(/^\//, '')}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  try {
    return await s3Client.send(command);
  } catch (error) {
    console.error(`[Storage] Error subiendo archivo ${key}:`, error);
    throw error;
  }
}

/**
 * Borra un archivo de Cloudflare R2 para la política de retención.
 */
export async function deleteFile(tenantId: string, filePath: string) {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) return null;
  
  const key = `tenants/${tenantId}/${filePath.replace(/^\//, '')}`;
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  try {
    return await s3Client.send(command);
  } catch (error) {
    // Si no existe, no rompemos el proceso, simplemente logueamos
    console.warn(`[Storage] Archivo a borrar no encontrado o error: ${key}`);
    return null;
  }
}
