"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import EditableLabel from "@/components/admin/EditableLabel";
import SmartSearchInput from "@/components/SmartSearchInput";

interface SystemUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "DEV" | "ADMIN" | "USUARIO";
  isActive: boolean;
  notes?: string;
  createdAt: string;
  lastLogin?: string;
}

const initialDemoUsers: SystemUser[] = [
  {
    id: "u1",
    name: "Super Developer",
    username: "dev_palm",
    email: "dev@palmera.io",
    role: "DEV",
    isActive: true,
    notes: "Desarrollador principal del sistema. Acceso completo a logs y base de datos.",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    lastLogin: new Date().toISOString(),
  },
  {
    id: "u2",
    name: "Renato García",
    username: "renato_admin",
    email: "renato@palmera.io",
    role: "ADMIN",
    isActive: true,
    notes: "Líder de TI y administrador del core del ERP.",
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
    lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
  },
  {
    id: "u3",
    name: "Silvia Fernández",
    username: "silvia_ops",
    email: "silvia@palmera.io",
    role: "USUARIO",
    isActive: true,
    notes: "Directora de operaciones. Acceso a la gestión de contactos y conversaciones.",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

export default function UsersSettingsPage() {
  // --- States ---
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"ALL" | "DEV" | "ADMIN" | "USUARIO">("ALL");

  // CRUD Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  // Simulated Email Modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDetails, setEmailDetails] = useState<{
    to: string;
    name: string;
    role: string;
    tempPassword?: string;
    accessLink: string;
  } | null>(null);

  // Floating Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    role: "USUARIO" as "DEV" | "ADMIN" | "USUARIO",
    isActive: true,
    password: "",
    notes: "",
  });

  const generateSecurePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let password = "";
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    password += "0123456789"[Math.floor(Math.random() * 10)];
    password += "!@#$%^&*"[Math.floor(Math.random() * 8)];
    for (let i = 0; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  };

  // --- Load and Save from LocalStorage ---
  useEffect(() => {
    const { getTenantStorageKey } = require("@/lib/clientStorage");
    const key = getTenantStorageKey("palmera_users");
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setUsers(JSON.parse(saved));
      } catch (e) {
        setUsers(initialDemoUsers);
      }
    } else {
      setUsers(initialDemoUsers);
      localStorage.setItem(key, JSON.stringify(initialDemoUsers));
    }
  }, []);

  const saveUsers = (updated: SystemUser[]) => {
    setUsers(updated);
    const { getTenantStorageKey } = require("@/lib/clientStorage");
    const key = getTenantStorageKey("palmera_users");
    localStorage.setItem(key, JSON.stringify(updated));
  };

  // --- Toast Trigger Helper ---
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- Audit Log Tracker Helper ---
  const trackAuditLog = (action: string, details: string) => {
    try {
      const { getTenantStorageKey } = require("@/lib/clientStorage");
      const logsKey = getTenantStorageKey("palmera_audit_logs");
      const savedLogs = localStorage.getItem(logsKey) || "[]";
      const logs = JSON.parse(savedLogs);
      const newLog = {
        id: "log_" + Date.now(),
        action,
        details,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(logsKey, JSON.stringify([newLog, ...logs].slice(0, 15)));
    } catch (e) {
      console.error("Failed to write audit log", e);
    }
  };

  // --- CRUD Modal Actions ---
  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      username: "",
      email: "",
      role: "USUARIO",
      isActive: true,
      password: "••••••••",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: SystemUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      password: "••••••••",
      notes: user.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (id === "u1" || id === "u2") {
      alert("Por motivos de seguridad, no se pueden eliminar los usuarios base iniciales (Super Developer y Renato Admin).");
      return;
    }
    if (confirm("¿Estás seguro de que deseas eliminar este usuario de la plataforma?")) {
      const deletedUser = users.find((u) => u.id === id);
      const filtered = users.filter((u) => u.id !== id);
      saveUsers(filtered);
      
      triggerToast(`¡Usuario ${deletedUser?.name} eliminado con éxito!`);
      trackAuditLog("USER_DELETED", `Usuario ${deletedUser?.username} (${deletedUser?.email}) fue eliminado del ERP.`);
    }
  };

  const toggleUserStatus = (user: SystemUser) => {
    if (user.id === "u1") {
      alert("No se puede desactivar al desarrollador principal del sistema.");
      return;
    }
    const updated = users.map((u) =>
      u.id === user.id ? { ...u, isActive: !u.isActive } : u
    );
    saveUsers(updated);
    
    const statusText = !user.isActive ? "Activado" : "Desactivado";
    triggerToast(`Usuario ${user.name} ahora está ${statusText.toLowerCase()}`);
    trackAuditLog("USER_STATUS_TOGGLED", `El estado del usuario ${user.username} cambió a ${statusText.toUpperCase()}.`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim() || !formData.email.trim()) {
      return alert("Por favor complete los campos requeridos.");
    }

    if (editingUser) {
      // Edit
      const updated = users.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              name: formData.name,
              username: formData.username,
              email: formData.email,
              role: formData.role,
              isActive: formData.isActive,
              notes: formData.notes,
            }
          : u
      );
      saveUsers(updated);
      triggerToast(`¡Ficha de ${formData.name} actualizada!`);
      trackAuditLog("USER_UPDATED", `Detalles del usuario ${formData.username} actualizados. Nivel: ${formData.role}.`);

      // If password was updated (i.e. not default mask)
      if (formData.password !== "••••••••" && formData.password.trim() !== "") {
        const accessLink = `${window.location.protocol}//${window.location.host}/login?onboarding=true&email=${encodeURIComponent(formData.email)}`;
        setEmailDetails({
          to: formData.email,
          name: formData.name,
          role: formData.role,
          tempPassword: formData.password,
          accessLink,
        });
        setShowEmailModal(true);
      }
    } else {
      // Create
      const passwordToUse = (formData.password === "••••••••" || !formData.password) ? generateSecurePassword() : formData.password;
      const newUser: SystemUser = {
        id: "u_" + Date.now(),
        name: formData.name,
        username: formData.username,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
      };
      saveUsers([...users, newUser]);
      triggerToast(`¡Usuario ${formData.name} creado con éxito!`);
      trackAuditLog("USER_CREATED", `Nuevo usuario ${formData.username} (${formData.email}) creado con nivel ${formData.role}.`);

      // Trigger Onboarding Simulated Email
      const accessLink = `${window.location.protocol}//${window.location.host}/login?onboarding=true&email=${encodeURIComponent(formData.email)}`;
      setEmailDetails({
        to: formData.email,
        name: formData.name,
        role: formData.role,
        tempPassword: passwordToUse,
        accessLink,
      });
      setShowEmailModal(true);
    }
    setIsModalOpen(false);
  };

  // --- Filtering ---
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    const matchesText =
      u.name.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query);

    const matchesRole = filterRole === "ALL" || u.role === filterRole;

    return matchesText && matchesRole;
  });

  return (
    <div className="space-y-6 relative">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] bg-linear-to-r from-emerald-600 to-emerald-500 text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-xl border border-emerald-400 backdrop-blur-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-300">
          <Icons.CheckCircle className="h-5 w-5 text-white animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Odoo-style Header Area */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-4">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
            <EditableLabel apiKey="users.page.title" defaultValue="Usuarios & Niveles de Acceso" />
          </div>
          <div className="text-xs text-muted-foreground block mt-1">
            <EditableLabel apiKey="users.page.desc" defaultValue="Gestión centralizada de credenciales y perfiles de autorización de usuarios de Palmera." />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveUsers(initialDemoUsers)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted"
            title="Recargar usuarios base de demostración"
          >
            <Icons.RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Recargar Demo</span>
          </button>
        </div>
      </div>

      {/* Search & Role Filters Bar */}
      <div className="grid gap-3 md:grid-cols-3 bg-muted/20 border border-border/40 p-4 rounded-xl">
        {/* Search Input */}
        <SmartSearchInput value={searchQuery} onChange={setSearchQuery} suggestions={users.flatMap((user) => [user.name, user.username, user.email])} placeholder="Buscar por Nombre, Nombre de Usuario, Correo..." className="md:col-span-2" />

        {/* Access Level Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              const order: ("ALL" | "DEV" | "ADMIN" | "USUARIO")[] = ["ALL", "DEV", "ADMIN", "USUARIO"];
              const nextIndex = (order.indexOf(filterRole) + 1) % order.length;
              setFilterRole(order[nextIndex]);
            }}
            className={`flex-1 inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold px-2 transition-all ${
              filterRole !== "ALL"
                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-500"
                : "border-border/50 bg-background text-foreground hover:bg-muted"
            }`}
          >
            <Icons.ShieldAlert className="h-3.5 w-3.5" />
            <span>
              {filterRole === "ALL" ? "Nivel: Todos" : filterRole === "DEV" ? "Nivel: DEV" : filterRole === "ADMIN" ? "Nivel: ADMIN" : "Nivel: USUARIO"}
            </span>
          </button>
        </div>
      </div>

      {/* User Dashboard Viewport */}
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 select-none">
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <EditableLabel apiKey="users.col.user" defaultValue="Usuario" />
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <EditableLabel apiKey="users.col.email" defaultValue="Email" />
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <EditableLabel apiKey="users.col.role" defaultValue="Nivel de Acceso" />
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <EditableLabel apiKey="users.col.status" defaultValue="Estado" />
                </th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <EditableLabel apiKey="users.col.created" defaultValue="Creado / Último Acceso" />
                </th>
                <th className="px-6 py-3.5 text-right w-24">
                  <button
                    onClick={openCreateModal}
                    className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-metallic-red shadow-md shadow-red-500/20 transition-all hover:scale-105 duration-200 cursor-pointer"
                    title="Añadir nuevo usuario (+)"
                  >
                    <Icons.Plus className="h-4.5 w-4.5" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    <Icons.UserX className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                    <span>No se encontraron usuarios que coincidan con la búsqueda.</span>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="group border-b border-border/40 hover:bg-muted/30 transition-all duration-150"
                  >
                    {/* User Profile column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-extrabold border transition-transform group-hover:scale-105 duration-200 ${
                          user.role === "DEV"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            : user.role === "ADMIN"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        }`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">{user.name}</span>
                          <span className="text-[10px] text-muted-foreground block font-mono">@{user.username}</span>
                        </div>
                      </div>
                    </td>

                    {/* Email column */}
                    <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                      <a href={`mailto:${user.email}`} className="hover:text-red-500 transition-colors">
                        {user.email}
                      </a>
                    </td>

                    {/* Permission Tier Badges (DEV, ADMIN, USUARIO) */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border ${
                        user.role === "DEV"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          : user.role === "ADMIN"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      }`}>
                        {user.role === "DEV" ? (
                          <>
                            <Icons.ShieldAlert className="h-3 w-3" />
                            <span>Developer</span>
                          </>
                        ) : user.role === "ADMIN" ? (
                          <>
                            <Icons.ShieldCheck className="h-3 w-3" />
                            <span>Administrador</span>
                          </>
                        ) : (
                          <>
                            <Icons.User className="h-3 w-3" />
                            <span>Usuario Estándar</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Status toggle column */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleUserStatus(user)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold border transition-all cursor-pointer ${
                          user.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                            : "bg-stone-500/10 text-stone-500 border-stone-500/25"
                        }`}
                        title="Haga clic para alternar el estado"
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-500 animate-pulse" : "bg-stone-500"}`} />
                        <span>{user.isActive ? "Activo" : "Suspendido"}</span>
                      </button>
                    </td>

                    {/* Dates column */}
                    <td className="px-6 py-4 text-[10px] font-medium text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Icons.Calendar className="h-3 w-3 text-muted-foreground/60" />
                        <span>Alt: {new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                      {user.lastLogin && (
                        <div className="flex items-center gap-1 font-mono text-[9px]">
                          <Icons.Clock className="h-3 w-3 text-emerald-500/60" />
                          <span>Acc: {new Date(user.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </td>

                    {/* Actions column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
                          title="Editar usuario"
                        >
                          <Icons.Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-all duration-150"
                          title="Eliminar usuario"
                        >
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

      {/* Interactive Creation / Edit User Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border/50 bg-card p-6 text-card-foreground shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
              <h3 className="text-lg font-bold text-foreground">
                {editingUser ? "Editar Ficha de Usuario" : "Registrar Nuevo Usuario del Sistema"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name & Username */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Roberto Martínez"
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Nombre de Usuario (Username)</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/\s+/g, "").toLowerCase() })}
                    placeholder="Ej. roberto_admin"
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              {/* Email & Password */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Email Corporativo</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@palmera.io"
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Contraseña del Sistema</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, password: generateSecurePassword() })}
                      className="text-[10px] text-red-500 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Icons.KeyRound className="h-3 w-3" />
                      <span>Autogenerar segura</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Escriba la clave o autogenere"
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              {/* Access Role Selection & Status Toggle */}
              <div className="grid gap-4 sm:grid-cols-3 items-center">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Nivel de Acceso (Rol)</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as "DEV" | "ADMIN" | "USUARIO" })}
                    className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500 font-semibold"
                  >
                    <option value="DEV">🛠️ DEV — Desarrollador de Software</option>
                    <option value="ADMIN">👑 ADMIN — Administrador del ERP</option>
                    <option value="USUARIO">👥 USUARIO — Usuario Estándar</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Estado de Cuenta</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded-sm border-border text-red-500 focus:ring-red-500 h-4.5 w-4.5"
                    />
                    <span className="text-xs font-bold text-foreground">Cuenta Activa</span>
                  </label>
                </div>
              </div>

              {/* Dynamic Permissions Matrix Card */}
              <div className={`p-4 rounded-xl border transition-all ${
                formData.role === "DEV"
                  ? "bg-rose-500/5 border-rose-500/20 text-rose-800 dark:text-rose-400"
                  : formData.role === "ADMIN"
                  ? "bg-red-500/5 border-red-500/20 text-red-800 dark:text-red-400"
                  : "bg-blue-500/5 border-blue-500/20 text-blue-800 dark:text-blue-400"
              }`}>
                <div className="flex gap-2.5 items-start">
                  <Icons.ShieldAlert className="h-4.5 w-4.5 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-extrabold block uppercase tracking-widest mb-0.5">
                      Alcance del Permiso: {formData.role}
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      {formData.role === "DEV" && (
                        "Permisos Críticos: Lectura/Escritura completa de código base, adapters de base de datos relacionales, depurador de latencia en vivo y visualizador de auditorías en crudo. Orientado para ingenieros."
                      )}
                      {formData.role === "ADMIN" && (
                        "Permisos Operativos: Acceso total a ajustes generales de la empresa, creación y suspensión de usuarios, y configuración de módulos del ERP. Orientado para gestores TI."
                      )}
                      {formData.role === "USUARIO" && (
                        "Permisos Limitados: Acceso exclusivo para consultar y editar la libreta de contactos, redactar e-mails, despachar plantillas de WhatsApp y gestionar su perfil particular."
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Notas Internas / Observaciones</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Anotar detalles sobre el perfil o puesto..."
                  rows={2}
                  className="w-full rounded-lg border border-border/50 bg-background py-1.5 px-3 text-xs text-foreground outline-hidden focus:border-red-500 resize-none"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-metallic-red px-5 text-xs font-bold shadow-md shadow-red-500/25 transition-all cursor-pointer"
                >
                  <Icons.Save className="h-4 w-4" />
                  <span>Guardar Usuario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SIMULATED EMAIL SENT NOTIFICATION OVERLAY */}
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
                  <span className="w-16 font-bold uppercase text-[9px] text-muted-foreground/60">De:</span>
                  <span className="text-foreground">Palm Onboarding Service &lt;no-reply@palmera.io&gt;</span>
                </div>
                <div className="flex text-muted-foreground">
                  <span className="w-16 font-bold uppercase text-[9px] text-muted-foreground/60">Para:</span>
                  <span className="text-emerald-400 font-medium">{emailDetails.name} &lt;{emailDetails.to}&gt;</span>
                </div>
                <div className="flex text-muted-foreground">
                  <span className="w-16 font-bold uppercase text-[9px] text-muted-foreground/60">Asunto:</span>
                  <span className="text-white font-bold">Bienvenido a Palmera - Configura tu contraseña de acceso</span>
                </div>
              </div>

              <div className="p-4 space-y-4 text-foreground/90 font-sans leading-relaxed text-[11px]">
                <p>Hola <strong>{emailDetails.name}</strong>,</p>
                
                <p>
                  Te damos la bienvenida a tu nuevo espacio de trabajo en <strong>Palmera</strong>.
                </p>

                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-border/30 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nivel de Acceso Concedido:</span>
                    <span className="font-bold text-red-500 font-mono text-[9px]">{emailDetails.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contraseña Segura Autogenerada:</span>
                    <span className="font-bold text-emerald-400 font-mono">{emailDetails.tempPassword}</span>
                  </div>
                </div>

                <p>
                  Para empezar a trabajar con nosotros, haz clic en el siguiente enlace para activar tu cuenta y configurar tu contraseña de primer acceso:
                </p>

                <div className="text-center py-2">
                  <a
                    href={emailDetails.accessLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 font-bold text-white transition-all px-4 text-[10px]"
                  >
                    <span>Configurar Contraseña y Acceder</span>
                    <Icons.ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="text-[10px] text-muted-foreground border-t border-border/20 pt-3 font-mono break-all leading-normal">
                  URL de enlace directo: <br/>
                  <span className="text-red-500/70">{emailDetails.accessLink}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="h-8.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Cerrar simulación
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
