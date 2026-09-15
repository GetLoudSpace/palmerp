"use client";
import React, { useCallback, useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { useSession } from "next-auth/react";
import { getTenantSlugClient } from "@/lib/clientStorage";
import { EDUCATION_INSTRUMENTS } from "../lib/instruments";

// Un profesor es siempre un User real (role PROFESSOR) + EduTeacherProfile.
// Esta pantalla solo lista lo que devuelve GET /api/education/teachers: sin seeds,
// sin localStorage. Crear un profesor crea su usuario (POST) y no puede existir sin él.
type Professor = {
  userId: string;
  profileId: string | null;
  name: string;
  email: string;
  instruments: string[];
  isActive: boolean;
  createdAt: string;
  lessonCount: number;
};

function genPass() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function ProfessorsManager() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role as string | undefined;
  const isAdmin = userRole === "ADMIN" || userRole === "DEV";
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Professor | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; instruments: string[] }>({ name: "", email: "", instruments: [] });
  const [emailDetails, setEmailDetails] = useState<{ to: string; name: string; tempPassword: string; accessLink: string } | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/education/teachers");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "No se pudieron cargar los profesores");
      setProfessors(Array.isArray(data?.teachers) ? data.teachers : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Error al cargar profesores");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener("palmera_users_updated", h);
    return () => window.removeEventListener("palmera_users_updated", h);
  }, [load]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const openCreate = () => {
    if (!isAdmin) return alert("Solo ADMIN puede crear profesores");
    setEditing(null);
    setForm({ name: "", email: "", instruments: [] });
    setShowForm(true);
  };

  const openEdit = (p: Professor) => {
    if (!isAdmin) return alert("Solo ADMIN puede editar profesores");
    setEditing(p);
    setForm({ name: p.name, email: p.email, instruments: p.instruments });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return alert("Solo ADMIN puede gestionar profesores");
    if (!form.name.trim() || (!editing && !form.email.trim())) return alert("Nombre y email requeridos");
    try {
      if (editing) {
        const res = await fetch("/api/education/teachers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: editing.userId, name: form.name, instruments: form.instruments }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return alert(data?.error || "Error al guardar");
        flash(`Profesor ${form.name} actualizado`);
      } else {
        const pass = genPass();
        const slug = getTenantSlugClient();
        const res = await fetch("/api/education/teachers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, email: form.email, instruments: form.instruments, password: pass }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return alert(data?.error || "Error al crear profesor");
        const host = window.location.host.replace(/^[^.]+\./, "");
        setEmailDetails({
          to: form.email,
          name: form.name,
          tempPassword: data?.tempPassword || pass,
          accessLink: `${window.location.protocol}//${slug}.${host}/login?onboarding=true&email=${encodeURIComponent(form.email)}`,
        });
        setShowEmail(true);
        flash(`Profesor ${form.name} creado con su usuario`);
      }
      setShowForm(false);
      setEditing(null);
      load();
      window.dispatchEvent(new Event("palmera_users_updated"));
    } catch {
      alert("Error de red al guardar el profesor");
    }
  };

  const toggle = async (p: Professor) => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/education/teachers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: p.userId, isActive: !p.isActive }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return alert(data?.error || "Error al cambiar el estado");
      flash(p.isActive ? `Profesor ${p.name} archivado (mantiene sus clases)` : `Profesor ${p.name} reactivado`);
      load();
    } catch {
      alert("Error de red");
    }
  };

  const remove = async (p: Professor) => {
    if (!isAdmin) return;
    const msg = p.lessonCount > 0
      ? `${p.name} tiene ${p.lessonCount} clase(s) en el histórico y no se puede eliminar. ¿Archivarlo en su lugar?`
      : `¿Eliminar a ${p.name}? Se borra también su usuario. Esta acción no se puede deshacer.`;
    if (!confirm(msg)) return;
    try {
      if (p.lessonCount > 0) return toggle({ ...p, isActive: true });
      const res = await fetch(`/api/education/teachers?userId=${encodeURIComponent(p.userId)}&hard=1`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) return alert(data?.error || "Error al eliminar");
      flash(`Profesor ${p.name} eliminado`);
      load();
      window.dispatchEvent(new Event("palmera_users_updated"));
    } catch {
      alert("Error de red");
    }
  };

  const filtered = professors.filter((p) => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {toast && <div className="fixed bottom-4 right-4 z-50 bg-foreground text-background px-4 py-2 rounded-xl text-xs font-bold">{toast}</div>}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black">Profesores ({filtered.length})</h2>
          <p className="text-xs text-muted-foreground">Cada profesor es un usuario del ERP con rol Profesor: al crearlo se crea su acceso y aparece aquí vinculado. Sin usuarios vinculados no hay profesores.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icons.Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="rounded-xl border border-border/40 bg-background pl-8 pr-3 py-2 text-xs w-44" />
          </div>
          <button onClick={openCreate} disabled={!isAdmin} className={`rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1 ${isAdmin ? "bg-foreground text-background" : "bg-muted text-muted-foreground cursor-not-allowed border border-border/40"}`} title={isAdmin ? "Crear profesor (crea su usuario)" : "Solo ADMIN"}><Icons.UserPlus className="h-4 w-4" /> Nuevo profesor</button>
        </div>
      </div>

      {loading && <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Cargando profesores reales…</div>}
      {!loading && loadError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-xs">
          <span className="font-bold text-red-600">No se pudieron cargar los profesores:</span> {loadError}{" "}
          <button onClick={load} className="underline font-bold">Reintentar</button>
        </div>
      )}

      {!loading && !loadError && (
        <div className="grid gap-3">
          {filtered.map((p) => (
            <div key={p.userId} className="rounded-2xl border border-border/40 bg-card p-4 flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 font-black border border-amber-500/20">{p.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="text-sm font-bold flex flex-wrap items-center gap-2">{p.name}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${p.isActive ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "bg-stone-500/10 border-stone-500/20"}`}>{p.isActive ? "Activo" : "Archivado"}</span>
                    <span className="rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20 px-2 py-0.5 text-[10px]">Profesor · usuario vinculado</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-2"><span>{p.email}</span><span>· {p.lessonCount} clase(s)</span></div>
                  <div className="mt-1 flex flex-wrap gap-1">{(p.instruments || []).map((k) => <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{k}</span>)}{p.instruments.length === 0 && <span className="text-[10px] text-muted-foreground">Sin instrumentos asignados</span>}</div>
                  <div className="text-[11px] text-muted-foreground">Usuario desde el {new Date(p.createdAt).toLocaleDateString("es-ES")}</div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {isAdmin ? (
                  <>
                    <button onClick={() => openEdit(p)} className="rounded-lg border border-border/40 p-2 text-xs flex items-center gap-1" title="Editar nombre e instrumentos"><Icons.Pencil className="h-4 w-4" /></button>
                    <button onClick={() => toggle(p)} className="rounded-lg border border-border/40 p-2 text-xs" title={p.isActive ? "Archivar (mantiene clases)" : "Reactivar"}>{p.isActive ? "Archivar" : "Activar"}</button>
                    <button onClick={() => remove(p)} className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-600" title="Eliminar (solo si no tiene clases)"><Icons.Trash2 className="h-4 w-4" /></button>
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground px-2">Solo ADMIN</span>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sin profesores. Crea el primero con “Nuevo profesor” (se creará su usuario) o asigna el rol Profesor a un usuario existente en Ajustes → Usuarios.</div>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4">
          <form onSubmit={submit} className="w-full max-w-xl rounded-t-[1.5rem] md:rounded-2xl bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between"><h3 className="font-bold">{editing ? "Editar profesor" : "Nuevo profesor (crea su usuario)"}</h3><button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="p-2"><Icons.X className="h-5 w-5" /></button></div>
            <p className="text-xs text-muted-foreground">{editing ? "Edita el nombre y los instrumentos. El acceso sigue siendo el mismo usuario." : "Se creará un User con rol Profesor + su perfil. No se puede crear un profesor sin usuario."}</p>
            <div className="mt-3 grid gap-3">
              <label className="text-xs font-bold">Nombre*<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Ana García" className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm" /></label>
              {!editing && <label className="text-xs font-bold">Email* (será su acceso)<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ana@academia.es" className="mt-1 w-full rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm" /></label>}
              <div className="text-xs font-bold">Instrumentos que imparte<div className="mt-1 flex flex-wrap gap-1">{Object.values(EDUCATION_INSTRUMENTS).filter((i) => i.key !== "COMMON").map((ins) => { const active = form.instruments.includes(ins.key); return <button type="button" key={ins.key} onClick={() => setForm({ ...form, instruments: active ? form.instruments.filter((k) => k !== ins.key) : [...form.instruments, ins.key] })} className={`rounded-full border px-3 py-1 text-xs ${active ? "bg-amber-500 text-white" : "bg-background"}`}>{ins.label}</button>; })}</div></div>
            </div>
            <button type="submit" className="mt-4 w-full rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background">{editing ? "Guardar cambios" : "Crear profesor y su usuario"}</button>
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
                <div className="flex"><span className="w-16 font-bold uppercase text-[9px] text-muted-foreground/60">Asunto:</span><span className="text-white font-bold">Invitación Profesor — Acceso Educación</span></div>
              </div>
              <div className="p-4 space-y-3 text-foreground/90 text-[11px] leading-relaxed">
                <p>Hola <strong>{emailDetails.name}</strong>, has sido dado de alta como <strong>Profesor</strong> (usuario del ERP).</p>
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-border/30 space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Rol:</span><span className="font-bold text-blue-400">PROFESSOR · acceso Educación</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Contraseña temporal:</span><span className="font-mono text-emerald-400">{emailDetails.tempPassword}</span></div>
                </div>
                <div className="text-center py-2"><a href={emailDetails.accessLink} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-[10px] font-bold text-white">Activar acceso <Icons.ArrowRight className="h-3.5 w-3.5" /></a></div>
                <div className="text-[10px] font-mono break-all text-amber-500/70">{emailDetails.accessLink}</div>
              </div>
            </div>
            <div className="flex justify-end"><button onClick={() => setShowEmail(false)} className="h-8.5 px-4 rounded-xl bg-zinc-800 text-white text-xs font-bold">Cerrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
