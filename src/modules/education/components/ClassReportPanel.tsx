// src/modules/education/components/ClassReportPanel.tsx
"use client";
import React, { useEffect, useState, useCallback } from "react";
import * as Icons from "lucide-react";
import { useSession } from "next-auth/react";
import { getTenantStorageKey } from "@/lib/clientStorage";
import { buildWaMeUrl } from "../lib/whatsapp";
import { getReportRecipients, sendableRecipients, type EduCommsMode, type ReportRecipient } from "../lib/recipients";

/* ─── Types ─────────────────────────────────────── */
type GoogleEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  organizer?: { email?: string };
  description?: string;
};

type LocalLesson = {
  id: string;
  studentName: string;
  studentPhone?: string;
  instrument: string;
  date: string;
  status: string;
  notes?: string;
  whatsappSentAt?: string;
  teacherId?: string;
  teacherName?: string;
};

type EduStudentLite = {
  id: string;
  contactId?: string;
  contactName: string;
  contactPhone: string;
  birthDate?: string;
  tutorId?: string;
  tutorName?: string;
  tutorPhone?: string;
  guardianRelation?: string;
  commsMode: EduCommsMode;
};

type ReportForm = {
  done: string;
  todo: string;
  attendance: boolean;
};

/* ─── Helpers ────────────────────────────────────── */
function fmtTime(dt?: string): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

/* ─── Component ─────────────────────────────────── */
export default function ClassReportPanel() {
  const { data: session } = useSession();
  const professorEmail = (session?.user as any)?.email as string | undefined;

  const [gcEvents, setGcEvents] = useState<GoogleEvent[]>([]);
  const [gcLoading, setGcLoading] = useState(false);
  const [gcError, setGcError] = useState<string | null>(null);
  const [localLessons, setLocalLessons] = useState<LocalLesson[]>([]);
  const [eduStudents, setEduStudents] = useState<EduStudentLite[]>([]);
  const [recipients, setRecipients] = useState<ReportRecipient[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<GoogleEvent | null>(null);
  const [selectedLocal, setSelectedLocal] = useState<LocalLesson | null>(null);
  const [form, setForm] = useState<ReportForm>({ done: "", todo: "", attendance: true });
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const fetchGoogleEvents = useCallback(async () => {
    if (!professorEmail) return;
    setGcLoading(true);
    setGcError(null);
    try {
      const res = await fetch(`/api/education/calendar?email=${encodeURIComponent(professorEmail)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error cargando Google Calendar");
      setGcEvents(data.events || []);
    } catch (e: any) {
      setGcError(e?.message ?? "No se pudo conectar con Google Calendar");
      setGcEvents([]);
    } finally {
      setGcLoading(false);
    }
  }, [professorEmail]);

  const sessionRole = (session?.user as any)?.role as string | undefined;
  const sessionUserId = (session?.user as any)?.id as string | undefined;
  const sessionUserName = session?.user?.name as string | undefined;
  // El profesor solo ve sus clases: vinculadas por teacherId/teacherName o sin asignar (legado).
  // ADMIN/DEV ven todas. Google Calendar ya filtra por email en el servidor.
  const isProfessorView = sessionRole === "PROFESSOR" || sessionRole === "STAFF";

  const loadLocalLessons = useCallback(() => {
    const raw = localStorage.getItem(getTenantStorageKey("edu_lessons"));
    if (!raw) return;
    try {
      const arr: any[] = JSON.parse(raw);
      const today = todayISO();
      const todayLessons: LocalLesson[] = arr
        .filter((l: any) => String(l.date || "").startsWith(today))
        .map((l: any) => ({
          id: String(l.id),
          studentName: String(l.studentName || l.name || "Alumno"),
          studentPhone: l.studentPhone ? String(l.studentPhone) : undefined,
          instrument: String(l.instrument || "GUITARRA"),
          date: String(l.date),
          status: String(l.status || "SCHEDULED"),
          notes: l.notes ? String(l.notes) : undefined,
          whatsappSentAt: l.whatsappSentAt ? String(l.whatsappSentAt) : undefined,
          teacherId: l.teacherId ? String(l.teacherId) : undefined,
          teacherName: l.teacherName ? String(l.teacherName) : undefined,
        }))
        .filter((l: LocalLesson) => {
          if (!isProfessorView) return true;
          if (!l.teacherId && !l.teacherName) return true; // sin asignar (legado) → visible
          if (sessionUserId && l.teacherId === sessionUserId) return true;
          if (sessionUserName && l.teacherName === sessionUserName) return true;
          return false;
        });
      setLocalLessons(todayLessons);
    } catch {}
  }, [isProfessorView, sessionUserId, sessionUserName]);

  const loadEduStudents = useCallback(() => {
    try {
      const raw = localStorage.getItem(getTenantStorageKey("edu_students"));
      if (!raw) return;
      const arr: any[] = JSON.parse(raw);
      setEduStudents(
        (Array.isArray(arr) ? arr : []).map((s: any) => ({
          id: String(s.id),
          contactId: s.contactId ? String(s.contactId) : undefined,
          contactName: String(s.contactName || s.name || "Alumno"),
          contactPhone: String(s.contactPhone || s.phone || ""),
          birthDate: s.birthDate ? String(s.birthDate) : undefined,
          tutorId: s.tutorId ? String(s.tutorId) : undefined,
          tutorName: s.tutorName ? String(s.tutorName) : undefined,
          tutorPhone: s.tutorPhone ? String(s.tutorPhone) : undefined,
          guardianRelation: s.guardianRelation ? String(s.guardianRelation) : undefined,
          commsMode: (s.commsMode === "STUDENT_ONLY" || s.commsMode === "BOTH" ? s.commsMode : "TUTOR_ONLY") as EduCommsMode,
        }))
      );
    } catch {}
  }, []);

  useEffect(() => {
    fetchGoogleEvents();
    loadLocalLessons();
    loadEduStudents();
  }, [fetchGoogleEvents, loadLocalLessons, loadEduStudents]);

  /** Resuelve destinatarios según ficha del alumno (Contact manda) o teléfono suelto de la clase. */
  const resolveRecipients = useCallback((lessonName: string, lessonPhone?: string): ReportRecipient[] => {
    const match = eduStudents.find((s) => s.contactName.toLowerCase() === lessonName.toLowerCase());
    const recs = getReportRecipients({
      student: {
        id: match?.contactId || match?.id || `local-${lessonName}`,
        name: match?.contactName || lessonName,
        phone: match?.contactPhone || lessonPhone,
      },
      tutor: match?.tutorName || match?.tutorPhone
        ? { id: match.tutorId || `tutor-${match.id}`, name: match.tutorName || "Tutor", phone: match.tutorPhone }
        : null,
      commsMode: match?.commsMode || "TUTOR_ONLY",
      tutorRelationLabel: match?.guardianRelation,
    });
    return recs;
  }, [eduStudents]);

  const openRecipients = (lessonName: string, lessonPhone?: string) => {
    const recs = resolveRecipients(lessonName, lessonPhone);
    setRecipients(recs);
    setSelectedRecipientIds(sendableRecipients(recs).map((r) => r.contactId));
  };

  const selectGcEvent = (ev: GoogleEvent) => {
    setSelectedEvent(ev);
    setSelectedLocal(null);
    setForm({ done: "", todo: "", attendance: true });
    openRecipients(ev.summary || "Alumno");
    setShowForm(true);
  };

  const selectLocal = (l: LocalLesson) => {
    setSelectedLocal(l);
    setSelectedEvent(null);
    setForm({ done: l.notes || "", todo: "", attendance: true });
    openRecipients(l.studentName, l.studentPhone);
    setShowForm(true);
  };

  const sendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.done.trim() && !form.todo.trim()) {
      alert("Escribe al menos qué se hizo o la tarea para la próxima clase.");
      return;
    }
    setSending(true);

    const lessonId = selectedLocal?.id || selectedEvent?.id || "gc-" + Date.now();
    const lessonName = selectedLocal?.studentName || selectedEvent?.summary || "Alumno";
    const instrument = selectedLocal?.instrument || "";
    // studentId real si la ficha existe en local (el servidor valida contra Prisma; 404 → solo fallback local)
    const matchedStudent = eduStudents.find((s) => s.contactName.toLowerCase() === lessonName.toLowerCase());

    const body =
      `*Clase de hoy — ${new Date().toLocaleDateString("es-ES")}*\n` +
      (instrument ? `🎸 Instrumento: ${instrument}\n` : "") +
      (form.done ? `✅ Lo que hemos hecho: ${form.done}\n` : "") +
      (form.todo ? `📌 Para la próxima clase: ${form.todo}\n` : "") +
      `\n¡Gracias!`;

    const chosen = recipients.filter((r) => selectedRecipientIds.includes(r.contactId) && r.toPhone && !r.warning);
    const fallbackTargets = chosen.length > 0 ? chosen : sendableRecipients(recipients);

    try {
      let cloudOk = false;
      try {
        const res = await fetch("/api/education/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: matchedStudent?.id || lessonId,
            lessonId,
            done: form.done,
            todo: form.todo,
            recipients: chosen.map((r) => ({ contactId: r.contactId, role: r.role })),
          }),
        });
        const data = await res.json().catch(() => null);
        // 404 = ficha aún solo en localStorage (sin Prisma): no es error, seguimos con wa.me
        cloudOk = res.ok && !!data?.success && (data?.sent ?? 0) > 0;
        if (!res.ok && res.status !== 404) throw new Error(data?.error || "Error enviando reporte");
      } catch (apiErr: any) {
        if (!String(apiErr?.message || "").includes("404") && !String(apiErr?.message || "").includes("Student not found")) throw apiErr;
      }

      if (selectedLocal) {
        const raw = localStorage.getItem(getTenantStorageKey("edu_lessons"));
        if (raw) {
          try {
            const arr: any[] = JSON.parse(raw);
            const updated = arr.map((l: any) =>
              String(l.id) === selectedLocal.id
                ? { ...l, notes: form.done, status: "COMPLETED", whatsappSentAt: new Date().toISOString() }
                : l
            );
            localStorage.setItem(getTenantStorageKey("edu_lessons"), JSON.stringify(updated));
            window.dispatchEvent(new Event("palmera_edu_lessons_updated"));
          } catch {}
        }
      }

      if (cloudOk) {
        setToast({ msg: `✅ Reporte enviado por WhatsApp Cloud API (${fallbackTargets.length} destinatario${fallbackTargets.length === 1 ? "" : "s"})`, ok: true });
      } else if (fallbackTargets.length > 0) {
        setToast({ msg: `📲 Abriendo WhatsApp (fallback wa.me) → ${fallbackTargets.length} chat${fallbackTargets.length === 1 ? "" : "s"}...`, ok: true });
        fallbackTargets.forEach((r, i) => {
          setTimeout(() => window.open(buildWaMeUrl(r.toPhone, body), "_blank"), i * 600);
        });
      } else {
        setToast({ msg: "✅ Reporte guardado (sin teléfono válido en alumno ni tutor)", ok: true });
      }
      setTimeout(() => setToast(null), 4000);

      loadLocalLessons();
    } catch (err: any) {
      setToast({ msg: "Error: " + (err?.message ?? "desconocido"), ok: false });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSending(false);
      setShowForm(false);
      setSelectedEvent(null);
      setSelectedLocal(null);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setSelectedEvent(null);
    setSelectedLocal(null);
  };

  const hasContent = gcEvents.length > 0 || localLessons.length > 0;

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-[200] rounded-2xl px-5 py-3 text-sm font-bold shadow-2xl border ${
            toast.ok
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-700"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Cabecera mínima (sin tarjeta: el título de página ya dice "tus clases de hoy") */}
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-sm font-black">
          <Icons.CalendarCheck className="h-4 w-4 text-red-500" />
          Clases de hoy
        </h2>
        <button
          onClick={() => { fetchGoogleEvents(); loadLocalLessons(); loadEduStudents(); }}
          disabled={gcLoading}
          className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-background px-3 py-2 text-xs font-bold hover:bg-muted disabled:opacity-50"
        >
          <Icons.RefreshCw className={`h-3.5 w-3.5 ${gcLoading ? "animate-spin" : ""}`} />
          {gcLoading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {/* Google Calendar events */}
      {gcEvents.length > 0 && (
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700 dark:text-sky-400">
            <Icons.Calendar className="h-4 w-4" />
            Google Calendar — eventos del día ({gcEvents.length})
          </div>
          <div className="space-y-2">
            {gcEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => selectGcEvent(ev)}
                className="w-full rounded-2xl border border-border/40 bg-card p-4 text-left flex items-center justify-between gap-3 hover:border-red-500/40 hover:bg-red-500/5 transition group"
              >
                <div>
                  <div className="text-sm font-bold group-hover:text-red-600 transition">
                    {ev.summary || "Clase sin título"}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <Icons.Clock3 className="h-3.5 w-3.5" />
                    {fmtTime(ev.start?.dateTime)} – {fmtTime(ev.end?.dateTime)}
                    {ev.description && <span className="truncate max-w-[180px]">· {ev.description}</span>}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 rounded-xl bg-foreground text-background px-3 py-2 text-xs font-bold opacity-80 group-hover:opacity-100 transition">
                  <Icons.ClipboardPen className="h-3.5 w-3.5" />
                  Finalizar
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Google Calendar error/warning */}
      {gcError && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <Icons.AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>Google Calendar:</strong> {gcError} — usando agenda interna de Palmera.
          </span>
        </div>
      )}

      {/* Local lessons */}
      {localLessons.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Icons.CalendarDays className="h-4 w-4" />
            Agenda Palmera — clases programadas hoy ({localLessons.length})
          </div>
          <div className="space-y-2">
            {localLessons.map((l) => (
              <button
                key={l.id}
                onClick={() => !l.whatsappSentAt && selectLocal(l)}
                disabled={!!l.whatsappSentAt}
                className={`w-full rounded-2xl border p-4 text-left flex items-center justify-between gap-3 transition group ${
                  l.whatsappSentAt
                    ? "border-emerald-500/20 bg-emerald-500/5 opacity-70 cursor-default"
                    : "border-border/40 bg-background hover:border-red-500/40 hover:bg-red-500/5"
                }`}
              >
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    {l.studentName}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{l.instrument}</span>
                    {l.whatsappSentAt && (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        ✓ Enviado
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <Icons.Clock3 className="h-3.5 w-3.5" />
                    {fmtTime(l.date)} · {l.status}
                    {l.studentPhone && <span>· {l.studentPhone}</span>}
                  </div>
                </div>
                {!l.whatsappSentAt && (
                  <div className="shrink-0 flex items-center gap-1.5 rounded-xl bg-foreground text-background px-3 py-2 text-xs font-bold opacity-80 group-hover:opacity-100 transition">
                    <Icons.Send className="h-3.5 w-3.5" />
                    Finalizar
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!gcLoading && !hasContent && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
          <Icons.CalendarX className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm font-bold text-muted-foreground">Sin clases programadas hoy</p>
          <p className="text-xs text-muted-foreground">
            Conecta Google Calendar con <code className="font-mono text-[10px]">GOOGLE_SERVICE_ACCOUNT_JSON</code> o crea slots en la Agenda.
          </p>
        </div>
      )}

      {/* Report form modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
          <form
            onSubmit={sendReport}
            className="w-full max-w-lg rounded-t-[2rem] md:rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-auto"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Icons.ClipboardPen className="h-3.5 w-3.5" />
                  Resumen de clase
                </div>
                <h3 className="text-base font-black mt-0.5">
                  {selectedLocal?.studentName || selectedEvent?.summary || "Clase"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedLocal
                    ? `${fmtTime(selectedLocal.date)} · ${selectedLocal.instrument}`
                    : `${fmtTime(selectedEvent?.start?.dateTime)}`}
                </p>
              </div>
              <button type="button" onClick={closeForm} className="p-2 rounded-xl hover:bg-muted">
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            <label className="block text-xs font-bold">
              ✅ ¿Qué se ha hecho hoy?
              <textarea
                value={form.done}
                onChange={(e) => setForm({ ...form, done: e.target.value })}
                placeholder="Ej. Acordes Do, Re, Mi — repaso ritmo 4/4, subimos tempo de 80 a 90 bpm..."
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
            </label>

            <label className="block text-xs font-bold">
              📌 Tarea para la próxima clase
              <textarea
                value={form.todo}
                onChange={(e) => setForm({ ...form, todo: e.target.value })}
                placeholder="Ej. Practicar escala pentatónica mínimo 15 min al día, escuchar la canción X..."
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
            </label>

            <div
              onClick={() => setForm({ ...form, attendance: !form.attendance })}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              <div className={`relative h-6 w-10 rounded-full transition ${form.attendance ? "bg-red-500" : "bg-muted"}`}>
                <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${form.attendance ? "left-5" : "left-1"}`} />
              </div>
              <span className="text-xs font-bold">Asistencia confirmada</span>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Icons.MessageCircle className="h-4 w-4 text-emerald-600" />
                Destinatarios WhatsApp (según ficha del alumno)
              </div>
              {recipients.length === 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs flex items-center gap-2 text-amber-700">
                  <Icons.AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Sin teléfono en alumno ni tutor — el reporte se guardará pero no se enviará.</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {recipients.map((r) => {
                  const active = selectedRecipientIds.includes(r.contactId) && !r.warning;
                  return (
                    <button
                      key={r.contactId}
                      type="button"
                      disabled={!!r.warning || !r.toPhone}
                      onClick={() =>
                        setSelectedRecipientIds((prev) =>
                          prev.includes(r.contactId) ? prev.filter((id) => id !== r.contactId) : [...prev, r.contactId]
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        r.warning || !r.toPhone
                          ? "border-amber-500/30 bg-amber-500/5 text-amber-700 opacity-70 cursor-not-allowed"
                          : active
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                          : "border-border/40 bg-background text-muted-foreground"
                      }`}
                      title={r.warning || r.toPhone}
                    >
                      {r.role === "GUARDIAN" ? "👨‍👩‍👧 " : "🎸 "}{r.label}{r.warning ? " · sin teléfono" : ""}
                    </button>
                  );
                })}
              </div>
              {recipients.some((r) => r.warning) && (
                <p className="text-[11px] text-amber-700">Completa el teléfono en Contactos o en la ficha del alumno para activar ese destinatario.</p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-border/40 bg-background px-4 py-3 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={sending || (!form.done.trim() && !form.todo.trim())}
                className="flex-1 rounded-xl bg-foreground text-background px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition"
              >
                {sending ? (
                  <><Icons.Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Icons.Send className="h-4 w-4" /> Enviar reporte por WhatsApp</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
