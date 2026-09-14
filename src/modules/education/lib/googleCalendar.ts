// EduCalendar Google adapter — pluggable, no prioritario pero estructura lista
// Cuando haya creds (GOOGLE_CLIENT_ID/SECRET + EduCalendarLink), se sincroniza
// Palmera es source of truth; Google es espejo. Futuro: desconectar Google sin perder datos.

export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  location?: string;
  extendedProperties?: { private?: Record<string,string> };
}

export function buildGoogleEventFromLesson(lesson: {
  studentName: string;
  instrument: string;
  date: string;
  durationMin: number;
  roomName?: string;
  notes?: string;
  batchToken?: string;
}): GoogleCalendarEvent {
  const start = new Date(lesson.date);
  const end = new Date(start.getTime() + lesson.durationMin * 60000);
  return {
    summary: `${lesson.studentName} · ${lesson.instrument}`,
    description: `Clase ${lesson.instrument} — ${lesson.notes || ""}\nPalmera EduLesson${lesson.batchToken ? ` r/batch/${lesson.batchToken}` : ""}`,
    location: lesson.roomName || undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    extendedProperties: { private: { palmera_lesson: "1", palmera_instrument: lesson.instrument } },
  };
}

export async function syncLessonToGoogle(opts: {
  accessToken: string;
  calendarId: string;
  googleEventId?: string | null;
  event: GoogleCalendarEvent;
}): Promise<{ googleEventId: string | null; error?: string }> {
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(opts.calendarId)}/events`;
  const url = opts.googleEventId ? `${base}/${encodeURIComponent(opts.googleEventId)}` : base;
  const method = opts.googleEventId ? "PATCH" : "POST";
  try {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${opts.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(opts.event),
    });
    const data: any = await res.json().catch(()=> ({}));
    if (!res.ok) return { googleEventId: null, error: data?.error?.message || `Google ${res.status}` };
    return { googleEventId: data.id || null };
  } catch (e:any) {
    return { googleEventId: null, error: String(e?.message ?? e) };
  }
}

export async function deleteGoogleEvent(opts: { accessToken: string; calendarId: string; googleEventId: string }) {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(opts.calendarId)}/events/${encodeURIComponent(opts.googleEventId)}`;
  try {
    const res = await fetch(url, { method:"DELETE", headers:{ Authorization:`Bearer ${opts.accessToken}` } });
    return res.ok;
  } catch { return false; }
}

// Setting keys for Google OAuth (por tenant o global env fallback)
export const GOOGLE_SETTING_KEYS = ["google_client_id","google_client_secret","google_redirect_uri"] as const;
