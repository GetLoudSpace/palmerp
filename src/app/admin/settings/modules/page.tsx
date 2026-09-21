"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import EditableLabel from "@/components/admin/EditableLabel";
import { PalmModesRegistry } from "@/modules/registry";

interface ERPMode {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "Operaciones" | "Soporte" | "Estrategia";
  isActive: boolean;
}

export default function ModulesSettingsPage() {
  const [modes, setModes] = useState<ERPMode[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const { getTenantStorageKey } = require("@/lib/clientStorage");
    const key = getTenantStorageKey("palmera_active_modes");
    const load = async () => {
      let activeIds: string[] = [];
      try {
        const res = await fetch("/api/admin/modes");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.modes)) {
            activeIds = data.modes;
            localStorage.setItem(key, JSON.stringify(activeIds));
          } else {
            const saved = localStorage.getItem(key);
            if (saved) activeIds = JSON.parse(saved);
          }
        } else {
          const saved = localStorage.getItem(key);
          if (saved) activeIds = JSON.parse(saved);
        }
      } catch {
        const saved = localStorage.getItem(key);
        if (saved) {
          try { activeIds = JSON.parse(saved); } catch {}
        }
      }
      const mapped: ERPMode[] = Object.keys(PalmModesRegistry).map((key) => {
        const config = PalmModesRegistry[key];
        return {
          id: config.id,
          name: config.name,
          icon: config.icon,
          description: config.description,
          category: config.category as any,
          isActive: activeIds.includes(config.id),
        };
      });
      setModes(mapped);
    };
    load();
  }, []);

  const handleToggleMode = (mode: ERPMode) => {
    const updated = modes.map((m) =>
      m.id === mode.id ? { ...m, isActive: !m.isActive } : m
    );
    setModes(updated);

    const { getTenantStorageKey } = require("@/lib/clientStorage");
    const key = getTenantStorageKey("palmera_active_modes");
    const activeIds = updated.filter((m) => m.isActive).map((m) => m.id);
    localStorage.setItem(key, JSON.stringify(activeIds));
    fetch("/api/admin/modes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modes: activeIds }) }).catch(() => {});
    window.dispatchEvent(new Event("palmera_modes_updated"));

    const actionText = !mode.isActive ? "Activado" : "Desactivado";
    setToastMessage(`¡${mode.name} ${actionText.toLowerCase()} correctamente!`);
    setTimeout(() => setToastMessage(null), 4000);

    // Audit log
    try {
      const logsKey = getTenantStorageKey("palmera_audit_logs");
      const savedLogs = localStorage.getItem(logsKey) || "[]";
      const logs = JSON.parse(savedLogs);
      const newLog = {
        id: "log_" + Date.now(),
        action: mode.isActive ? "MODE_DEACTIVATED" : "MODE_ACTIVATED",
        details: `El sector de trabajo "${mode.name}" fue ${actionText.toLowerCase()} por el Administrador.`,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(logsKey, JSON.stringify([newLog, ...logs].slice(0, 15)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleActivateAll = () => {
    const updated = modes.map((m) => ({ ...m, isActive: true }));
    setModes(updated);
    const { getTenantStorageKey } = require("@/lib/clientStorage");
    const key = getTenantStorageKey("palmera_active_modes");
    const activeIds = updated.map((m) => m.id);
    localStorage.setItem(key, JSON.stringify(activeIds));
    fetch("/api/admin/modes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modes: activeIds }) }).catch(() => {});
    window.dispatchEvent(new Event("palmera_modes_updated"));
    setToastMessage("¡Todos los sectores de trabajo han sido activados!");
    setTimeout(() => setToastMessage(null), 4000);
    trackGlobalAudit("ALL_MODES_ACTIVATED", "Todos los sectores de trabajo fueron activados por el Administrador.");
  };

  const handleDeactivateAll = () => {
    const updated = modes.map((m) => ({ ...m, isActive: false }));
    setModes(updated);
    const { getTenantStorageKey } = require("@/lib/clientStorage");
    const key = getTenantStorageKey("palmera_active_modes");
    localStorage.setItem(key, JSON.stringify([]));
    fetch("/api/admin/modes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modes: [] }) }).catch(() => {});
    window.dispatchEvent(new Event("palmera_modes_updated"));
    setToastMessage("¡Todos los sectores de trabajo han sido desactivados!");
    setTimeout(() => setToastMessage(null), 4000);
    trackGlobalAudit("ALL_MODES_DEACTIVATED", "Todos los sectores de trabajo fueron desactivados por el Administrador.");
  };

  const trackGlobalAudit = (action: string, details: string) => {
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
    } catch (err) {
      console.error(err);
    }
  };

  const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
    const IconComponent = (Icons as any)[name];
    if (!IconComponent) return <Icons.HelpCircle className={className} />;
    return <IconComponent className={className} />;
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

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-4">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
            <EditableLabel apiKey="settings.modes.title" defaultValue="Gestión de Sectores (Áreas de Trabajo)" />
          </div>
          <div className="text-xs text-muted-foreground block mt-1">
            <EditableLabel apiKey="settings.modes.desc" defaultValue="Activa o desactiva sectores enteros. Palmera adaptará instantáneamente el menú y las funciones disponibles según tus preferencias operativas." />
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleActivateAll}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
          >
            <Icons.CheckSquare className="h-4 w-4" />
            <span>Activar Todos</span>
          </button>
          <button
            type="button"
            onClick={handleDeactivateAll}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <Icons.XSquare className="h-4 w-4" />
            <span>Desactivar Todos</span>
          </button>
        </div>
      </div>

      {/* Modes Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {modes.map((mode) => (
          <div
            key={mode.id}
            className={`flex flex-col justify-between bg-card border p-5 rounded-2xl shadow-xs transition-all duration-300 group ${
              mode.isActive
                ? "border-red-500/40 ring-4 ring-red-500/5 shadow-md shadow-red-500/5 bg-red-500/[0.01]"
                : "border-border/40 hover:border-red-500/20"
            }`}
          >
            <div className="space-y-3">
              {/* Header card: Icon & Category Category */}
              <div className="flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-300 ${
                  mode.isActive
                    ? "bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}>
                  <DynamicIcon name={mode.icon} className="h-6 w-6" />
                </div>
                <span className={`text-[9px] font-bold uppercase border px-2.5 py-0.5 rounded-full ${
                  mode.category === "Operaciones"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20"
                    : mode.category === "Soporte"
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-500 border-purple-500/20"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20"
                }`}>
                  {mode.category}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-extrabold text-foreground tracking-wide flex items-center gap-1.5">
                  {mode.name}
                  {mode.isActive && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {mode.description}
                </p>
              </div>
            </div>

            {/* Actions: Toggle Mode */}
            <div className="flex items-center justify-between border-t border-border/30 pt-4 mt-5">
              <span className="text-[10px] text-muted-foreground font-semibold">
                {mode.isActive ? "Activo" : "Inactivo"}
              </span>

              <button
                type="button"
                onClick={() => handleToggleMode(mode)}
                className={`inline-flex h-8.5 items-center justify-center px-4 rounded-lg text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                  mode.isActive
                    ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
                    : "bg-metallic-red text-white shadow-md shadow-red-500/20 hover:shadow-lg active:scale-95"
                }`}
              >
                {mode.isActive ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
