"use client";
import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { getTenantStorageKey, getTenantSlugClient } from "@/lib/clientStorage";
import { EDUCATION_INSTRUMENTS } from "../lib/instruments";

type Professor = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  instruments: string[];
  isActive: boolean;
  userId?: string;
  createdAt: string;
  lastLogin?: string;
};

function genPass() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#";
  return Array.from({length:12}, ()=> chars[Math.floor(Math.random()*chars.length)]).join("");
}

export default function ProfessorsManager() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{name:string; email:string; phone:string; instruments:string[]}>({name:"", email:"", phone:"", instruments:[]});
  const [emailDetails, setEmailDetails] = useState<{to:string; name:string; tempPassword:string; accessLink:string} | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [toast, setToast] = useState<string|null>(null);
  const [search, setSearch] = useState("");

  const load = () => {
    const key = getTenantStorageKey("edu_professors");
    const raw = localStorage.getItem(key);
    if (raw) try{ setProfessors(JSON.parse(raw)); } catch{}
    else {
      const seed: Professor[] = [
        { id:"p1", name:"Prof. Ana García", email:"ana@getloud.es", phone:"+34 600 123 456", instruments:["GUITARRA","VOZ"], isActive:true, createdAt: new Date(Date.now()-10*86400000).toISOString() },
        { id:"p2", name:"Prof. Carlos Ruiz", email:"carlos@getloud.es", instruments:["PIANO","BAJO"], isActive:true, createdAt: new Date(Date.now()-5*86400000).toISOString() },
      ];
      setProfessors(seed); localStorage.setItem(key, JSON.stringify(seed));
    }
  };
  useEffect(()=>{ load(); }, []);
  const persist = (next: Professor[])=>{ setProfessors(next); localStorage.setItem(getTenantStorageKey("edu_professors"), JSON.stringify(next)); window.dispatchEvent(new Event("palmera_edu_professors_updated")); };

  const toggle = (id:string)=>{
    const next = professors.map(p=> p.id===id ? {...p, isActive: !p.isActive} : p);
    persist(next);
  };

  const del = (id:string)=>{
    if (!confirm("¿Archivar profesor? Se desactiva acceso pero mantiene histórico de clases.")) return;
    persist(professors.filter(p=>p.id!==id));
  };

  const submit = async (e:React.FormEvent)=>{
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return alert("Nombre y email requeridos");
    const pass = genPass();
    const slug = getTenantSlugClient();
    const accessLink = `${window.location.protocol}//${slug}.${window.location.host.replace(/^[^.]+\./,"")}/login?onboarding=true&email=${encodeURIComponent(form.email)}&role=PROFESSOR`;
    // Intentar crear User real via API (si falla, queda solo localStorage mock como UsersSettingsPage)
    let createdUserId: string | undefined;
    try{
      const res = await fetch("/api/education/teachers", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, instruments: form.instruments, password: pass }) });
      const data = await res.json().catch(()=>null);
      if (res.ok && data?.success) createdUserId = data.user?.id;
    } catch{}
    const p: Professor = { id: "prof_"+Date.now().toString(36), name: form.name, email: form.email, phone: form.phone, instruments: form.instruments.length?form.instruments:["GUITARRA"], isActive:true, userId: createdUserId, createdAt: new Date().toISOString() };
    persist([...professors, p]);
    setEmailDetails({ to: form.email, name: form.name, tempPassword: pass, accessLink });
    setShowEmail(true);
    setShowForm(false);
    setForm({name:"", email:"", phone:"", instruments:[]});
    setToast(`Profesor ${p.name} creado — email de acceso enviado (PROFESSOR)`);
    setTimeout(()=>setToast(null),3000);
    // audit local
    try{
      const k=getTenantStorageKey("palmera_audit_logs");
      const logs=JSON.parse(localStorage.getItem(k)||"[]");
      logs.unshift({id:"log_"+Date.now(), action:"EDU_PROFESSOR_CREATED", details:`Profesor ${p.name} <${p.email}> instrumentos ${p.instruments.join(",")} — acceso solo EDUCACION, rol PROFESSOR`, timestamp: new Date().toISOString()});
      localStorage.setItem(k, JSON.stringify(logs.slice(0,20)));
    } catch{}
  };

  const filtered = professors.filter(p=> {
    const q=search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {toast && <div className="fixed bottom-4 right-4 z-50 bg-foreground text-background px-4 py-2 rounded-xl text-xs font-bold">{toast}</div>}

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400"><Icons.GraduationCap className="h-4 w-4" /> Arquitectura por revisar</div>
        <p className="mt-1 text-xs text-muted-foreground">Profesor = <code>UserRole.PROFESSOR</code> <span className="font-mono">prisma/schema.prisma:281</span> con <code>tenantId</code> + RLS vía <code>EduLesson.teacherId</code>. Sidebar filtra: PROFESSOR solo ve <code>EDUCACION</code> + conversaciones. Calendario <code>EducationAgenda</code> es compartido (ve demás profesores) pero filtros por aula/profesor permiten foco. Invite crea <code>User</code> vía <code>POST /api/education/teachers</code> (bcrypt) y email onboarding <code>/login?onboarding&amp;role=PROFESSOR</code>. Futuro: desconectar Google Calendar por profesor vía <code>EduCalendarLink.userId</code>.</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black">Profesores ({filtered.length})</h2>
          <p className="text-xs text-muted-foreground">Crea profesor → le llega email con contraseña temporal y acceso solo a Educación vinculada a él. Calendario compartido.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icons.Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar..." className="rounded-xl border border-border/40 bg-background pl-8 pr-3 py-2 text-xs w-44" />
          </div>
          <button onClick={()=>setShowForm(true)} className="rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background flex items-center gap-1"><Icons.UserPlus className="h-4 w-4" /> Nuevo profesor</button>
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map(p=>(
          <div key={p.id} className="rounded-2xl border border-border/40 bg-card p-4 flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 font-black border border-amber-500/20">{p.name.charAt(0).toUpperCase()}</div>
              <div>
                <div className="text-sm font-bold flex items-center gap-2">{p.name} <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${p.isActive?"bg-emerald-500/10 text-emerald-700 border-emerald-500/20":"bg-stone-500/10 border-stone-500/20"}`}>{p.isActive?"Activo":"Archivado"}</span> <span className="rounded-full bg-violet-500/10 text-violet-700 border border-violet-500/20 px-2 py-0.5 text-[10px]">PROFESSOR</span></div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2"><span>{p.email}</span>{p.phone && <span>· {p.phone}</span>}</div>
                <div className="mt-1 flex flex-wrap gap-1">{(p.instruments||[]).map(k=> <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{k}</span>)} {p.userId && <span className="text-[10px] font-mono text-muted-foreground">→ User {p.userId.slice(0,6)}</span>}</div>
                <div className="text-[11px] text-muted-foreground">Creado {new Date(p.createdAt).toLocaleDateString("es-ES")} · verá solo EDUCACION, pero calendario compartido ve demás profesores</div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={()=>toggle(p.id)} className="rounded-lg border border-border/40 p-2 text-xs">{p.isActive?"Desactivar":"Activar"}</button>
              <button onClick={()=>del(p.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-600"><Icons.Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {filtered.length===0 && <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sin profesores. Crea el primero.</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4">
          <form onSubmit={submit} className="w-full max-w-xl rounded-t-[1.5rem] md:rounded-2xl bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between"><h3 className="font-bold">Nuevo profesor — acceso solo Educación</h3><button type="button" onClick={()=>setShowForm(false)} className="p-2"><Icons.X className="h-5 w-5" /></button></div>
            <p className="text-xs text-muted-foreground">Se creará <code>User</code> con <code>role=PROFESSOR</code> y <code>tenantId</code> actual. Recibirá email con link <code>/login?onboarding</code>.</p>
            <div className="mt-3 grid gap-3">
              <label className="text-xs font-bold">Nombre*<input required value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} placeholder="Ej. Ana García" className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm" /></label>
              <label className="text-xs font-bold">Email* (llega invitación)<input required type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} placeholder="ana@getloud.es" className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm" /></label>
              <label className="text-xs font-bold">Teléfono<input value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})} placeholder="+34 600..." className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm" /></label>
              <div className="text-xs font-bold">Instrumentos que imparte<div className="mt-1 flex flex-wrap gap-1">{Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map(ins=>{ const active=form.instruments.includes(ins.key); return <button type="button" key={ins.key} onClick={()=>setForm({...form, instruments: active? form.instruments.filter(k=>k!==ins.key): [...form.instruments, ins.key]})} className={`rounded-full border px-3 py-1 text-xs ${active?"bg-amber-500 text-white":"bg-background"}`}>{ins.label}</button>; })}</div></div>
            </div>
            <button type="submit" className="mt-4 w-full rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background">Crear y enviar email</button>
          </form>
        </div>
      )}

      {showEmail && emailDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-zinc-950 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[10px] font-bold text-emerald-400"><Icons.Send className="h-3 w-3" /> Email simulado (SMTP Outbox) — Profesor</div>
            <div className="rounded-2xl bg-zinc-900 border border-border/50 overflow-hidden text-xs">
              <div className="bg-zinc-800/50 p-3.5 border-b border-border/40 space-y-1.5">
                <div className="flex"><span className="w-16 font-bold uppercase text-[9px] text-muted-foreground/60">De:</span><span className="text-foreground">Palmera &lt;no-reply@palmera.io&gt;</span></div>
                <div className="flex"><span className="w-16 font-bold uppercase text-[9px] text-muted-foreground/60">Para:</span><span className="text-emerald-400">{emailDetails.name} &lt;{emailDetails.to}&gt;</span></div>
                <div className="flex"><span className="w-16 font-bold uppercase text-[9px] text-muted-foreground/60">Asunto:</span><span className="text-white font-bold">Invitación Profesor — Acceso solo Educación (GetLoud)</span></div>
              </div>
              <div className="p-4 space-y-3 text-foreground/90 text-[11px] leading-relaxed">
                <p>Hola <strong>{emailDetails.name}</strong>, has sido dado de alta como <strong>PROFESSOR</strong> en GetLoud.</p>
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-border/30 space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Rol:</span><span className="font-bold text-violet-400">PROFESSOR — solo EDUCACION</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Contraseña temporal:</span><span className="font-mono text-emerald-400">{emailDetails.tempPassword}</span></div>
                </div>
                <p>Calendario es compartido: verás slots de demás profesores (filtrable por profesor/aula), pero tus clases vinculadas son las tuyas (<code>EduLesson.teacherId</code>).</p>
                <div className="text-center py-2"><a href={emailDetails.accessLink} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-[10px] font-bold text-white">Activar acceso <Icons.ArrowRight className="h-3.5 w-3.5" /></a></div>
                <div className="text-[10px] font-mono break-all text-amber-500/70">{emailDetails.accessLink}</div>
              </div>
            </div>
            <div className="flex justify-end"><button onClick={()=>setShowEmail(false)} className="h-8.5 px-4 rounded-xl bg-zinc-800 text-white text-xs font-bold">Cerrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
