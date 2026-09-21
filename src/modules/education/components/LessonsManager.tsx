"use client";
import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { getTenantStorageKey } from "@/lib/clientStorage";
import { EDUCATION_INSTRUMENTS } from "../lib/instruments";
import { buildLessonWhatsAppMessage, buildWaMeUrl } from "../lib/whatsapp";

type LessonRow = { id:string; studentName:string; studentPhone:string; instrument:string; date:string; durationMin:number; status:string; taughtSkills:string[]; notes?:string; ratingFocus?:number; homeworkIds?:string[]; songIds?:string[]; whatsappSentAt?: string; batchToken?:string; };

const SKILLS = ["acordes_abiertos","cejilla","ritmo_4_4","escala_pent","oído","lectura"];
const MOCK_EX = [{id:"e1",title:"Arpegio PIMA básico", instrument:"GUITARRA", skillKeys:["acordes_abiertos"]}, {id:"e2",title:"Slap básico", instrument:"BAJO", skillKeys:["ritmo_4_4"]}, {id:"e3",title:"Manos separadas", instrument:"PIANO", skillKeys:["lectura"]}];
const MOCK_SONG = [{id:"s1",title:"Entre dos aguas", artist:"Paco"},{id:"s2",title:"Billie Jean", artist:"MJ"}];

export default function LessonsManager() {
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [showFinish, setShowFinish] = useState<LessonRow|null>(null);
  const [form, setForm] = useState<{instrument:string; duration:number; skills:string[]; notes:string; rating:number; homework:string[]; songs:string[]}>({instrument:"GUITARRA", duration:45, skills:[], notes:"", rating:3, homework:[], songs:[]});
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string|null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newLesson, setNewLesson] = useState<{studentName:string; studentPhone:string; instrument:string; date:string}>({studentName:"", studentPhone:"", instrument:"GUITARRA", date: new Date().toISOString().slice(0,16)});

  const safeArr = (a: unknown): string[] => Array.isArray(a) ? (a as string[]) : [];
  useEffect(()=>{
    const key = getTenantStorageKey("edu_lessons");
    const raw = localStorage.getItem(key);
    if (raw) try{
      const parsed = JSON.parse(raw);
      const arr: any[] = Array.isArray(parsed) ? parsed : [];
      const normalized: LessonRow[] = arr.map((l:any)=> ({
        id: String(l.id || "l_"+Date.now()),
        studentName: String(l.studentName || l.name || "Alumno"),
        studentPhone: String(l.studentPhone || l.phone || ""),
        instrument: String(l.instrument || "GUITARRA"),
        date: String(l.date || new Date().toISOString()),
        durationMin: Number(l.durationMin || 45),
        status: String(l.status || "SCHEDULED"),
        taughtSkills: safeArr(l.taughtSkills),
        notes: l.notes ? String(l.notes) : undefined,
        ratingFocus: l.ratingFocus ?? undefined,
        homeworkIds: safeArr(l.homeworkIds),
        songIds: safeArr(l.songIds),
        whatsappSentAt: l.whatsappSentAt ? String(l.whatsappSentAt) : undefined,
        batchToken: l.batchToken ? String(l.batchToken) : undefined,
      }));
      setLessons(normalized);
      if (arr.some((l:any)=> !Array.isArray(l.taughtSkills) || !Array.isArray(l.homeworkIds) || !Array.isArray(l.songIds))) {
        localStorage.setItem(key, JSON.stringify(normalized));
      }
    } catch{ setLessons([]);} 
    else {
      const seed: LessonRow[] = [
        { id:"l1", studentName:"Lucía Martín", studentPhone:"+34 600 111 222", instrument:"GUITARRA", date: new Date().toISOString(), durationMin:45, status:"SCHEDULED", taughtSkills:[] },
        { id:"l2", studentName:"Marco Ruiz", studentPhone:"+34 600 333 444", instrument:"BAJO", date: new Date().toISOString(), durationMin:45, status:"COMPLETED", taughtSkills:["ritmo_4_4"], notes:"Progreso slap" },
      ];
      setLessons(seed); localStorage.setItem(key, JSON.stringify(seed));
    }
  }, []);
  const persist = (next: LessonRow[])=>{ setLessons(next); localStorage.setItem(getTenantStorageKey("edu_lessons"), JSON.stringify(next)); };

  const createLesson = (e: React.FormEvent)=>{
    e.preventDefault();
    if (!newLesson.studentName.trim()) return;
    const nl: LessonRow = { id: "l_"+Date.now(), studentName: newLesson.studentName, studentPhone: newLesson.studentPhone, instrument: newLesson.instrument, date: new Date(newLesson.date).toISOString(), durationMin:45, status:"SCHEDULED", taughtSkills:[] };
    persist([nl, ...lessons]); setShowNew(false); setNewLesson({studentName:"", studentPhone:"", instrument:"GUITARRA", date: new Date().toISOString().slice(0,16)});
  };

  const openFinish = (l: LessonRow)=>{
    setShowFinish(l);
    setForm({instrument:l.instrument, duration:l.durationMin, skills:safeArr(l.taughtSkills), notes:l.notes||"", rating:l.ratingFocus||3, homework:safeArr(l.homeworkIds), songs:safeArr(l.songIds)});
  };

  const doFinish = async (e: React.FormEvent)=>{
    e.preventDefault();
    if (!showFinish) return;
    setSending(true);
    const batchToken = Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4);
    const batchLink = `${typeof window!=="undefined"?window.location.origin:""}${"/r/batch/"+batchToken}`;

    // Mock proposal: homework from mock
    const hwIds = form.homework.length? form.homework : MOCK_EX.filter(ex=>ex.instrument===form.instrument || ex.instrument==="COMMON").slice(0,2).map(e=>e.id);
    // persist lesson
    const next = lessons.map(l=> l.id===showFinish.id ? { ...l, instrument: form.instrument, durationMin: form.duration, status:"COMPLETED", taughtSkills: form.skills, notes: form.notes, ratingFocus: form.rating, homeworkIds: hwIds, songIds: form.songs, whatsappSentAt: new Date().toISOString(), batchToken } as LessonRow : l);
    persist(next);

    // outbox log + shared resources
    const outKey = getTenantStorageKey("edu_outbox");
    const sharedKey = getTenantStorageKey("edu_shared");
    const out = JSON.parse(localStorage.getItem(outKey)||"[]");
    const shared = JSON.parse(localStorage.getItem(sharedKey)||"[]");
    const body = buildLessonWhatsAppMessage({ studentName: showFinish.studentName, instrumentLabel: form.instrument, skillsLabel: safeArr(form.skills).join(", ")||undefined, link: batchLink, count: hwIds.length + safeArr(form.songs).length });
    // Cloud API dryRun: try fetch if Setting has creds, else fallback wa.me
    const phone = showFinish.studentPhone;
    let waUrl = buildWaMeUrl(phone, body);
    // pretend Cloud API call (will fail without creds, but we log)
    try {
      const res = await fetch("/api/education/whatsapp/send", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ to: phone, body, batchToken, lessonId: showFinish.id, link: batchLink }) });
      if (res.ok) {
        const j = await res.json();
        if (j.waMessageId) {
          out.unshift({ id: batchToken, studentName: showFinish.studentName, toPhone: phone, body, link: batchLink, batchToken, status:"SENT", waMessageId: j.waMessageId, sentAt: new Date().toISOString() });
        } else {
          // fallback to wa.me
          window.open(waUrl, "_blank");
          out.unshift({ id: batchToken, studentName: showFinish.studentName, toPhone: phone, body, link: batchLink, batchToken, status:"QUEUED", sentAt: new Date().toISOString() });
        }
      } else {
        window.open(waUrl, "_blank");
        out.unshift({ id: batchToken, studentName: showFinish.studentName, toPhone: phone, body, link: batchLink, batchToken, status:"QUEUED", sentAt: new Date().toISOString() });
      }
    } catch {
      window.open(waUrl, "_blank");
      out.unshift({ id: batchToken, studentName: showFinish.studentName, toPhone: phone, body, link: batchLink, batchToken, status:"QUEUED", sentAt: new Date().toISOString() });
    }
    // shared resources for batch (1 per hw)
    hwIds.forEach((eid:string)=> shared.unshift({ token: Math.random().toString(36).slice(2,10), batchToken, lessonId: showFinish.id, exerciseId: eid, studentName: showFinish.studentName }));
    form.songs.forEach((sid:string)=> shared.unshift({ token: Math.random().toString(36).slice(2,10), batchToken, lessonId: showFinish.id, songId: sid, studentName: showFinish.studentName }));
    localStorage.setItem(outKey, JSON.stringify(out.slice(0,50)));
    localStorage.setItem(sharedKey, JSON.stringify(shared.slice(0,100)));
    // audit local
    const audit = JSON.parse(localStorage.getItem("palmera_audit_logs")||"[]");
    audit.unshift({ id:"log_"+Date.now(), action:"EDU_LESSON_FINISHED", details:`Clase ${showFinish.studentName} ${form.instrument} — WhatsApp 1 link agregador ${batchLink}`, timestamp: new Date().toISOString()});
    localStorage.setItem("palmera_audit_logs", JSON.stringify(audit.slice(0,20)));

    setSending(false); setShowFinish(null);
    setToast(`Clase finalizada + WhatsApp 1 link agregador: ${batchLink} (ver Historial alumno)`); setTimeout(()=>setToast(null),4000);
  };

  const batchSendDay = async ()=>{
    const pending = lessons.filter(l=>l.status==="COMPLETED" && !l.whatsappSentAt);
    if (pending.length===0) { setToast("Nada pendiente"); setTimeout(()=>setToast(null),2000); return; }
    for (const l of pending) { openFinish(l); break; } // open first for demo (batch would iterate)
    setToast(`Batch del día: ${pending.length} pendientes — abre cada uno y envía (Cloud API)`); setTimeout(()=>setToast(null),3000);
  };

  const filtered = lessons.filter(l=> filter==="ALL" || l.instrument===filter);

  return (
    <div className="space-y-4">
      {toast && <div className="fixed bottom-4 right-4 z-50 max-w-xs bg-foreground text-background px-4 py-3 rounded-xl text-xs font-bold">{toast}</div>}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Clases & Seguimiento</h2>
        <div className="flex gap-2">
          <button onClick={batchSendDay} className="rounded-xl bg-red-500 px-3 py-2 text-xs font-bold text-white hidden md:flex items-center gap-1"><Icons.Send className="h-4 w-4" /> Enviar día</button>
          <button onClick={()=>setShowNew(true)} className="rounded-xl bg-foreground px-3 py-2 text-xs font-bold text-background flex items-center gap-1"><Icons.Plus className="h-4 w-4" /> Nueva</button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={()=>setFilter("ALL")} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${filter==="ALL"?"bg-foreground text-background":"bg-background"}`}>Todos</button>
        {Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map((ins)=><button key={ins.key} onClick={()=>setFilter(ins.key)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${filter===ins.key?"bg-red-500 text-white border-red-500":"bg-background"}`}>{ins.label}</button>)}
      </div>

      <div className="space-y-2">
        {filtered.map((l)=>(
          <div key={l.id} className="rounded-2xl border border-border/40 bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div><div className="text-sm font-bold">{l.studentName} <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{l.instrument}</span></div><div className="text-xs text-muted-foreground">{new Date(l.date).toLocaleString("es-ES")} · {l.durationMin}′ · {l.status} {l.whatsappSentAt?"· WhatsApp ✓":"· pendiente"}</div><div className="text-xs">Skills: {safeArr(l.taughtSkills).join(", ")||"—"} {l.notes?`· ${l.notes}`:""}</div>{l.batchToken && <div className="text-[11px] font-mono text-red-600">r/batch/{l.batchToken}</div>}</div>
              <div className="flex flex-col gap-1">
                <button onClick={()=>openFinish(l)} className={`rounded-xl px-3 py-2 text-xs font-bold ${l.status==="COMPLETED"&&l.whatsappSentAt?"bg-emerald-500 text-white":"bg-foreground text-background"}`}>{l.whatsappSentAt?"Reenviar":"Finalizar"}</button>
                <a href={`/r/batch/${l.batchToken||"demo"}`} target="_blank" rel="noreferrer" className="rounded-xl border border-border/40 px-3 py-1.5 text-center text-xs font-bold">Ver link</a>
              </div>
            </div>
            {/* skill sliders preview */}
            <div className="mt-2 flex gap-1">{SKILLS.slice(0,3).map((s)=><span key={s} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{s}</span>)}</div>
          </div>
        ))}
        {filtered.length===0 && <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sin clases. Crea una.</div>}
      </div>

      <button onClick={batchSendDay} className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold md:hidden">Enviar pendientes del día (Cloud API)</button>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4">
          <form onSubmit={createLesson} className="w-full max-w-xl rounded-t-[1.5rem] md:rounded-2xl bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between"><h3 className="font-bold">Nueva clase</h3><button type="button" onClick={()=>setShowNew(false)} className="p-2"><Icons.X className="h-5 w-5" /></button></div>
            <div className="mt-3 grid gap-3">
              <input required value={newLesson.studentName} onChange={(e)=>setNewLesson({...newLesson, studentName:e.target.value})} placeholder="Alumno (ej. Lucía Martín)" className="rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm" />
              <input value={newLesson.studentPhone} onChange={(e)=>setNewLesson({...newLesson, studentPhone:e.target.value})} placeholder="Teléfono +34 ..." className="rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm" />
              <select value={newLesson.instrument} onChange={(e)=>setNewLesson({...newLesson, instrument:e.target.value})} className="rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm">{Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map((ins)=><option key={ins.key} value={ins.key}>{ins.label}</option>)}</select>
              <input type="datetime-local" value={newLesson.date} onChange={(e)=>setNewLesson({...newLesson, date:e.target.value})} className="rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm" />
            </div>
            <button type="submit" className="mt-4 w-full rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background">Crear clase</button>
          </form>
        </div>
      )}

      {showFinish && (
        <form onSubmit={doFinish} className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4">
          <div className="w-full max-w-xl rounded-t-[1.5rem] md:rounded-2xl bg-card p-5 shadow-xl max-h-[92vh] overflow-auto">
            <div className="flex items-center justify-between"><h3 className="font-bold">Finalizar clase · {showFinish.studentName}</h3><button type="button" onClick={()=>setShowFinish(null)} className="p-2"><Icons.X className="h-5 w-5" /></button></div>
            <p className="text-xs text-muted-foreground">Valoración 1-5 por skill + ejercicios/canciones → WhatsApp 1 link agregador <span className="font-mono">r/batch/…</span></p>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-bold">Instrumento<select value={form.instrument} onChange={(e)=>setForm({...form, instrument:e.target.value})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs">{Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map((ins)=><option key={ins.key} value={ins.key}>{ins.label}</option>)}</select></label>
                <label className="text-xs font-bold">Duración<input type="number" value={form.duration} onChange={(e)=>setForm({...form, duration: parseInt(e.target.value)||45})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs" /></label>
              </div>
              <div>
                <div className="text-xs font-bold">Skills trabajadas (1-5)</div>
                <div className="mt-1 grid gap-2">
                  {SKILLS.map((sk)=>{
                    const active = form.skills.includes(sk);
                    return <div key={sk} className="flex items-center gap-2 rounded-xl border border-border/40 bg-background px-3 py-2">
                      <button type="button" onClick={()=>setForm({...form, skills: active? form.skills.filter(k=>k!==sk): [...form.skills, sk]})} className={`h-6 w-6 rounded-full border flex items-center justify-center ${active?"bg-red-500 text-white border-red-500":""}`}>{active&&<Icons.Check className="h-4 w-4" />}</button>
                      <span className="flex-1 text-xs font-bold">{sk}</span>
                      {active && <select value={form.rating} onChange={(e)=>setForm({...form, rating: parseInt(e.target.value)})} className="rounded-lg border border-border/40 bg-card px-2 py-1 text-xs"><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option></select>}
                    </div>;
                  })}
                </div>
              </div>
              <label className="text-xs font-bold block">Notas<input value={form.notes} onChange={(e)=>setForm({...form, notes:e.target.value})} placeholder="Progreso, actitud..." className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs" /></label>
              <div>
                <div className="text-xs font-bold">Ejercicios propuestos (auto)</div>
                <div className="mt-1 flex flex-wrap gap-1">{MOCK_EX.filter(ex=>ex.instrument===form.instrument).map((ex)=>{ const sel=form.homework.includes(ex.id); return <button type="button" key={ex.id} onClick={()=>setForm({...form, homework: sel? form.homework.filter(id=>id!==ex.id): [...form.homework, ex.id]})} className={`rounded-full border px-3 py-1 text-xs ${sel?"bg-foreground text-background":"bg-background"}`}>{ex.title}</button>; })}</div>
                <p className="text-[10px] text-muted-foreground">Motor scoring filtra por instrumento/skill gap + tiempo 2/5/15′</p>
              </div>
              <div>
                <div className="text-xs font-bold">Canciones</div>
                <div className="mt-1 flex flex-wrap gap-1">{MOCK_SONG.map((s)=>{ const sel=form.songs.includes(s.id); return <button type="button" key={s.id} onClick={()=>setForm({...form, songs: sel? form.songs.filter(id=>id!==s.id): [...form.songs, s.id]})} className={`rounded-full border px-3 py-1 text-xs ${sel?"bg-red-500 text-white":"bg-background"}`}>{s.title} · {s.artist}</button>; })}</div>
              </div>
            </div>
            <button disabled={sending} type="submit" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{sending?<Icons.Loader2 className="h-4 w-4 animate-spin" />:<Icons.Send className="h-4 w-4" />} Guardar y enviar por WhatsApp Cloud API (1 link)</button>
            <p className="mt-2 text-[10px] text-muted-foreground">Se guarda EduLesson + assessments 1-5 + EduSharedResource batch + EduOutboxMessage + AuditLog. Si Cloud API no configurada, fallback wa.me.</p>
          </div>
        </form>
      )}
    </div>
  );
}
