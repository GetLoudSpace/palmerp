// src/modules/education/lib/whatsappConfig.ts
// Fuente única de verdad para credenciales WhatsApp Cloud API.
//
// Prioridad: vault cifrado por tenant > env global.
// Acepta los dos nombres históricos de env para no romper despliegues:
//   token:   WHATSAPP_TOKEN (canónico) | WHATSAPP_ACCESS_TOKEN (legacy)
//   phoneId: WHATSAPP_PHONE_NUMBER_ID (canónico) | WHATSAPP_PHONE_ID (legacy)
//   template: WHATSAPP_TEMPLATE (canónico, default "edu_lesson_followup")
//
// Los valores en claro solo existen en memoria del servidor. Hacia el cliente
// solo se expone `vaultSourceKind()` ("vault"|"env"|null), nunca nombres de vars.
import { readVault } from "@/lib/secrets";
import { LEGACY_SETTING_KEYS } from "@/lib/credentials";

const TOKEN_KEY = "whatsapp_token";
const PHONE_KEY = "whatsapp_phone_number_id";
const TEMPLATE_KEY = "whatsapp_template";
const LEGACY_PHONE_KEY = LEGACY_SETTING_KEYS[PHONE_KEY];

export interface WhatsAppConfig {
  token: string | null;
  phoneNumberId: string | null;
  template: string;
  configured: boolean;
  /** Origen interno (no exponer tal cual al cliente no-admin). */
  source: {
    token: "vault" | "env:WHATSAPP_TOKEN" | "env:WHATSAPP_ACCESS_TOKEN" | null;
    phoneNumberId: "vault" | "env:WHATSAPP_PHONE_NUMBER_ID" | "env:WHATSAPP_PHONE_ID" | null;
  };
}

/** Origen genérico apto para respuestas a roles no-admin: no revela nombres de vars. */
export function vaultSourceKind(config: WhatsAppConfig): "vault" | "env" | null {
  if (config.source.token === "vault" || config.source.phoneNumberId === "vault") return "vault";
  if (config.configured) return "env";
  return null;
}

/** Solo-servidor: lee secretos de env. No exportar a chiamantes cliente. */
function readWhatsAppEnv() {
  const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || null;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || null;
  return {
    token,
    phoneNumberId,
    template: process.env.WHATSAPP_TEMPLATE || "edu_lesson_followup",
    tokenEnvName: (process.env.WHATSAPP_TOKEN
      ? "env:WHATSAPP_TOKEN"
      : process.env.WHATSAPP_ACCESS_TOKEN
        ? "env:WHATSAPP_ACCESS_TOKEN"
        : null) as WhatsAppConfig["source"]["token"],
    phoneEnvName: (process.env.WHATSAPP_PHONE_NUMBER_ID
      ? "env:WHATSAPP_PHONE_NUMBER_ID"
      : process.env.WHATSAPP_PHONE_ID
        ? "env:WHATSAPP_PHONE_ID"
        : null) as WhatsAppConfig["source"]["phoneNumberId"],
  };
}

export async function resolveWhatsAppConfig(tenantId?: string | null): Promise<WhatsAppConfig> {
  const env = readWhatsAppEnv();

  let token: string | null = null;
  let phoneNumberId: string | null = null;
  let template = env.template;

  if (tenantId) {
    const vault = await readVault(tenantId, [TOKEN_KEY, PHONE_KEY, LEGACY_PHONE_KEY, TEMPLATE_KEY]);
    token = vault[TOKEN_KEY];
    phoneNumberId = vault[PHONE_KEY] || vault[LEGACY_PHONE_KEY];
    template = vault[TEMPLATE_KEY] || template;
  }

  const tokenFromVault = Boolean(token);
  const phoneFromVault = Boolean(phoneNumberId);
  if (!token) token = env.token;
  if (!phoneNumberId) phoneNumberId = env.phoneNumberId;

  return {
    token,
    phoneNumberId,
    template,
    configured: Boolean(token && phoneNumberId),
    source: {
      token: tokenFromVault ? "vault" : env.tokenEnvName,
      phoneNumberId: phoneFromVault ? "vault" : env.phoneEnvName,
    },
  };
}
