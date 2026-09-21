"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import EditableLabel from "@/components/admin/EditableLabel";
import { clearTenantDemoData } from "@/lib/demoDataCleanup";

export default function GeneralSettingsPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [cleanupPhrase, setCleanupPhrase] = useState("");
  const [isCleaning, setIsCleaning] = useState(false);

  // Core settings form state
  const [settings, setSettings] = useState({
    companyName: "Palm Enterprises SL",
    systemEmail: "core@palmera.io",
    timezone: "Europe/Madrid",
    defaultLanguage: "es",
    cachingEnabled: true,
    maintenanceMode: false,
    themeColor: "amber",
  });

  useEffect(() => {
    const { getTenantStorageKey } = require("@/lib/clientStorage");
    const key = getTenantStorageKey("palmera_general_settings");
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        // use default
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const { getTenantStorageKey } = require("@/lib/clientStorage");
    const key = getTenantStorageKey("palmera_general_settings");
    localStorage.setItem(key, JSON.stringify(settings));
    
    // Toast notification
    setToastMessage("¡Ajustes generales del sistema guardados!");
    setTimeout(() => setToastMessage(null), 4000);

    // Audit log
    try {
      const logsKey = getTenantStorageKey("palmera_audit_logs");
      const savedLogs = localStorage.getItem(logsKey) || "[]";
      const logs = JSON.parse(savedLogs);
      const newLog = {
        id: "log_" + Date.now(),
        action: "SETTINGS_UPDATED",
        details: `Parámetros generales actualizados: Razón Social "${settings.companyName}", Mantenimiento: ${settings.maintenanceMode ? "SÍ" : "NO"}.`,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(logsKey, JSON.stringify([newLog, ...logs].slice(0, 15)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCleanup = () => {
    if (cleanupPhrase !== "BORRAR DATOS") return;
    setIsCleaning(true);
    const result = clearTenantDemoData();
    setIsCleanupOpen(false);
    setCleanupPhrase("");
    setToastMessage(`Limpieza completada: ${result.removedRecords} registros eliminados.`);
    window.setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] bg-linear-to-r from-emerald-600 to-emerald-500 text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-xl border border-emerald-400 backdrop-blur-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-300">
          <Icons.CheckCircle className="h-5 w-5 text-white animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Odoo Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-4">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
            <EditableLabel apiKey="settings.general.title" defaultValue="Configuración General" />
          </div>
          <div className="text-xs text-muted-foreground block mt-1">
            <EditableLabel apiKey="settings.general.desc" defaultValue="Parámetros estructurales, localización y estado operativo del núcleo de Palmera." />
          </div>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="grid gap-6 md:grid-cols-3">
        {/* Left 2 Cols: Main settings */}
        <div className="md:col-span-2 space-y-6 bg-card border border-border/40 p-6 rounded-2xl">
          <span className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-widest block mb-4 border-b border-border/20 pb-2">
            Identificación de la Empresa
          </span>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Razón Social / Empresa</label>
              <input
                type="text"
                required
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">E-mail de Notificaciones del Sistema</label>
              <input
                type="email"
                required
                value={settings.systemEmail}
                onChange={(e) => setSettings({ ...settings, systemEmail: e.target.value })}
                className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500"
              />
            </div>
          </div>

          <span className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-widest block pt-4 mb-4 border-b border-border/20 pb-2">
            Localización y Región
          </span>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Huso Horario (Timezone)</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500 font-semibold"
              >
                <option value="Europe/Madrid">Europe/Madrid (UTC+01:00)</option>
                <option value="Europe/London">Europe/London (UTC+00:00)</option>
                <option value="America/New_York">America/New_York (UTC-05:00)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Idioma Predeterminado</label>
              <select
                value={settings.defaultLanguage}
                onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                className="w-full rounded-lg border border-border/50 bg-background py-2 px-3 text-xs text-foreground outline-hidden focus:border-red-500 font-semibold"
              >
                <option value="es">Español (Castellano)</option>
                <option value="en">English (Inglés)</option>
                <option value="ca">Català (Catalán)</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end border-t border-border/30 pt-4 mt-6">
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-metallic-red px-5 text-xs font-bold shadow-md shadow-red-500/25 transition-all cursor-pointer"
            >
              <Icons.Save className="h-4 w-4" />
              <span>Guardar Ajustes</span>
            </button>
          </div>
        </div>

        {/* Right Col: Diagnostics / Core States */}
        <div className="space-y-6">
          <div className="bg-card border border-border/40 p-6 rounded-2xl">
            <span className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-widest block mb-4 border-b border-border/20 pb-2">
              Estado Operativo
            </span>

            <div className="space-y-4">
              {/* Maintenance Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">Modo Mantenimiento</span>
                  <p className="text-[10px] text-muted-foreground">Desconecta el portal público.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                  className={`relative inline-flex h-5.5 w-10.5 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-hidden ${
                    settings.maintenanceMode ? "bg-red-500" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      settings.maintenanceMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Cache Toggle */}
              <div className="flex items-center justify-between border-t border-border/30 pt-3">
                <div>
                  <span className="text-xs font-bold text-foreground block">Caché de Consultas</span>
                  <p className="text-[10px] text-muted-foreground">Acelera transacciones de lectura.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, cachingEnabled: !settings.cachingEnabled })}
                  className={`relative inline-flex h-5.5 w-10.5 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-hidden ${
                    settings.cachingEnabled ? "bg-red-500" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      settings.cachingEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-muted/15 border border-border/40 p-5 rounded-2xl text-[10px] text-muted-foreground leading-relaxed">
            <span className="font-extrabold text-foreground uppercase tracking-wider block mb-1">
              Nota sobre el Motor
            </span>
            <span>
              La personalización general se propaga a todas las consolas modulares y fichas de clientes. Los logs de control registran automáticamente cada alteración.
            </span>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-red-500/10 p-2 text-red-600 dark:text-red-400"><Icons.RefreshCw className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-foreground">Actualizaciones Fleet</h3>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Tu ERP se actualiza como el mío: semáforo verde/amarillo, 1-click con backup previo y verificación. Misma base que uso yo.</p>
                <a href="/admin/settings/updates" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-500/20 dark:text-red-300"><Icons.RefreshCw className="h-4 w-4" />Abrir Actualizaciones</a>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400"><Icons.Trash2 className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-foreground">Limpiar datos de prueba</h3>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Borra los contactos, datos comerciales, reservas, consumos, operaciones y auditorías del tenant actual. Conserva usuarios, contraseñas, módulos activos, ajustes y configuración de IA.</p>
                <button type="button" onClick={() => setIsCleanupOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-500/20 dark:text-rose-300"><Icons.Trash2 className="h-4 w-4" />Borrar datos de prueba</button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {isCleanupOpen && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl border border-rose-500/25 bg-card p-6 shadow-2xl"><div className="flex items-start gap-3"><div className="rounded-xl bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400"><Icons.TriangleAlert className="h-5 w-5" /></div><div><h2 className="text-lg font-black text-foreground">¿Limpiar este espacio?</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Esta acción elimina los datos operativos de prueba del tenant actual. No se puede deshacer desde Palmera.</p></div></div><div className="mt-5 rounded-xl border border-border/50 bg-background/40 p-3 text-xs text-muted-foreground">Se conservarán los usuarios, contraseñas, módulos, ajustes generales y configuración de IA.</div><label className="mt-5 block text-xs font-bold text-foreground">Escribe <span className="font-mono text-rose-600 dark:text-rose-300">BORRAR DATOS</span> para confirmar<input autoFocus value={cleanupPhrase} onChange={(event) => setCleanupPhrase(event.target.value)} placeholder="BORRAR DATOS" className="mt-2 w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-rose-500" /></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => { setIsCleanupOpen(false); setCleanupPhrase(""); }} className="rounded-xl border border-border/60 px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted">Cancelar</button><button type="button" disabled={cleanupPhrase !== "BORRAR DATOS" || isCleaning} onClick={handleCleanup} className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{isCleaning ? "Limpiando..." : "Eliminar definitivamente"}</button></div></div></div>}
    </div>
  );
}
