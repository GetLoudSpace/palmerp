"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { getDefaultSlug } from "@/lib/clientStorage";

interface Opportunity {
  id: string;
  title: string;
  contactName: string;
  value: number;
  probability: number;
  status: "ACTIVE" | "WON" | "LOST";
}

interface Lead {
  id: string;
  value: number;
  stage: string;
}

export default function AnalyticsTab() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  // Simulation states
  const [simLeadsCount, setSimLeadsCount] = useState(150);
  const [simConversionRate, setSimConversionRate] = useState(25); // percentage
  const [simAverageDealValue, setSimAverageDealValue] = useState(5000); // Euros

  const getSlug = () => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const parts = hostname.split(".");
    return parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www" ? parts[0] : getDefaultSlug();
  };

  const loadData = () => {
    const slug = getSlug();
    // Load Ops
    const opsKey = `palmera_sales_opportunities_${slug}`;
    const savedOps = localStorage.getItem(opsKey);
    if (savedOps) {
      try { setOpportunities(JSON.parse(savedOps)); } catch (e) {}
    }
    // Load Leads
    const leadsKey = `palmera_sales_leads_${slug}`;
    const savedLeads = localStorage.getItem(leadsKey);
    if (savedLeads) {
      try { setLeads(JSON.parse(savedLeads)); } catch (e) {}
    }
  };

  useEffect(() => {
    loadData();

    // Listen for updates
    window.addEventListener("palmera_opportunities_updated", loadData);
    window.addEventListener("palmera_leads_updated", loadData);

    return () => {
      window.removeEventListener("palmera_opportunities_updated", loadData);
      window.removeEventListener("palmera_leads_updated", loadData);
    };
  }, []);

  // --- Metrics Calculations ---
  const activeOps = opportunities.filter((o) => o.status === "ACTIVE");
  const wonOps = opportunities.filter((o) => o.status === "WON");
  const lostOps = opportunities.filter((o) => o.status === "LOST");
  const totalClosed = wonOps.length + lostOps.length;

  const winRate = totalClosed > 0 ? Math.round((wonOps.length / totalClosed) * 100) : 0;
  
  // Total pipeline value of active ops
  const pipelineValue = activeOps.reduce((acc, o) => acc + o.value, 0);

  // Weighted forecast = value * probability
  const weightedForecast = activeOps.reduce((acc, o) => acc + (o.value * (o.probability / 100)), 0);

  // Total won revenue
  const totalWonRevenue = wonOps.reduce((acc, o) => acc + o.value, 0);

  // Lead Funnel Values
  const initialLeadsVal = leads.filter((l) => l.stage === "INITIAL").reduce((acc, l) => acc + l.value, 0);
  const qualLeadsVal = leads.filter((l) => l.stage === "QUALIFIED").reduce((acc, l) => acc + l.value, 0);
  const propLeadsVal = leads.filter((l) => l.stage === "PROPOSAL").reduce((acc, l) => acc + l.value, 0);
  const negLeadsVal = leads.filter((l) => l.stage === "NEGOTIATION").reduce((acc, l) => acc + l.value, 0);

  // BI Simulated Revenue
  const simulatedSalesCount = Math.round(simLeadsCount * (simConversionRate / 100));
  const simulatedRevenue = simulatedSalesCount * simAverageDealValue;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border/30 pb-3">
        <h3 className="text-sm font-bold text-foreground">Análisis de Business Intelligence (BI) de Ventas</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Indicadores clave de conversión, proyecciones ponderadas de ingresos y simulador de metas comerciales.</p>
      </div>

      {/* BI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        {/* Win Rate Card */}
        <div className="border border-border/40 bg-card p-4.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider block">Tasa de Cierre</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-foreground font-mono">{winRate}%</span>
            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
              <Icons.TrendingUp className="h-3 w-3" />
              +2.4%
            </span>
          </div>
          <div className="text-[9px] text-muted-foreground">{wonOps.length} ganadas de {totalClosed} cerradas</div>
        </div>

        {/* Total Won Revenue Card */}
        <div className="border border-border/40 bg-card p-4.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider block">Ventas Cerradas (Éxito)</span>
          <span className="text-xl font-extrabold text-foreground font-mono">
            {totalWonRevenue.toLocaleString("es-ES")} €
          </span>
          <div className="text-[9px] text-muted-foreground">Ingresos reales facturados y ganados</div>
        </div>

        {/* Pipeline Value Card */}
        <div className="border border-border/40 bg-card p-4.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider block">Valor de Cartera Activa</span>
          <span className="text-xl font-extrabold text-foreground font-mono">
            {pipelineValue.toLocaleString("es-ES")} €
          </span>
          <div className="text-[9px] text-muted-foreground">{activeOps.length} oportunidades en curso</div>
        </div>

        {/* Weighted Forecast Card */}
        <div className="border border-border/40 bg-card p-4.5 rounded-2xl shadow-xs space-y-1 bg-linear-to-r from-red-500/5 to-red-500/5">
          <span className="text-[9px] font-extrabold uppercase text-red-600 dark:text-red-500 tracking-wider block">Previsión Ponderada</span>
          <span className="text-xl font-extrabold text-foreground font-mono">
            {Math.round(weightedForecast).toLocaleString("es-ES")} €
          </span>
          <div className="text-[9px] text-muted-foreground">Valor ajustado por probabilidad</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Funnel Chart */}
        <div className="border border-border/40 bg-card p-5 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-foreground border-b border-border/30 pb-2">Distribución del Pipeline por Etapa</h4>
          
          <div className="space-y-3.5">
            {/* Initial */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-foreground">
                <span>Contacto Inicial</span>
                <span className="font-mono">{initialLeadsVal.toLocaleString("es-ES")} €</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (initialLeadsVal / (pipelineValue || 1)) * 100)}%` }} />
              </div>
            </div>

            {/* Qualified */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-foreground">
                <span>Cualificado</span>
                <span className="font-mono">{qualLeadsVal.toLocaleString("es-ES")} €</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (qualLeadsVal / (pipelineValue || 1)) * 100)}%` }} />
              </div>
            </div>

            {/* Proposal */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-foreground">
                <span>Propuesta / Oferta</span>
                <span className="font-mono">{propLeadsVal.toLocaleString("es-ES")} €</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, (propLeadsVal / (pipelineValue || 1)) * 100)}%` }} />
              </div>
            </div>

            {/* Negotiation */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-foreground">
                <span>Negociación Final</span>
                <span className="font-mono">{negLeadsVal.toLocaleString("es-ES")} €</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (negLeadsVal / (pipelineValue || 1)) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: BI Forecast Simulator */}
        <div className="border border-border/40 bg-card p-5 rounded-2xl space-y-4 bg-linear-to-b from-card to-muted/10">
          <div className="border-b border-border/30 pb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground">Simulador de Ingresos y Metas Comerciales</h4>
            <Icons.BarChart2 className="h-4 w-4 text-red-500 animate-pulse" />
          </div>

          <div className="space-y-4">
            {/* Slider 1: Leads */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-foreground">
                <span>Leads Captados Mensuales</span>
                <span className="font-mono text-red-600 dark:text-red-500">{simLeadsCount} leads</span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={simLeadsCount}
                onChange={(e) => setSimLeadsCount(Number(e.target.value))}
                className="w-full accent-red-500 cursor-pointer"
              />
            </div>

            {/* Slider 2: Conversion Rate */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-foreground">
                <span>Tasa de Conversión (%)</span>
                <span className="font-mono text-red-600 dark:text-red-500">{simConversionRate}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={simConversionRate}
                onChange={(e) => setSimConversionRate(Number(e.target.value))}
                className="w-full accent-red-500 cursor-pointer"
              />
            </div>

            {/* Slider 3: Deal Value */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-foreground">
                <span>Valor Medio de Contrato (€)</span>
                <span className="font-mono text-red-600 dark:text-red-500">
                  {simAverageDealValue.toLocaleString("es-ES")} €
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="50000"
                step="500"
                value={simAverageDealValue}
                onChange={(e) => setSimAverageDealValue(Number(e.target.value))}
                className="w-full accent-red-500 cursor-pointer"
              />
            </div>

            {/* Simulated Output Dashboard */}
            <div className="border border-border/40 p-4 rounded-xl bg-background space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                <span>Ventas Estimadas:</span>
                <span className="text-foreground">{simulatedSalesCount} cierres</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/30 pt-2 text-xs font-extrabold">
                <span className="text-foreground">Facturación Estimada:</span>
                <span className="text-red-600 dark:text-red-400 font-mono">
                  {simulatedRevenue.toLocaleString("es-ES")} € / mes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
