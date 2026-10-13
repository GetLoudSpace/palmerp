// src/lib/contactSync.ts
// Helpers PUROS para la feature #11 (contacts_shared_db): mapeo localStorage ↔ DB,
// validación de payloads y claves de deduplicación. Sin Prisma ni Node:
// se importa tanto en rutas de servidor como en páginas "use client".
import { normalizePhoneES } from "./phone";

export const CONTACT_TYPES = ["INDIVIDUAL", "COMPANY"] as const;
export const CONTACT_CATEGORIES = ["NONE", "ALUMNO", "TUTOR", "PROFESOR"] as const;

// Enum Instrument de Prisma: no existe "GUITARRA" plano (legado
// acústica/eléctrica). La UI trabaja con "GUITARRA" (ver instruments.ts).
const DB_INSTRUMENTS = new Set([
  "BAJO",
  "GUITARRA_ACUSTICA",
  "GUITARRA_ELECTRICA",
  "BATERIA",
  "PIANO",
  "VOZ",
]);

/** "GUITARRA" (UI) → "GUITARRA_ACUSTICA" (DB). Resto válido pasa tal cual. */
export function mapInstrumentToDb(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const k = v.trim().toUpperCase();
  if (!k) return undefined;
  if (k === "GUITARRA") return "GUITARRA_ACUSTICA";
  return DB_INSTRUMENTS.has(k) ? k : undefined;
}

/** Inverso para pintar en UI: acústica/eléctrica → "GUITARRA". */
export function mapInstrumentFromDb(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  if (v === "GUITARRA_ACUSTICA" || v === "GUITARRA_ELECTRICA") return "GUITARRA";
  return v || undefined;
}

export interface ContactPayload {
  name: string;
  phone: string;
  email: string;
  contactType: "INDIVIDUAL" | "COMPANY";
  category: "NONE" | "ALUMNO" | "TUTOR" | "PROFESOR";
  instrument?: string;
  companyName: string;
  cif: string;
  billingStreet: string;
  billingZip: string;
  billingCity: string;
  billingCountry: string;
  notes: string;
  birthDate?: string;
  tutorIds: string[];
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * Valida y normaliza un payload de contacto (creación/edición/import).
 * Nunca lanza: devuelve { ok:false, error } legible para la UI.
 */
export function validateContactPayload(body: unknown): { ok: true; data: ContactPayload } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = str(b.name);
  if (!name) return { ok: false, error: "El nombre es requerido" };
  if (name.length > 120) return { ok: false, error: "El nombre es demasiado largo (máx 120)" };

  const email = str(b.email).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Email no válido" };
  }

  const contactType = String(b.contactType || "INDIVIDUAL").toUpperCase();
  if (!CONTACT_TYPES.includes(contactType as (typeof CONTACT_TYPES)[number])) {
    return { ok: false, error: "Tipo no válido (INDIVIDUAL/COMPANY)" };
  }

  const category = String(b.category || "NONE").toUpperCase();
  if (!CONTACT_CATEGORIES.includes(category as (typeof CONTACT_CATEGORIES)[number])) {
    return { ok: false, error: "Categoría no válida (NONE/ALUMNO/TUTOR/PROFESOR)" };
  }

  let instrument: string | undefined;
  if (category === "ALUMNO") {
    instrument = mapInstrumentToDb(b.instrument);
    if (!instrument) return { ok: false, error: "El instrumento es obligatorio para un alumno" };
  } else if (b.instrument) {
    instrument = mapInstrumentToDb(b.instrument);
  }

  let birthDate: string | undefined;
  const rawBirth = str(b.birthDate ?? b.birthdate);
  if (rawBirth) {
    const d = new Date(rawBirth);
    if (isNaN(d.getTime())) return { ok: false, error: "Fecha de nacimiento no válida" };
    birthDate = d.toISOString();
  }

  const tutorIds = Array.isArray(b.tutorIds)
    ? [...new Set(b.tutorIds.map(String).filter(Boolean))]
    : [];

  return {
    ok: true,
    data: {
      name,
      phone: str(b.phone),
      email,
      contactType: contactType as ContactPayload["contactType"],
      category: category as ContactPayload["category"],
      instrument,
      companyName: contactType === "INDIVIDUAL" ? str(b.companyName) : "",
      cif: str(b.cif),
      billingStreet: str(b.billingStreet),
      billingZip: str(b.billingZip),
      billingCity: str(b.billingCity),
      billingCountry: str(b.billingCountry) || "España",
      notes: str(b.notes),
      birthDate,
      tutorIds,
    },
  };
}

/**
 * Clave de deduplicación idempotente: teléfono normalizado > email > nombre.
 * Dos fichas con el mismo teléfono son el mismo Contact (regla ya usada
 * en recipients.ts para no duplicar envíos).
 */
export function contactDedupeKey(c: {
  phone?: string | null;
  phoneNormalized?: string | null;
  email?: string | null;
  name?: string | null;
}): string {
  const norm = (c.phoneNormalized || "").replace(/\D/g, "") || normalizePhoneES(c.phone || "");
  if (norm) return `phone:${norm}`;
  const email = (c.email || "").trim().toLowerCase();
  if (email) return `email:${email}`;
  return `name:${(c.name || "").trim().toLowerCase()}`;
}

/** Normaliza teléfono suelto al formato DB (phone + phoneNormalized). */
export function splitPhone(raw: unknown): { phone: string; phoneNormalized: string | null } {
  const phone = str(raw);
  const norm = normalizePhoneES(phone);
  return { phone, phoneNormalized: norm || null };
}
