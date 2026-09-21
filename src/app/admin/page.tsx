"use client";

import React, { useEffect, useState, useCallback } from "react";
import * as Icons from "lucide-react";
import { getTenantStorageKey } from "@/lib/clientStorage";
import { defaultDashboardLayout, validateLayout } from "@/lib/dashboard/registry";
import type { DashboardLayout, DashboardWidgetConfig } from "@/lib/dashboard/types";
import WidgetCard from "@/components/dashboard/WidgetCard";
import AddWidgetModal from "@/components/dashboard/AddWidgetModal";

export default function AdminDashboard() {
  const [activeModes, setActiveModes] = useState<string[]>([]);
  const [layout, setLayout] = useState<DashboardLayout>(defaultDashboardLayout);
  const [isEditing, setIsEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Persist layout to storage + API
  const persistLayout = useCallback(
    (next: DashboardLayout) => {
      setLayout(next);
      try {
        const key = getTenantStorageKey("palmera_dashboard_layout");
        localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new Event("palmera_dashboard_updated"));
      } catch {}
      fetch("/api/admin/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: next }),
      }).catch(() => {});
    },
    []
  );

  // Load active modes + layout
  useEffect(() => {
    const modesKey = getTenantStorageKey("palmera_active_modes");
    const layoutKey = getTenantStorageKey("palmera_dashboard_layout");

    const loadModes = async () => {
      try {
        const res = await fetch("/api/admin/modes");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.modes)) {
            setActiveModes(data.modes);
            localStorage.setItem(modesKey, JSON.stringify(data.modes));
            return;
          }
        }
      } catch {}
      const saved = localStorage.getItem(modesKey);
      if (saved) {
        try {
          setActiveModes(JSON.parse(saved));
        } catch {}
      }
    };

    const loadLayout = async () => {
      // try API first
      try {
        const res = await fetch("/api/admin/dashboard");
        if (res.ok) {
          const data = await res.json();
          if (data.success && validateLayout(data.layout)) {
            setLayout(data.layout);
            localStorage.setItem(layoutKey, JSON.stringify(data.layout));
            setLoaded(true);
            return;
          }
        }
      } catch {}
      // fallback localStorage
      const saved = localStorage.getItem(layoutKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (validateLayout(parsed)) {
            setLayout(parsed);
            setLoaded(true);
            return;
          }
        } catch {}
      }
      // default
      setLayout(defaultDashboardLayout);
      try {
        localStorage.setItem(layoutKey, JSON.stringify(defaultDashboardLayout));
      } catch {}
      setLoaded(true);
    };

    loadModes();
    loadLayout();

    const handler = () => {
      const v = localStorage.getItem(modesKey);
      if (v) {
        try {
          setActiveModes(JSON.parse(v));
        } catch {}
      }
    };
    window.addEventListener("palmera_modes_updated", handler);
    window.addEventListener("storage", handler);
    const dashboardHandler = () => {
      const v = localStorage.getItem(layoutKey);
      if (v) {
        try {
          const parsed = JSON.parse(v);
          if (validateLayout(parsed)) setLayout(parsed);
        } catch {}
      }
    };
    window.addEventListener("palmera_dashboard_updated", dashboardHandler);
    return () => {
      window.removeEventListener("palmera_modes_updated", handler);
      window.removeEventListener("storage", handler);
      window.removeEventListener("palmera_dashboard_updated", dashboardHandler);
    };
  }, []);

  // editing state persist
  useEffect(() => {
    const key = getTenantStorageKey("palmera_dashboard_editing");
    const saved = localStorage.getItem(key);
    if (saved === "true") setIsEditing(true);
  }, []);
  useEffect(() => {
    try {
      const key = getTenantStorageKey("palmera_dashboard_editing");
      localStorage.setItem(key, String(isEditing));
    } catch {}
  }, [isEditing]);

  const handleRemove = (id: string) => {
    const next: DashboardLayout = { ...layout, widgets: layout.widgets.filter((w) => w.id !== id) };
    persistLayout(next);
    showToast("Métrica eliminada");
  };

  const handleUpdate = (id: string, patch: Partial<DashboardWidgetConfig>) => {
    const next: DashboardLayout = {
      ...layout,
      widgets: layout.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    };
    persistLayout(next);
  };

  const handleMove = (id: string, dir: "up" | "down") => {
    const idx = layout.widgets.findIndex((w) => w.id === id);
    if (idx === -1) return;
    const nextIdx = dir === "up" ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= layout.widgets.length) return;
    const arr = [...layout.widgets];
    const tmp = arr[idx];
    arr[idx] = arr[nextIdx];
    arr[nextIdx] = tmp;
    persistLayout({ ...layout, widgets: arr });
  };

  const handleAdd = (widget: DashboardWidgetConfig) => {
    persistLayout({ ...layout, widgets: [...layout.widgets, widget] });
    setShowAdd(false);
    showToast(`Añadido: ${widget.title}`);
  };

  const handleReset = () => {
    if (!confirm("¿Restablecer el escritorio al layout por defecto? Se perderán los cambios actuales.")) return;
    persistLayout(defaultDashboardLayout);
    showToast("Escritorio restablecido");
  };

  const existingSources = new Set(layout.widgets.map((w) => w.source));

  if (!loaded) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="h-24 rounded-2xl bg-muted/30 animate-pulse border border-border/20" />
        <div className="grid grid-cols-12 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="col-span-12 sm:col-span-6 lg:col-span-4 h-40 rounded-2xl bg-muted/20 animate-pulse border border-border/20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-border/30 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Escritorio</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Panel de métricas editable • {layout.widgets.length} widgets • {activeModes.length} sectores activos • Visualiza lo que quieras en modo gráfico
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsEditing((v) => !v)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors ${isEditing ? "bg-red-500 text-white border-red-500 shadow" : "bg-card border-border hover:bg-muted"}`}
          >
            {isEditing ? <Icons.Check className="h-3.5 w-3.5" /> : <Icons.Pencil className="h-3.5 w-3.5" />}
            {isEditing ? "Terminar edición" : "Editar panel"}
          </button>
          {isEditing && (
            <>
              <button onClick={() => setShowAdd(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-metallic-red px-3 text-xs font-bold text-white shadow">
                <Icons.Plus className="h-3.5 w-3.5" /> Añadir métrica
              </button>
              <button onClick={handleReset} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold hover:bg-muted">
                <Icons.RotateCcw className="h-3.5 w-3.5" /> Restablecer
              </button>
            </>
          )}
          {!isEditing && (
            <a href="/admin/settings/modules" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold hover:bg-muted">
              <Icons.LayoutGrid className="h-3.5 w-3.5" /> Gestionar sectores
            </a>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-start gap-3">
          <Icons.Info className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-bold text-red-700 dark:text-red-500">Modo edición activo:</span> cambia el tamaño (S/M/L), el tipo de gráfico (línea/barra/área/donut), el periodo (7d/30d/90d), mueve widgets con ↑↓ y elimina los que no necesites. Los cambios se guardan automáticamente por tenant.
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-12 gap-4">
        {layout.widgets.map((w, idx) => (
          <WidgetCard
            key={w.id}
            widget={w}
            isEditing={isEditing}
            onUpdate={(patch) => handleUpdate(w.id, patch)}
            onRemove={() => handleRemove(w.id)}
            onMove={(dir) => handleMove(w.id, dir)}
            isFirst={idx === 0}
            isLast={idx === layout.widgets.length - 1}
            activeModes={activeModes}
          />
        ))}
      </div>

      {layout.widgets.length === 0 && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border/50 bg-muted/10">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-card border border-border flex items-center justify-center mb-3">
            <Icons.LayoutGrid className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">Tu escritorio está vacío</p>
          <p className="text-xs text-muted-foreground mt-1">Añade métricas para construir tu panel a medida.</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-4 text-xs font-bold text-white">
            <Icons.Plus className="h-3.5 w-3.5" /> Añadir primera métrica
          </button>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-2">
        <Icons.Sparkles className="h-3 w-3" />
        <span>
          {isEditing ? "Edición: los cambios se guardan al instante • Pulsa Terminar edición para salir" : "Tip: pulsa Editar panel para personalizar • Todo vinculado a tus sectores activos"}
        </span>
      </div>

      {showAdd && <AddWidgetModal onClose={() => setShowAdd(false)} onAdd={handleAdd} activeModes={activeModes} existingSources={existingSources} />}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[90] bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg border border-emerald-400 flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <Icons.CheckCircle className="h-4 w-4" />
          {toast}
        </div>
      )}
    </div>
  );
}
