"use client";

import React, { useState } from "react";
import * as Icons from "lucide-react";
import { getDefaultSlug } from "@/lib/clientStorage";

interface ScoutedLead {
  companyName: string;
  industry: string;
  estimatedEmployees: number;
  budgetCapacity: "ALTA" | "MEDIA" | "BAJA";
  affinityScore: number;
  contactPerson: string;
  contactRole: string;
  phone: string;
  linkedinUrl: string;
  value: number;
  pitch: string;
  callScript: string;
}

export default function ScouterTab() {
  const [category, setCategory] = useState("TECH");
  const [activityType, setActivityType] = useState("MASTERCHEF");
  const [location, setLocation] = useState("Barcelona");
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [leads, setLeads] = useState<ScoutedLead[]>([]);
  const [importedLeads, setImportedLeads] = useState<Record<string, boolean>>({});

  const scanSteps = [
    "Inicializando motor de búsqueda local...",
    "Rastreando directorios comerciales en la zona...",
    "Filtrando empresas por tamaño y solvencia corporativa...",
    "Identificando responsables de Recursos Humanos / Office Managers...",
    "Analizando afinidad con talleres gastronómicos y team building...",
    "Generando guiones de llamada personalizados e inteligentes..."
  ];

  const handleStartScout = async () => {
    setIsScanning(true);
    setScanStep(0);
    setLeads([]);
    setImportedLeads({});

    // Cycle through animation steps
    const interval = setInterval(() => {
      setScanStep((prev) => {
        if (prev < scanSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 1500);

    try {
      const response = await fetch("/api/sales/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, activityType, location })
      });

      const data = await response.json();
      
      // Minimum scan display time
      setTimeout(() => {
        clearInterval(interval);
        setLeads(data.error ? [] : data);
        setIsScanning(false);
        if (data.error) {
          alert("Error al conectar con el servicio de IA: " + data.error);
        }
      }, 9500);
    } catch (e) {
      clearInterval(interval);
      setIsScanning(false);
      alert("Error en la conexión con la base de datos de prospección.");
    }
  };

  const getSlug = () => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const parts = hostname.split(".");
    return parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www" ? parts[0] : getDefaultSlug();
  };

  const handleImportLead = (lead: ScoutedLead) => {
    const slug = getSlug();
    
    // 1. Import to Contacts
    const contactsKey = `palmera_contacts_${slug}`;
    const savedContacts = localStorage.getItem(contactsKey) || "[]";
    let contacts = [];
    try {
      contacts = JSON.parse(savedContacts);
    } catch (e) {
      contacts = [];
    }

    const contactId = "ct_" + Date.now();
    const newContact = {
      id: contactId,
      name: lead.contactPerson,
      email: `${lead.contactPerson.toLowerCase().replace(" ", ".")}@${lead.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      phone: lead.phone,
      linkedin: lead.linkedinUrl,
      contactType: "COMPANY" as const,
      companyName: lead.companyName,
      notes: `Lead prospectado automáticamente. Interés en ${activityType}.\n\nÁngulo de venta: ${lead.pitch}`,
      createdAt: new Date().toISOString()
    };

    contacts.push(newContact);
    localStorage.setItem(contactsKey, JSON.stringify(contacts));

    // 2. Import to Sales Leads (Kanban)
    const leadsKey = `palmera_sales_leads_${slug}`;
    const savedLeads = localStorage.getItem(leadsKey) || "[]";
    let salesLeads = [];
    try {
      salesLeads = JSON.parse(savedLeads);
    } catch (e) {
      salesLeads = [];
    }

    const newSalesLead = {
      id: "lead_" + Date.now(),
      contactId: contactId,
      companyName: lead.companyName,
      contactPerson: lead.contactPerson,
      contactRole: lead.contactRole,
      stage: "INITIAL",
      value: lead.value,
      pitch: lead.pitch,
      callScript: lead.callScript,
      phone: lead.phone,
      linkedinUrl: lead.linkedinUrl,
      createdAt: new Date().toISOString()
    };

    salesLeads.push(newSalesLead);
    localStorage.setItem(leadsKey, JSON.stringify(salesLeads));

    // 3. Create Audit Log
    try {
      const logsKey = `palmera_audit_logs_${slug}`;
      const savedLogs = localStorage.getItem(logsKey) || "[]";
      const logs = JSON.parse(savedLogs);
      const newLog = {
        id: "log_" + Date.now(),
        action: "SALES_LEAD_SCOUTED",
        details: `Lead corporativo importado: ${lead.companyName} (${lead.contactPerson} - ${lead.contactRole}). Presupuesto estimado: ${lead.value}€.`,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(logsKey, JSON.stringify([newLog, ...logs].slice(0, 15)));
    } catch (e) {}

    // Update state
    setImportedLeads((prev) => ({ ...prev, [lead.companyName]: true }));

    // Dispatch reload events for other tabs
    window.dispatchEvent(new Event("palmera_contacts_updated"));
    window.dispatchEvent(new Event("palmera_leads_updated"));
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="border border-border/40 bg-card p-5 rounded-2xl space-y-2">
        <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
          <Icons.Cpu className="h-4.5 w-4.5 text-red-500" />
          <span>Auto-Scouter de Eventos Corporativos IA</span>
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Rastrea directorios empresariales y localizaciones de interés para detectar empresas que requieran cenas corporativas premium o team building. La IA validará los datos de contacto y redactará un **guión telefónico a medida** para que solo tengas que marcar, presentarte y captar el cliente.
        </p>
      </div>

      {/* Scout Settings Form */}
      {!isScanning && leads.length === 0 && (
        <div className="border border-border/40 bg-card p-6 rounded-2xl space-y-4 max-w-xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">Categoría Empresarial</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
              >
                <option value="TECH">Tecnología y Startups</option>
                <option value="LEGAL">Finanzas, Seguros & Legal</option>
                <option value="CONSULTING">Consultoras e Ingenierías</option>
                <option value="CREATIVE">Agencias de Marketing & Creativas</option>
                <option value="HEALTHCARE">Farmacéutica y Salud</option>
                <option value="AUTOMOTIVE">Automoción e Industria</option>
                <option value="RETAIL">Retail y E-commerce</option>
                <option value="INSURANCE">Seguros y Banca</option>
                <option value="ENERGY">Energía y Utilities</option>
                <option value="TELECOM">Telecomunicaciones</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">Experiencia Ofrecida</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
              >
                <option value="MASTERCHEF">Taller de Cocina Masterchef</option>
                <option value="DEGUSTATION">Menú Degustación Catalán (€130/persona)</option>
                <option value="COCKTAILS">Taller de Coctelería de Autor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">Localización Geográfica</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Barcelona, Girona..."
              className="w-full text-xs p-2.5 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
            />
          </div>

          <button
            onClick={handleStartScout}
            className="w-full inline-flex h-10 items-center justify-center rounded-xl bg-metallic-red text-white text-xs font-bold shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-all cursor-pointer"
          >
            <Icons.Play className="h-4.5 w-4.5 mr-1.5" />
            <span>Iniciar Escaneo Inteligente</span>
          </button>
        </div>
      )}

      {/* Scanning Status Loader */}
      {isScanning && (
        <div className="border border-border/40 bg-card p-10 rounded-3xl text-center space-y-6 flex flex-col items-center justify-center max-w-xl mx-auto my-10 shadow-lg">
          <div className="relative h-16 w-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-red-500/10 border-t-red-500 animate-spin"></div>
            <Icons.Search className="h-6 w-6 text-red-500 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-foreground">Rastreando la Web con IA</h4>
            <p className="text-[10px] text-muted-foreground max-w-xs leading-normal">
              Buscando empresas locales con presupuestos de eventos corporativos activos en {location}...
            </p>
          </div>

          {/* Stepper logs */}
          <div className="w-full max-w-xs bg-muted/40 border border-border/30 rounded-xl p-3 text-left">
            <span className="text-[8px] font-extrabold uppercase text-red-500 tracking-wider block mb-1.5">Registro de Acciones</span>
            <div className="space-y-1">
              {scanSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[9px]">
                  {scanStep > idx ? (
                    <Icons.CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  ) : scanStep === idx ? (
                    <Icons.Loader2 className="h-3 w-3 text-red-500 animate-spin shrink-0" />
                  ) : (
                    <Icons.Circle className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                  )}
                  <span className={`${scanStep === idx ? "font-bold text-foreground" : scanStep > idx ? "text-foreground/70" : "text-muted-foreground/40"}`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results view */}
      {!isScanning && leads.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <h3 className="text-xs font-bold text-foreground">Clientes Potenciales Detectados ({leads.length})</h3>
            <button
              onClick={() => setLeads([])}
              className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-500/10 px-3 py-1 rounded-md"
            >
              Nuevo Escaneo
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {leads.map((l) => (
              <div
                key={l.companyName}
                className="border border-border/40 bg-card rounded-2xl p-5 space-y-4 hover:border-red-500/30 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-extrabold text-foreground">{l.companyName}</h4>
                      <p className="text-[10px] text-muted-foreground">{l.industry}</p>
                    </div>
                    <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border ${
                      l.budgetCapacity === "ALTA"
                        ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                        : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                    }`}>
                      Presupuesto: {l.budgetCapacity}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-3 gap-2 bg-muted/20 border border-border/20 p-2.5 rounded-xl text-[10px]">
                    <div>
                      <span className="text-muted-foreground block text-[8px] uppercase font-bold">Afinidad</span>
                      <span className="font-extrabold text-foreground text-red-500">{l.affinityScore}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[8px] uppercase font-bold">Tamaño</span>
                      <span className="font-extrabold text-foreground">~{l.estimatedEmployees} emp.</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[8px] uppercase font-bold">Valor Est.</span>
                      <span className="font-extrabold text-foreground">{l.value} €</span>
                    </div>
                  </div>

                  {/* Target Contact */}
                  <div className="text-[10px] space-y-1">
                    <span className="text-muted-foreground block text-[8px] uppercase font-bold">Contacto Principal</span>
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Icons.User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{l.contactPerson} ({l.contactRole})</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Icons.Phone className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{l.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <Icons.ExternalLink className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <a href={l.linkedinUrl} target="_blank" rel="noopener noreferrer"
                         className="text-blue-500 hover:text-blue-400 underline truncate max-w-[200px]">
                        {l.linkedinUrl.replace("https://", "")}
                      </a>
                    </div>
                  </div>

                  {/* Pitch paragraph */}
                  <div className="bg-muted/10 p-3 rounded-xl border border-border/20 space-y-1">
                    <span className="text-[8px] font-extrabold uppercase text-red-500 block">Ángulo de Venta (IA)</span>
                    <p className="text-[10px] text-foreground/80 leading-normal font-medium">{l.pitch}</p>
                  </div>

                  {/* Pitch script */}
                  <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 space-y-1">
                    <span className="text-[8px] font-extrabold uppercase text-emerald-600 block">Guión de Apertura Telefónica</span>
                    <p className="text-[10px] text-foreground/90 leading-normal italic font-semibold border-l border-emerald-500/40 pl-2">
                      "{l.callScript}"
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  {importedLeads[l.companyName] ? (
                    <div className="w-full inline-flex h-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold gap-1">
                      <Icons.Check className="h-4 w-4" />
                      <span>Importado con Éxito</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleImportLead(l)}
                      className="w-full inline-flex h-9 items-center justify-center rounded-lg bg-metallic-red text-white text-xs font-bold shadow-xs hover:shadow-md cursor-pointer"
                    >
                      <Icons.Plus className="h-4 w-4 mr-1" />
                      <span>Importar a Ventas & CRM</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
