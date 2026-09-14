"use client";
import React, { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { getTenantStorageKey, getTenantSlugClient } from "@/lib/clientStorage";
import { EDUCATION_INSTRUMENTS } from "../lib/instruments";
import { buildGoogleEventFromLesson } from "../lib/googleCalendar";

type Room = { id:string; name:string; color?:string };
type UserRef = { id:string; name:string };
type StudentRef = { id:string; name:string; instrument?:string };

type LessonAgenda = {
  id:string; studentId?:string; studentName:string; studentPhone?:string;
  instrument:string; date:string; durationMin:number; status:string;
  teacherId?:string; teacherName?:string;
  roomId?:string; roomName?:string;
  taughtSkills:string[]; notes?:string; nextGoals?:string;
  homeworkIds?:string[]; songIds?:string[];
  googleEventId?:string; googleCalendarId?:string; googleSyncStatus?:string;
  batchToken?:string;
};

const HOURS = Array.from({length: 14}, (_,i)=> 8+i); // 8..21

function startOfWeek(d: Date){ const date=new Date(d); const day=date.getDay(); const diff=date.getDate()-day+(day===0?-6:1); date.setDate(diff); date.setHours(0,0,0,0); return date; }
function addDays(d:Date,n:number){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function sameDay(a:Date,b:Date){ return a.toDateString()===b.toDateString(); }
function fmtDay(d:Date){ return d.toLocaleDateString("es-ES",{weekday:"short", day:"2-digit", month:"short"}); }
function fmtHour(h:number){ return `${String(h).padStart(2,"0")}:00`; }

export default function EducationAgenda({ onSelectLesson }: { onSelectLesson?: (l:LessonAgenda)=>void }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<StudentRef[]>([]);
  const [users, setUsers] = useState<UserRef[]>([]);
  const [lessons, setLessons] = useState<LessonAgenda[]>([]);
  const [view, setView] = useState<"week"|"day">("week");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [filterRoom, setFilterRoom] = useState<string>("ALL");
  const [filterTeacher, setFilterTeacher] = useState<string>("ALL");
  const [filterInstrument, setFilterInstrument] = useState<string>("ALL");
  const [showSlot, setShowSlot] = useState<{date:string; hour:number} | null>(null);
  const [editing, setEditing] = useState<LessonAgenda|null>(null);
  const [form, setForm] = useState<{studentId:string; instrument:string; teacherId:string; roomId:string; hour:number; minute:number; duration:number; notes:string}>({ studentId:"", instrument:"GUITARRA", teacherId:"", roomId:"", hour: 10, minute:0, duration:45, notes:""});
  const [showRoomMgr, setShowRoomMgr] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [toast, setToast] = useState<string|null>(null);

  const weekStart = useMemo(()=> startOfWeek(cursor), [cursor]);
  const days = useMemo(()=> view==="week" ? Array.from({length:7},(_,i)=> addDays(weekStart,i)) : [new Date(cursor)], [weekStart, view, cursor]);

  const loadAll = () => {
    const rk = getTenantStorageKey("edu_rooms");
    const sk = getTenantStorageKey("edu_students");
    const lk = getTenantStorageKey("edu_lessons");
    const ukRaw = localStorage.getItem(`palmera_users_${getTenantSlugClient()}`) || localStorage.getItem(getTenantStorageKey("edu_users"));
    const roomRaw = localStorage.getItem(rk);
    const studRaw = localStorage.getItem(sk);
    const lessRaw = localStorage.getItem(lk);

    let r: Room[] = [];
    if (roomRaw) try{ r=JSON.parse(roomRaw); } catch{}
    if (r.length===0) {
      r = [{id:"r1", name:"Aula 1", color:"#f59e0b"},{id:"r2", name:"Aula 2", color:"#0ea5e9"},{id:"r3", name:"Estudio", color:"#10b981"}];
      localStorage.setItem(rk, JSON.stringify(r));
    }
    setRooms(r);

    if (studRaw) try{
      const parsed = JSON.parse(studRaw);
      const arr: any[] = Array.isArray(parsed)?parsed:[];
      setStudents(arr.map((s:any)=>({id:s.id, name:s.contactName||s.name, instrument: s.primaryInstrument|| (Array.isArray(s.instruments)?s.instruments[0]:undefined)})));
    } catch{}

    // users: from Tenant users if available, else mock profesores
    if (ukRaw) try{
      const pu = JSON.parse(ukRaw);
      if (Array.isArray(pu) && pu.length) setUsers(pu.map((u:any)=>({id:u.id||u.email, name:u.name||u.email})));
      else throw new Error("empty");
    } catch {
      setUsers([{id:"u1", name:"Prof. Ana"},{id:"u2", name:"Prof. Carlos"},{id:"u3", name:"Prof. GetLoud"}]);
    }
    if (lessRaw) try{
      const parsed = JSON.parse(lessRaw);
      const arr: any[] = Array.isArray(parsed)?parsed:[];
      // normalize lessons for agenda
      const norm: LessonAgenda[] = arr.map((l:any)=>({
        id: String(l.id),
        studentId: l.studentId,
        studentName: String(l.studentName||l.name||"Alumno"),
        studentPhone: l.studentPhone,
        instrument: String(l.instrument||"GUITARRA"),
        date: String(l.date),
        durationMin: Number(l.durationMin||45),
        status: String(l.status||"SCHEDULED"),
        teacherId: l.teacherId,
        teacherName: l.teacherName || (l.teacherId ? String(l.teacherId) : undefined),
        roomId: l.roomId,
        roomName: l.roomName || (l.roomId ? String(l.roomId) : undefined),
        taughtSkills: Array.isArray(l.taughtSkills)?l.taughtSkills:[],
        notes: l.notes,
        nextGoals: l.nextGoals,
        homeworkIds: Array.isArray(l.homeworkIds)?l.homeworkIds:Array.isArray(l.homeworkExerciseIds)?l.homeworkExerciseIds:[],
        songIds: Array.isArray(l.songIds)?l.songIds:[],
        googleEventId: l.googleEventId,
        googleSyncStatus: l.googleSyncStatus,
        batchToken: l.batchToken,
      }));
      // hydrate roomName/teacherName from lookup
      const roomMap = new Map(r.map(x=>[x.id,x.name] as const));
      norm.forEach(n=>{ if(n.roomId && !n.roomName) n.roomName = roomMap.get(n.roomId) || n.roomId; });
      setLessons(norm);
    } catch{}
  };

  useEffect(()=>{ loadAll(); const h=()=>loadAll(); window.addEventListener("storage",h); window.addEventListener("palmera_edu_rooms_updated",h); window.addEventListener("palmera_edu_lessons_updated",h); return()=>{window.removeEventListener("storage",h); window.removeEventListener("palmera_edu_rooms_updated",h); window.removeEventListener("palmera_edu_lessons_updated",h);} }, [cursor]);

  const persistLessons = (next: LessonAgenda[])=>{
    setLessons(next);
    // also persist to legacy edu_lessons key (LessonsManager reads same key) — keep compat
    const legacyRaw = localStorage.getItem(getTenantStorageKey("edu_lessons"));
    let legacy: any[] = [];
    try{ legacy = legacyRaw? JSON.parse(legacyRaw):[]; } catch{}
    // merge: replace by id
    const map = new Map<string, any>(legacy.map((x:any)=>[String(x.id), x] as const));
    next.forEach(n=>{
      const prev = map.get(n.id) || {};
      map.set(n.id, {
        ...prev,
        id: n.id,
        studentName: n.studentName,
        studentPhone: n.studentPhone,
        studentId: n.studentId,
        instrument: n.instrument,
        date: n.date,
        durationMin: n.durationMin,
        status: n.status,
        teacherId: n.teacherId,
        teacherName: n.teacherName,
        roomId: n.roomId,
        roomName: n.roomName,
        taughtSkills: n.taughtSkills,
        notes: n.notes,
        nextGoals: n.nextGoals,
        homeworkIds: n.homeworkIds,
        songIds: n.songIds,
        googleEventId: n.googleEventId,
        googleSyncStatus: n.googleSyncStatus,
        batchToken: n.batchToken,
      });
    });
    localStorage.setItem(getTenantStorageKey("edu_lessons"), JSON.stringify(Array.from(map.values())));
    window.dispatchEvent(new Event("palmera_edu_lessons_updated"));
  };

  const filteredLessons = lessons.filter(l=>{
    if (filterRoom!=="ALL" && l.roomId!==filterRoom) return false;
    if (filterTeacher!=="ALL" && (l.teacherId||"")!==filterTeacher) return false;
    if (filterInstrument!=="ALL" && l.instrument!==filterInstrument) return false;
    return true;
  });

  const lessonsByDayHour = (day: Date, hour:number)=>{
    return filteredLessons.filter(l=>{
      const d=new Date(l.date);
      return sameDay(d, day) && d.getHours()===hour;
    });
  };

  const lastLessonForStudent = (studentId?: string, studentName?: string)=>{
    const cand = lessons.filter(l=> (studentId && l.studentId===studentId) || (studentName && l.studentName===studentName));
    if (!cand.length) return null;
    cand.sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime());
    return cand[0];
  };

  const proposedHomework = (last: LessonAgenda | null)=>{
    if (!last) return { homework: [], songs: [] } as any;
    // propone lo que quedó pendiente nextGoals + homework de última
    return { homework: last.homeworkIds || [], songs: last.songIds || [], lastNotes: last.notes, lastSkills: last.taughtSkills };
  };

  const openSlot = (day: Date, hour:number)=>{
    const iso = new Date(day); iso.setHours(hour,0,0,0);
    setShowSlot({ date: iso.toISOString(), hour });
    setEditing(null);
    // preselect next slot with teacher/room from last lesson if any
    setForm({ studentId: "", instrument:"GUITARRA", teacherId: filterTeacher!=="ALL"?filterTeacher:"", roomId: filterRoom!=="ALL"?filterRoom:"", hour, minute:0, duration:45, notes:"" });
  };

  const openEdit = (l: LessonAgenda)=>{
    setEditing(l);
    const d=new Date(l.date);
    setForm({ studentId: l.studentId||"", instrument:l.instrument, teacherId:l.teacherId||"", roomId:l.roomId||"", hour:d.getHours(), minute:d.getMinutes(), duration:l.durationMin, notes:l.notes||"" });
    setShowSlot({ date: l.date, hour: d.getHours() });
  };

  const saveSlot = (e: React.FormEvent)=>{
    e.preventDefault();
    if (!form.studentId) return alert("Selecciona alumno (clase vinculada a alumno obligatoria)");
    const student = students.find(s=>s.id===form.studentId);
    if (!student) return;
    const baseDate = showSlot ? new Date(showSlot.date) : new Date();
    baseDate.setHours(form.hour, form.minute, 0,0);
    const teacher = users.find(u=>u.id===form.teacherId);
    const room = rooms.find(r=>r.id===form.roomId);
    const last = lastLessonForStudent(form.studentId, student.name);
    const proposal = proposedHomework(last);

    if (editing) {
      const next = lessons.map(l=> l.id===editing.id ? {
        ...l,
        studentId: form.studentId,
        studentName: student.name,
        instrument: form.instrument,
        date: baseDate.toISOString(),
        durationMin: form.duration,
        teacherId: form.teacherId || undefined,
        teacherName: teacher?.name,
        roomId: form.roomId || undefined,
        roomName: room?.name,
        notes: form.notes,
        homeworkIds: l.homeworkIds,
        nextGoals: l.nextGoals,
      } as LessonAgenda : l);
      persistLessons(next);
      // google sync fire-and-forget (si hay calendario link)
      trySyncGoogle(next.find(x=>x.id===editing.id)!);
    } else {
      const nl: LessonAgenda = {
        id: "l_"+Date.now().toString(36),
        studentId: form.studentId,
        studentName: student.name,
        instrument: form.instrument,
        date: baseDate.toISOString(),
        durationMin: form.duration,
        status:"SCHEDULED",
        teacherId: form.teacherId || undefined,
        teacherName: teacher?.name,
        roomId: form.roomId || undefined,
        roomName: room?.name,
        taughtSkills: [],
        notes: form.notes,
        homeworkIds: proposal.homework as string[],
        songIds: proposal.songs as string[],
        nextGoals: last?.nextGoals,
      };
      persistLessons([nl, ...lessons]);
      trySyncGoogle(nl);
    }
    setShowSlot(null); setEditing(null);
    setToast(editing? "Slot actualizado":"Slot creado — vinculado a seguimiento");
    setTimeout(()=>setToast(null),2500);
  };

  const trySyncGoogle = async (lesson: LessonAgenda)=>{
    // fire-and-forget hacia /api/education/calendar/sync (si no hay creds, queda pending)
    try{
      await fetch("/api/education/calendar/sync",{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ lessonId: lesson.id, lesson }) });
    } catch{}
  };

  const deleteSlot = ()=>{
    if (!editing) return;
    if (!confirm("¿Borrar slot? Se archiva (posible sync Google delete).")) return;
    const next = lessons.filter(l=>l.id!==editing.id);
    persistLessons(next);
    // también borrar en Google si tenía googleEventId
    if (editing.googleEventId) {
      fetch("/api/education/calendar/sync",{ method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ googleEventId: editing.googleEventId, googleCalendarId: editing.googleEventId }) }).catch(()=>{});
    }
    setShowSlot(null); setEditing(null);
  };

  const addRoom = (e: React.FormEvent)=>{
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const r: Room = { id: "r_"+Date.now().toString(36), name: newRoomName.trim(), color: ["#f59e0b","#0ea5e9","#10b981","#8b5cf6","#ef4444"][rooms.length%5]};
    const next=[...rooms, r];
    setRooms(next); localStorage.setItem(getTenantStorageKey("edu_rooms"), JSON.stringify(next));
    window.dispatchEvent(new Event("palmera_edu_rooms_updated"));
    setNewRoomName(""); setShowRoomMgr(false);
  };

  const lastForForm = useMemo(()=>{
    if (!form.studentId) return null;
    return lastLessonForStudent(form.studentId);
  }, [form.studentId, lessons]);

  return (
    <div className="space-y-3">
      {toast && <div className="fixed bottom-4 right-4 z-50 bg-foreground text-background px-4 py-2 rounded-xl text-xs font-bold shadow">{toast}</div>}

      {/* Toolbar Google-like */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/40 bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1">
          <button onClick={()=>setCursor(new Date())} className="rounded-xl border border-border/40 bg-background px-3 py-1.5 text-xs font-bold">Hoy</button>
          <button onClick={()=>setCursor(addDays(cursor, view==="week"?-7:-1))} className="rounded-full p-2 hover:bg-muted"><Icons.ChevronLeft className="h-4 w-4" /></button>
          <button onClick={()=>setCursor(addDays(cursor, view==="week"?7:1))} className="rounded-full p-2 hover:bg-muted"><Icons.ChevronRight className="h-4 w-4" /></button>
          <span className="ml-2 text-sm font-bold">{view==="week" ? `${weekStart.toLocaleDateString("es-ES",{day:"2-digit",month:"short"})} – ${addDays(weekStart,6).toLocaleDateString("es-ES",{day:"2-digit",month:"short", year:"numeric"})}` : cursor.toLocaleDateString("es-ES",{weekday:"long", day:"2-digit", month:"long", year:"numeric"})}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <select value={view} onChange={(e)=>setView(e.target.value as any)} className="rounded-xl border border-border/40 bg-background px-2 py-1.5 text-xs font-bold">
            <option value="week">Semana</option><option value="day">Día</option>
          </select>
          <span className="hidden md:inline text-xs text-muted-foreground ml-2">Google Calendar sincronizado (no prioritario, desconectable con el tiempo)</span>
        </div>
      </div>

      {/* Filters: aula y profesor (como Google Calendar colores/calendarios) */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/40 bg-card p-3">
        <div className="flex items-center gap-1.5 text-xs font-bold"><Icons.MapPin className="h-4 w-4 text-amber-500" /> Aula</div>
        <select value={filterRoom} onChange={(e)=>setFilterRoom(e.target.value)} className="rounded-xl border border-border/40 bg-background px-3 py-1.5 text-xs">
          <option value="ALL">Todas las aulas</option>
          {rooms.map(r=> <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button onClick={()=>setShowRoomMgr(true)} className="rounded-lg border border-border/40 p-1.5"><Icons.Plus className="h-4 w-4" /></button>

        <div className="flex items-center gap-1.5 text-xs font-bold ml-2"><Icons.UserCheck className="h-4 w-4 text-sky-500" /> Profesor</div>
        <select value={filterTeacher} onChange={(e)=>setFilterTeacher(e.target.value)} className="rounded-xl border border-border/40 bg-background px-3 py-1.5 text-xs">
          <option value="ALL">Todos</option>
          {users.map(u=> <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>

        <div className="flex items-center gap-1.5 text-xs font-bold ml-2"><Icons.Music className="h-4 w-4" /> Instrumento</div>
        <select value={filterInstrument} onChange={(e)=>setFilterInstrument(e.target.value)} className="rounded-xl border border-border/40 bg-background px-3 py-1.5 text-xs">
          <option value="ALL">Todos</option>
          {Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map(ins=> <option key={ins.key} value={ins.key}>{ins.label}</option>)}
        </select>
        <span className="ml-auto text-[11px] text-muted-foreground">{filteredLessons.length} clases visibles</span>
      </div>

      {/* Grid Google-like: horas × días */}
      <div className="overflow-auto rounded-2xl border border-border/40 bg-card shadow-sm">
        <div className="min-w-[720px]">
          <div className="grid" style={{gridTemplateColumns:`60px repeat(${days.length},1fr)`}}>
            <div className="border-b border-r border-border/40 bg-muted/20 p-2 text-[10px] font-bold uppercase text-muted-foreground">Hora</div>
            {days.map(d=>(
              <div key={d.toISOString()} className={`border-b border-r border-border/40 p-2 text-center ${sameDay(d,new Date())?"bg-amber-500/10":"bg-muted/20"}`}>
                <div className="text-xs font-black">{fmtDay(d)}</div>
                <div className="text-[11px] text-muted-foreground">{d.toLocaleDateString("es-ES")}</div>
              </div>
            ))}
            {HOURS.map(h=>(
              <React.Fragment key={h}>
                <div className="border-b border-r border-border/40 bg-background p-1 text-right text-[11px] font-mono text-muted-foreground" style={{minHeight:56}}>{fmtHour(h)}</div>
                {days.map(d=>{
                  const slots = lessonsByDayHour(d,h);
                  return (
                    <div key={d.toISOString()+h} onClick={()=>openSlot(d,h)} className="relative border-b border-r border-border/20 p-1 hover:bg-amber-500/5 cursor-pointer" style={{minHeight:56}}>
                      {slots.map(l=>{
                        const roomColor = rooms.find(r=>r.id===l.roomId)?.color || "#f59e0b";
                        return (
                          <div key={l.id} onClick={(e)=>{e.stopPropagation(); openEdit(l); if(onSelectLesson) onSelectLesson(l);}} className="mb-1 rounded-lg border px-2 py-1 text-xs shadow-sm hover:scale-[1.02] transition" style={{borderLeft:`3px solid ${roomColor}`, background: l.status==="COMPLETED"?"#ecfdf5":"white"}}>
                            <div className="font-bold truncate flex items-center gap-1"><span className="truncate">{l.studentName}</span> <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px]">{l.instrument}</span></div>
                            <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1"><Icons.Clock3 className="h-3 w-3" />{new Date(l.date).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})} · {l.durationMin}′ {l.teacherName?`· ${l.teacherName}`:""} {l.roomName?`· ${l.roomName}`:""}</div>
                            {l.googleEventId && <div className="text-[9px] text-sky-600 flex items-center gap-0.5"><Icons.CalendarCheck className="h-3 w-3" /> Google</div>}
                          </div>
                        );
                      })}
                      {slots.length===0 && <div className="absolute inset-1 rounded-lg border border-dashed border-transparent hover:border-amber-500/30" />}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">Click en hueco → crear slot (vinculado a alumno + profesor + aula). Click en evento → editar/ ver seguimiento. Filtros por aula/profesor/instrumento como en Google Calendar. Palmera es source of truth; Google sync es opcional y desconectable.</p>

      {/* Slot form (crear/editar) */}
      {showSlot && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4">
          <form onSubmit={saveSlot} className="w-full max-w-xl rounded-t-[1.5rem] md:rounded-2xl bg-card p-5 shadow-xl max-h-[92vh] overflow-auto">
            <div className="flex items-center justify-between"><h3 className="font-bold flex items-center gap-2"><Icons.CalendarPlus className="h-5 w-5 text-amber-500" /> {editing?"Editar slot":"Nuevo slot"} · {new Date(showSlot.date).toLocaleDateString("es-ES")} {String(form.hour).padStart(2,"0")}:{String(form.minute).padStart(2,"0")}</h3><button type="button" onClick={()=>{setShowSlot(null); setEditing(null);}} className="p-2"><Icons.X className="h-5 w-5" /></button></div>

            <div className="mt-3 grid gap-3">
              <label className="text-xs font-bold">Alumno * (clase vinculada a alumno)
                <select required value={form.studentId} onChange={(e)=>{
                  const s=students.find(x=>x.id===e.target.value);
                  setForm({...form, studentId:e.target.value, instrument: s?.instrument||form.instrument});
                }} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm">
                  <option value="">— Selecciona alumno —</option>
                  {students.map(s=> <option key={s.id} value={s.id}>{s.name} · {s.instrument||""}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-bold">Instrumento<select value={form.instrument} onChange={(e)=>setForm({...form, instrument:e.target.value})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs">{Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map(ins=> <option key={ins.key} value={ins.key}>{ins.label}</option>)}</select></label>
                <label className="text-xs font-bold">Duración (min)<input type="number" value={form.duration} onChange={(e)=>setForm({...form, duration: parseInt(e.target.value)||45})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs" /></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-bold">Profesor<select value={form.teacherId} onChange={(e)=>setForm({...form, teacherId:e.target.value})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-xs"><option value="">— Sin asignar —</option>{users.map(u=> <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
                <label className="text-xs font-bold">Aula / Espacio<select value={form.roomId} onChange={(e)=>setForm({...form, roomId:e.target.value})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-xs"><option value="">— Sin aula —</option>{rooms.map(r=> <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="text-xs font-bold">Hora<input type="number" min={8} max={21} value={form.hour} onChange={(e)=>setForm({...form, hour: parseInt(e.target.value)||10})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs" /></label>
                <label className="text-xs font-bold">Min<input type="number" min={0} max={45} step={15} value={form.minute} onChange={(e)=>setForm({...form, minute: parseInt(e.target.value)||0})} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs" /></label>
                <label className="text-xs font-bold">Aula nueva<button type="button" onClick={()=>setShowRoomMgr(true)} className="mt-1 w-full rounded-xl border border-dashed border-border/40 bg-muted/20 px-3 py-2 text-xs">+ Crear aula</button></label>
              </div>
              <label className="text-xs font-bold">Notas slot<textarea value={form.notes} onChange={(e)=>setForm({...form, notes:e.target.value})} placeholder="Objetivo de la clase..." rows={2} className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-xs" /></label>

              {/* Seguimiento conectado */}
              {lastForForm && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="text-xs font-bold flex items-center gap-1"><Icons.History className="h-4 w-4 text-amber-600" /> Conectado al seguimiento</div>
                  <div className="mt-1 text-xs"><span className="font-bold">Última clase:</span> {new Date(lastForForm.date).toLocaleDateString("es-ES")} · {lastForForm.taughtSkills.join(", ")||"—"} · {lastForForm.notes||"sin notas"}</div>
                  <div className="text-xs"><span className="font-bold">Propuesta dejar como ejercicio siguiente:</span> {(lastForForm.homeworkIds||[]).join(", ")||"—"} {(lastForForm.songIds||[]).length?`· canciones ${(lastForForm.songIds||[]).join(", ")}`:""}</div>
                  <div className="text-[11px] text-muted-foreground">Se hereda como base para la próxima clase (editable al finalizar).</div>
                </div>
              )}
              {!lastForForm && form.studentId && <div className="text-xs text-muted-foreground border rounded-xl p-2">Sin histórico previo — primera clase.</div>}
            </div>

            <div className="mt-4 flex gap-2">
              {editing && <button type="button" onClick={deleteSlot} className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-600">Borrar</button>}
              <button type="submit" className="flex-1 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background">{editing?"Guardar cambios":"Crear slot"}</button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">Google Calendar: sincronización opcional en <code>/api/education/calendar/sync</code>. Si configuras <code>EduCalendarLink</code>, el slot se espeja en Google; si desconectas, Palmera sigue mandando (no prioritario Google).</p>
          </form>
        </div>
      )}

      {showRoomMgr && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4">
          <form onSubmit={addRoom} className="w-full max-w-md rounded-t-[1.5rem] md:rounded-2xl bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between"><h3 className="font-bold">Nueva aula</h3><button type="button" onClick={()=>setShowRoomMgr(false)} className="p-2"><Icons.X className="h-5 w-5" /></button></div>
            <input value={newRoomName} onChange={(e)=>setNewRoomName(e.target.value)} placeholder="Ej. Aula 3, Sala Juntas, Estudio B" className="mt-3 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm" />
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">{rooms.map(r=> <span key={r.id} className="rounded-full border px-2 py-1">{r.name}</span>)} </div>
            <button type="submit" className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white">Crear aula</button>
          </form>
        </div>
      )}
    </div>
  );
}
