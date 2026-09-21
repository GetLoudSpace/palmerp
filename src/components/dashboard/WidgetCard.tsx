"use client";
import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { getTenantStorageKey, getDefaultSlug } from "@/lib/clientStorage";
import type { DashboardWidgetConfig, ChartType, WidgetSpan, Period } from "@/lib/dashboard/types";
import { LineChart, BarChart, AreaChart, DonutChart } from "./charts/ChartPrimitives";

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const I = (Icons as unknown as Record<string, React.FC<{ className?: string }>>)[name];
  if (!I) return <Icons.HelpCircle className={className} />;
  return <I className={className} />;
};

function useMockData(source: string, period: Period | undefined) {
  const [contacts, setContacts] = useState<{ total: number; byType: { label: string; value: number }[]; newSeries: number[] }>({
    total: 0,
    byType: [],
    newSeries: [],
  });
  const [audit, setAudit] = useState<{ id: string; action: string; details: string; time: string }[]>([]);

  useEffect(() => {
    try {
      const key = getTenantStorageKey("palmera_contacts");
      // contacts page uses palmera_contacts_<slug>
      const slug = (() => {
        const h = typeof window !== "undefined" ? window.location.hostname : "";
        if (h.includes("localhost") || h.includes("127.0.0.1")) {
          const parts = h.split(".");
          if (parts.length > 1 && parts[0] !== "localhost") return parts[0].toLowerCase();
        } else {
          const parts = h.split(".");
          if (parts.length > 2 && parts[0] !== "www") return parts[0].toLowerCase();
        }
        return getDefaultSlug();
      })();
      const raw = localStorage.getItem(`palmera_contacts_${slug}`);
      if (raw) {
        const arr = JSON.parse(raw) as Array<{ contactType: string; createdAt?: string }>;
        const total = arr.length;
        const comp = arr.filter((c) => c.contactType === "COMPANY").length;
        const ind = total - comp;
        const byType = [
          { label: "Empresas", value: comp },
          { label: "Particulares", value: ind },
        ];
        // newSeries: last 7 days counts (mock from createdAt if present else random)
        const series = Array.from({ length: 7 }, (_, i) => {
          // simple deterministic random around total
          return Math.max(1, Math.round((total / 7) + Math.sin(i * 1.2) * 2 + (Math.random() * 2 - 1)));
        });
        setContacts({ total, byType, newSeries: series });
      } else {
        // fallback demo
        setContacts({ total: 148, byType: [{ label: "Empresas", value: 52 }, { label: "Particulares", value: 96 }], newSeries: [12, 18, 15, 22, 19, 25, 18] });
      }
    } catch {
      setContacts({ total: 148, byType: [{ label: "Empresas", value: 52 }, { label: "Particulares", value: 96 }], newSeries: [12, 18, 15, 22, 19, 25, 18] });
    }
    try {
      const slug2 = (() => {
        const h = typeof window !== "undefined" ? window.location.hostname : "";
        if (h.includes("localhost") || h.includes("127.0.0.1")) {
          const parts = h.split(".");
          if (parts.length > 1 && parts[0] !== "localhost") return parts[0].toLowerCase();
        } else {
          const parts = h.split(".");
          if (parts.length > 2 && parts[0] !== "www") return parts[0].toLowerCase();
        }
        return getDefaultSlug();
      })();
      const auditKey = `palmera_audit_logs_${slug2}`;
      const legacyKey = "palmera_audit_logs";
      const raw2 = localStorage.getItem(auditKey) || localStorage.getItem(legacyKey) || "[]";
      const arr2 = JSON.parse(raw2);
      const mapped = (Array.isArray(arr2) ? arr2 : []).slice(0, 8).map((l: Record<string, unknown>) => ({
        id: String(l["id"] || Math.random()),
        action: String(l["action"] || "AUDIT"),
        details: String(l["details"] || l["msg"] || ""),
        time: String(l["timestamp"] || l["time"] || "Hace un momento"),
      }));
      if (mapped.length === 0) {
        setAudit([
          { id: "1", action: "Inicialización de base de datos", details: "Esquema relacional de Prisma verificado y compilado.", time: "Hace 10 min" },
          { id: "2", action: "Render de UI Shell", details: "Sidebar dinámico cargado exitosamente.", time: "Hace 2 min" },
          { id: "3", action: "Cambio de tema", details: "Dark mode preferido cargado por defecto en local storage.", time: "Ahora mismo" },
        ]);
      } else setAudit(mapped);
    } catch {
      setAudit([
        { id: "1", action: "Inicialización de base de datos", details: "Esquema relacional de Prisma verificado y compilado.", time: "Hace 10 min" },
        { id: "2", action: "Render de UI Shell", details: "Sidebar dinámico cargado exitosamente.", time: "Hace 2 min" },
      ]);
    }
  }, [source, period]);

  return { contacts, audit };
}

export default function WidgetCard({
  widget,
  isEditing,
  onUpdate,
  onRemove,
  onMove,
  isFirst,
  isLast,
  activeModes,
}: {
  widget: DashboardWidgetConfig;
  isEditing: boolean;
  onUpdate: (patch: Partial<DashboardWidgetConfig>) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
  activeModes: string[];
}) {
  const period = widget.period || "7d";
  const { contacts, audit } = useMockData(widget.source, period);
  const requiresModule = !!widget.moduleId;
  const moduleActive = !widget.moduleId || activeModes.includes(widget.moduleId);

  const spanClass = widget.span === 3 ? "col-span-12" : widget.span === 2 ? "col-span-12 md:col-span-6" : "col-span-12 sm:col-span-6 lg:col-span-4";

  // Mock generators for non-core sources
  const mockSeries = (len = 7, base = 20) => Array.from({ length: len }, (_, i) => Math.max(4, Math.round(base + Math.sin(i) * 6 + (Math.random() * 6 - 3))));
  const mockPipeline = [
    { label: "Contacto", value: 24 },
    { label: "Cualificación", value: 18 },
    { label: "Propuesta", value: 12 },
    { label: "Negociación", value: 7 },
    { label: "Ganado", value: 4 },
  ];

  const renderKpi = () => {
    let value: string = "—";
    let change: string | null = null;
    let colorClass = "from-red-500/10 to-red-500/10 text-red-600 border-red-500/20";
    let data: number[] | null = null;

    switch (widget.source) {
      case "core.contacts.count":
        value = String(contacts.total);
        change = "+12% esta semana";
        break;
      case "sales.pipeline.value":
        value = "€ 48.2k";
        change = "Ponderado 30d";
        data = mockSeries(7, 18);
        colorClass = "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-500/20";
        break;
      case "restaurant.waste.cost":
        value = "€ 1.240";
        change = "-8% vs mes anterior";
        data = mockSeries(7, 12);
        colorClass = "from-rose-500/10 to-red-500/10 text-rose-600 border-rose-500/20";
        break;
      case "purchasing.orders.pending":
        value = "6";
        change = "2 urgentes";
        colorClass = "from-blue-500/10 to-cyan-500/10 text-blue-600 border-blue-500/20";
        break;
      case "restaurant.reservations.today":
        value = "18";
        change = "4 VIP";
        break;
      case "finance.invoices.pending":
        value = "9 • € 12.4k";
        change = "5 vencidas";
        break;
      case "team.clocking.late":
        value = "3";
        change = "Últimos 7 días";
        break;
      case "ecommerce.orders.today":
        value = "22";
        change = "+5 hoy";
        break;
      default:
        value = widget.source.includes("sales") ? "€ 36k" : widget.source.includes("restaurant") ? "14" : "42";
        change = "Dato simulado";
        break;
    }

    const showChart = widget.chartType && data;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{widget.title}</p>
            <h3 className="text-2xl font-extrabold tracking-tight text-foreground">{value}</h3>
            {change && <p className="text-xs font-medium text-red-600 dark:text-red-500">{change}</p>}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr border ${colorClass}`}>
            <DynamicIcon name={widget.icon || "Activity"} className="h-5 w-5" />
          </div>
        </div>
        {showChart && data && (
          <div className="rounded-lg bg-muted/20 p-2 border border-border/30">
            {widget.chartType === "bar" ? <BarChart data={data} /> : <LineChart data={data} />}
          </div>
        )}
      </div>
    );
  };

  const renderChart = () => {
    const ct = widget.chartType || "line";
    let data: number[] = mockSeries(7);
    let donutData: { label: string; value: number }[] | null = null;
    let titleExtra: string | null = null;

    switch (widget.source) {
      case "core.contacts.new":
        data = contacts.newSeries.length ? contacts.newSeries : [12, 18, 15, 22, 19, 25, 18];
        titleExtra = `${period} • ${data.reduce((a, b) => a + b, 0)} altas`;
        break;
      case "sales.pipeline.count":
        if (ct === "pie" || ct === "donut") donutData = mockPipeline;
        else data = mockPipeline.map((p) => p.value);
        titleExtra = `Total ${mockPipeline.reduce((a, b) => a + b.value, 0)} leads`;
        break;
      case "sales.revenue.forecast":
        data = [18, 22, 19, 28, 24, 32, 29];
        titleExtra = "€ ponderado";
        break;
      case "purchasing.stockDays":
        data = [12, 8, 5, 14, 3, 9, 6];
        titleExtra = "días restantes";
        break;
      case "restaurant.covers":
        data = [42, 58, 49, 62, 55, 71, 68];
        break;
      case "finance.cashflow":
        data = [12, 19, 15, 22, 18, 25, 20];
        break;
      case "team.shifts.coverage":
        data = [85, 92, 88, 95, 78, 90, 94];
        break;
      case "core.contacts.byType":
        donutData = contacts.byType.length
          ? contacts.byType
          : [
              { label: "Empresas", value: 52 },
              { label: "Particulares", value: 96 },
            ];
        break;
      case "restaurant.haccp.compliance":
        donutData = [{ label: "OK", value: 87 }, { label: "Alerta", value: 13 }];
        break;
      default:
        if (ct === "pie" || ct === "donut") donutData = [{ label: "A", value: 40 }, { label: "B", value: 30 }, { label: "C", value: 30 }];
        else data = mockSeries(7);
        break;
    }

    if ((ct === "pie" || ct === "donut") && donutData) {
      return (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-foreground">{widget.title}</h4>
            {titleExtra && <span className="text-[10px] font-semibold text-muted-foreground">{titleExtra}</span>}
          </div>
          <DonutChart data={donutData} />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-foreground">{widget.title}</h4>
          {titleExtra && <span className="text-[10px] font-semibold text-muted-foreground">{titleExtra}</span>}
        </div>
        <div className="rounded-lg bg-muted/10 border border-border/20 p-2">
          {ct === "bar" ? <BarChart data={data} /> : ct === "area" ? <AreaChart data={data} /> : <LineChart data={data} />}
        </div>
        <div className="flex gap-1.5 justify-center">
          {data.map((_, i) => (
            <span key={i} className="h-1 w-6 rounded-full bg-muted" />
          ))}
        </div>
      </div>
    );
  };

  const renderFeed = () => (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-foreground flex items-center justify-between">
        {widget.title} <span className="text-[9px] font-bold uppercase tracking-widest bg-muted/40 border border-border/50 px-2 py-0.5 rounded-md text-muted-foreground">Live</span>
      </h4>
      <div className="divide-y divide-border/40 max-h-52 overflow-y-auto pr-1">
        {audit.map((l) => (
          <div key={l.id} className="py-2.5 flex gap-3">
            <div className="h-6 w-6 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
              <Icons.Activity className="h-3 w-3" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-foreground truncate">{l.action}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">{l.time}</span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{l.details}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTable = () => {
    if (widget.source === "core.diagnostics") {
      return (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground">{widget.title}</h4>
          <div className="space-y-3">
            {[
              { label: "Uso de Memoria (Heap)", value: "142 MB / 512 MB", pct: 27, color: "bg-red-500" },
              { label: "Latencia de Base de Datos", value: "12ms (Prisma 7 Pool)", pct: 8, color: "bg-emerald-500" },
              { label: "Compilación TypeScript", value: "Exitoso (tsc check)", pct: 100, color: "bg-blue-500" },
            ].map((r) => (
              <div key={r.label}>
                <div className="flex justify-between text-[11px] font-medium mb-1">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-bold text-foreground">{r.value}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border/30 pt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>Next.js 16.2.6</span>
            <span>React 19</span>
          </div>
        </div>
      );
    }
    // generic table mocks
    const rows =
      widget.source === "sales.scout.leads"
        ? [
            { c1: "Glovo", c2: "Tech", c3: "92%" },
            { c1: "Typeform", c2: "SaaS", c3: "88%" },
            { c1: "Cuatrecasas", c2: "Legal", c3: "81%" },
          ]
        : widget.source === "purchasing.priceAlerts"
          ? [
              { c1: "Aceite oliva 5L", c2: "+6%", c3: "Proveedor A" },
              { c1: "Harina 25kg", c2: "+3%", c3: "Proveedor B" },
            ]
          : [
              { c1: "Dato 1", c2: "—", c3: "—" },
              { c1: "Dato 2", c2: "—", c3: "—" },
            ];
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-foreground">{widget.title}</h4>
        <div className="overflow-hidden rounded-lg border border-border/30">
          <table className="w-full text-[11px]">
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-semibold text-foreground">{r.c1}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.c2}</td>
                  <td className="px-3 py-2 text-right font-bold text-foreground">{r.c3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderHero = () => (
    <div className="relative overflow-hidden rounded-xl border border-red-500/15 bg-gradient-to-tr from-red-500/15 via-red-500/5 to-transparent p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-bold text-red-600">
            <Icons.Sparkles className="h-3 w-3" /> Núcleo Listo
          </span>
          <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            ¡Bienvenido a <span className="text-red-500">Palmera</span>!
          </h2>
          <p className="max-w-xl text-xs text-muted-foreground leading-relaxed">
            Panel editable: elige qué métricas ver, cambia visualizaciones (línea/barra/donut) y filtra por sector. Los datos se adaptan a los módulos que tengas activos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/admin/settings/modules" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-bold text-white shadow">
            <Icons.LayoutGrid className="h-3.5 w-3.5" /> Ver Sectores
          </a>
          <a href="/superadmin" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-stone-800 px-3 text-xs font-bold text-white">
            <Icons.Layers className="h-3.5 w-3.5" /> Consola
          </a>
        </div>
      </div>
    </div>
  );

  const content = () => {
    if (!moduleActive) {
      return (
        <div className="py-8 text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600">
            <DynamicIcon name={widget.icon || "Package"} className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">{widget.title}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Requiere sector <span className="font-bold text-red-600">{widget.moduleId}</span> inactivo.</p>
          </div>
          <a href="/admin/settings/modules" className="inline-flex h-7 px-3 items-center rounded-lg bg-red-500 text-white text-xs font-bold">
            Activar sector
          </a>
        </div>
      );
    }
    switch (widget.kind) {
      case "kpi":
        return renderKpi();
      case "chart":
        return renderChart();
      case "feed":
        return renderFeed();
      case "table":
        return renderTable();
      case "hero":
        return renderHero();
      default:
        return renderKpi();
    }
  };

  if (widget.kind === "hero") {
    return (
      <div className={`${spanClass} ${isEditing ? "ring-2 ring-red-500/20 rounded-xl" : ""}`}>
        {isEditing && (
          <div className="mb-1 flex items-center justify-end gap-1">
            <button onClick={() => onMove("up")} disabled={isFirst} className="h-6 w-6 rounded border bg-card flex items-center justify-center disabled:opacity-40">
              <Icons.ChevronUp className="h-3 w-3" />
            </button>
            <button onClick={() => onMove("down")} disabled={isLast} className="h-6 w-6 rounded border bg-card flex items-center justify-center disabled:opacity-40">
              <Icons.ChevronDown className="h-3 w-3" />
            </button>
            <button onClick={onRemove} className="h-6 px-2 rounded bg-destructive/10 text-destructive text-[10px] font-bold border border-destructive/20">
              <Icons.Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
        {content()}
      </div>
    );
  }

  return (
    <div className={`${spanClass} rounded-2xl border bg-card p-4 md:p-5 shadow-xs flex flex-col ${isEditing ? "border-red-500/30 ring-2 ring-red-500/10" : "border-border/40"} ${!moduleActive ? "opacity-90" : ""}`}>
      {isEditing && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-border/30">
          <div className="flex items-center gap-1">
            <button onClick={() => onMove("up")} disabled={isFirst} className="h-7 w-7 rounded-lg border border-border bg-card flex items-center justify-center disabled:opacity-30 hover:bg-muted">
              <Icons.ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onMove("down")} disabled={isLast} className="h-7 w-7 rounded-lg border border-border bg-card flex items-center justify-center disabled:opacity-30 hover:bg-muted">
              <Icons.ChevronDown className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-bold text-muted-foreground ml-1">Span:</span>
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => onUpdate({ span: s as WidgetSpan })}
                className={`h-6 px-2 rounded text-[10px] font-bold border ${widget.span === s ? "bg-red-500 text-white border-red-500" : "bg-card border-border hover:bg-muted"}`}
              >
                {s === 1 ? "S" : s === 2 ? "M" : "L"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {widget.kind === "chart" && (
              <>
                <span className="text-[10px] font-bold text-muted-foreground">Vista:</span>
                {(["line", "bar", "area", "donut"] as ChartType[]).map((ct) => (
                  <button
                    key={ct}
                    onClick={() => onUpdate({ chartType: ct })}
                    className={`h-6 px-2 rounded text-[10px] font-bold capitalize border ${widget.chartType === ct ? "bg-red-500 text-white border-red-500" : "bg-card border-border hover:bg-muted"}`}
                  >
                    {ct}
                  </button>
                ))}
                <select
                  value={widget.period || "7d"}
                  onChange={(e) => onUpdate({ period: e.target.value as Period })}
                  className="h-6 rounded border border-border bg-card text-[10px] font-semibold px-1"
                >
                  <option value="7d">7d</option>
                  <option value="30d">30d</option>
                  <option value="90d">90d</option>
                </select>
              </>
            )}
            {widget.kind === "kpi" && (
              <select
                value={widget.chartType || ""}
                onChange={(e) => onUpdate({ chartType: (e.target.value || undefined) as ChartType | undefined })}
                className="h-6 rounded border border-border bg-card text-[10px] font-semibold px-1"
              >
                <option value="">Sin gráfico</option>
                <option value="line">Línea</option>
                <option value="bar">Barra</option>
              </select>
            )}
            <button onClick={onRemove} className="h-7 w-7 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center hover:bg-destructive/15">
              <Icons.Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      {content()}
    </div>
  );
}
