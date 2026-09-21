"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { getDefaultSlug } from "@/lib/clientStorage";
import { isTenantDataCleared } from "@/lib/demoDataCleanup";

interface Opportunity {
  id: string;
  title: string;
  contactName: string;
  value: number;
  probability: number; // 0 to 100
  closeDate: string;
  status: "ACTIVE" | "WON" | "LOST";
  createdAt: string;
}

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
  },
  {
    id: "op2",
    title: "Licenciamiento Completo ERP",
    contactName: "Tecnologías del Sur SA",
    value: 28000,
    probability: 95,
    closeDate: "2026-05-30",
    status: "WON",
    createdAt: new Date().toISOString(),
  },
  {
    id: "op3",
    title: "Consultoría e Integración Custom",
    contactName: "Carlos Ortega",
    value: 6200,
    probability: 40,
    closeDate: "2026-07-01",
    status: "LOST",
    createdAt: new Date().toISOString(),
  },
];

export default function OpportunitiesTab() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactsList, setContactsList] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    contactName: "",
    value: 5000,
    probability: 50,
    closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "ACTIVE" as Opportunity["status"],
  });

  const getSlug = () => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const parts = hostname.split(".");
    return parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www" ? parts[0] : getDefaultSlug();
  };

  useEffect(() => {
    const slug = getSlug();
    const storageKey = `palmera_sales_opportunities_${slug}`;
    if (isTenantDataCleared(slug)) {
      setOpportunities([]);
      setContactsList([]);
      return;
    }
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setOpportunities(JSON.parse(saved));
      } catch (e) {
        setOpportunities(INITIAL_DEMO_OPPORTUNITIES);
      }
    } else {
      setOpportunities(INITIAL_DEMO_OPPORTUNITIES);
      localStorage.setItem(storageKey, JSON.stringify(INITIAL_DEMO_OPPORTUNITIES));
    }

    // Load contact names from localStorage
    const contactsKey = `palmera_contacts_${slug}`;
    const savedContacts = localStorage.getItem(contactsKey);
    if (savedContacts) {
      try {
        const parsed = JSON.parse(savedContacts);
        setContactsList(parsed.map((c: any) => c.name));
      } catch (e) {
        setContactsList(["Gastroshows Barcelona SL", "Tecnologías del Sur SA", "Carlos Ortega"]);
      }
    } else {
      setContactsList(["Gastroshows Barcelona SL", "Tecnologías del Sur SA", "Carlos Ortega"]);
    }
  }, []);

  const saveOpportunities = (updated: Opportunity[]) => {
    setOpportunities(updated);
    const slug = getSlug();
    localStorage.setItem(`palmera_sales_opportunities_${slug}`, JSON.stringify(updated));

    // Notify other components (like Analytics)
    window.dispatchEvent(new Event("palmera_opportunities_updated"));
  };

  const handleUpdateStatus = (id: string, newStatus: Opportunity["status"]) => {
    const updated = opportunities.map((op) => {
      if (op.id !== id) return op;
      return { ...op, status: newStatus };
    });
    saveOpportunities(updated);

    // Audit log
    try {
      const slug = getSlug();
      const logsKey = `palmera_audit_logs_${slug}`;
      const savedLogs = localStorage.getItem(logsKey) || "[]";
      const logs = JSON.parse(savedLogs);
      const opName = opportunities.find((o) => o.id === id)?.title;
      const newLog = {
        id: "log_" + Date.now(),
        action: `SALES_OPPORTUNITY_${newStatus}`,
        details: `Oportunidad comercial "${opName}" marcada como ${newStatus}.`,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(logsKey, JSON.stringify([newLog, ...logs].slice(0, 15)));
    } catch (e) {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.contactName) return alert("Título y Cliente son requeridos.");

    const newOp: Opportunity = {
      id: "op_" + Date.now(),
      title: formData.title,
      contactName: formData.contactName,
      value: Number(formData.value) || 0,
      probability: Number(formData.probability) || 0,
      closeDate: formData.closeDate,
      status: formData.status,
      createdAt: new Date().toISOString(),
    };

    saveOpportunities([...opportunities, newOp]);
    setIsModalOpen(false);
    setFormData({
      title: "",
      contactName: "",
      value: 5000,
      probability: 50,
      closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "ACTIVE",
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta oportunidad?")) {
      const updated = opportunities.filter((op) => op.id !== id);
      saveOpportunities(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Gestión de Oportunidades Comerciales</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Realiza el seguimiento de cotizaciones, probabilidades de cierre e importes de contratos.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg bg-metallic-red text-white text-xs font-bold px-3 shadow-md shadow-red-500/20 hover:shadow-lg transition-all cursor-pointer"
        >
          <Icons.Plus className="h-4 w-4" />
          <span>Nueva Oportunidad</span>
        </button>
      </div>

      {/* Opportunities Table */}
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4">Oportunidad</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Importe</th>
                <th className="px-6 py-4">Cierre Est.</th>
                <th className="px-6 py-4">Probabilidad</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {opportunities.map((op) => (
                <tr key={op.id} className="group hover:bg-muted/30 transition-all duration-150">
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-foreground block">{op.title}</span>
                    <span className="text-[8px] text-muted-foreground block mt-0.5">
                      Creado: {new Date(op.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                    {op.contactName}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-foreground font-mono">
                    {op.value.toLocaleString("es-ES")} €
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                    {new Date(op.closeDate).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-foreground font-mono min-w-[30px]">
                        {op.probability}%
                      </span>
                      <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            op.probability >= 75 ? "bg-emerald-500" :
                            op.probability >= 40 ? "bg-red-500" : "bg-red-500"
                          }`}
                          style={{ width: `${op.probability}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase border ${
                      op.status === "WON" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                      op.status === "LOST" ? "bg-destructive/10 text-destructive border-destructive/20" :
                      "bg-blue-500/10 text-blue-600 border-blue-500/20"
                    }`}>
                      {op.status === "WON" ? "Ganada" : op.status === "LOST" ? "Perdida" : "Abierta"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {op.status === "ACTIVE" && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(op.id, "WON")}
                            className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                            title="Marcar como Ganada"
                          >
                            <Icons.Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(op.id, "LOST")}
                            className="p-1 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                            title="Marcar como Perdida"
                          >
                            <Icons.X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(op.id)}
                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title="Eliminar oportunidad"
                      >
                        <Icons.Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {opportunities.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    No hay oportunidades comerciales registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Opportunity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <h3 className="font-bold text-foreground text-sm">Nueva Oportunidad Comercial</h3>
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
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Nombre de Oportunidad</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej. Contrato Anual Licencias"
                    className="w-full text-xs p-2 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Cliente / Cuenta</label>
                  <select
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
                    required
                  >
                    <option value="">Selecciona un cliente...</option>
                    {contactsList.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Valor Estimado (€)</label>
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                      placeholder="Ej. 15000"
                      className="w-full text-xs p-2 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Cierre Previsto</label>
                    <input
                      type="date"
                      value={formData.closeDate}
                      onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Probabilidad (%)</label>
                    <input
                      type="number"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                      placeholder="Ej. 70"
                      className="w-full text-xs p-2 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
                      min={0}
                      max={100}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Estado</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full text-xs p-2 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
                    >
                      <option value="ACTIVE">Abierta / Activa</option>
                      <option value="WON">Ganada (Éxito)</option>
                      <option value="LOST">Perdida</option>
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
                  Crear Oportunidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
