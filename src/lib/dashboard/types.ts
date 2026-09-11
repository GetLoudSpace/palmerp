export type WidgetKind = "kpi" | "chart" | "feed" | "table" | "hero";
export type ChartType = "line" | "bar" | "area" | "pie" | "donut";
export type Period = "7d" | "30d" | "90d";
export type WidgetSpan = 1 | 2 | 3; // 1 = 4 cols, 2 = 6 cols, 3 = 12 cols (full)

export interface DashboardWidgetConfig {
  id: string;
  kind: WidgetKind;
  title: string;
  source: string;
  moduleId?: string; // if set, widget requires that PalmModesRegistry id active
  chartType?: ChartType;
  period?: Period;
  span: WidgetSpan;
  icon?: string;
  description?: string;
}

export interface DashboardLayout {
  version: 1;
  widgets: DashboardWidgetConfig[];
}

export interface WidgetCatalogItem {
  source: string;
  title: string;
  description: string;
  kind: WidgetKind;
  defaultChartType?: ChartType;
  defaultSpan: WidgetSpan;
  moduleId?: string;
  icon: string;
  category: string;
}
