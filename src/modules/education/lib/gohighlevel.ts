// GoHighLevel adapter — preparado para sincronizar la agenda vía API.
// Patrón espejo al de Google (googleCalendar.ts): Palmera es source of truth,
// GHL es espejo + disparador de workflows. Sin credenciales, todo hace skip.
//
// Conexión (dos piezas independientes, ambas opcionales):
//  A) Calendar API v2 (Private Integration token de sub-cuenta):
//     - Settings por tenant: ghl_sync_enabled, ghl_api_token, ghl_location_id, ghl_calendar_id
//     - Cada clase (EduLesson) se espeja como appointment (create/update/delete).
//     - Ver https://marketplace.gohighlevel.com/docs/ghl/calendars/calendar-events
//  B) Workflow webhooks (sin auth, la URL ya lleva el secreto):
//     - Settings: ghl_workflow_class_created_url, ghl_workflow_class_cancelled_url
//     - Palmera hace POST al crear/cancelar → GHL dispara recordatorios, follow-ups, etc.
//  C) Inbound (GHL → Palmera): POST /api/education/calendar/ghl-webhook
//     - Proteger con Setting ghl_webhook_secret (o env GHL_WEBHOOK_SECRET).
//
// Sin migración: el mapeo lessonId <-> appointmentId vive en Setting
// `ghl_appointment_map` (JSON). Si el volumen crece, migrar a columna en EduLesson.

import db from "@/lib/db";

export const GHL_API_BASE = "https://services.leadconnectorhq.com";
export const GHL_API_VERSION = "2021-07-28";

export const GHL_SETTING_KEYS = [
  "ghl_sync_enabled",
  "ghl_api_token",
  "ghl_location_id",
  "ghl_calendar_id",
  "ghl_workflow_class_created_url",
  "ghl_workflow_class_cancelled_url",
  "ghl_webhook_secret",
  "ghl_inbound_apply",
  "ghl_appointment_map",
] as const;

export interface GhlConfig {
  enabled: boolean;
  apiToken: string | null;
  locationId: string | null;
  calendarId: string | null;
  workflowClassCreatedUrl: string | null;
  workflowClassCancelledUrl: string | null;
  webhookSecret: string | null;
  /** Si true, los eventos inbound de GHL actualizan el estado de la clase. Default false. */
  inboundApply: boolean;
}

export interface LessonLike {
  id?: string;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  instrument?: string;
  date: string;
  durationMin?: number;
  roomName?: string;
  notes?: string;
  status?: string;
  teacherName?: string;
  batchToken?: string;
}

async function getSetting(tenantId: string, key: string): Promise<string | null> {
  try {
    const row = await (db as any).setting.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function setSetting(tenantId: string, key: string, value: string) {
  await (db as any).setting.upsert({
    where: { tenantId_key: { tenantId, key } },
    create: { tenantId, key, value },
    update: { value },
  });
}

/** Lee la config GHL del tenant (Settings; el token también admite env global fallback). */
export async function getGhlConfig(tenantId: string): Promise<GhlConfig> {
  const [enabled, token, locationId, calendarId, createdUrl, cancelledUrl, secret, inbound] =
    await Promise.all([
      getSetting(tenantId, "ghl_sync_enabled"),
      getSetting(tenantId, "ghl_api_token"),
      getSetting(tenantId, "ghl_location_id"),
      getSetting(tenantId, "ghl_calendar_id"),
      getSetting(tenantId, "ghl_workflow_class_created_url"),
      getSetting(tenantId, "ghl_workflow_class_cancelled_url"),
      getSetting(tenantId, "ghl_webhook_secret"),
      getSetting(tenantId, "ghl_inbound_apply"),
    ]);
  return {
    enabled: enabled === "true" || enabled === "1",
    apiToken: token || process.env.GHL_API_TOKEN || null,
    locationId: locationId || process.env.GHL_LOCATION_ID || null,
    calendarId: calendarId || process.env.GHL_CALENDAR_ID || null,
    workflowClassCreatedUrl: createdUrl || process.env.GHL_WORKFLOW_CLASS_CREATED_URL || null,
    workflowClassCancelledUrl: cancelledUrl || process.env.GHL_WORKFLOW_CLASS_CANCELLED_URL || null,
    webhookSecret: secret || process.env.GHL_WEBHOOK_SECRET || null,
    inboundApply: inbound === "true" || inbound === "1",
  };
}

/** Palmera EduLesson.status → GHL appointmentStatus. */
export function mapLessonStatusToGhl(status?: string): string {
  switch ((status || "SCHEDULED").toUpperCase()) {
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "NO_SHOW":
      return "noshow";
    default:
      return "confirmed";
  }
}

/** GHL appointmentStatus → Palmera EduLesson.status (para inbound). */
export function mapGhlStatusToLesson(status?: string): string | null {
  switch ((status || "").toLowerCase()) {
    case "cancelled":
    case "invalid":
      return "CANCELLED";
    case "showed":
    case "completed":
      return "COMPLETED";
    case "noshow":
      return "NO_SHOW";
    case "new":
    case "confirmed":
    case "active":
      return "SCHEDULED";
    default:
      return null;
  }
}

export function buildGhlAppointmentFromLesson(lesson: LessonLike): {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  appointmentStatus: string;
} {
  const instrument = lesson.instrument || "GUITARRA";
  const start = new Date(lesson.date);
  const end = new Date(start.getTime() + (lesson.durationMin || 45) * 60000);
  return {
    title: `Clase ${instrument} — ${lesson.studentName || "Alumno"}`,
    description: [
      `Clase ${instrument} (Palmera)`,
      lesson.teacherName ? `Profesor: ${lesson.teacherName}` : null,
      lesson.roomName ? `Aula: ${lesson.roomName}` : null,
      lesson.notes ? `Notas: ${lesson.notes}` : null,
      lesson.batchToken ? `Ref: r/batch/${lesson.batchToken}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    appointmentStatus: mapLessonStatusToGhl(lesson.status),
  };
}

async function ghlFetch<T>(path: string, opts: {
  token: string;
  method?: string;
  body?: unknown;
}): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const res = await fetch(`${GHL_API_BASE}${path}`, {
      method: opts.method || "GET",
      headers: {
        Authorization: `Bearer ${opts.token}`,
        Version: GHL_API_VERSION,
        "Content-Type": "application/json",
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const data = (await res.json().catch(() => null)) as T | null;
    if (!res.ok) {
      const msg = (data as any)?.message || (data as any)?.error || `GHL ${res.status}`;
      return { ok: false, status: res.status, data, error: String(msg) };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: String((e as Error)?.message ?? e) };
  }
}

function splitName(full?: string): { firstName: string; lastName: string } {
  const parts = String(full || "Alumno").trim().split(/\s+/);
  return { firstName: parts[0] || "Alumno", lastName: parts.slice(1).join(" ") || "" };
}

/** Busca contacto en GHL por email o teléfono (duplicate search). */
export async function findGhlContact(opts: {
  token: string;
  locationId: string;
  email?: string;
  phone?: string;
}): Promise<string | null> {
  const params = new URLSearchParams({ locationId: opts.locationId });
  if (opts.email) params.set("email", opts.email);
  else if (opts.phone) params.set("phoneNumber", opts.phone);
  else return null;
  const res = await ghlFetch<any>(`/contacts/search/duplicate?${params.toString()}`, { token: opts.token });
  const contact = res.data?.contact;
  return contact?.id ? String(contact.id) : null;
}

/** Crea el contacto del alumno en GHL. */
export async function createGhlContact(opts: {
  token: string;
  locationId: string;
  name?: string;
  email?: string;
  phone?: string;
}): Promise<{ contactId: string | null; error?: string }> {
  const { firstName, lastName } = splitName(opts.name);
  const res = await ghlFetch<any>("/contacts/", {
    token: opts.token,
    method: "POST",
    body: {
      locationId: opts.locationId,
      firstName,
      ...(lastName ? { lastName } : {}),
      ...(opts.email ? { email: opts.email } : {}),
      ...(opts.phone ? { phone: opts.phone } : {}),
      source: "Palmera ERP",
    },
  });
  const id = res.data?.contact?.id ? String(res.data.contact.id) : null;
  return id ? { contactId: id } : { contactId: null, error: res.error || "No se pudo crear el contacto" };
}

/** Devuelve el contactId del alumno, creando el contacto si no existe. */
export async function ensureGhlContact(opts: {
  token: string;
  locationId: string;
  name?: string;
  email?: string;
  phone?: string;
}): Promise<{ contactId: string | null; error?: string }> {
  const found = await findGhlContact(opts);
  if (found) return { contactId: found };
  return createGhlContact(opts);
}

/** Crea el appointment en GHL (espejo de la clase). */
export async function createGhlAppointment(opts: {
  token: string;
  locationId: string;
  calendarId: string;
  contactId: string;
  lesson: LessonLike;
}): Promise<{ appointmentId: string | null; error?: string }> {
  const appt = buildGhlAppointmentFromLesson(opts.lesson);
  const res = await ghlFetch<any>("/calendars/events/appointments", {
    token: opts.token,
    method: "POST",
    body: {
      calendarId: opts.calendarId,
      locationId: opts.locationId,
      contactId: opts.contactId,
      title: appt.title,
      description: appt.description,
      startTime: appt.startTime,
      endTime: appt.endTime,
      appointmentStatus: appt.appointmentStatus,
      ignoreFreeSlotValidation: true,
      toNotify: true,
    },
  });
  // La respuesta varía por versión: id | appointment.id | eventId
  const id = res.data?.id || res.data?.appointment?.id || res.data?.eventId;
  return id ? { appointmentId: String(id) } : { appointmentId: null, error: res.error || "GHL no devolvió id" };
}

/** Actualiza el appointment (reprogramación, cambio de estado, notas). */
export async function updateGhlAppointment(opts: {
  token: string;
  appointmentId: string;
  lesson: LessonLike;
}): Promise<{ ok: boolean; error?: string }> {
  const appt = buildGhlAppointmentFromLesson(opts.lesson);
  const res = await ghlFetch<any>(`/calendars/events/appointments/${encodeURIComponent(opts.appointmentId)}`, {
    token: opts.token,
    method: "PUT",
    body: {
      title: appt.title,
      description: appt.description,
      startTime: appt.startTime,
      endTime: appt.endTime,
      appointmentStatus: appt.appointmentStatus,
      ignoreFreeSlotValidation: true,
    },
  });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

/** Borra el appointment en GHL. */
export async function deleteGhlAppointment(opts: {
  token: string;
  appointmentId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await ghlFetch<any>(`/calendars/events/appointments/${encodeURIComponent(opts.appointmentId)}`, {
    token: opts.token,
    method: "DELETE",
  });
  // GHL devuelve 200/204; algunos planes 404 si ya no existe → se considera ok idempotente
  if (res.ok || res.status === 404) return { ok: true };
  return { ok: false, error: res.error };
}

/** Lista calendarios de la location (para elegir ghl_calendar_id). */
export async function listGhlCalendars(opts: {
  token: string;
  locationId: string;
}): Promise<{ calendars: Array<{ id: string; name: string }>; error?: string }> {
  const res = await ghlFetch<any>(`/calendars/?locationId=${encodeURIComponent(opts.locationId)}`, {
    token: opts.token,
  });
  if (!res.ok) return { calendars: [], error: res.error };
  const list = Array.isArray(res.data?.calendars) ? res.data.calendars : [];
  return { calendars: list.map((c: any) => ({ id: String(c.id), name: String(c.name || c.id) })) };
}

/** Dispara un workflow de GHL vía Inbound Webhook (la URL ya contiene el secreto). */
export async function triggerGhlWorkflow(
  url: string | null | undefined,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!url) return { ok: true, skipped: true };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "palmera-erp", ...payload }),
    });
    if (!res.ok) return { ok: false, error: `Workflow ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
}

// ---------- Mapeo lessonId <-> appointmentId (Setting JSON, sin migración) ----------

async function readMap(tenantId: string): Promise<Record<string, string>> {
  const raw = await getSetting(tenantId, "ghl_appointment_map");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function getGhlAppointmentId(tenantId: string, lessonId: string): Promise<string | null> {
  const map = await readMap(tenantId);
  return map[lessonId] || null;
}

export async function saveGhlAppointmentId(tenantId: string, lessonId: string, appointmentId: string) {
  const map = await readMap(tenantId);
  map[lessonId] = appointmentId;
  await setSetting(tenantId, "ghl_appointment_map", JSON.stringify(map));
}

export async function clearGhlAppointmentId(tenantId: string, lessonId: string) {
  const map = await readMap(tenantId);
  delete map[lessonId];
  await setSetting(tenantId, "ghl_appointment_map", JSON.stringify(map));
}

/** Búsqueda inversa (webhook inbound): appointmentId → lessonId. */
export async function findLessonIdByAppointment(
  tenantId: string,
  appointmentId: string,
): Promise<string | null> {
  const map = await readMap(tenantId);
  for (const [lessonId, apptId] of Object.entries(map)) {
    if (apptId === appointmentId) return lessonId;
  }
  return null;
}
