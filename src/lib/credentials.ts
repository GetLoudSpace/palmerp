// src/lib/credentials.ts
// Definiciones del vault de credenciales: PURA (sin Node ni Prisma).
// Se importa desde la página cliente Y desde las APIs: añadir una credencial
// es una entrada aquí y la UI + endpoints la recogen solos.
// Lo que toca servidor (sesión, guard) vive en src/lib/requireVaultAdmin.ts.
export interface CredentialDef {
  key: string;
  label: string;
  hint: string;
  envNames: readonly string[];
  group: "whatsapp" | "google";
  /** meta solo-UI: cómo se edita el campo (el valor jamás se precarga) */
  secret: boolean;
  multiline?: boolean;
  placeholder: string;
}

export const CREDENTIAL_DEFS: readonly CredentialDef[] = [
  {
    key: "whatsapp_token",
    label: "WhatsApp · Token",
    hint: "Token permanente de la app Meta",
    envNames: ["WHATSAPP_TOKEN", "WHATSAPP_ACCESS_TOKEN"],
    group: "whatsapp",
    secret: true,
    placeholder: "EAA…  (pega el token de Meta)",
  },
  {
    key: "whatsapp_phone_number_id",
    label: "WhatsApp · Phone Number ID",
    hint: "ID del número remitente (panel Meta → WhatsApp → API Setup)",
    envNames: ["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_PHONE_ID"],
    group: "whatsapp",
    secret: true,
    placeholder: "123456789…  (API Setup en Meta)",
  },
  {
    key: "whatsapp_template",
    label: "WhatsApp · Template",
    hint: "Nombre del template aprobado, ej. edu_lesson_followup",
    envNames: ["WHATSAPP_TEMPLATE"],
    group: "whatsapp",
    secret: false,
    placeholder: "edu_lesson_followup",
  },
  {
    key: "google_service_account_json",
    label: "Google · Service Account JSON",
    hint: "JSON completo de la service-account, en 1 línea",
    envNames: ["GOOGLE_SERVICE_ACCOUNT_JSON"],
    group: "google",
    secret: true,
    multiline: true,
    placeholder: '{"type":"service_account",…}  (1 línea)',
  },
  {
    key: "google_calendar_id",
    label: "Google · Calendar ID",
    hint: "Email del calendario compartido con la service-account",
    envNames: ["GOOGLE_CALENDAR_ID"],
    group: "google",
    secret: false,
    placeholder: "tuescuela@gmail.com",
  },
];

export type CredentialKey = (typeof CREDENTIAL_DEFS)[number]["key"];

const ALLOWED = new Set<string>(CREDENTIAL_DEFS.map((d) => d.key));

export function isCredentialKey(key: unknown): key is CredentialKey {
  return typeof key === "string" && ALLOWED.has(key);
}

/** Claves legacy que se siguen leyendo (migran al canónico al próximo guardado). */
export const LEGACY_SETTING_KEYS: Record<string, string> = {
  whatsapp_phone_number_id: "whatsapp_phone_id",
};
