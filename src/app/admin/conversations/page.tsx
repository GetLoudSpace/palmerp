"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { getTenantStorageKey } from "@/lib/clientStorage";
import EditableLabel from "@/components/admin/EditableLabel";
import SmartSearchInput from "@/components/SmartSearchInput";

type AuditEntry = {
  id: string;
  action: string;
  table?: string;
  recordId?: string;
  details: string;
  timestamp: string;
  success?: boolean;
  userId?: string;
  ipAddress?: string;
};

const ACTION_META: Record<string, { label: string; icon: string; color: string }> = {
  EMAIL_DISPATCHED: { label: "Email enviado", icon: "Mail", color: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
  WHATSAPP_DISPATCHED: { label: "WhatsApp enviado", icon: "MessageCircle", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  PHONE_CALL_COMPLETED: { label: "Llamada completada", icon: "PhoneCall", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  USER_CREATED: { label: "Usuario creado", icon: "UserPlus", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  USER_UPDATED: { label: "Usuario actualizado", icon: "UserCog", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  USER_DELETED: { label: "Usuario eliminado", icon: "UserX", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  USER_STATUS_TOGGLED: { label: "Estado usuario", icon: "ShieldAlert", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  CONTACT_CREATED: { label: "Contacto creado", icon: "Users", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  CONTACT_UPDATED: { label: "Contacto editado", icon: "Pencil", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  SETTINGS_UPDATED: { label: "Ajustes modificados", icon: "Settings", color: "bg-stone-500/10 text-stone-600 border-stone-500/20" },
  MODE_TOGGLED: { label: "Sector activado", icon: "Layers", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  SYSTEM_ALERT: { label: "Alerta crítica", icon: "Siren", color: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const CRITICAL_ACTIONS = new Set(["USER_DELETED", "USER_STATUS_TOGGLED", "SYSTEM_ALERT", "PHONE_CALL_COMPLETED"]);

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { label: action.replace(/_/g, " "), icon: "Activity", color: "bg-muted text-muted-foreground border-border" };
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function buildDemoLogs(): AuditEntry[] {
  const now = Date.now();
  const ago = (mins: number) => new Date(now - mins * 60 * 1000).toISOString();
  return [
    { id: "demo_1", action: "EMAIL_DISPATCHED", table: "Contact", recordId: "c2", details: 'Correo enviado a Renato García (renato@gastroshows.es). Saludo: "Hey". Plantilla: Casual.', timestamp: ago(12), success: true },
    { id: "demo_2", action: "WHATSAPP_DISPATCHED", table: "Contact", recordId: "c3", details: 'WhatsApp enviado a Lucía Fernández (+34 677 889 900). Mensaje: "Querida Silvia, te he dejado..."', timestamp: ago(45), success: true },
    { id: "demo_3", action: "PHONE_CALL_COMPLETED", table: "Contact", recordId: "c3", details: "Llamada completada con Lucía Fernández (+34 677 889 900). Duración: 02:34.", timestamp: ago(68), success: true },
    { id: "demo_4", action: "USER_CREATED", table: "User", details: "Nuevo usuario silvia_ops (silvia@palmera.io) creado con nivel USUARIO.", timestamp: ago(120), success: true },
    { id: "demo_5", action: "USER_STATUS_TOGGLED", table: "User", details: "El estado del usuario silvia_ops cambió a DESACTIVADO.", timestamp: ago(180), success: true },
    { id: "demo_6", action: "SYSTEM_ALERT", table: "AuditLog", details: "Intento de acceso denegado a /admin/settings por rol USUARIO.", timestamp: ago(210), success: false },
    { id: "demo_7", action: "EMAIL_DISPATCHED", table: "Contact", recordId: "c1", details: 'Correo enviado a Gastroshows Barcelona SL (info@gastroshows.es). Saludo: "Estimados compañeros".', timestamp: ago(260), success: true },
    { id: "demo_8", action: "CONTACT_CREATED", table: "Contact", details: "Contacto Tecnologías del Sur SA creado como COMPANY con CIF A41002003.", timestamp: ago(340), success: true },
    { id: "demo_9", action: "SETTINGS_UPDATED", table: "Setting", details: "Parámetro company_name actualizado a Gastroshows S.L.", timestamp: ago(420), success: true },
    { id: "demo_10", action: "MODE_TOGGLED", table: "Setting", details: "Sector RESTAURANTE activado por ADMIN.", timestamp: ago(560), success: true },
    { id: "demo_11", action: "USER_DELETED", table: "User", details: "Usuario temporal_test (test@palmera.io) fue eliminado del ERP.", timestamp: ago(700), success: true },
    { id: "demo_12", action: "SYSTEM_ALERT", table: "AuditLog", details: "Fallo de envío SMTP a carlos.ortega@gmail.com - mailbox unavailable.", timestamp: ago(890), success: false },
  ];
}

function loadLogsFromStorage(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  const tenantKey = getTenantStorageKey("palmera_audit_logs");
  const legacyKey = "palmera_audit_logs";
  const keysToCheck = [tenantKey, legacyKey];
  // Also check generic tenant-suffixed variants that contacts page used historically
  const allStored: AuditEntry[] = [];
  const seen = new Set<string>();

  for (const key of keysToCheck) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        if (!item || !item.id || seen.has(item.id)) continue;
        seen.add(item.id);
        allStored.push({
          id: String(item.id),
          action: String(item.action ?? "SYSTEM_ALERT"),
          table: item.table ? String(item.table) : undefined,
          recordId: item.recordId ? String(item.recordId) : undefined,
          details: String(item.details ?? item.detail ?? ""),
          timestamp: String(item.timestamp ?? item.createdAt ?? new Date().toISOString()),
          success: typeof item.success === "boolean" ? item.success : true,
          userId: item.userId ? String(item.userId) : undefined,
          ipAddress: item.ipAddress ? String(item.ipAddress) : undefined,
        });
      }
    } catch {}
  }

  // Scan all localStorage for palmera_audit_logs_* tenant isolation keys (multi-tenant compat)
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("palmera_audit_logs_")) continue;
      if (keysToCheck.includes(key)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) continue;
        for (const item of parsed) {
          if (!item || !item.id || seen.has(item.id)) continue;
          seen.add(item.id);
          allStored.push({
            id: String(item.id),
            action: String(item.action ?? "SYSTEM_ALERT"),
            table: item.table ? String(item.table) : undefined,
            recordId: item.recordId ? String(item.recordId) : undefined,
            details: String(item.details ?? item.detail ?? ""),
            timestamp: String(item.timestamp ?? item.createdAt ?? new Date().toISOString()),
            success: typeof item.success === "boolean" ? item.success : true,
          });
        }
      } catch {}
    }
  } catch {}

  return allStored.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export default function ConversationsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<"ALL" | "MESSAGING" | "USERS" | "SYSTEM">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "audit">("inbox");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const pageSize = 10;

  const refresh = () => {
    const stored = loadLogsFromStorage();
    if (stored.length === 0) {
      const demo = buildDemoLogs();
      setLogs(demo);
    } else {
      setLogs(stored);
    }
  };

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    // Listen for custom event dispatched elsewhere (e.g. contacts page)
    window.addEventListener("palmera_audit_updated", onStorage as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("palmera_audit_updated", onStorage as EventListener);
    };
  }, []);

  const persistLogs = (next: AuditEntry[]) => {
    setLogs(next);
    try {
      const key = getTenantStorageKey("palmera_audit_logs");
      localStorage.setItem(key, JSON.stringify(next.slice(0, 50)));
      window.dispatchEvent(new Event("palmera_audit_updated"));
    } catch {}
  };

  const handleSeedDemo = () => {
    const demo = buildDemoLogs();
    persistLogs(demo);
  };

  const handleClear = () => {
    if (!confirm("¿Vaciar la bandeja de auditoría? Se borrarán los logs locales de este tenant.")) return;
    persistLogs([]);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        !q ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.table && log.table.toLowerCase().includes(q)) ||
        getActionMeta(log.action).label.toLowerCase().includes(q);

      const isMessaging = ["EMAIL_DISPATCHED", "WHATSAPP_DISPATCHED", "PHONE_CALL_COMPLETED"].includes(log.action);
      const isUser = log.action.startsWith("USER_");
      const isSystem = !isMessaging && !isUser;

      const matchesCategory =
        category === "ALL" ||
        (category === "MESSAGING" && isMessaging) ||
        (category === "USERS" && isUser) ||
        (category === "SYSTEM" && isSystem);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "SUCCESS" && log.success !== false) ||
        (statusFilter === "FAILED" && log.success === false);

      const matchesCritical = !criticalOnly || CRITICAL_ACTIONS.has(log.action) || log.success === false;

      const matchesTab = activeTab === "inbox" ? true : CRITICAL_ACTIONS.has(log.action) || log.success === false;

      return matchesSearch && matchesCategory && matchesStatus && matchesCritical && matchesTab;
    });
  }, [logs, searchQuery, category, statusFilter, criticalOnly, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, category, statusFilter, criticalOnly, activeTab]);

  const stats = useMemo(() => {
    const messagingToday = logs.filter((l) => ["EMAIL_DISPATCHED", "WHATSAPP_DISPATCHED"].includes(l.action)).length;
    const failed = logs.filter((l) => l.success === false).length;
    const critical = logs.filter((l) => CRITICAL_ACTIONS.has(l.action) || l.success === false).length;
    return { total: logs.length, messagingToday, failed, critical };
  }, [logs]);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-4">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
            <EditableLabel apiKey="conversations.page.title" defaultValue="Conversaciones & Auditoría" />
          </div>
          <div className="text-xs text-muted-foreground block mt-1 max-w-2xl">
            <EditableLabel apiKey="conversations.page.desc" defaultValue="Bandeja centralizada de mensajería, notificaciones y traza de actividad empresarial (AuditLog). Filtra correos, WhatsApp, llamadas y acciones críticas." />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSeedDemo} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted">
            <Icons.RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Recargar demo</span>
          </button>
          <button onClick={handleClear} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 text-xs font-semibold text-red-600 hover:bg-red-500/10">
            <Icons.Trash2 className="h-3.5 w-3.5" />
            <span>Vaciar</span>
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total trazas</span><Icons.Activity className="h-4 w-4 text-amber-500" /></div>
          <div className="mt-2 text-2xl font-black text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Eventos registrados</div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mensajería</span><Icons.Mail className="h-4 w-4 text-sky-500" /></div>
          <div className="mt-2 text-2xl font-black text-foreground">{stats.messagingToday}</div>
          <div className="text-xs text-muted-foreground">Emails + WhatsApp</div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Alertas críticas</span><Icons.Siren className="h-4 w-4 text-red-500" /></div>
          <div className="mt-2 text-2xl font-black text-foreground">{stats.critical}</div>
          <div className="text-xs text-muted-foreground">Requieren revisión</div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fallos</span><Icons.AlertTriangle className="h-4 w-4 text-red-500" /></div>
          <div className="mt-2 text-2xl font-black text-foreground">{stats.failed}</div>
          <div className="text-xs text-muted-foreground">success = false</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActiveTab("inbox")} className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition ${activeTab === "inbox" ? "bg-foreground text-background border-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>
          <Icons.Inbox className="h-3.5 w-3.5" /> Bandeja de Entrada
          <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === "inbox" ? "bg-white/20" : "bg-muted"}`}>{logs.length}</span>
        </button>
        <button onClick={() => setActiveTab("audit")} className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition ${activeTab === "audit" ? "bg-amber-500 text-white border-amber-500" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>
          <Icons.ShieldAlert className="h-3.5 w-3.5" /> Alertas de Auditoría
          <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === "audit" ? "bg-white/20" : "bg-muted"}`}>{stats.critical}</span>
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr] bg-muted/20 border border-border/40 p-4 rounded-xl">
        <SmartSearchInput value={searchQuery} onChange={setSearchQuery} suggestions={logs.flatMap((l) => [l.action, l.details, l.table ?? "", getActionMeta(l.action).label])} placeholder="Buscar por acción, detalle, tabla... (ej. EMAIL, WHATSAPP, USER_DELETED)" className="w-full" />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCategory((c) => (c === "ALL" ? "MESSAGING" : c === "MESSAGING" ? "USERS" : c === "USERS" ? "SYSTEM" : "ALL"))} className={`flex-1 inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold px-2 transition-all ${category !== "ALL" ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-500" : "border-border/50 bg-background text-foreground hover:bg-muted"}`}>
            <Icons.Filter className="h-3.5 w-3.5" />
            <span>{category === "ALL" ? "Categoría: Todas" : category === "MESSAGING" ? "Mensajería" : category === "USERS" ? "Usuarios" : "Sistema"}</span>
          </button>
          <button onClick={() => setStatusFilter((s) => (s === "ALL" ? "SUCCESS" : s === "SUCCESS" ? "FAILED" : "ALL"))} className={`flex-1 inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold px-2 transition-all ${statusFilter !== "ALL" ? "bg-amber-500/10 border-amber-500/30 text-amber-600" : "border-border/50 bg-background text-foreground hover:bg-muted"}`}>
            <Icons.CheckCircle2 className="h-3.5 w-3.5" />
            <span>{statusFilter === "ALL" ? "Estado: Todos" : statusFilter === "SUCCESS" ? "Solo éxito" : "Solo fallos"}</span>
          </button>
          <button onClick={() => setCriticalOnly((v) => !v)} className={`inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold px-3 transition-all ${criticalOnly ? "bg-red-500/10 border-red-500/30 text-red-600" : "border-border/50 bg-background text-foreground hover:bg-muted"}`}>
            <Icons.Siren className="h-3.5 w-3.5" />
            <span>Críticas</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 select-none">
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Acción</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Detalle</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tabla</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Ver</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    <Icons.Inbox className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                    <span>No hay trazas que coincidan con los filtros. Prueba con “Recargar demo”.</span>
                  </td>
                </tr>
              ) : (
                paginated.map((log) => {
                  const meta = getActionMeta(log.action);
                  return (
                    <tr key={log.id} className="group border-b border-border/40 hover:bg-muted/30 transition-all duration-150">
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground whitespace-nowrap">{formatDate(log.timestamp)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${meta.color}`}>
                          {log.action.includes("EMAIL") ? <Icons.Mail className="h-3 w-3" /> : log.action.includes("WHATSAPP") ? <Icons.MessageCircle className="h-3 w-3" /> : log.action.includes("PHONE") ? <Icons.PhoneCall className="h-3 w-3" /> : log.success === false ? <Icons.AlertTriangle className="h-3 w-3" /> : <Icons.Activity className="h-3 w-3" />}
                          <span>{meta.label}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-foreground/80 max-w-md truncate" title={log.details}>{log.details}</td>
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground">{log.table ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${log.success === false ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${log.success === false ? "bg-red-500" : "bg-emerald-500"}`} />
                          {log.success === false ? "Fallo" : "Éxito"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setSelected(log)} className="inline-flex h-7 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted">
                          <Icons.Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 px-4 py-3">
          <span className="text-xs text-muted-foreground">Mostrando {paginated.length} de {filtered.length} · Página {page} de {totalPages}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold disabled:opacity-40">Anterior</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border/50 bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Detalle de traza</div>
                <div className="mt-1 text-sm font-black text-foreground">{getActionMeta(selected.action).label} · {selected.action}</div>
                <div className="mt-1 text-xs text-muted-foreground">{formatDate(selected.timestamp)} · {selected.table ?? "AuditLog"} {selected.recordId ? `· ${selected.recordId}` : ""}</div>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><Icons.X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 p-4 text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">{selected.details}</div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setSelected(null)} className="inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-xs font-bold text-background">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
