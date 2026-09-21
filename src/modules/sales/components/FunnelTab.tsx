"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { getDefaultSlug } from "@/lib/clientStorage";
import { isTenantDataCleared } from "@/lib/demoDataCleanup";

interface Lead {
  id: string;
  name?: string;
  company?: string;
  companyName?: string;
  contactPerson?: string;
  email: string;
  value: number;
  stage: "INITIAL" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION";
  createdAt: string;
}

interface Opportunity {
  id: string;
  title: string;
  contactName: string;
  value: number;
  probability: number;
  status: "ACTIVE" | "WON" | "LOST";
  createdAt: string;
}

const INITIAL_DEMO_LEADS: Lead[] = [
  {
    id: "l1",
    name: "Sofía Martínez",
    company: "Restauración Central",
    email: "sofia@centralrest.es",
    value: 4800,
    stage: "INITIAL",
    createdAt: new Date().toISOString(),
  },
  {
    id: "l2",
    name: "Javier López",
    company: "Sabor y Arte S.L.",
    email: "j.lopez@saboryarte.com",
    value: 12500,
    stage: "QUALIFIED",
    createdAt: new Date().toISOString(),
  },
  {
    id: "l3",
    name: "Elena Gómez",
    company: "Hoteles del Norte",
    email: "egomez@nortehotelex.es",
    value: 24000,
    stage: "PROPOSAL",
    createdAt: new Date().toISOString(),
  },
  {
    id: "l4",
    name: "Marcos Ruiz",
    company: "Gourmet Catering",
    email: "mruiz@gourmetc.com",
    value: 8500,
    stage: "NEGOTIATION",
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_DEMO_OPPORTUNITIES: Opportunity[] = [
  {
    id: "op1",
    title: "Suscripción Anual Enterprise",
    contactName: "Gastroshows Barcelona SL",
    value: 15000,
    probability: 80,
    closeDate: "2026-06-15",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  } as any,
  {
    id: "op2",
    title: "Licenciamiento Completo ERP",
    contactName: "Tecnologías del Sur SA",
    value: 28000,
    probability: 95,
    closeDate: "2026-05-30",
    status: "WON",
    createdAt: new Date().toISOString(),
  } as any,
  {
    id: "op3",
    title: "Consultoría e Integración Custom",
    contactName: "Carlos Ortega",
    value: 6200,
    probability: 40,
    closeDate: "2026-07-01",
    status: "LOST",
    createdAt: new Date().toISOString(),
  } as any,
];

export default function FunnelTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  
  // Custom success probabilities (percentages) for forecasting
  const [probabilities, setProbabilities] = useState({
    INITIAL: 10,
    QUALIFIED: 30,
    PROPOSAL: 60,
    NEGOTIATION: 85,
  });

  const getSlug = () => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const parts = hostname.split(".");
    return parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www" ? parts[0] : getDefaultSlug();
  };

  const loadData = () => {
    const slug = getSlug();
    if (isTenantDataCleared(slug)) {
      setLeads([]);
      setOpportunities([]);
      return;
    }
    
    // Load leads
    const leadsKey = `palmera_sales_leads_${slug}`;
    const savedLeads = localStorage.getItem(leadsKey);
    if (savedLeads) {
      try {
        setLeads(JSON.parse(savedLeads));
      } catch (e) {
        setLeads(INITIAL_DEMO_LEADS);
      }
    } else {
      setLeads(INITIAL_DEMO_LEADS);
      localStorage.setItem(leadsKey, JSON.stringify(INITIAL_DEMO_LEADS));
    }

    // Load opportunities
    const opsKey = `palmera_sales_opportunities_${slug}`;
    const savedOps = localStorage.getItem(opsKey);
    if (savedOps) {
      try {
        setOpportunities(JSON.parse(savedOps));
      } catch (e) {
        setOpportunities(INITIAL_DEMO_OPPORTUNITIES);
      }
    } else {
      setOpportunities(INITIAL_DEMO_OPPORTUNITIES);
      localStorage.setItem(opsKey, JSON.stringify(INITIAL_DEMO_OPPORTUNITIES));
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("palmera_leads_updated", loadData);
    window.addEventListener("palmera_opportunities_updated", loadData);
    return () => {
      window.removeEventListener("palmera_leads_updated", loadData);
      window.removeEventListener("palmera_opportunities_updated", loadData);
    };
  }, []);

  // Compute metrics by stage
  const stageStats = {
    INITIAL: { count: 0, value: 0 },
    QUALIFIED: { count: 0, value: 0 },
    PROPOSAL: { count: 0, value: 0 },
    NEGOTIATION: { count: 0, value: 0 },
    WON: { count: 0, value: 0 },
    LOST: { count: 0, value: 0 },
  };

  leads.forEach((l) => {
    if (stageStats[l.stage]) {
      stageStats[l.stage].count += 1;
      stageStats[l.stage].value += Number(l.value) || 0;
    }
  });

  opportunities.forEach((o) => {
    if (o.status === "WON") {
      stageStats.WON.count += 1;
      stageStats.WON.value += Number(o.value) || 0;
    } else if (o.status === "LOST") {
      stageStats.LOST.count += 1;
      stageStats.LOST.value += Number(o.value) || 0;
    } else if (o.status === "ACTIVE") {
      stageStats.NEGOTIATION.count += 1;
      stageStats.NEGOTIATION.value += Number(o.value) || 0;
    }
  });

  // Calculate Cumulative Flow (Leads that reached or surpassed each stage)
  const totalLeadsCount = leads.length + opportunities.filter(o => o.status === "WON" || o.status === "LOST").length;
  
  const reachedInitial = totalLeadsCount;
  const reachedQualified = stageStats.QUALIFIED.count + stageStats.PROPOSAL.count + stageStats.NEGOTIATION.count + stageStats.WON.count;
  const reachedProposal = stageStats.PROPOSAL.count + stageStats.NEGOTIATION.count + stageStats.WON.count;
  const reachedNegotiation = stageStats.NEGOTIATION.count + stageStats.WON.count;
  const reachedWon = stageStats.WON.count;

  // Conversion rates (percentage of leads moving from previous stage to this one)
  const convQualified = reachedInitial > 0 ? Math.round((reachedQualified / reachedInitial) * 100) : 0;
  const convProposal = reachedQualified > 0 ? Math.round((reachedProposal / reachedQualified) * 100) : 0;
  const convNegotiation = reachedProposal > 0 ? Math.round((reachedNegotiation / reachedProposal) * 100) : 0;
  const convWon = reachedNegotiation > 0 ? Math.round((reachedWon / reachedNegotiation) * 100) : 0;

  // Forecast calculations (Probability * Value)
  const activePipelineValue = 
    stageStats.INITIAL.value + 
    stageStats.QUALIFIED.value + 
    stageStats.PROPOSAL.value + 
    stageStats.NEGOTIATION.value;

  const weightedForecast = 
    (stageStats.INITIAL.value * (probabilities.INITIAL / 100)) +
    (stageStats.QUALIFIED.value * (probabilities.QUALIFIED / 100)) +
    (stageStats.PROPOSAL.value * (probabilities.PROPOSAL / 100)) +
    (stageStats.NEGOTIATION.value * (probabilities.NEGOTIATION / 100)) +
    stageStats.WON.value; // Won is always 100%

  // Stagnant Leads (Older than 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const stagnantLeads = leads.filter(l => new Date(l.createdAt) < sevenDaysAgo);

  // Total won vs lost ratio
  const winCount = stageStats.WON.count;
  const lossCount = stageStats.LOST.count;
  const totalClosed = winCount + lossCount;
  const winRate = totalClosed > 0 ? Math.round((winCount / totalClosed) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="border border-border/40 bg-card p-4.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider block">Cartera Activa Total</span>
          <div className="text-lg font-extrabold text-foreground font-mono">
            {activePipelineValue.toLocaleString("es-ES")} €
          </div>
          <p className="text-[9px] text-muted-foreground">Suma bruta de fases iniciales</p>
        </div>

        <div className="border border-border/40 bg-card p-4.5 rounded-2xl shadow-xs space-y-1 bg-linear-to-r from-red-500/5 to-red-500/5">
          <span className="text-[9px] font-extrabold uppercase text-red-600 dark:text-red-500 tracking-wider block">Previsión Ponderada</span>
          <div className="text-lg font-extrabold text-foreground font-mono text-red-600 dark:text-red-500">
            {Math.round(weightedForecast).toLocaleString("es-ES")} €
          </div>
          <p className="text-[9px] text-muted-foreground">Valor esperado de cierre + Ganados</p>
        </div>

        <div className="border border-border/40 bg-card p-4.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider block">Tasa de Cierre (Win Rate)</span>
          <div className="text-lg font-extrabold text-foreground font-mono">
            {winRate}%
          </div>
          <p className="text-[9px] text-muted-foreground">{winCount} ganadas de {totalClosed} cerradas</p>
        </div>

        <div className="border border-border/40 bg-card p-4.5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[9px] font-extrabold uppercase text-rose-500 tracking-wider block">Alertas de Estancamiento</span>
          <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono">
            {stagnantLeads.length} leads
          </div>
          <p className="text-[9px] text-muted-foreground">Sin movimiento en últimos 7 días</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Visual Funnel Representation (Left side) */}
        <div className="lg:col-span-2 border border-border/40 bg-card p-6 rounded-2xl shadow-xs space-y-5">
          <div className="border-b border-border/30 pb-3 flex justify-between items-center">
            <h4 className="text-xs font-bold text-foreground">Visualización Gráfica del Embudo Comercial</h4>
            <span className="text-[9px] text-muted-foreground font-mono">Calculado sobre {totalLeadsCount} prospectos históricos</span>
          </div>

          <div className="flex flex-col items-center justify-center space-y-3.5 pt-4">
            {/* Stage 1: Initial */}
            <div className="w-full flex flex-col items-center">
              <div className="w-full h-11 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between px-4 transition-all hover:bg-blue-500/15">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1. Contacto Inicial</span>
                <span className="text-xs font-mono font-bold text-foreground">{stageStats.INITIAL.count} leads • {stageStats.INITIAL.value.toLocaleString("es-ES")} €</span>
              </div>
              <div className="h-6 flex items-center gap-1 text-[9px] font-bold text-muted-foreground/80">
                <Icons.ArrowDown className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                <span>{convQualified}% conversión paso</span>
              </div>
            </div>

            {/* Stage 2: Qualified */}
            <div className="w-[85%] flex flex-col items-center">
              <div className="w-full h-11 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-between px-4 transition-all hover:bg-purple-500/15">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">2. Cualificado</span>
                <span className="text-xs font-mono font-bold text-foreground">{stageStats.QUALIFIED.count} leads • {stageStats.QUALIFIED.value.toLocaleString("es-ES")} €</span>
              </div>
              <div className="h-6 flex items-center gap-1 text-[9px] font-bold text-muted-foreground/80">
                <Icons.ArrowDown className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                <span>{convProposal}% conversión paso</span>
              </div>
            </div>

            {/* Stage 3: Proposal */}
            <div className="w-[70%] flex flex-col items-center">
              <div className="w-full h-11 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between px-4 transition-all hover:bg-red-500/15">
                <span className="text-xs font-bold text-red-600 dark:text-red-500">3. Propuesta</span>
                <span className="text-xs font-mono font-bold text-foreground">{stageStats.PROPOSAL.count} leads • {stageStats.PROPOSAL.value.toLocaleString("es-ES")} €</span>
              </div>
              <div className="h-6 flex items-center gap-1 text-[9px] font-bold text-muted-foreground/80">
                <Icons.ArrowDown className="h-3.5 w-3.5 text-red-400 animate-pulse" />
                <span>{convNegotiation}% conversión paso</span>
              </div>
            </div>

            {/* Stage 4: Negotiation */}
            <div className="w-[55%] flex flex-col items-center">
              <div className="w-full h-11 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between px-4 transition-all hover:bg-emerald-500/15">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">4. Negociación</span>
                <span className="text-xs font-mono font-bold text-foreground">{stageStats.NEGOTIATION.count} leads • {stageStats.NEGOTIATION.value.toLocaleString("es-ES")} €</span>
              </div>
              <div className="h-6 flex items-center gap-1 text-[9px] font-bold text-muted-foreground/80">
                <Icons.ArrowDown className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span>{convWon}% conversión paso</span>
              </div>
            </div>

            {/* Stage 5: Won */}
            <div className="w-[40%]">
              <div className="w-full h-11 bg-linear-to-r from-emerald-500 to-teal-500 text-white rounded-lg flex items-center justify-between px-4 shadow-md shadow-emerald-500/15">
                <span className="text-xs font-extrabold flex items-center gap-1">
                  <Icons.Trophy className="h-3.5 w-3.5" />
                  <span>5. Ganado</span>
                </span>
                <span className="text-xs font-mono font-bold">{stageStats.WON.count} cierres • {stageStats.WON.value.toLocaleString("es-ES")} €</span>
              </div>
            </div>
          </div>
        </div>

        {/* Forecast Probabilities Adjuster (Right side) */}
        <div className="space-y-4">
          <div className="border border-border/40 bg-card p-5 rounded-2xl shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-foreground border-b border-border/30 pb-2">Parámetros de Éxito Ponderado</h4>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1.5">
                  <span>PROBABILIDAD CONTACTO INICIAL</span>
                  <span className="text-foreground">{probabilities.INITIAL}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={probabilities.INITIAL}
                  onChange={(e) => setProbabilities({ ...probabilities, INITIAL: Number(e.target.value) })}
                  className="w-full accent-red-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1.5">
                  <span>PROBABILIDAD CUALIFICADO</span>
                  <span className="text-foreground">{probabilities.QUALIFIED}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={probabilities.QUALIFIED}
                  onChange={(e) => setProbabilities({ ...probabilities, QUALIFIED: Number(e.target.value) })}
                  className="w-full accent-red-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1.5">
                  <span>PROBABILIDAD PROPUESTA</span>
                  <span className="text-foreground">{probabilities.PROPOSAL}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={probabilities.PROPOSAL}
                  onChange={(e) => setProbabilities({ ...probabilities, PROPOSAL: Number(e.target.value) })}
                  className="w-full accent-red-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1.5">
                  <span>PROBABILIDAD NEGOCIACIÓN</span>
                  <span className="text-foreground">{probabilities.NEGOTIATION}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={probabilities.NEGOTIATION}
                  onChange={(e) => setProbabilities({ ...probabilities, NEGOTIATION: Number(e.target.value) })}
                  className="w-full accent-red-500 cursor-pointer"
                />
              </div>
            </div>
            
            <div className="bg-muted/30 border border-border/30 p-3.5 rounded-xl text-[10px] space-y-1">
              <span className="text-muted-foreground block text-[9px] uppercase font-bold">Nota explicativa</span>
              <p className="text-muted-foreground leading-normal font-medium">
                Modifica los sliders según la efectividad real de tu restaurante. Multiplica el valor acumulado de cada etapa por su probabilidad y calcula la entrada media de caja esperada en base a los cierres proyectados.
              </p>
            </div>
          </div>

          {/* Stagnant Leads alerts panel */}
          <div className="border border-border/40 bg-card p-5 rounded-2xl shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-foreground border-b border-border/30 pb-2 flex items-center gap-1.5">
              <Icons.AlertTriangle className="h-4 w-4 text-rose-500" />
              <span>Leads Enfríandose ({stagnantLeads.length})</span>
            </h4>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {stagnantLeads.map((l) => (
                <div key={l.id} className="p-2.5 rounded-xl border border-rose-500/10 bg-rose-500/5 flex items-center justify-between text-[10px]">
                  <div>
                    <span className="font-extrabold text-foreground block">{l.company || l.companyName || "Empresa"}</span>
                    <span className="text-muted-foreground">{l.name || l.contactPerson || "Contacto"} • {l.value.toLocaleString("es-ES")} €</span>
                  </div>
                  <span className="text-[8px] bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-md font-mono font-bold">
                    Etapa: {l.stage}
                  </span>
                </div>
              ))}
              {stagnantLeads.length === 0 && (
                <p className="text-[9px] text-muted-foreground text-center py-4">¡Gran trabajo! Ningún lead se encuentra estancado.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
