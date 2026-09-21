"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { getDefaultSlug } from "@/lib/clientStorage";

// Tab Components
import ProspectingTab from "./ProspectingTab";
import OpportunitiesTab from "./OpportunitiesTab";
import FollowUpTab from "./FollowUpTab";
import ContactsTab from "./ContactsTab";
import AnalyticsTab from "./AnalyticsTab";
import ScouterTab from "./ScouterTab";
import FunnelTab from "./FunnelTab";

export default function SalesDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "prospecting" | "opportunities" | "followup" | "contacts" | "analytics" | "scouter" | "funnel">("overview");

  const [shopSlug, setShopSlug] = useState<string | null>(null);

  // Summary Metrics
  const [stats, setStats] = useState({
    leadsCount: 0,
    activeOpsCount: 0,
    pipelineValue: 0,
    recentLog: "",
  });

  const getSlug = () => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const parts = hostname.split(".");
    return parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www" ? parts[0] : getDefaultSlug();
  };

  const loadDashboardStats = () => {
    const slug = getSlug();
    
    // Calculate leads count
    const leadsKey = `palmera_sales_leads_${slug}`;
    const savedLeads = localStorage.getItem(leadsKey);
    let lCount = 0;
    if (savedLeads) {
      try {
        const parsed = JSON.parse(savedLeads);
        lCount = parsed.length;
      } catch (e) {}
    }

    // Calculate opportunities count & value
    const opsKey = `palmera_sales_opportunities_${slug}`;
    const savedOps = localStorage.getItem(opsKey);
    let oCount = 0;
    let pValue = 0;
    if (savedOps) {
      try {
        const parsed = JSON.parse(savedOps);
        const active = parsed.filter((o: any) => o.status === "ACTIVE");
        oCount = active.length;
        pValue = active.reduce((acc: number, o: any) => acc + o.value, 0);
      } catch (e) {}
    }

    // Load recent audit log details
    const logsKey = `palmera_audit_logs_${slug}`;
    const savedLogs = localStorage.getItem(logsKey);
    let recentDetails = "Sin actividad comercial registrada.";
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs);
        const salesLogs = parsed.filter((log: any) => log.action && log.action.startsWith("SALES_"));
        if (salesLogs.length > 0) {
          recentDetails = salesLogs[0].details;
        }
      } catch (e) {}
    }

    setStats({
      leadsCount: lCount,
      activeOpsCount: oCount,
      pipelineValue: pValue,
      recentLog: recentDetails,
    });
  };

  useEffect(() => {
    loadDashboardStats();
    fetch("/api/shop").then(r=>r.json()).then(d=>{ if(d?.success && d.shop?.slug) setShopSlug(d.shop.slug); }).catch(()=>{});

    // Listen to changes in other tabs
    window.addEventListener("palmera_leads_updated", loadDashboardStats);
    window.addEventListener("palmera_opportunities_updated", loadDashboardStats);
    window.addEventListener("palmera_sales_followup_created", loadDashboardStats);

    return () => {
      window.removeEventListener("palmera_leads_updated", loadDashboardStats);
      window.removeEventListener("palmera_opportunities_updated", loadDashboardStats);
      window.removeEventListener("palmera_sales_followup_created", loadDashboardStats);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Dynamic Tab Navigation Header */}
      <div className="flex flex-col gap-4 border-b border-border/30 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-extrabold text-foreground tracking-tight md:text-2xl">Módulo de Ventas & CRM</h2>
            {shopSlug && (
              <a href={`/shop/${shopSlug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-red-500 text-white px-3 py-1.5 text-xs font-black shadow hover:bg-red-600">
                <Icons.ShoppingBag className="h-3.5 w-3.5" /> Pedir pan (vista cliente)
              </a>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Espacio de trabajo unificado para la prospección de clientes, oportunidades y análisis de ventas. La vista cliente de la tienda (e-commerce/pedidos) vive solo aquí, no en otros modos como Educación.</p>
        </div>

        {/* Tab Links */}
        <div className="flex flex-wrap items-center gap-1 bg-muted/20 border border-border/40 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("overview")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "overview" ? "bg-card text-foreground shadow-xs border border-border/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icons.LayoutDashboard className="h-3.5 w-3.5" />
            <span>Pizarra</span>
          </button>
          
          <button
            onClick={() => setActiveTab("prospecting")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "prospecting" ? "bg-card text-foreground shadow-xs border border-border/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icons.KanbanSquare className="h-3.5 w-3.5" />
            <span>Prospección</span>
          </button>

          <button
            onClick={() => setActiveTab("funnel")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "funnel" ? "bg-card text-foreground shadow-xs border border-border/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icons.Filter className="h-3.5 w-3.5" />
            <span>Embudo</span>
          </button>

          <button
            onClick={() => setActiveTab("opportunities")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "opportunities" ? "bg-card text-foreground shadow-xs border border-border/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icons.Target className="h-3.5 w-3.5" />
            <span>Oportunidades</span>
          </button>

          <button
            onClick={() => setActiveTab("followup")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "followup" ? "bg-card text-foreground shadow-xs border border-border/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icons.CalendarCheck2 className="h-3.5 w-3.5" />
            <span>Seguimiento</span>
          </button>

          <button
            onClick={() => setActiveTab("contacts")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "contacts" ? "bg-card text-foreground shadow-xs border border-border/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icons.Users className="h-3.5 w-3.5" />
            <span>Contactos</span>
          </button>

          <button
            onClick={() => setActiveTab("scouter")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "scouter" ? "bg-card text-foreground shadow-xs border border-border/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icons.Cpu className="h-3.5 w-3.5" />
            <span>Scouter IA</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "analytics" ? "bg-card text-foreground shadow-xs border border-border/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icons.BarChart2 className="h-3.5 w-3.5" />
            <span>BI & Analítica</span>
          </button>
        </div>
      </div>

      {/* Main View Port */}
      <div className="transition-all duration-200">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Quick KPI stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="border border-border/40 bg-card p-5 rounded-2xl shadow-xs space-y-1">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Prospectos Activos</span>
                  <Icons.Users className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-xl font-extrabold text-foreground font-mono">{stats.leadsCount}</div>
                <p className="text-[9px] text-muted-foreground mt-0.5">Leads comerciales en embudo</p>
              </div>

              <div className="border border-border/40 bg-card p-5 rounded-2xl shadow-xs space-y-1">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Oportunidades Abiertas</span>
                  <Icons.Target className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-xl font-extrabold text-foreground font-mono">{stats.activeOpsCount}</div>
                <p className="text-[9px] text-muted-foreground mt-0.5">Negociaciones activas</p>
              </div>

              <div className="border border-border/40 bg-card p-5 rounded-2xl shadow-xs space-y-1 bg-linear-to-r from-red-500/5 to-red-500/5">
                <div className="flex items-center justify-between text-red-600 dark:text-red-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Valor Estimado Cartera</span>
                  <Icons.DollarSign className="h-4 w-4 text-red-600 dark:text-red-500" />
                </div>
                <div className="text-xl font-extrabold text-foreground font-mono">
                  {stats.pipelineValue.toLocaleString("es-ES")} €
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">Importe total ponderable</p>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 border border-border/40 bg-card p-5 rounded-2xl shadow-xs space-y-4">
                <h3 className="text-xs font-extrabold text-foreground border-b border-border/30 pb-2 uppercase tracking-wider">Accesos Rápidos comerciales</h3>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => setActiveTab("prospecting")}
                    className="p-4 rounded-xl border border-border/40 bg-muted/20 hover:border-red-500/20 text-left space-y-1 group transition-all cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                      <Icons.KanbanSquare className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Abrir Embudo Kanban</h4>
                    <p className="text-[9px] text-muted-foreground">Gestionar etapas de potenciales leads y ventas.</p>
                  </button>

                  <button
                    onClick={() => setActiveTab("opportunities")}
                    className="p-4 rounded-xl border border-border/40 bg-muted/20 hover:border-red-500/20 text-left space-y-1 group transition-all cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                      <Icons.Target className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Ver Cotizaciones y Cierres</h4>
                    <p className="text-[9px] text-muted-foreground">Revisar importes y marcar oportunidades ganadas.</p>
                  </button>

                  <button
                    onClick={() => setActiveTab("contacts")}
                    className="p-4 rounded-xl border border-border/40 bg-muted/20 hover:border-red-500/20 text-left space-y-1 group transition-all cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                      <Icons.Users className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Historial de Llamadas/Emails</h4>
                    <p className="text-[9px] text-muted-foreground">Registrar actividades y comentarios por contacto.</p>
                  </button>

                  <button
                    onClick={() => setActiveTab("analytics")}
                    className="p-4 rounded-xl border border-border/40 bg-muted/20 hover:border-red-500/20 text-left space-y-1 group transition-all cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                      <Icons.BarChart2 className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Proyecciones Financieras BI</h4>
                    <p className="text-[9px] text-muted-foreground">Analizar conversiones y simular ingresos mensuales.</p>
                  </button>
                </div>
              </div>

              {/* Feed de Auditoría Comercial */}
              <div className="border border-border/40 bg-card p-5 rounded-2xl shadow-xs space-y-4">
                <h3 className="text-xs font-extrabold text-foreground border-b border-border/30 pb-2 uppercase tracking-wider">Última Operación</h3>
                <div className="space-y-3.5">
                  <div className="flex gap-2.5 items-start">
                    <div className="h-7 w-7 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 shrink-0">
                      <Icons.Bell className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-red-500">Log de Ventas</span>
                      <p className="text-xs text-foreground/80 font-medium leading-tight">{stats.recentLog}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "prospecting" && <ProspectingTab />}
        {activeTab === "funnel" && <FunnelTab />}
        {activeTab === "opportunities" && <OpportunitiesTab />}
        {activeTab === "followup" && <FollowUpTab />}
        {activeTab === "contacts" && <ContactsTab />}
        {activeTab === "scouter" && <ScouterTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
      </div>
    </div>
  );
}
