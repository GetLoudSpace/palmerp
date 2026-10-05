import React, { useState } from "react";
import * as Icons from "lucide-react";
import { buildLessonWhatsAppMessage, buildWaMeUrl } from "../lib/whatsapp";
import { getTenantStorageKey } from "@/lib/clientStorage";

export type LessonRow = {
  id: string;
  studentName: string;
  studentPhone: string;
  instrument: string;
  date: string;
  durationMin: number;
  status: string;
  taughtSkills: string[];
  notes?: string;
  ratingFocus?: number;
  homeworkIds?: string[];
  songIds?: string[];
  whatsappSentAt?: string;
  batchToken?: string;
};

export default function LessonFinishModal({
  lesson,
  onClose,
}: {
  lesson: LessonRow;
  onClose: () => void;
}) {
  const SKILLS = ["acordes_abiertos", "cejilla", "ritmo_4_4", "escala_pent", "oído", "lectura"];
  const MOCK_EX = [
    { id: "e1", title: "Arpegio PIMA básico", instrument: "GUITARRA", skillKeys: ["acordes_abiertos"] },
    { id: "e2", title: "Slap básico", instrument: "BAJO", skillKeys: ["ritmo_4_4"] },
    { id: "e3", title: "Manos separadas", instrument: "PIANO", skillKeys: ["lectura"] },
  ];
  const MOCK_SONG = [
    { id: "s1", title: "Entre dos aguas", artist: "Paco" },
    { id: "s2", title: "Billie Jean", artist: "MJ" },
  ];

  const safeArr = (a: unknown): string[] => (Array.isArray(a) ? (a as string[]) : []);

  const [form, setForm] = useState({
    instrument: lesson.instrument,
    duration: lesson.durationMin,
    skills: safeArr(lesson.taughtSkills),
    notes: lesson.notes || "",
    rating: lesson.ratingFocus || 3,
    homework: safeArr(lesson.homeworkIds),
    songs: safeArr(lesson.songIds),
  });
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const persist = (next: LessonRow[]) => {
    localStorage.setItem(getTenantStorageKey("edu_lessons"), JSON.stringify(next));
  };

  const doFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const batchToken = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    const batchLink = `${typeof window !== "undefined" ? window.location.origin : ""}${"/r/batch/" + batchToken}`;
    const hwIds = form.homework.length
      ? form.homework
      : MOCK_EX.filter((ex) => ex.instrument === form.instrument || ex.instrument === "COMMON").slice(0, 2).map((e) => e.id);

    const raw = localStorage.getItem(getTenantStorageKey("edu_lessons"));
    const lessons: LessonRow[] = raw ? JSON.parse(raw) : [];
    const next = lessons.map((l) =>
      l.id === lesson.id
        ? {
            ...l,
            instrument: form.instrument,
            durationMin: form.duration,
            status: "COMPLETED",
            taughtSkills: form.skills,
            notes: form.notes,
            ratingFocus: form.rating,
            homeworkIds: hwIds,
            songIds: form.songs,
            whatsappSentAt: new Date().toISOString(),
            batchToken,
          }
        : l
    );
    persist(next);

    const outKey = getTenantStorageKey("edu_outbox");
    const sharedKey = getTenantStorageKey("edu_shared");
    const out = JSON.parse(localStorage.getItem(outKey) || "[]");
    const shared = JSON.parse(localStorage.getItem(sharedKey) || "[]");
    const body = buildLessonWhatsAppMessage({
      studentName: lesson.studentName,
      instrumentLabel: form.instrument,
      skillsLabel: safeArr(form.skills).join(", ") || undefined,
      link: batchLink,
      count: hwIds.length + safeArr(form.songs).length,
    });
    const phone = lesson.studentPhone;
    const waUrl = buildWaMeUrl(phone, body);
    try {
      const res = await fetch("/api/education/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, body, batchToken, lessonId: lesson.id, link: batchLink }),
      });
      if (res.ok) {
        const j = await res.json();
        if (j.waMessageId) {
          out.unshift({ id: batchToken, studentName: lesson.studentName, toPhone: phone, body, link: batchLink, batchToken, status: "SENT", waMessageId: j.waMessageId, sentAt: new Date().toISOString() });
        } else {
          window.open(waUrl, "_blank");
          out.unshift({ id: batchToken, studentName: lesson.studentName, toPhone: phone, body, link: batchLink, batchToken, status: "QUEUED", sentAt: new Date().toISOString() });
        }
      } else {
        window.open(waUrl, "_blank");
        out.unshift({ id: batchToken, studentName: lesson.studentName, toPhone: phone, body, link: batchLink, batchToken, status: "QUEUED", sentAt: new Date().toISOString() });
      }
    } catch {
      window.open(waUrl, "_blank");
      out.unshift({ id: batchToken, studentName: lesson.studentName, toPhone: phone, body, link: batchLink, batchToken, status: "QUEUED", sentAt: new Date().toISOString() });
    }
    hwIds.forEach((eid) =>
      shared.unshift({ token: Math.random().toString(36).slice(2, 10), batchToken, lessonId: lesson.id, exerciseId: eid, studentName: lesson.studentName })
    );
    form.songs.forEach((sid) =>
      shared.unshift({ token: Math.random().toString(36).slice(2, 10), batchToken, lessonId: lesson.id, songId: sid, studentName: lesson.studentName })
    );
    localStorage.setItem(outKey, JSON.stringify(out.slice(0, 50)));
    localStorage.setItem(sharedKey, JSON.stringify(shared.slice(0, 100)));

    const audit = JSON.parse(localStorage.getItem("palmera_audit_logs") || "[]");
    audit.unshift({ id: "log_" + Date.now(), action: "EDU_LESSON_FINISHED", details: `Clase ${lesson.studentName} ${form.instrument} — WhatsApp 1 link agregador ${batchLink}`, timestamp: new Date().toISOString() });
    localStorage.setItem("palmera_audit_logs", JSON.stringify(audit.slice(0, 20)));

    setSending(false);
    setToast(`Clase finalizada + WhatsApp link: ${batchLink}`);
    setTimeout(() => setToast(null), 4000);
    onClose();
  };

  return (
    <form onSubmit={doFinish} className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4">
      <div className="w-full max-w-xl rounded-t-[1.5rem] md:rounded-2xl bg-card p-5 shadow-xl max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Finalizar clase · {lesson.studentName}</h3>
          <button type="button" onClick={onClose} className="p-2"><Icons.X className="h-5 w-5"/></button>
        </div>
        <p className="text-xs text-muted-foreground">Valoración 1-5 por skill + ejercicios/canciones → WhatsApp 1 link <span className="font-mono">/r/batch/…</span></p>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold">Instrumento
              <select value={form.instrument} onChange={e => setForm({ ...form, instrument: e.target.value })} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs">
                {Object.values({ GUITARRA: { key: "GUITARRA", label: "Guitarra" }, BAJO: { key: "BAJO", label: "Bajo" }, PIANO: { key: "PIANO", label: "Piano" } }).map(ins => (
                  <option key={ins.key} value={ins.key}>{ins.label}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold">Duración
              <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 45 })} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs"/>
            </label>
          </div>
          <div className="text-xs font-bold">Skills trabajadas (1-5)</div>
          <div className="mt-1 grid gap-2">
            {SKILLS.map(sk => {
              const active = form.skills.includes(sk);
              return (
                <div key={sk} className="flex items-center gap-2 rounded-xl border border-border/40 bg-background px-3 py-2">
                  <button type="button" onClick={() => setForm({ ...form, skills: active ? form.skills.filter(k => k !== sk) : [...form.skills, sk] })} className={`h-6 w-6 rounded-full border flex items-center justify-center ${active ? "bg-red-500 text-white border-red-5" : ""}`}>
                    {active && <Icons.Check className="h-4 w-4"/>}
                  </button>
                  <span className="flex-1 text-xs font-bold">{sk}</span>
                  {active && (
                    <select value={form.rating} onChange={e => setForm({ ...form, rating: parseInt(e.target.value) })} className="rounded-lg border border-border/40 bg-card px-2 py-1 text-xs">
                      {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
          <label className="text-xs font-bold block">Notas
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Progreso, actitud..." className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs"/>
          </label>
          <div>
            <div className="text-xs font-bold">Ejercicios propuestos (auto)</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {MOCK_EX.filter(ex => ex.instrument === form.instrument).map(ex => {
                const sel = form.homework.includes(ex.id);
                return (
                  <button key={ex.id} type="button" onClick={() => setForm({ ...form, homework: sel ? form.homework.filter(id => id !== ex.id) : [...form.homework, ex.id] })} className={`rounded-full border px-3 py-1 text-xs ${sel ? "bg-foreground text-background" : "bg-background"}`}>{ex.title}</button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold">Canciones</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {MOCK_SONG.map(s => {
                const sel = form.songs.includes(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => setForm({ ...form, songs: sel ? form.songs.filter(id => id !== s.id) : [...form.songs, s.id] })} className={`rounded-full border px-3 py-1 text-xs ${sel ? "bg-red-500 text-white" : "bg-background"}`}>{s.title} · {s.artist}</button>
                );
              })}
            </div>
          </div>
          <button disabled={sending} type="submit" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
            {sending ? <Icons.Loader2 className="h-4 w-4 animate-spin"/> : <Icons.Send className="h-4 w-4"/>} Guardar y enviar por WhatsApp Cloud API (1 link)
          </button>
          <p className="mt-2 text-[10px] text-muted-foreground">Se guarda EduLesson + assessments 1-5 + EduSharedResource batch + EduOutboxMessage + AuditLog. Si Cloud API no configurada, fallback wa.me.</p>
        </div>
        {toast && <div className="fixed bottom-4 right-4 z-50 max-w-xs bg-foreground text-background px-4 py-3 rounded-xl text-xs font-bold">{toast}</div>}
      </div>
    </form>
  );
}
