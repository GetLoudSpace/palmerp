import type { WidgetCatalogItem, DashboardWidgetConfig, DashboardLayout } from "./types";

// Catálogo extensible: cada entrada describe una métrica/visualización disponible.
// Core no importa módulos; los módulos se registran aquí con moduleId opcional.
export const widgetCatalog: WidgetCatalogItem[] = [
  // CORE
  {
    source: "core.contacts.count",
    title: "Total contactos",
    description: "Conteo total de contactos (empresas + particulares)",
    kind: "kpi",
    defaultSpan: 1,
    icon: "Users",
    category: "Core",
  },
  {
    source: "core.contacts.byType",
    title: "Contactos por tipo",
    description: "Distribución empresas vs particulares",
    kind: "chart",
    defaultChartType: "donut",
    defaultSpan: 1,
    icon: "PieChart",
    category: "Core",
  },
  {
    source: "core.contacts.new",
    title: "Alta de contactos",
    description: "Evolución de altas últimos días",
    kind: "chart",
    defaultChartType: "area",
    defaultSpan: 2,
    icon: "TrendingUp",
    category: "Core",
  },
  {
    source: "core.audit.feed",
    title: "Registro de auditoría",
    description: "Feed en vivo de actividad del sistema",
    kind: "feed",
    defaultSpan: 2,
    icon: "Activity",
    category: "Core",
  },
  {
    source: "core.hero",
    title: "Bienvenido a Palmera",
    description: "Banner de bienvenida + accesos rápidos",
    kind: "hero",
    defaultSpan: 3,
    icon: "Sparkles",
    category: "Core",
  },
  {
    source: "core.diagnostics",
    title: "Diagnóstico del core",
    description: "Heap, latencia Prisma, estado tsc",
    kind: "table",
    defaultSpan: 1,
    icon: "Cpu",
    category: "Core",
  },
  // VENTAS
  {
    source: "sales.pipeline.count",
    title: "Pipeline: nº oportunidades",
    description: "Leads por etapa del embudo",
    kind: "chart",
    defaultChartType: "bar",
    defaultSpan: 2,
    icon: "BarChart3",
    moduleId: "VENTAS",
    category: "Ventas",
  },
  {
    source: "sales.pipeline.value",
    title: "Valor pipeline (€)",
    description: "Valor ponderado por probabilidad",
    kind: "kpi",
    defaultSpan: 1,
    icon: "Euro",
    moduleId: "VENTAS",
    category: "Ventas",
  },
  {
    source: "sales.revenue.forecast",
    title: "Previsión ingresos",
    description: "Forecast ponderado 30 días",
    kind: "chart",
    defaultChartType: "line",
    defaultSpan: 2,
    icon: "TrendingUp",
    moduleId: "VENTAS",
    category: "Ventas",
  },
  {
    source: "sales.scout.leads",
    title: "Leads Scouter IA",
    description: "Últimos 5 prospectos detectados",
    kind: "table",
    defaultSpan: 2,
    icon: "Sparkles",
    moduleId: "VENTAS",
    category: "Ventas",
  },
  // COMPRAS
  {
    source: "purchasing.stockDays",
    title: "Días de stock restante",
    description: "Materias primas con stock crítico",
    kind: "chart",
    defaultChartType: "bar",
    defaultSpan: 2,
    icon: "Package",
    moduleId: "COMPRAS_INTELIGENTES",
    category: "Compras",
  },
  {
    source: "purchasing.orders.pending",
    title: "Pedidos pendientes",
    description: "Pedidos a proveedor por confirmar",
    kind: "kpi",
    defaultSpan: 1,
    icon: "ShoppingBag",
    moduleId: "COMPRAS_INTELIGENTES",
    category: "Compras",
  },
  {
    source: "purchasing.priceAlerts",
    title: "Alertas de precio",
    description: "Albaranes con subida no pactada",
    kind: "table",
    defaultSpan: 1,
    icon: "AlertTriangle",
    moduleId: "COMPRAS_INTELIGENTES",
    category: "Compras",
  },
  // RESTAURANTE
  {
    source: "restaurant.covers",
    title: "Comensales / día",
    description: "Evolución cubiertos últimos 7 días",
    kind: "chart",
    defaultChartType: "area",
    defaultSpan: 2,
    icon: "Utensils",
    moduleId: "RESTAURANTE",
    category: "Restaurante",
  },
  {
    source: "restaurant.waste.cost",
    title: "Coste mermas (€)",
    description: "Impacto económico de desperdicio",
    kind: "kpi",
    defaultSpan: 1,
    icon: "Trash2",
    moduleId: "RESTAURANTE",
    category: "Restaurante",
  },
  {
    source: "restaurant.haccp.compliance",
    title: "Cumplimiento HACCP",
    description: "% registros de temperatura ok",
    kind: "chart",
    defaultChartType: "donut",
    defaultSpan: 1,
    icon: "ShieldCheck",
    moduleId: "RESTAURANTE",
    category: "Restaurante",
  },
  {
    source: "restaurant.reservations.today",
    title: "Reservas hoy",
    description: "Reservas confirmadas para hoy",
    kind: "kpi",
    defaultSpan: 1,
    icon: "Calendar",
    moduleId: "RESTAURANTE",
    category: "Restaurante",
  },
  // FINANZAS
  {
    source: "finance.invoices.pending",
    title: "Facturas pendientes",
    description: "Nº y total facturas por cobrar/pagar",
    kind: "kpi",
    defaultSpan: 1,
    icon: "FileText",
    moduleId: "FINANZAS",
    category: "Finanzas",
  },
  {
    source: "finance.cashflow",
    title: "Flujo de caja",
    description: "Evolución ingresos vs gastos",
    kind: "chart",
    defaultChartType: "line",
    defaultSpan: 2,
    icon: "Wallet",
    moduleId: "FINANZAS",
    category: "Finanzas",
  },
  // GESTIÓN EQUIPO
  {
    source: "team.shifts.coverage",
    title: "Cobertura turnos",
    description: "% puestos cubiertos semana actual",
    kind: "chart",
    defaultChartType: "bar",
    defaultSpan: 2,
    icon: "Users2",
    moduleId: "GESTION_EQUIPO",
    category: "Equipo",
  },
  {
    source: "team.clocking.late",
    title: "Retrasos fichaje",
    description: "Incidencias de puntualidad últimos 7d",
    kind: "kpi",
    defaultSpan: 1,
    icon: "Clock",
    moduleId: "GESTION_EQUIPO",
    category: "Equipo",
  },
  // E-COMMERCE / LOGISTICA / OTROS
  {
    source: "ecommerce.orders.today",
    title: "Pedidos e-commerce hoy",
    description: "Pedidos online del día",
    kind: "kpi",
    defaultSpan: 1,
    icon: "ShoppingCart",
    moduleId: "VENTAS",
    category: "E-commerce",
  },
  {
    source: "logistics.stock.critical",
    title: "Stock crítico",
    description: "Productos bajo mínimo",
    kind: "chart",
    defaultChartType: "bar",
    defaultSpan: 1,
    icon: "Warehouse",
    moduleId: "LOGISTICA",
    category: "Logística",
  },
];

export const defaultDashboardLayout: DashboardLayout = {
  version: 1,
  widgets: [
    {
      id: "hero-welcome",
      kind: "hero",
      title: "Bienvenido a Palmera",
      source: "core.hero",
      span: 3,
      icon: "Sparkles",
    },
    { id: "kpi-contacts", kind: "kpi", title: "Total contactos", source: "core.contacts.count", span: 1, icon: "Users" },
    { id: "kpi-sales-value", kind: "kpi", title: "Valor pipeline (€)", source: "sales.pipeline.value", span: 1, icon: "Euro", moduleId: "VENTAS" },
    { id: "kpi-waste", kind: "kpi", title: "Coste mermas (€)", source: "restaurant.waste.cost", span: 1, icon: "Trash2", moduleId: "RESTAURANTE" },
    { id: "chart-contacts-new", kind: "chart", title: "Alta de contactos", source: "core.contacts.new", chartType: "area", period: "7d", span: 2, icon: "TrendingUp" },
    { id: "chart-pipeline", kind: "chart", title: "Pipeline por etapa", source: "sales.pipeline.count", chartType: "bar", span: 1, icon: "BarChart3", moduleId: "VENTAS" },
    { id: "feed-audit", kind: "feed", title: "Registro de auditoría", source: "core.audit.feed", span: 2, icon: "Activity" },
    { id: "diag-core", kind: "table", title: "Diagnóstico del core", source: "core.diagnostics", span: 1, icon: "Cpu" },
  ],
};

export function getCatalogItem(source: string): WidgetCatalogItem | undefined {
  return widgetCatalog.find((w) => w.source === source);
}

export function validateLayout(layout: unknown): layout is DashboardLayout {
  if (!layout || typeof layout !== "object") return false;
  const obj = layout as Record<string, unknown>;
  if (obj.version !== 1) return false;
  if (!Array.isArray(obj.widgets)) return false;
  return obj.widgets.every(
    (w: unknown) =>
      w && typeof w === "object" && typeof (w as Record<string, unknown>).id === "string" && typeof (w as Record<string, unknown>).source === "string"
  );
}
