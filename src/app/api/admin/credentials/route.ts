// src/app/api/admin/credentials/route.ts
// Vault de credenciales por tenant — SOLO ADMIN/DEV.
//
// Seguridad:
// - GET jamás devuelve valores: solo {configured, source} por clave.
// - PUT cifra con AES-256-GCM antes de guardar (Setting.value = `enc:v1:...`).
// - DELETE borra el vault (puede quedar fallback env global: se informa sin revelarlo).
// - Todo guardado/borrado queda en AuditLog con la CLAVE, nunca el valor.
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { encryptSecret, hasSecretsKey } from "@/lib/secrets";
import {
  CREDENTIAL_DEFS,
  LEGACY_SETTING_KEYS,
  isCredentialKey,
  type CredentialKey,
} from "@/lib/credentials";
import { requireVaultAdmin } from "@/lib/requireVaultAdmin";

function envConfigured(envNames: readonly string[]): boolean {
  return envNames.some((n) => Boolean(process.env[n]));
}

export async function GET() {
  const auth = await requireVaultAdmin();
  if ("error" in auth) return auth.error;
  const { tenantId } = auth.user;

  let vaultKeys = new Set<string>();
  try {
    const rows = await db.setting.findMany({
      where: { tenantId, key: { in: CREDENTIAL_DEFS.map((d) => d.key) } },
      select: { key: true },
    });
    vaultKeys = new Set(rows.map((r) => r.key));
    // legacy: el phone id antiguo se reporta como el canónico
    for (const [canonical, legacy] of Object.entries(LEGACY_SETTING_KEYS)) {
      if (vaultKeys.has(legacy)) vaultKeys.add(canonical);
    }
  } catch {
    // sin DB → todo a env
  }

  return NextResponse.json({
    success: true,
    secretsKeyReady: hasSecretsKey(),
    credentials: CREDENTIAL_DEFS.map((d) => {
      const inVault = vaultKeys.has(d.key);
      const inEnv = envConfigured(d.envNames);
      return {
        key: d.key,
        label: d.label,
        hint: d.hint,
        configured: inVault || inEnv,
        // "vault" = lo pusiste aquí (cifrado) · "env" = viene del servidor · null = pendiente
        source: inVault ? ("vault" as const) : inEnv ? ("env" as const) : null,
      };
    }),
  });
}

export async function PUT(request: Request) {
  const auth = await requireVaultAdmin();
  if ("error" in auth) return auth.error;
  const { tenantId, id: userId } = auth.user;

  const body = await request.json().catch(() => ({}));
  const { key, value } = body as { key?: unknown; value?: unknown };
  if (!isCredentialKey(key)) {
    return NextResponse.json({ error: "Clave no permitida" }, { status: 400 });
  }
  const clean = typeof value === "string" ? value.trim() : "";
  if (!clean) return NextResponse.json({ error: "Valor vacío" }, { status: 400 });
  if (clean.length > 20000) return NextResponse.json({ error: "Valor demasiado largo" }, { status: 400 });
  if (key === "google_service_account_json") {
    try {
      JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: "No es un JSON válido" }, { status: 400 });
    }
  }
  if (!hasSecretsKey()) {
    return NextResponse.json(
      { error: "Falta CREDENTIALS_ENCRYPTION_KEY en el servidor (pide al técnico: openssl rand -base64 32)" },
      { status: 500 }
    );
  }

  const encrypted = encryptSecret(clean);
  await db.setting.upsert({
    where: { tenantId_key: { tenantId, key } },
    update: { value: encrypted },
    create: { tenantId, key, value: encrypted },
  });
  await audit(tenantId, userId, "CREDENTIAL_SAVED", key, `Credencial guardada (cifrada): ${key}`, true);

  return NextResponse.json({ success: true, key, configured: true, source: "vault" });
}

export async function DELETE(request: Request) {
  const auth = await requireVaultAdmin();
  if ("error" in auth) return auth.error;
  const { tenantId, id: userId } = auth.user;

  const body = await request.json().catch(() => ({}));
  const url = new URL(request.url);
  const key: unknown = body.key ?? url.searchParams.get("key");
  if (!isCredentialKey(key)) {
    return NextResponse.json({ error: "Clave no permitida" }, { status: 400 });
  }

  try {
    await db.setting.delete({ where: { tenantId_key: { tenantId, key } } });
  } catch {}
  // La clave legacy también se limpia al borrar su canónica
  const legacy = LEGACY_SETTING_KEYS[key];
  if (legacy) {
    try {
      await db.setting.delete({ where: { tenantId_key: { tenantId, key: legacy } } });
    } catch {}
  }
  await audit(tenantId, userId, "CREDENTIAL_DELETED", key, `Credencial eliminada del vault: ${key}`, true);

  const def = CREDENTIAL_DEFS.find((d) => d.key === key);
  return NextResponse.json({
    success: true,
    key,
    vaultConfigured: false,
    envFallback: def ? envConfigured(def.envNames) : false,
  });
}

async function audit(
  tenantId: string,
  userId: string,
  action: string,
  recordId: CredentialKey,
  details: string,
  success: boolean
) {
  try {
    await db.auditLog.create({ data: { tenantId, userId, action, table: "Setting", recordId, details, success } });
  } catch {}
}
