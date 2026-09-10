"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { coreModules, PalmModesRegistry } from "@/modules/registry";
import { getTenantStorageKey } from "@/lib/clientStorage";

const PageIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (Icons as any)[name];
  if (!IconComponent) return <Icons.HelpCircle className={className} />;
  return <IconComponent className={className} />;
};

export default function AdminDashboard() {
  const [activeModes, setActiveModes] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const key = getTenantStorageKey("palmera_active_modes");
    const load = async () => {
      try {
        const res = await fetch("/api/admin/modes");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.modes)) {
            setActiveModes(data.modes);
            localStorage.setItem(key, JSON.stringify(data.modes));
            return;
          }
        }
      } catch {}
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setActiveModes(Array.isArray(parsed) ? parsed : []);
        } catch {
          setActiveModes([]);
        }
      } else {
        setActiveModes([]);
      }
    };
    load();
    const handler = () => {
      const v = localStorage.getItem(key);
      if (v) {
        try { setActiveModes(JSON.parse(v)); } catch {}
      }
    };
    window.addEventListener("palmera_modes_updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("palmera_modes_updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const modeApps = activeModes.map((id) => PalmModesRegistry[id]).filter(Boolean);

  const allApps = [
    ...coreModules.map((m) => ({ ...m, type: "core" as const })),
    ...modeApps.map((m) => ({ id: m.id, name: m.name, icon: m.icon, category: m.category, menuItems: m.menuItems, type: "mode" as const })),
  ];

  const filtered = allApps.filter((app) =>
    app.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] -m-6 bg-gradient-to-br from-[#fafaf9] via-[#f5f5f4] to-[#e7e5e4] dark:from-[#1c1917] dark:via-[#292524] dark:to-[#1c1917] p-6 md:p-10">
      {/* Header - Apple style */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Escritorio
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {filtered.length} aplicaciones instaladas • Gestiona tu negocio como en Odoo, con diseño Apple
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar aplicación..."
            className="w-full pl-9 pr-4 h-10 rounded-full bg-white/80 dark:bg-stone-800/80 backdrop-blur border border-stone-200/60 dark:border-stone-700/60 text-sm outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
        </div>
      </div>

      {/* Odoo-like desktop grid - Apple design */}
      <div className="max-w-6xl mx-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm mb-4">
              <Icons.Package className="h-8 w-8 text-stone-400" />
            </div>
            <p className="text-sm text-stone-500">No hay aplicaciones que coincidan</p>
            <Link href="/admin/settings/modules" className="text-sm text-amber-600 hover:underline mt-2 inline-block">
              Gestionar modos →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8">
            {filtered.map((app) => (
              <Link
                key={app.id}
                href={app.menuItems[0]?.path || "/admin"}
                className="group flex flex-col items-center gap-3 p-4 rounded-3xl hover:bg-white/60 dark:hover:bg-stone-800/60 hover:shadow-xl hover:shadow-stone-200/50 dark:hover:shadow-black/20 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative">
                  <div className="h-20 w-20 rounded-[22px] bg-white dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700/60 shadow-lg shadow-stone-200/60 dark:shadow-black/30 flex items-center justify-center group-hover:shadow-xl group-hover:shadow-amber-500/10 group-hover:border-amber-500/20 group-hover:scale-105 transition-all duration-300">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-[#f25c54] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                      <PageIcon name={app.icon} className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  {app.type === "core" && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-stone-900 shadow-sm" title="Core" />
                  )}
                </div>
                <div className="text-center space-y-0.5 max-w-[110px]">
                  <p className="text-[13px] font-semibold text-stone-900 dark:text-stone-100 leading-tight line-clamp-2">
                    {app.name}
                  </p>
                  <p className="text-[10px] font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                    {app.category}
                  </p>
                </div>
              </Link>
            ))}

            {/* Add more apps card - Apple style */}
            <Link
              href="/admin/settings/modules"
              className="group flex flex-col items-center gap-3 p-4 rounded-3xl border-2 border-dashed border-stone-200 dark:border-stone-700 hover:border-amber-500/30 hover:bg-amber-500/[0.04] transition-all duration-300"
            >
              <div className="h-20 w-20 rounded-[22px] bg-stone-50 dark:bg-stone-800/50 border border-dashed border-stone-200 dark:border-stone-700 flex items-center justify-center group-hover:border-amber-500/20 group-hover:bg-white dark:group-hover:bg-stone-800 transition-all">
                <Icons.Plus className="h-7 w-7 text-stone-400 group-hover:text-amber-500 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-stone-600 dark:text-stone-400">Añadir app</p>
                <p className="text-[10px] text-stone-400 uppercase tracking-wider">Catálogo</p>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Footer hint - Apple */}
      <div className="max-w-6xl mx-auto mt-12 flex items-center justify-center gap-2 text-[11px] text-stone-400 dark:text-stone-500">
        <Icons.Sparkles className="h-3 w-3" />
        <span>Arrastra, busca y entra • Diseño Apple • Core: {coreModules.length} • Modos: {modeApps.length}</span>
      </div>
    </div>
  );
}
