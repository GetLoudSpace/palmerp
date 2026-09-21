// src/modules/education/lib/recipients.ts
// Resolución de destinatarios WhatsApp: 1 alumno = 1 Contact + 1 tutor único.
// Contact es fuente de verdad; aquí solo se decide A QUIÉN enviar.
import { normalizePhoneES } from "@/lib/phone";

export type EduCommsMode = "TUTOR_ONLY" | "STUDENT_ONLY" | "BOTH";
export type RecipientRole = "STUDENT" | "GUARDIAN";

export interface RecipientContact {
  id: string;
  name: string;
  phone?: string | null;
  phoneNormalized?: string | null;
  birthDate?: string | Date | null;
  commsOptOut?: boolean | null;
}

export interface ReportRecipient {
  contactId: string;
  role: RecipientRole;
  label: string;
  toPhone: string; // normalizado solo-dígitos
  warning?: string;
}

export function isMinor(birthDate?: string | Date | null): boolean | null {
  if (!birthDate) return null;
  const d = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age < 18;
}

/** Defecto sensato si la ficha aún no tiene commsMode explícito. */
export function defaultCommsMode(studentBirthDate?: string | Date | null, hasTutor: boolean = false): EduCommsMode {
  const minor = isMinor(studentBirthDate);
  if (minor === true) return "TUTOR_ONLY";
  if (!hasTutor) return "STUDENT_ONLY";
  return "TUTOR_ONLY";
}

/** Defecto de pagador: tutor si hay menor/tutor, propio en adulto sin tutor. */
export function defaultBillingMode(studentBirthDate?: string | Date | null, hasTutor: boolean = false): "TUTOR" | "PROPIO" {
  const minor = isMinor(studentBirthDate);
  if (minor === true && hasTutor) return "TUTOR";
  if (!hasTutor) return "PROPIO";
  return "TUTOR";
}

function normPhone(c: RecipientContact): string {
  if (c.phoneNormalized) return c.phoneNormalized.replace(/\D/g, "");
  return normalizePhoneES(c.phone || "");
}

/**
 * Calcula la lista final de destinatarios, deduplicada por teléfono.
 * Nunca lanza: si nadie tiene teléfono válido devuelve [] y el llamante muestra badge.
 */
export function getReportRecipients(opts: {
  student: RecipientContact;
  tutor?: RecipientContact | null;
  commsMode: EduCommsMode;
  tutorRelationLabel?: string;
}): ReportRecipient[] {
  const { student, tutor, commsMode } = opts;
  const out: ReportRecipient[] = [];
  const seen = new Set<string>();

  const push = (c: RecipientContact, role: RecipientRole, label: string) => {
    if (c.commsOptOut) return;
    const toPhone = normPhone(c);
    if (!toPhone) {
      out.push({ contactId: c.id, role, label, toPhone: "", warning: "Sin teléfono — no se enviará" });
      return;
    }
    if (seen.has(toPhone)) return; // mismo móvil en padre e hijo → 1 envío
    seen.add(toPhone);
    out.push({ contactId: c.id, role, label, toPhone });
  };

  const tutorLabel = tutor
    ? `Tutor · ${tutor.name}${opts.tutorRelationLabel ? ` (${opts.tutorRelationLabel})` : ""}`
    : "Tutor";
  const studentLabel = `Alumno · ${student.name}`;

  if (commsMode === "TUTOR_ONLY") {
    if (tutor) push(tutor, "GUARDIAN", tutorLabel);
    else push(student, "STUDENT", studentLabel); // fallback: sin tutor, al alumno
  } else if (commsMode === "STUDENT_ONLY") {
    push(student, "STUDENT", studentLabel);
  } else {
    if (tutor) push(tutor, "GUARDIAN", tutorLabel);
    push(student, "STUDENT", studentLabel);
  }

  // Solo teléfonos válidos llegan al envío real; los warnings los muestra la UI
  return out;
}

/** Solo los que tienen teléfono real son enviables. */
export function sendableRecipients(recipients: ReportRecipient[]): ReportRecipient[] {
  return recipients.filter((r) => r.toPhone && !r.warning);
}
