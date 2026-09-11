"use client";
import React, { useState } from "react";
import * as Icons from "lucide-react";
import { widgetCatalog } from "@/lib/dashboard/registry";
import type { DashboardWidgetConfig, ChartType, WidgetSpan } from "@/lib/dashboard/types";

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const I = (Icons as unknown as Record<string, React.FC<{ className?: string }>>)[name];
  if (!I) return <Icons.HelpCircle className={className} />;
  return <I className={className} />;
};

export default function AddWidgetModal({
  onClose,
  onAdd,
  activeModes,
  existingSources,
}: {
  onClose: () => void;
  onAdd: (widget: DashboardWidgetConfig) => void;
  activeModes: string[];
  existingSources: Set<string>;
}) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("Todas");

  const categories = ["Todas", ...Array.from(new Set(widgetCatalog.map((w) => w.category)))];

  const filtered = widgetCatalog.filter((w) => {
    if (filterCat !== "Todas" && w.category !== filterCat) return false;
    if (search && !w.title.toLowerCase().includes(search.toLowerCase()) && !w.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAdd = (item: (typeof widgetCatalog)[number]) => {
    const id = `${item.source.replace(/\./g, "-")}-${Date.now()}`;
    const widget: DashboardWidgetConfig = {
      id,
      kind: item.kind,
      title: item.title,
      source: item.source,
      moduleId: item.moduleId,
      chartType: item.defaultChartType as ChartType | undefined,
      period: "7d",
      span: item.defaultSpan,
      icon: item.icon,
      description: item.description,
    };
    onAdd(widget);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl border border-border/50 bg-card shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Icons.LayoutGrid className="h-4 w-4 text-amber-500" /> Añadir métrica al escritorio
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Elige qué datos visualizar. Los módulos inactivos se marcan y puedes activarlos desde aquí.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <Icons.X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-border/30 bg-muted/20 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar métrica..."
              className="w-full pl-8 pr-3 h-8 rounded-lg border border-border/50 bg-background text-xs outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${filterCat === c ? "bg-amber-500 text-white border-amber-500" : "bg-card border-border/50 text-muted-foreground hover:bg-muted"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid gap-3 sm:grid-cols-2">
          {filtered.map((item) => {
            const requiresModule = !!item.moduleId;
            const isActive = !item.moduleId || activeModes.includes(item.moduleId);
            const alreadyAdded = existingSources.has(item.source);
            return (
              <div
                key={item.source}
                className={`rounded-xl border p-4 flex flex-col gap-3 transition-all ${isActive ? "bg-card border-border/40 hover:border-amber-500/30 hover:shadow-sm" : "bg-muted/30 border-border/30 opacity-75"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${isActive ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : "bg-muted border-border text-muted-foreground"}`}>
                    <DynamicIcon name={item.icon} className="h-4.5 w-4.5" />
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                    {item.category}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{item.description}</p>
                  {requiresModule && (
                    <p className={`text-[10px] font-semibold mt-1.5 flex items-center gap-1 ${isActive ? "text-emerald-600" : "text-amber-600"}`}>
                      <Icons.Package className="h-3 w-3" />
                      Requiere: {item.moduleId} {isActive ? "• Activo" : "• Inactivo"}
                    </p>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Icons.Maximize2 className="h-3 w-3" /> Span {item.defaultSpan} • {item.kind} {item.defaultChartType ? `• ${item.defaultChartType}` : ""}
                  </span>
                  <button
                    onClick={() => handleAdd(item)}
                    disabled={alreadyAdded}
                    className={`inline-flex h-7 px-3 items-center gap-1 rounded-lg text-[11px] font-bold transition-colors ${alreadyAdded ? "bg-muted text-muted-foreground cursor-not-allowed" : isActive ? "bg-metallic-orange text-white shadow" : "bg-amber-500/10 text-amber-700 border border-amber-500/20 hover:bg-amber-500/15"}`}
                  >
                    {alreadyAdded ? (
                      <>
                        <Icons.Check className="h-3.5 w-3.5" /> Añadido
                      </>
                    ) : (
                      <>
                        <Icons.Plus className="h-3.5 w-3.5" /> Añadir
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border/30 px-6 py-3 bg-muted/20 flex justify-end">
          <button onClick={onClose} className="h-8 px-4 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-muted">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
