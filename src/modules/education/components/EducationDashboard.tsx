"use client";
import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import Link from "next/link";
import { getTenantStorageKey } from "@/lib/clientStorage";
import { EDUCATION_INSTRUMENTS } from "../lib/instruments";

type Student = { id:string; name:string; instruments:string[]; tier:string; phone?:string; levelByInstrument?: Record<string,string> };
type Lesson = { id:string; studentName:string; instrument:string; date:string; status:string; whatsappSentAt?: string };

const DEMO_STUDENTS: Student[] = [
  { id:"s1", name:"Lucía Martín", instruments:["GUITARRA","VOZ"], tier:"ARTISTA", phone:"+34 600 111 222", levelByInstrument:{GUITARRA:"BASICO", VOZ:"INICIACION"} },
  { id:"s2", name:"Marco Ruiz", instruments:["BAJO"], tier:"ALUMNO", phone:"+34 600 333 444", levelByInstrument:{BAJO:"INICIACION"} },
  { id:"s3", name:"Sofía García", instruments:["PIANO"], tier:"ALUMNO", phone:"+34 600 555 666" },
  { id:"s4", name:"Diego López", instruments:["BATERIA"], tier:"ARTISTA", phone:"+34 600 777 888" },
];

const DEMO_LESSONS: Lesson[] = [
  { id:"l1", studentName:"Lucía Martín", instrument:"GUITARRA", date: new Date().toISOString(), status:"COMPLETED" },
  { id:"l2", studentName:"Marco Ruiz", instrument:"BAJO", date: new Date().toISOString(), status:"SCHEDULED" },
  { id:"l3", studentName:"Sofía García", instrument:"PIANO", date: new Date().toISOString(), status:"COMPLETED", whatsappSentAt: new Date().toISOString() },
];

export default function EducationDashboard() {
  const [instrumentFilter, setInstrumentFilter] = useState<string>("ALL");
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>(DEMOS_LESSON_SAFE);

  useEffect(()=> {
    const key = getTenantStorageKey("edu_students");
    const k2 = getTenantStorageKey("edu_lessons");
    const saved = localStorage.getItem(key);
    const saved2 = localStorage.getItem(k2);
    if (saved) try { setStudents(JSON.parse(saved)); } catch { setStudents(DEMO_STUDENTS); } else { setStudents(DEMO_STUDENTS); localStorage.setItem(key, JSON.stringify(DEMO_STUDENTS)); }
    if (saved2) try { setLessons(JSON.parse(saved2)); } catch { setLessons(DEMO_LESSONS); } else { setLessons(DEMO_LESSONS); localStorage.setItem(k2, JSON.stringify(DEMO_LESSONS)); }
  }, []);

  const filteredLessons = lessons.filter(l => instrumentFilter==="ALL" || l.instrument===instrumentFilter);
  const todayCompleted = lessons.filter(l=>l.status==="COMPLETED").length;
  const pendingWhatsApp = lessons.filter(l=>l.status==="COMPLETED" && !l.whatsappSentAt).length;
  const artists = students.filter(s=>s.tier==="ARTISTA").length;

  return (
    <div className="space-y-4">
      <header className="rounded-[1.5rem] border border-border/40 bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400"><Icons.GraduationCap className="h-4 w-4" /> Educación · GetLoud</div>
        <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Panel Profesor</h1>
        <p className="mt-1 text-xs text-muted-foreground">100% móvil — clases, biblioteca y artista premium.</p>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <button onClick={()=>setInstrumentFilter("ALL")} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${instrumentFilter==="ALL"?"bg-foreground text-background":"bg-background"}`}>Todos</button>
          {Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map((ins)=>(
            <button key={ins.key} onClick={()=>setInstrumentFilter(ins.key)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${instrumentFilter===ins.key?"bg-amber-500 text-white border-amber-500":"bg-background"}`}>{ins.label}</button>
          ))}
        </div>
      </header>

      <section className="grid gap-3 grid-cols-2">
        {[
          { label:"Clases hoy", value: filteredLessons.length, icon: Icons.Calendar },
          { label:"Completadas", value: todayCompleted, icon: Icons.CheckCircle2 },
          { label:"WhatsApp pendientes", value: pendingWhatsApp, icon: Icons.MessageCircle },
          { label:"Artistas premium", value: artists, icon: Icons.Star },
        ].map((k)=>{ const I=k.icon; return <div key={k.label} className="rounded-2xl border border-border/40 bg-card p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</span><I className="h-4 w-4 text-amber-500" /></div><div className="mt-2 text-2xl font-black">{k.value}</div></div>; })}
      </section>

      <section className="rounded-3xl border border-border/40 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between"><h2 className="text-sm font-black flex items-center gap-2"><Icons.Clock3 className="h-4 w-4 text-amber-500" /> Hoy</h2><Link href="/admin/education/lessons" className="text-xs font-bold text-amber-600">Ver todas</Link></div>
        <div className="mt-3 space-y-2">
          {filteredLessons.length===0 ? <p className="text-xs text-muted-foreground">Sin clases filtradas.</p> : filteredLessons.map((l)=>(
            <div key={l.id} className="flex items-center justify-between rounded-2xl border border-border/40 bg-background p-3">
              <div><div className="text-sm font-bold">{l.studentName}</div><div className="text-[11px] text-muted-foreground flex items-center gap-1.5"><span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold">{l.instrument}</span> {new Date(l.date).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})} · {l.status}</div></div>
              <Link href={`/admin/education/lessons?finish=${l.id}`} className={`rounded-xl px-3 py-2 text-xs font-bold ${l.whatsappSentAt?"bg-emerald-500 text-white":"bg-foreground text-background"}`}>{l.whatsappSentAt?"Enviado":"Finalizar"}</Link>
            </div>
          ))}
        </div>
        {pendingWhatsApp>0 && <button onClick={()=>alert(`Batch WhatsApp Cloud API: ${pendingWhatsApp} pendientes (POST /api/education/lessons/batch-send)`)} className="mt-3 w-full rounded-xl bg-amber-500 px-4 py-3 text-xs font-bold text-white">Enviar pendientes del día por WhatsApp Cloud API</button>}
      </section>

      <section className="grid gap-3">
        <Link href="/admin/education/students" className="rounded-2xl border border-border/40 bg-card p-4 flex items-center justify-between"><span className="text-sm font-bold flex items-center gap-2"><Icons.Users className="h-4 w-4" /> Alumnos ({students.length})</span><Icons.ChevronRight className="h-4 w-4" /></Link>
        <Link href="/admin/education/library" className="rounded-2xl border border-border/40 bg-card p-4 flex items-center justify-between"><span className="text-sm font-bold flex items-center gap-2"><Icons.Library className="h-4 w-4" /> Biblioteca</span><Icons.ChevronRight className="h-4 w-4" /></Link>
        <Link href="/admin/education/artist" className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center justify-between"><span className="text-sm font-bold flex items-center gap-2"><Icons.Music2 className="h-4 w-4 text-amber-500" /> Portal Artista (premium)</span><Icons.ChevronRight className="h-4 w-4" /></Link>
      </section>

      <div className="sticky bottom-0 z-10 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 backdrop-blur flex items-center justify-between">
        <span className="text-xs font-bold">Finalizar clase → formulario + WhatsApp 1 link agregador</span>
        <Link href="/admin/education/lessons" className="rounded-xl bg-foreground px-3 py-2 text-xs font-bold text-background">Abrir</Link>
      </div>
    </div>
  );
}
// safe fallback const (avoid TDZ)
const DEMOS_LESSON_SAFE = DEMO_LESSONS;
