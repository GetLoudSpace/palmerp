"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { getDefaultSlug } from "@/lib/clientStorage";
import { isTenantDataCleared } from "@/lib/demoDataCleanup";

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  value: number;
  stage: "INITIAL" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION";
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

const STAGES = [
  { id: "INITIAL", label: "Contacto Inicial", color: "border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400" },
  { id: "QUALIFIED", label: "Cualificado", color: "border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400" },
  { id: "PROPOSAL", label: "Propuesta", color: "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400" },
  { id: "NEGOTIATION", label: "Negociación", color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" },
] as const;

export default function ProspectingTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    value: 1000,
    stage: "INITIAL" as Lead["stage"],
  });

  const getSlug = () => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const parts = hostname.split(".");
    return parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www" ? parts[0] : getDefaultSlug();
  };

  useEffect(() => {
    const slug = getSlug();
    const storageKey = `palmera_sales_leads_${slug}`;
    if (isTenantDataCleared(slug)) {
      setLeads([]);
      return;
    }
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setLeads(JSON.parse(saved));
      } catch (e) {
        setLeads(INITIAL_DEMO_LEADS);
      }
    } else {
      setLeads(INITIAL_DEMO_LEADS);
      localStorage.setItem(storageKey, JSON.stringify(INITIAL_DEMO_LEADS));
    }
  }, []);

  const saveLeads = (updated: Lead[]) => {
    setLeads(updated);
    const slug = getSlug();
    localStorage.setItem(`palmera_sales_leads_${slug}`, JSON.stringify(updated));

    // Update global opportunities tally if negotiation/proposal values change
    window.dispatchEvent(new Event("palmera_leads_updated"));
  };

  const moveLead = (leadId: string, direction: "prev" | "next") => {
    const stageFlow: Lead["stage"][] = ["INITIAL", "QUALIFIED", "PROPOSAL", "NEGOTIATION"];
    const updated = leads.map((lead) => {
      if (lead.id !== leadId) return lead;
      const currentIndex = stageFlow.indexOf(lead.stage);
      let nextIndex = currentIndex;
      if (direction === "next" && currentIndex < stageFlow.length - 1) {
        nextIndex = currentIndex + 1;
      } else if (direction === "prev" && currentIndex > 0) {
        nextIndex = currentIndex - 1;
      }
      return { ...lead, stage: stageFlow[nextIndex] };
    });
    saveLeads(updated);

    // Audit log
    try {
      const slug = getSlug();
      const logsKey = `palmera_audit_logs_${slug}`;
      const savedLogs = localStorage.getItem(logsKey) || "[]";
      const logs = JSON.parse(savedLogs);
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        const nextStage = stageFlow[stageFlow.indexOf(lead.stage) + (direction === "next" ? 1 : -1)];
        const newLog = {
          id: "log_" + Date.now(),
          action: "SALES_LEAD_MOVED",
          details: `Prospecto "${lead.name}" (${lead.company}) movido de ${lead.stage} a ${nextStage}.`,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(logsKey, JSON.stringify([newLog, ...logs].slice(0, 15)));
      }
    } catch (e) {}
  };

  const handleDeleteLead = (leadId: string) => {
    if (confirm("¿Seguro de que deseas eliminar este prospecto?")) {
      const updated = leads.filter((l) => l.id !== leadId);
      saveLeads(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.company) return alert("Nombre y Empresa son requeridos.");

    const newLead: Lead = {
      id: "l_" + Date.now(),
      name: formData.name,
      company: formData.company,
      email: formData.email || "",
      value: Number(formData.value) || 0,
      stage: formData.stage,
      createdAt: new Date().toISOString(),
    };

    saveLeads([...leads, newLead]);
    setIsModalOpen(false);
    setFormData({ name: "", company: "", email: "", value: 1000, stage: "INITIAL" });
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Embudo de Prospección de Clientes</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Control visual de leads comerciales. Arrastra y promueve prospectos para cerrar ventas.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg bg-metallic-red text-white text-xs font-bold px-3 shadow-md shadow-red-500/20 hover:shadow-lg transition-all cursor-pointer"
        >
          <Icons.Plus className="h-4 w-4" />
          <span>Nuevo Prospecto</span>
        </button>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid gap-4 md:grid-cols-4 overflow-x-auto pb-4">
        {STAGES.map((col) => {
          const colLeads = leads.filter((l) => l.stage === col.id);
          const totalValue = colLeads.reduce((acc, l) => acc + l.value, 0);

          return (
            <div key={col.id} className="min-w-[220px] bg-muted/15 border border-border/40 p-4 rounded-2xl flex flex-col space-y-3">
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-[10px] font-bold text-foreground">
                  {colLeads.length}
                </span>
              </div>
              <div className="text-[9px] text-muted-foreground font-mono font-semibold">
                Suma: {totalValue.toLocaleString("es-ES")} €
              </div>

              {/* Cards list */}
              <div className="flex-1 space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {colLeads.map((lead) => (
                  <div key={lead.id} className="bg-card border border-border/40 hover:border-red-500/30 p-3.5 rounded-xl shadow-xs space-y-3 transition-all duration-200 group">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-foreground leading-snug truncate">{lead.name}</h4>
                      <p className="text-[10px] text-muted-foreground truncate">{lead.company}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{lead.email}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/30 pt-2.5">
                      <span className="text-[10px] font-mono font-bold text-red-600 dark:text-red-500">
                        {lead.value.toLocaleString("es-ES")} €
                      </span>
                      
                      <div className="flex items-center gap-1">
                        {/* Move Prev */}
                        {col.id !== "INITIAL" && (
                          <button
                            onClick={() => moveLead(lead.id, "prev")}
                            className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Regresar etapa"
                          >
                            <Icons.ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {/* Move Next */}
                        {col.id !== "NEGOTIATION" && (
                          <button
                            onClick={() => moveLead(lead.id, "next")}
                            className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Promover etapa"
                          >
                            <Icons.ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-1 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive cursor-pointer ml-1"
                          title="Eliminar prospecto"
                        >
                          <Icons.Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {colLeads.length === 0 && (
                  <div className="text-center py-8 text-[10px] text-muted-foreground border border-dashed border-border/50 rounded-xl">
                    Vacío
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <h3 className="font-bold text-foreground text-sm">Nuevo Prospecto Comercial</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Sofía Martínez"
                    className="w-full text-xs p-2 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Empresa / Negocio</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Ej. Restauración Central"
                    className="w-full text-xs p-2 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">E-mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ej. sofia@centralrest.es"
                    className="w-full text-xs p-2 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Valor Estimado (€)</label>
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                      placeholder="Ej. 5000"
                      className="w-full text-xs p-2 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Etapa Inicial</label>
                    <select
                      value={formData.stage}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
                      className="w-full text-xs p-2 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
                    >
                      <option value="INITIAL">Contacto Inicial</option>
                      <option value="QUALIFIED">Cualificado</option>
                      <option value="PROPOSAL">Propuesta</option>
                      <option value="NEGOTIATION">Negociación</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border/50 text-xs rounded-lg hover:bg-muted cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-metallic-red text-white text-xs font-bold rounded-lg shadow-md shadow-red-500/20 hover:shadow-lg cursor-pointer"
                >
                  Crear Prospecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
