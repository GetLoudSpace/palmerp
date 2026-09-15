"use client";

import React, { useCallback, useEffect, useState } from "react";
import * as Icons from "lucide-react";
import EditableLabel from "@/components/admin/EditableLabel";
import SmartSearchInput from "@/components/SmartSearchInput";
import { EDUCATION_INSTRUMENTS } from "@/modules/education/lib/instruments";

// Usuarios reales del tenant vía /api/admin/users (sin demos ni localStorage).
// Rol PROFESOR = User + EduTeacherProfile: aparece vinculado en la sección Profesor.
// No se puede crear un profesor sin usuario: ambas pantallas usan el mismo User.
type Role = "DEV" | "ADMIN" | "PROFESSOR" | "STAFF";

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string | null;
  isProfessor: boolean;
  instruments: string[];
  profileActive: boolean | null;
}

const ROLE_META: Record<Role, { label: string; desc: string; badge: string }> = {
  DEV: {
    label: "Developer",
    desc: "Permisos críticos: código base, base de datos y auditoría en crudo. Solo ingenieros.",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  ADMIN: {
    label: "Administrador",
    desc: "Acceso total: ajustes de empresa, usuarios y módulos del ERP.",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  PROFESSOR: {
    label: "Profesor",
    desc: "Usuario vinculado a Educación: imparte clases y aparece en la sección Profesor con sus instrumentos. No toca el core.",
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
  STAFF: {
    label: "Usuario estándar",
    desc: "Acceso operativo: contactos, conversaciones y su perfil. Sin administración.",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
};

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"ALL" | Role>("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDetails, setEmailDetails] = useState<{
    to: string;
    name: string;
    role: string;
    tempPassword?: string;
    accessLink: string;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "STAFF" as Role,
    password: "",
    instruments: [] as string[],
    isActive: true,
  });

  const generateSecurePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pw = "Aa1!";
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw.split("").sort(() => 0.5 - Math.random()).join("");
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "No se pudieron cargar los usuarios");
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Error al cargar usuarios");
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

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ name: "", email: "", role: "STAFF", password: "", instruments: [], isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (user: ApiUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
      instruments: user.instruments,
      isActive: user.profileActive ?? true,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (user: ApiUser) => {
    if (!confirm(`¿Eliminar a ${user.name}?${user.isProfessor ? " Se desvincula también de Profesor." : ""}`)) return;
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) return alert(data?.error || "Error al eliminar");
      triggerToast(`Usuario ${user.name} eliminado`);
      load();
    } catch {
      alert("Error de red al eliminar");
    }
  };

  const toggleProfessorStatus = async (user: ApiUser) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !(user.profileActive ?? true) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return alert(data?.error || "Error al cambiar el estado");
      triggerToast(`Profesor ${user.name} ${user.profileActive ? "archivado" : "reactivado"}`);
      load();
      window.dispatchEvent(new Event("palmera_users_updated"));
    } catch {
      alert("Error de red");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return alert("Nombre y email requeridos.");
    try {
      if (editingUser) {
        const payload: Record<string, unknown> = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        };
        if (formData.role === "PROFESSOR") {
          payload.instruments = formData.instruments;
          payload.isActive = formData.isActive;
        }
        if (formData.password.trim()) payload.password = formData.password.trim();
        const res = await fetch(`/api/admin/users/${encodeURIComponent(editingUser.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return alert(data?.error || "Error al guardar");
        triggerToast(`Usuario ${formData.name} actualizado`);
        if (data?.tempPassword) {
          setEmailDetails({
            to: formData.email,
            name: formData.name,
            role: formData.role,
            tempPassword: data.tempPassword,
            accessLink: `${window.location.origin}/login?onboarding=true&email=${encodeURIComponent(formData.email)}`,
          });
          setShowEmailModal(true);
        }
      } else {
        const password = formData.password.trim() || generateSecurePassword();
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            role: formData.role,
            password,
            instruments: formData.role === "PROFESSOR" ? formData.instruments : [],
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return alert(data?.error || "Error al crear");
        triggerToast(
          formData.role === "PROFESSOR"
            ? `Profesor ${formData.name} creado y vinculado`
            : `Usuario ${formData.name} creado`,
        );
        setEmailDetails({
          to: formData.email,
          name: formData.name,
          role: formData.role,
          tempPassword: data?.tempPassword || password,
          accessLink: `${window.location.origin}/login?onboarding=true&email=${encodeURIComponent(formData.email)}`,
        });
        setShowEmailModal(true);
      }
      setIsModalOpen(false);
      load();
      window.dispatchEvent(new Event("palmera_users_updated"));
    } catch {
      alert("Error de red al guardar");
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    const matchesText =
      u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
    const matchesRole = filterRole === "ALL" || u.role === filterRole;
    return matchesText && matchesRole;
  });

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
            <EditableLabel apiKey="users.page.desc" defaultValue="Usuarios reales del tenant. Con rol Profesor se vinculan a la sección Profesor." />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-metallic-orange px-4 text-xs font-bold shadow-md shadow-orange-500/20 transition-all hover:scale-105 duration-200 cursor-pointer"
          >
            <Icons.Plus className="h-4 w-4" />
            <span>Nuevo usuario</span>
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 bg-muted/20 border border-border/40 p-4 rounded-xl">
        <SmartSearchInput value={searchQuery} onChange={setSearchQuery} suggestions={users.flatMap((user) => [user.name, user.email])} placeholder="Buscar por nombre o correo..." className="md:col-span-2" />
        <div className="flex gap-2">
          <button
            onClick={() => {
              const order: ("ALL" | Role)[] = ["ALL", "DEV", "ADMIN", "PROFESSOR", "STAFF"];
              setFilterRole(order[(order.indexOf(filterRole) + 1) % order.length]);
            }}
            className={`flex-1 inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold px-2 transition-all ${
              filterRole !== "ALL"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-500"
                : "border-border/50 bg-background text-foreground hover:bg-muted"
            }`}
          >
            <Icons.ShieldAlert className="h-3.5 w-3.5" />
            <span>
              {filterRole === "ALL" ? "Nivel: Todos" : filterRole === "PROFESSOR" ? "Nivel: Profesor" : filterRole === "STAFF" ? "Nivel: Usuario" : `Nivel: ${filterRole}`}
            </span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 select-none">
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Usuario</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Nivel de Acceso</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Profesor</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Creado</th>
                <th className="px-6 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">Cargando usuarios reales…</td></tr>
              ) : loadError ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">No se pudieron cargar: {loadError} <button onClick={load} className="underline font-bold">Reintentar</button></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    <Icons.UserX className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                    <span>No hay usuarios. Crea el primero con “Nuevo usuario”.</span>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="group border-b border-border/40 hover:bg-muted/30 transition-all duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-extrabold border transition-transform group-hover:scale-105 duration-200 ${ROLE_META[user.role]?.badge ?? ROLE_META.STAFF.badge}`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">{user.name}</span>
                          <a href={`mailto:${user.email}`} className="text-[10px] text-muted-foreground font-mono hover:text-amber-500">{user.email}</a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border ${ROLE_META[user.role]?.badge ?? ROLE_META.STAFF.badge}`}>
                        <span>{ROLE_META[user.role]?.label ?? user.role}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.isProfessor ? (
                        <div className="flex flex-wrap gap-1 max-w-44">
                          {user.instruments.length === 0 && <span className="text-[10px] text-muted-foreground">Vinculado · sin instrumentos</span>}
                          {user.instruments.map((k) => <span key={k} className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-bold">{k}</span>)}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.isProfessor ? (
                        <button
                          onClick={() => toggleProfessorStatus(user)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold border transition-all cursor-pointer ${
                            user.profileActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                              : "bg-stone-500/10 text-stone-500 border-stone-500/25"
                          }`}
                          title="Archivar mantiene sus clases"
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${user.profileActive ? "bg-emerald-500 animate-pulse" : "bg-stone-500"}`} />
                          <span>{user.profileActive ? "Activo" : "Archivado"}</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>Activo</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[10px] font-medium text-muted-foreground">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={() => openEditModal(user)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150" title="Editar usuario">
                          <Icons.Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(user)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-all duration-150" title="Eliminar usuario">
                          <Icons.Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border/50 bg-card p-6 text-card-foreground shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
              <h3 className="text-lg font-bold text-foreground">
                {editingUser ? "Editar usuario" : "Registrar nuevo usuario"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Nombre completo</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Ana García" className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-amber-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Email (acceso)</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="ana@academia.es" className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-amber-500" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">{editingUser ? "Nueva contraseña (opcional)" : "Contraseña"}</label>
                    <button type="button" onClick={() => setFormData({ ...formData, password: generateSecurePassword() })} className="text-[10px] text-amber-500 font-bold hover:underline cursor-pointer flex items-center gap-1">
                      <Icons.KeyRound className="h-3 w-3" />
                      <span>Autogenerar</span>
                    </button>
                  </div>
                  <input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={editingUser ? "Vacío = no cambiar" : "Vacío = autogenerada"} className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-amber-500 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Nivel de acceso</label>
                  <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })} className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-amber-500 font-semibold">
                    <option value="STAFF">👥 Usuario estándar</option>
                    <option value="PROFESSOR">🎸 Profesor (vincula a Educación)</option>
                    <option value="ADMIN">👑 Administrador del ERP</option>
                    <option value="DEV">🛠️ Developer</option>
                  </select>
                </div>
              </div>

              {formData.role === "PROFESSOR" && (
                <div className="space-y-3 rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
                  <div className="text-xs font-bold uppercase text-violet-600 dark:text-violet-400">Perfil de profesor (Educación)</div>
                  <div className="text-xs font-bold">Instrumentos que imparte
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.values(EDUCATION_INSTRUMENTS).filter((i) => i.key !== "COMMON").map((ins) => {
                        const active = formData.instruments.includes(ins.key);
                        return <button type="button" key={ins.key} onClick={() => setFormData({ ...formData, instruments: active ? formData.instruments.filter((k) => k !== ins.key) : [...formData.instruments, ins.key] })} className={`rounded-full border px-3 py-1 text-xs ${active ? "bg-violet-500 text-white" : "bg-background"}`}>{ins.label}</button>;
                      })}
                    </div>
                  </div>
                  {editingUser && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="h-4 w-4 rounded-sm border-border text-amber-500 focus:ring-amber-500" />
                      <span className="text-xs font-bold">Profesor activo (desmarcar = archivar, mantiene clases)</span>
                    </label>
                  )}
                </div>
              )}

              <div className={`p-4 rounded-xl border transition-all ${formData.role === "PROFESSOR" ? "bg-violet-500/5 border-violet-500/20 text-violet-800 dark:text-violet-400" : "bg-blue-500/5 border-blue-500/20 text-blue-800 dark:text-blue-400"}`}>
                <div className="flex gap-2.5 items-start">
                  <Icons.ShieldAlert className="h-4.5 w-4.5 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-extrabold block uppercase tracking-widest mb-0.5">Alcance: {ROLE_META[formData.role].label}</span>
                    <p className="text-[11px] leading-relaxed">{ROLE_META[formData.role].desc}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-muted">Cancelar</button>
                <button type="submit" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-metallic-orange px-5 text-xs font-bold shadow-md shadow-orange-500/25 transition-all cursor-pointer">
                  <Icons.Save className="h-4 w-4" />
                  <span>{editingUser ? "Guardar cambios" : formData.role === "PROFESSOR" ? "Crear profesor" : "Crear usuario"}</span>
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
              <span>Simulación de Servidor de Correo (SMTP Outbox)</span>
            </div>
            <div className="rounded-2xl bg-zinc-900 border border-border/50 overflow-hidden text-xs">
              <div className="bg-zinc-800/50 p-3.5 border-b border-border/40 space-y-1.5">
                <div className="flex text-muted-foreground">
                  <span className="w-16 font-bold uppercase text-[9px] text-muted-foreground/60">Para:</span>
                  <span className="text-emerald-400 font-medium">{emailDetails.name} &lt;{emailDetails.to}&gt;</span>
                </div>
                <div className="flex text-muted-foreground">
                  <span className="w-16 font-bold uppercase text-[9px] text-muted-foreground/60">Asunto:</span>
                  <span className="text-white font-bold">Bienvenido a Palmera — tu acceso</span>
                </div>
              </div>
              <div className="p-4 space-y-4 text-foreground/90 font-sans leading-relaxed text-[11px]">
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-border/30 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nivel concedido:</span>
                    <span className="font-bold text-amber-500 font-mono text-[9px]">{emailDetails.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contraseña:</span>
                    <span className="font-bold text-emerald-400 font-mono">{emailDetails.tempPassword}</span>
                  </div>
                </div>
                <div className="text-center py-2">
                  <a href={emailDetails.accessLink} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 font-bold text-white transition-all px-4 text-[10px]">
                    <span>Acceder</span>
                    <Icons.ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="text-[10px] text-muted-foreground border-t border-border/20 pt-3 font-mono break-all leading-normal">
                  <span className="text-amber-500/70">{emailDetails.accessLink}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setShowEmailModal(false)} className="h-8.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-all cursor-pointer">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
