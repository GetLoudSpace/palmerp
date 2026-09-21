"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import SalesDashboard from "@/modules/sales/components/SalesDashboard";
import { getDefaultSlug } from "@/lib/clientStorage";

export default function SalesPage() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [installing, setInstalling] = useState(false);

  const getStorageKey = () => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const parts = hostname.split(".");
    const slug = parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www" ? parts[0] : getDefaultSlug();
    return `palmera_active_modes_${slug}`;
  };

  const checkInstallation = () => {
    if (typeof window !== "undefined") {
      // Look for the storage key. The core modules page uses `palmera_active_modes_slug` or central `palmera_active_modes_slug`
      // Wait, let's make sure we check both getTenantStorageKey("palmera_active_modes") and fallback
      const hostname = window.location.hostname;
      const parts = hostname.split(".");
      const slug = parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www" ? parts[0] : getDefaultSlug();
      
      const key = `palmera_active_modes_${slug}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const activeIds: string[] = JSON.parse(saved);
          setIsInstalled(activeIds.includes("VENTAS"));
        } catch (e) {
          setIsInstalled(false);
        }
      } else {
        // By default, in our initial route we added VENTAS. But if settings aren't loaded yet
        setIsInstalled(false);
      }
    }
  };

  useEffect(() => {
    checkInstallation();

    // Listen to changes to keep it in sync if toggled from the settings page
    window.addEventListener("palmera_modes_updated", checkInstallation);
    return () => {
      window.removeEventListener("palmera_modes_updated", checkInstallation);
    };
  }, []);

  const handleInstall = () => {
    setInstalling(true);

    // SaaS loader feel!
    setTimeout(() => {
      if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        const parts = hostname.split(".");
        const slug = parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www" ? parts[0] : getDefaultSlug();
        const key = `palmera_active_modes_${slug}`;

        let activeIds: string[] = [];
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            activeIds = JSON.parse(saved);
          } catch (e) {}
        }
        
        if (!activeIds.includes("VENTAS")) {
          activeIds.push("VENTAS");
          localStorage.setItem(key, JSON.stringify(activeIds));
        }

        // Add audit log
        try {
          const logsKey = `palmera_audit_logs_${slug}`;
          const savedLogs = localStorage.getItem(logsKey) || "[]";
          const logs = JSON.parse(savedLogs);
          const newLog = {
            id: "log_" + Date.now(),
            action: "MODULE_INSTALLED",
            details: "El módulo de Ventas & CRM fue instalado e iniciado correctamente por el Administrador.",
            timestamp: new Date().toISOString()
          };
          localStorage.setItem(logsKey, JSON.stringify([newLog, ...logs].slice(0, 15)));
        } catch (e) {}

        // Emit events
        window.dispatchEvent(new Event("palmera_modes_updated"));
        setIsInstalled(true);
      }
      setInstalling(false);
    }, 1500);
  };

  if (isInstalled === null) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Icons.Loader2 className="h-8 w-8 text-red-500 animate-spin" />
      </div>
    );
  }

  if (isInstalled) {
    return <SalesDashboard />;
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-12">
      {/* Presentation Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20 shadow-md shadow-red-500/5 animate-pulse">
          <Icons.DollarSign className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Módulo de Ventas & CRM</h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            Optimiza la captación y cierre de contratos. Todo lo necesario para la prospección, el seguimiento de clientes y el análisis de Business Intelligence.
          </p>
        </div>
      </div>

      {/* Grid of Key Features */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex gap-4 p-5 rounded-2xl border border-border/40 bg-card hover:border-red-500/20 transition-all duration-200">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Icons.KanbanSquare className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Prospección en Embudo</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mapea el recorrido de tus leads en etapas visuales (inicial, cualificado, propuesta, negociación) mediante tarjetas Kanban.
            </p>
          </div>
        </div>

        <div className="flex gap-4 p-5 rounded-2xl border border-border/40 bg-card hover:border-red-500/20 transition-all duration-200">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Icons.Target className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Gestión de Oportunidades</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Controla las ofertas comerciales con importes estimados, probabilidades de éxito y fechas de cierre planificadas para un pronóstico claro.
            </p>
          </div>
        </div>

        <div className="flex gap-4 p-5 rounded-2xl border border-border/40 bg-card hover:border-red-500/20 transition-all duration-200">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
            <Icons.CalendarCheck2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Seguimiento Omnicanal</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Registra llamadas telefónicas, correos electrónicos e interacciones con clientes para tener una bitácora unificada de cada contacto.
            </p>
          </div>
        </div>

        <div className="flex gap-4 p-5 rounded-2xl border border-border/40 bg-card hover:border-red-500/20 transition-all duration-200">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Icons.BarChart3 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Business Intelligence (BI)</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Analiza tasas de cierre, previsiones ponderadas de facturación y simula ingresos futuros en base a tasas de conversión ajustables.
            </p>
          </div>
        </div>
      </div>

      {/* Call To Action Block */}
      <div className="border border-border/40 rounded-3xl p-8 bg-linear-to-b from-card to-muted/10 text-center space-y-5 max-w-xl mx-auto shadow-md">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">¿Listo para iniciar tu canal de ventas?</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Instalar este módulo agregará la sección de Ventas a tu ERP e inyectará los paneles operativos en tu barra lateral de navegación.
          </p>
        </div>

        <button
          onClick={handleInstall}
          disabled={installing}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-metallic-red text-white text-xs font-bold px-8 shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 cursor-pointer"
        >
          {installing ? (
            <>
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
              <span>Instalando Módulo...</span>
            </>
          ) : (
            <>
              <Icons.Download className="h-4 w-4" />
              <span>Instalar Módulo de Ventas</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
