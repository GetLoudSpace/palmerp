// src/app/admin/settings/users/page.tsx
// Ficha real de usuarios (Postgres vía /api/admin/users).
// Nivel: DEV (técnico externo) · ADMIN (gerencia) · USUARIO (empleado).
// Solo al USUARIO se le configuran roles de trabajo (PROFESOR/COMERCIAL/FINANZAS)
// + módulos extra puntuales + instrumentos si es profesor.
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { useSession } from "next-auth/react";
import EditableLabel from "@/components/admin/EditableLabel";
import SmartSearchInput from "@/components/SmartSearchInput";
import { ASSIGNABLE_MODULES, WORK_ROLES, describeAccess, resolveAccess } from "@/lib/access";
import { EDUCATION_INSTRUMENTS } from "@/modules/education/lib/instruments";

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "DEV" | "ADMIN" | "USUARIO";
  isActive: boolean;
  workRoles: string[];
  extraModules: string[];
  instruments: string[];
  createdAt: string;
}

const LEVEL_META: Record<string, { label: string; desc: string }> = {
  DEV: { label: "DEV — Técnico externo", desc: "Ve TODO, incluido lo técnico. Solo otro DEV puede crear usuarios DEV." },
  ADMIN: { label: "ADMIN — Gerencia", desc: "Ve TODO lo funcional: usuarios (no DEV), credenciales, modos y ajustes." },
  USUARIO: { label: "USUARIO — Empleado", desc: "Solo lo que le den sus roles de trabajo + módulos extra." },
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Error de red");
  return data;
}

export default function UsersSettingsPage() {
  const { data: session } = useSession();
  const callerIsDev = (session?.user as { role?: string } | undefined)?.role === "DEV";
  const callerId = (session?.user as { id?: string } | undefined)?.id;

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"ALL" | "DEV" | "ADMIN" | "USUARIO">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDetails, setEmailDetails] = useState<{ to: string; name: string; role: string; tempPassword?: string; accessLink: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    level: "USUARIO" as "DEV" | "ADMIN" | "USUARIO",
    workRoles: [] as string[],
    extraModules: [] as string[],
    instruments: [] as string[],
    isActive: true,
    password: "",
  });

  const triggerToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    toastTimer.current = setTimeout(() => setToastMessage(null), 4000);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/api/admin/users");
      setUsers(data.users || []);
    } catch (e: unknown) {
      triggerToast(e instanceof Error ? e.message : "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    load();
    // Preset ?preset=PROFESOR (botón "Nuevo profesor" desde Educación).
    try {
      const preset = new URLSearchParams(window.location.search).get("preset");
      if (preset && WORK_ROLES.some((r) => r.id === preset)) {
        setFormData((p) => ({ ...p, level: "USUARIO", workRoles: [preset] }));
        setEditingUser(null);
        setIsModalOpen(true);
      }
    } catch {}
  }, [load]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ name: "", email: "", level: "USUARIO", workRoles: [], extraModules: [], instruments: [], isActive: true, password: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (user: ApiUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      level: user.role,
      workRoles: user.workRoles || [],
      extraModules: user.extraModules || [],
      instruments: user.instruments || [],
      isActive: user.isActive,
      password: "",
    });
    setIsModalOpen(true);
  };

  const toggleWorkRole = (id: string) =>
    setFormData((p) => ({ ...p, workRoles: p.workRoles.includes(id) ? p.workRoles.filter((w) => w !== id) : [...p.workRoles, id] }));

  const toggleExtra = (id: string) =>
    setFormData((p) => ({ ...p, extraModules: p.extraModules.includes(id) ? p.extraModules.filter((m) => m !== id) : [...p.extraModules, id] }));

  const toggleInstrument = (key: string) =>
    setFormData((p) => ({ ...p, instruments: p.instruments.includes(key) ? p.instruments.filter((k) => k !== key) : [...p.instruments, key] }));

  const preview = useMemo(
    () => describeAccess(resolveAccess({ role: formData.level, workRoles: formData.workRoles, extraModules: formData.extraModules })),
    [formData.level, formData.workRoles, formData.extraModules]
  );

  const accessLinkFor = (email: string) =>
    `${window.location.protocol}//${window.location.host}/login?onboarding=true&email=${encodeURIComponent(email)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return alert("Nombre y email requeridos.");
    setSaving(true);
    try {
      if (editingUser) {
        const data = await api("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingUser.id,
            name: formData.name,
            level: formData.level,
            workRoles: formData.workRoles,
            extraModules: formData.extraModules,
            instruments: formData.instruments,
            isActive: formData.isActive,
            ...(formData.password.trim() ? { password: formData.password.trim() } : {}),
          }),
        });
        triggerToast(`¡Ficha de ${formData.name} actualizada!`);
        if (data.tempPassword) {
          setEmailDetails({ to: formData.email, name: formData.name, role: formData.level, tempPassword: data.tempPassword, accessLink: accessLinkFor(formData.email) });
          setShowEmailModal(true);
        }
      } else {
        const data = await api("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            level: formData.level,
            workRoles: formData.workRoles,
            extraModules: formData.extraModules,
            instruments: formData.instruments,
            isActive: formData.isActive,
            ...(formData.password.trim() ? { password: formData.password.trim() } : {}),
          }),
        });
        triggerToast(`¡Usuario ${formData.name} creado con éxito!`);
        setEmailDetails({ to: formData.email, name: formData.name, role: formData.level, tempPassword: data.tempPassword, accessLink: accessLinkFor(formData.email) });
        setShowEmailModal(true);
      }
      setIsModalOpen(false);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error guardando");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: ApiUser) => {
    if (user.id === callerId && user.isActive) return alert("No puedes desactivarte a ti mismo.");
    try {
      await api("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
      });
      triggerToast(`Usuario ${user.name} ahora está ${!user.isActive ? "activo" : "archivado"}`);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error cambiando estado");
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesText = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.workRoles || []).join(" ").toLowerCase().includes(q);
    return matchesText && (filterRole === "ALL" || u.role === filterRole);
  });

  const isProfessorSelected = formData.level === "USUARIO" && formData.workRoles.includes("PROFESOR");

  return (
    <div className="space-y-6 relative">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] bg-linear-to-r from-emerald-600 to-emerald-500 text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-xl border border-emerald-400 backdrop-blur-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-300">
          <Icons.CheckCircle className="h-5 w-5 text-white animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-4">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
            <EditableLabel apiKey="users.page.title" defaultValue="Usuarios & Niveles de Acceso" />
          </div>
          <div className="text-xs text-muted-foreground block mt-1">
            <EditableLabel apiKey="users.page.desc" defaultValue="DEV (técnico externo) y ADMIN (gerencia) ven todo. Al USUARIO se le asignan roles de trabajo y módulos extra." />
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-metallic-red px-4 text-xs font-bold shadow-md shadow-red-500/25 cursor-pointer"
        >
          <Icons.UserPlus className="h-4 w-4" />
          <span>Nuevo usuario</span>
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3 bg-muted/20 border border-border/40 p-4 rounded-xl">
        <SmartSearchInput value={searchQuery} onChange={setSearchQuery} suggestions={users.flatMap((u) => [u.name, u.email])} placeholder="Buscar por nombre, correo o rol..." className="md:col-span-2" />
        <div className="flex gap-2">
          <button
            onClick={() => {
              const order: ("ALL" | "DEV" | "ADMIN" | "USUARIO")[] = ["ALL", "DEV", "ADMIN", "USUARIO"];
              setFilterRole(order[(order.indexOf(filterRole) + 1) % order.length]);
            }}
            className={`flex-1 inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold px-2 transition-all ${
              filterRole !== "ALL" ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-500" : "border-border/50 bg-background text-foreground hover:bg-muted"
            }`}
          >
            <Icons.ShieldAlert className="h-3.5 w-3.5" />
            <span>{filterRole === "ALL" ? "Nivel: Todos" : `Nivel: ${filterRole}`}</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 select-none">
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Usuario</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Nivel / Roles</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Verá</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado</th>
                <th className="px-6 py-3.5 text-right w-24">
                  <button onClick={openCreateModal} className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-metallic-red shadow-md shadow-red-500/20 transition-all hover:scale-105 duration-200 cursor-pointer" title="Añadir nuevo usuario (+)">
                    <Icons.Plus className="h-4.5 w-4.5" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground"><Icons.Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />Cargando usuarios reales…</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    <Icons.UserX className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                    <span>Sin usuarios. Crea el primero con el +.</span>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const access = resolveAccess({ role: user.role, workRoles: user.workRoles, extraModules: user.extraModules });
                  return (
                    <tr key={user.id} className="group border-b border-border/40 hover:bg-muted/30 transition-all duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-extrabold border transition-transform group-hover:scale-105 duration-200 ${
                            user.role === "DEV" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            : user.role === "ADMIN" ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground block">{user.name}</span>
                            <a href={`mailto:${user.email}`} className="text-[10px] text-muted-foreground block font-mono hover:text-red-500">{user.email}</a>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border ${
                          user.role === "DEV" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          : user.role === "ADMIN" ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        }`}>
                          {user.role === "DEV" ? <><Icons.Wrench className="h-3 w-3" /><span>Dev · externo</span></>
                          : user.role === "ADMIN" ? <><Icons.ShieldCheck className="h-3 w-3" /><span>Admin · gerencia</span></>
                          : <><Icons.User className="h-3 w-3" /><span>Usuario</span></>}
                        </span>
                        {user.role === "USUARIO" && (user.workRoles || []).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(user.workRoles || []).map((w) => (
                              <span key={w} className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                {WORK_ROLES.find((r) => r.id === w)?.label || w}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[10px] text-muted-foreground max-w-[220px]">
                        {describeAccess(access).join(" · ")}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActive(user)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold border transition-all cursor-pointer ${
                            user.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" : "bg-stone-500/10 text-stone-500 border-stone-500/25"
                          }`}
                          title="Archivar / reactivar (la baja es lógica, conserva histórico)"
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-500 animate-pulse" : "bg-stone-500"}`} />
                          <span>{user.isActive ? "Activo" : "Archivado"}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button onClick={() => openEditModal(user)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150" title="Editar ficha y accesos">
                            <Icons.Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border/50 bg-card p-6 text-card-foreground shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
              <h3 className="text-lg font-bold text-foreground">{editingUser ? "Editar ficha y accesos" : "Nuevo usuario"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Nombre completo</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Ana García" className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Email (login)</label>
                  <input type="email" required disabled={!!editingUser} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="ana@empresa.es" className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500 disabled:opacity-60" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Contraseña {editingUser ? "(vacío = mantener)" : "(vacío = autogenerar)"}</label>
                  <input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Mínimo 8 caracteres" className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Estado</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="rounded-sm border-border text-red-500 focus:ring-red-500 h-4.5 w-4.5" />
                    <span className="text-xs font-bold text-foreground">Cuenta activa</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Nivel</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(["DEV", "ADMIN", "USUARIO"] as const).map((lvl) => {
                    if (lvl === "DEV" && !callerIsDev) return null;
                    const active = formData.level === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setFormData({ ...formData, level: lvl })}
                        className={`rounded-xl border p-3 text-left transition ${active ? "border-red-500 bg-red-500/10" : "border-border/50 hover:bg-muted"}`}
                      >
                        <div className="text-xs font-black">{lvl === "DEV" ? "🛠️ DEV" : lvl === "ADMIN" ? "👑 ADMIN" : "👥 USUARIO"}</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{lvl === "DEV" ? "Técnico externo" : lvl === "ADMIN" ? "Gerencia" : "Empleado"}</div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">{LEVEL_META[formData.level].desc}</p>
              </div>

              {formData.level === "USUARIO" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Roles de trabajo (qué hace)</label>
                    <div className="flex flex-wrap gap-2">
                      {WORK_ROLES.map((r) => {
                        const active = formData.workRoles.includes(r.id);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => toggleWorkRole(r.id)}
                            title={r.description}
                            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${active ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "border-border/50 text-muted-foreground hover:bg-muted"}`}
                          >
                            {active ? "✓ " : ""}{r.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground">PROFESOR → Educación + Contactos · COMERCIAL → Ventas + Contactos · FINANZAS → Finanzas.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Módulos extra (excepciones puntuales)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto rounded-xl border border-border/40 p-2">
                      {ASSIGNABLE_MODULES.map((m) => {
                        const active = formData.extraModules.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggleExtra(m.id)}
                            className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold text-left transition ${active ? "border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-300" : "border-border/40 text-muted-foreground hover:bg-muted"}`}
                          >
                            {active ? "✓ " : ""}{m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {isProfessorSelected && (
                    <div className="space-y-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
                      <label className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">🎸 Instrumentos que imparte</label>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.values(EDUCATION_INSTRUMENTS).filter((i) => i.key !== "COMMON").map((ins) => {
                          const active = formData.instruments.includes(ins.key);
                          return (
                            <button
                              key={ins.key}
                              type="button"
                              onClick={() => toggleInstrument(ins.key)}
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${active ? "bg-red-500 text-white border-red-500" : "bg-background border-border/50"}`}
                            >
                              {ins.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                    <div className="flex gap-2.5 items-start">
                      <Icons.Eye className="h-4.5 w-4.5 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-extrabold block uppercase tracking-widest mb-0.5">Verá</span>
                        <p className="text-[11px] leading-relaxed">{preview.join(" · ")}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-muted">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-metallic-red px-5 text-xs font-bold shadow-md shadow-red-500/25 transition-all cursor-pointer disabled:opacity-50">
                  {saving ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Save className="h-4 w-4" />}
                  <span>Guardar usuario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEmailModal && emailDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-zinc-950 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl relative space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[10px] font-bold text-emerald-400">
              <Icons.Send className="h-3 w-3 animate-bounce" />
              <span>Acceso creado — entrega esta clave al usuario</span>
            </div>
            <div className="rounded-2xl bg-zinc-900 border border-border/50 overflow-hidden text-xs">
              <div className="bg-zinc-800/50 p-3.5 border-b border-border/40 space-y-1.5">
                <div className="flex text-muted-foreground">
                  <span className="w-16 font-bold uppercase text-[9px] text-muted-foreground/60">Para:</span>
                  <span className="text-emerald-400 font-medium">{emailDetails.name} &lt;{emailDetails.to}&gt;</span>
                </div>
                <div className="flex text-muted-foreground">
                  <span className="w-16 font-bold uppercase text-[9px] text-muted-foreground/60">Nivel:</span>
                  <span className="text-white font-bold">{emailDetails.role}</span>
                </div>
              </div>
              <div className="p-4 space-y-4 text-foreground/90 font-sans leading-relaxed text-[11px]">
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-border/30 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contraseña temporal:</span>
                    <span className="font-bold text-emerald-400 font-mono">{emailDetails.tempPassword}</span>
                  </div>
                </div>
                <div className="text-center py-2">
                  <a href={emailDetails.accessLink} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 font-bold text-white transition-all px-4 text-[10px]">
                    <span>Ir al login</span>
                    <Icons.ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="text-[10px] text-muted-foreground border-t border-border/20 pt-3 font-mono break-all leading-normal">
                  URL de enlace directo: <br />
                  <span className="text-red-500/70">{emailDetails.accessLink}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setShowEmailModal(false)} className="h-8.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-all cursor-pointer">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
