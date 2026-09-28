// src/modules/education/components/ProfessorsManager.tsx
// Profesores = USUARIO con rol de trabajo PROFESOR (fuente única: /api/admin/users).
// Crear un profesor crea su login + accesos + perfil docente. Sin semillas de mentira:
// si no hay profesores, se muestra vacío y se crea el primero.
"use client";
import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { useSession } from "next-auth/react";
import { EDUCATION_INSTRUMENTS } from "../lib/instruments";

type Professor = {
  id: string;
  name: string;
  email: string;
  instruments: string[];
  isActive: boolean;
  createdAt: string;
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Error de red");
  return data;
}

export default function ProfessorsManager() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role as string | undefined;
  const isAdmin = userRole === "ADMIN" || userRole === "DEV";
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{name:string; email:string; instruments:string[]}>({name:"", email:"", instruments:[]});
  const [emailDetails, setEmailDetails] = useState<{to:string; name:string; tempPassword:string; accessLink:string} | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [toast, setToast] = useState<string|null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api("/api/admin/users?workRole=PROFESOR");
      setProfessors(
        (data.users || []).map((u: any) => ({
          id: String(u.id),
          name: String(u.name),
          email: String(u.email),
          instruments: Array.isArray(u.instruments) ? u.instruments : [],
          isActive: u.isActive !== false,
          createdAt: String(u.createdAt || new Date().toISOString()),
        }))
      );
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "Error cargando profesores");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener("palmera_users_updated", h);
    return () => window.removeEventListener("palmera_users_updated", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async (id: string, next: boolean) => {
    try {
      await api("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: next }),
      });
      setToast(next ? "Profesor reactivado" : "Profesor archivado (mantiene histórico, no puede entrar)");
      setTimeout(() => setToast(null), 3000);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error cambiando estado");
    }
  };

  const submit = async (e:React.FormEvent)=>{
    e.preventDefault();
    if (!isAdmin) return alert("Solo ADMIN puede crear profesores");
    if (!form.name.trim() || !form.email.trim()) return alert("Nombre y email requeridos");
    try{
      const data = await api("/api/admin/users", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          level: "USUARIO",
          workRoles: ["PROFESOR"],
          extraModules: [],
          instruments: form.instruments.length ? form.instruments : ["GUITARRA"],
          isActive: true,
        }),
      });
      const accessLink = `${window.location.protocol}//${window.location.host}/login?onboarding=true&email=${encodeURIComponent(form.email)}`;
      setEmailDetails({ to: form.email, name: form.name, tempPassword: data.tempPassword, accessLink });
      setShowEmail(true);
      setShowForm(false);
      setForm({name:"", email:"", instruments:[]});
      setToast(`Profesor ${form.name} creado — USUARIO+PROFESOR (solo sus módulos)`);
      setTimeout(()=>setToast(null),3000);
      window.dispatchEvent(new Event("palmera_users_updated"));
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error creando profesor");
    }
  };

  const filtered = professors.filter(p=> {
    const q=search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {toast && <div className="fixed bottom-4 right-4 z-50 bg-foreground text-background px-4 py-2 rounded-xl text-xs font-bold shadow">{toast}</div>}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black">Profesores ({filtered.length})</h2>
          <p className="text-xs text-muted-foreground">Crear profesor = crear su usuario (USUARIO + rol PROFESOR): entra con su email y ve solo Educación, Contactos y sus clases.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icons.Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar..." className="rounded-xl border border-border/40 bg-background pl-8 pr-3 py-2 text-xs w-44" />
          </div>
          <a href="/admin/settings/users?preset=PROFESOR" className={`rounded-xl px-4 py-2 text-xs font-bold hidden md:inline-flex items-center gap-1 border border-border/40 hover:bg-muted ${isAdmin?"":"opacity-40 pointer-events-none"}`} title="Ficha completa en Usuarios">
            <Icons.Settings2 className="h-4 w-4" /> Ficha completa
          </a>
          <button onClick={()=>{ if(!isAdmin) return alert("Solo ADMIN puede crear profesores"); setShowForm(true); }} disabled={!isAdmin} className={`rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1 ${isAdmin?"bg-foreground text-background":"bg-muted text-muted-foreground cursor-not-allowed border border-border/40"}`} title={isAdmin?"Crear profesor (usuario real)":"Solo ADMIN"}><Icons.UserPlus className="h-4 w-4" /> Nuevo profesor</button>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2"><Icons.Loader2 className="h-4 w-4 animate-spin" /> Cargando profesores…</div>
      ) : (
      <div className="grid gap-3">
        {filtered.map(p=>(
          <div key={p.id} className="rounded-2xl border border-border/40 bg-card p-4 flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-700 font-black border border-red-500/20">{p.name.charAt(0).toUpperCase()}</div>
              <div>
                <div className="text-sm font-bold flex items-center gap-2">{p.name} <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${p.isActive?"bg-emerald-500/10 text-emerald-700 border-emerald-500/20":"bg-stone-500/10 border-stone-500/20"}`}>{p.isActive?"Activo":"Archivado"}</span> <span className="rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20 px-2 py-0.5 text-[10px]">USUARIO · Profesor</span></div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2"><span>{p.email}</span></div>
                <div className="mt-1 flex flex-wrap gap-1">{(p.instruments||[]).map(k=> <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{k}</span>)}</div>
                <div className="text-[11px] text-muted-foreground">Verá solo Educación + Contactos; sus clases vinculadas son las suyas (<code>EduLesson.teacherId</code>).</div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {isAdmin ? (
                <>
                  <button onClick={()=>toggle(p.id, !p.isActive)} className="rounded-lg border border-border/40 p-2 text-xs">{p.isActive?"Archivar":"Reactivar"}</button>
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground px-2">Solo ADMIN</span>
              )}
            </div>
          </div>
        ))}
        {filtered.length===0 && <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sin profesores. Crea el primero con “Nuevo profesor”.</div>}
      </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4">
          <form onSubmit={submit} className="w-full max-w-xl rounded-t-[1.5rem] md:rounded-2xl bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between"><h3 className="font-bold">Nuevo profesor — usuario real</h3><button type="button" onClick={()=>setShowForm(false)} className="p-2"><Icons.X className="h-5 w-5" /></button></div>
            <p className="text-xs text-muted-foreground">Se crea un <code>USUARIO</code> con rol de trabajo <code>PROFESOR</code> (+ perfil docente con instrumentos). Entrará con su email y verá solo sus módulos. Para más opciones (extras, comercial+profesor…), usa “Ficha completa”.</p>
            <div className="mt-3 grid gap-3">
              <label className="text-xs font-bold">Nombre*<input required value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} placeholder="Ej. Ana García" className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm" /></label>
              <label className="text-xs font-bold">Email* (será su login)<input required type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} placeholder="ana@empresa.es" className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm" /></label>
              <div className="text-xs font-bold">Instrumentos que imparte<div className="mt-1 flex flex-wrap gap-1">{Object.values(EDUCATION_INSTRUMENTS).filter(i=>i.key!=="COMMON").map(ins=>{ const active=form.instruments.includes(ins.key); return <button type="button" key={ins.key} onClick={()=>setForm({...form, instruments: active? form.instruments.filter(k=>k!==ins.key): [...form.instruments, ins.key]})} className={`rounded-full border px-3 py-1 text-xs ${active?"bg-red-500 text-white":"bg-background"}`}>{ins.label}</button>; })}</div></div>
            </div>
            <button type="submit" className="mt-4 w-full rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background">Crear usuario y mostrar acceso</button>
          </form>
        </div>
      )}

      {showEmail && emailDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-zinc-950 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[10px] font-bold text-emerald-400"><Icons.Send className="h-3 w-3" /> Acceso creado — Profesor</div>
            <div className="rounded-2xl bg-zinc-900 border border-border/50 overflow-hidden text-xs">
              <div className="bg-zinc-800/50 p-3.5 border-b border-border/40 space-y-1.5">
                <div className="flex"><span className="w-16 font-bold uppercase text-[9px] text-muted-foreground/60">Para:</span><span className="text-emerald-400">{emailDetails.name} &lt;{emailDetails.to}&gt;</span></div>
                <div className="flex"><span className="w-16 font-bold uppercase text-[9px] text-muted-foreground/60">Nivel:</span><span className="text-white font-bold">USUARIO · Profesor — solo sus módulos</span></div>
              </div>
              <div className="p-4 space-y-3 text-foreground/90 text-[11px] leading-relaxed">
                <p>Hola <strong>{emailDetails.name}</strong>, ya puedes entrar con tu email.</p>
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-border/30 space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Contraseña temporal:</span><span className="font-mono text-emerald-400">{emailDetails.tempPassword}</span></div>
                </div>
                <div className="text-center py-2"><a href={emailDetails.accessLink} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-[10px] font-bold text-white">Ir al login <Icons.ArrowRight className="h-3.5 w-3.5" /></a></div>
                <div className="text-[10px] font-mono break-all text-red-500/70">{emailDetails.accessLink}</div>
              </div>
            </div>
            <div className="flex justify-end"><button onClick={()=>setShowEmail(false)} className="h-8.5 px-4 rounded-xl bg-zinc-800 text-white text-xs font-bold">Cerrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
