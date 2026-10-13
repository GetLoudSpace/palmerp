// src/config/notionContacts.ts
// Feature #10: mapeo PURO página Notion ("Alumnos (Administrativa)")
// → Contact Palmerp. Sin fetch ni Prisma: se importa en la ruta de
// servidor y en tests con fixtures sintéticas (nunca PII real).
import { normalizePhoneES } from "../lib/phone";

export const NOTION_VERSION = "2022-06-28";

/** Valores de baja en `Estado de pagos` (con o sin emoji inicial). */
const BAJA_KEYWORDS = ["baja definitiva", "baja julio", "congelado"];

const INSTRUMENT_MAP: Record<string, string> = {
  "BATERÍA": "BATERIA",
  "BATERIA": "BATERIA",
  "CANTO": "VOZ",
  "PIANO": "PIANO",
  "BAJO": "BAJO",
  "GUITARRA AC.": "GUITARRA_ACUSTICA",
  "GUITARRA E.": "GUITARRA_ELECTRICA",
};

export interface MappedStudent {
  name: string;
  phone: string;
  email: string;
  tutorName: string;
  age: number | null;
  isMinor: boolean;
  instrumentsDb: string[];
  primaryInstrumentDb?: string;
  billingCity: string;
  billingStreet: string;
  /** Fecha de inscripción (Notion `Fecha inicio`, ISO) o null. */
  enrollmentDate: string | null;
  /** Motivo de descarte (baja / sin-teléfono / sin-nombre). null = importable. */
  skipReason: string | null;
}

type NProp = { type?: string; [k: string]: unknown };

function titleOf(p: NProp | undefined): string {
  if (!p || p.type !== "title" || !Array.isArray(p.title)) return "";
  return (p.title as { plain_text?: string }[]).map((t) => t.plain_text || "").join("").trim();
}

function richOf(p: NProp | undefined): string {
  if (!p || p.type !== "rich_text" || !Array.isArray(p.rich_text)) return "";
  return (p.rich_text as { plain_text?: string }[]).map((t) => t.plain_text || "").join("").trim();
}

function multiOf(p: NProp | undefined): string[] {
  if (!p || p.type !== "multi_select" || !Array.isArray(p.multi_select)) return [];
  return (p.multi_select as { name?: string }[]).map((o) => String(o.name || "").trim()).filter(Boolean);
}

function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

/** Mapea una opción de `Instrumento` (Notion) al enum DB. null si desconocida. */
export function mapNotionInstrument(option: string): string | null {
  const hit = INSTRUMENT_MAP[norm(option)];
  return hit ?? null;
}

export function isBajaEstado(estadoName: string): boolean {
  const n = norm(estadoName);
  return BAJA_KEYWORDS.some((k) => n.includes(norm(k)));
}

/** Extrae y valida una página de alumno. Nunca lanza con páginas raras. */
export function mapNotionStudent(page: {
  id?: string;
  properties?: Record<string, NProp>;
}): MappedStudent & { pageId: string } {
  const props = page?.properties ?? {};
  const get = (k: string): NProp | undefined => props[k];

  const name = titleOf(get("Alumno"));
  const phoneRaw = get("Phone")?.type === "phone_number" ? String(get("Phone")?.phone_number || "") : "";
  const phone = phoneRaw.trim();
  const emailProp = get("Email");
  const email = emailProp?.type === "email" ? String(emailProp.email || "").trim().toLowerCase() : "";
  const tutorName = richOf(get("Padre/Madre/Tutor"));
  const ageProp = get("Edad");
  const age = ageProp?.type === "number" && typeof ageProp.number === "number" ? ageProp.number : null;
  const isMinor = age !== null && age < 18;

  const instrumentsDb = multiOf(get("Instrumento"))
    .map(mapNotionInstrument)
    .filter((x): x is string => !!x);

  const ciudadProp = get("Ciudad");
  const billingCity =
    ciudadProp?.type === "select"
      ? String((ciudadProp.select as { name?: string } | null)?.name || "").trim()
      : "";
  const billingStreet = richOf(get("Dirección"));
  const inicioProp = get("Fecha inicio");
  const enrollmentDate =
    inicioProp?.type === "date" && inicioProp.date
      ? String((inicioProp.date as { start?: string }).start || "") || null
      : null;

  const bajaProp = get("Fecha baja");
  const hasBajaDate = !!bajaProp && bajaProp.type === "date" && !!bajaProp.date;
  const estadoProp = get("Estado de pagos");
  const estadoName =
    estadoProp && (estadoProp.type === "status" || estadoProp.type === "select")
      ? String(((estadoProp[estadoProp.type] as { name?: string } | null)?.name) || "")
      : "";

  let skipReason: string | null = null;
  if (!name) skipReason = "sin-nombre";
  else if (hasBajaDate || isBajaEstado(estadoName)) skipReason = "baja";
  else if (!normalizePhoneES(phone)) skipReason = "sin-telefono";

  return {
    pageId: String(page?.id || ""),
    name,
    phone,
    email,
    tutorName,
    age,
    isMinor,
    instrumentsDb,
    primaryInstrumentDb: instrumentsDb[0],
    billingCity,
    billingStreet,
    enrollmentDate,
    skipReason,
  };
}
