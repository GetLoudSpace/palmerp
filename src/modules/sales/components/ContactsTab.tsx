"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { getTenantStorageKey, getDefaultSlug } from "@/lib/clientStorage";
import SmartSearchInput from "@/components/SmartSearchInput";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  contactType: "INDIVIDUAL" | "COMPANY";
  companyName?: string;
  cif?: string;
  notes?: string;
  createdAt: string;
}

export default function ContactsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [followUpNote, setFollowUpNote] = useState("");
  const [interactionType, setInteractionType] = useState<"CALL" | "EMAIL" | "MEETING" | "NOTE">("CALL");
  const [followUps, setFollowUps] = useState<any[]>([]);

  // Call assistant states
  const [assistCallContact, setAssistCallContact] = useState<Contact | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callNote, setCallNote] = useState("");
  const [checklist, setChecklist] = useState({
    pax: false,
    allergies: false,
    language: false,
    date: false,
    budget: false,
  });

  const getSlug = () => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const parts = hostname.split(".");
    return parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www" ? parts[0] : getDefaultSlug();
  };

  const loadData = () => {
    const slug = getSlug();
    const storageKey = `palmera_contacts_${slug}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setContacts(JSON.parse(saved));
      } catch (e) {
        setContacts([]);
      }
    }

    const followUpsKey = `palmera_sales_followups_${slug}`;
    const savedFollowUps = localStorage.getItem(followUpsKey);
    if (savedFollowUps) {
      try {
        setFollowUps(JSON.parse(savedFollowUps));
      } catch (e) {
        setFollowUps([]);
      }
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("palmera_contacts_updated", loadData);
    return () => {
      window.removeEventListener("palmera_contacts_updated", loadData);
    };
  }, []);

  // Call timer effect
  useEffect(() => {
    let timer: any;
    if (isCallActive) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isCallActive]);

  const handleStartAssistCall = (contact: Contact) => {
    setAssistCallContact(contact);
    setChecklist({
      pax: false,
      allergies: false,
      language: false,
      date: false,
      budget: false,
    });
    setCallNote("");
    setCallDuration(0);
    setIsCallActive(true);
  };

  const formatDuration = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const getCustomScriptForContact = (contact: Contact) => {
    const slug = getSlug();
    const leadsKey = `palmera_sales_leads_${slug}`;
    const savedLeads = localStorage.getItem(leadsKey);
    if (savedLeads) {
      try {
        const parsed = JSON.parse(savedLeads);
        const match = parsed.find((l: any) => 
          l.companyName === contact.companyName || 
          l.companyName === contact.name || 
          (contact.companyName && l.companyName.includes(contact.companyName))
        );
        if (match && match.callScript) {
          return match.callScript;
        }
      } catch (e) {}
    }
    return `Hola ${contact.name}, mi nombre es Joan de Palm Restaurante. Te contacto brevemente porque sé que en ${contact.companyName || "su oficina"} organizan eventos y actividades de integración. Contamos con una propuesta de Menú Degustación tradicional catalana por 130€/persona y talleres interactivos estilo 'Masterchef'. ¿Cuándo suelen planificar sus próximos eventos y les interesaría recibir información detallada?`;
  };

  const handleSaveAssistCall = () => {
    if (!assistCallContact) return;
    setIsCallActive(false);

    const slug = getSlug();
    const durationStr = formatDuration(callDuration);
    
    // Construct structured notes from checklist
    const checklistNotes = [
      checklist.pax ? "[✓] Aforo/Personas Confirmado" : "[ ] Aforo/Personas pendiente",
      checklist.allergies ? "[✓] Alergias & Intolerancias Discutido (Menú muy poco modificable)" : "[ ] Alergias & Intolerancias sin tratar",
      checklist.language ? "[✓] Idioma Elegido (Inglés o Castellano)" : "[ ] Idioma sin especificar",
      checklist.date ? "[✓] Rango de Fechas Planteado" : "[ ] Fechas sin discutir",
      checklist.budget ? "[✓] Presupuesto base 130€ + extras Aceptado" : "[ ] Presupuesto base 130€ + extras sin tratar",
    ].join("\n");

    const noteBody = `[Llamada Asistida de Prospección - Duración: ${durationStr}]\n\n--- GUION/ICEBREAKER LEÍDO ---\n"${getCustomScriptForContact(assistCallContact).slice(0, 100)}..."\n\n--- CHECKLIST DE CUALIFICACIÓN ---\n${checklistNotes}\n\n--- ANOTACIÓN ---\n${callNote || "Sin comentarios adicionales."}`;

    const newFollowUp = {
      id: "fu_" + Date.now(),
      contactId: assistCallContact.id,
      contactName: assistCallContact.name,
      type: "CALL",
      note: noteBody,
      date: new Date().toISOString(),
    };

    const updated = [newFollowUp, ...followUps];
    setFollowUps(updated);
    localStorage.setItem(`palmera_sales_followups_${slug}`, JSON.stringify(updated));

    // Audit log
    try {
      const logsKey = `palmera_audit_logs_${slug}`;
      const savedLogs = localStorage.getItem(logsKey) || "[]";
      const logs = JSON.parse(savedLogs);
      const newLog = {
        id: "log_" + Date.now(),
        action: "SALES_CALL_QUALIFIED",
        details: `Llamada cualificada realizada a ${assistCallContact.name} (${durationStr}).`,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(logsKey, JSON.stringify([newLog, ...logs].slice(0, 15)));
    } catch (e) {}

    // Clean up state
    setAssistCallContact(null);
    window.dispatchEvent(new Event("palmera_sales_followup_created"));
    alert("¡Llamada de prospección y notas de cualificación guardadas con éxito!");
  };

  const handleAddFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !followUpNote.trim()) return;

    const slug = getSlug();
    const newFollowUp = {
      id: "fu_" + Date.now(),
      contactId: selectedContact.id,
      contactName: selectedContact.name,
      type: interactionType,
      note: followUpNote.trim(),
      date: new Date().toISOString(),
    };

    const updated = [newFollowUp, ...followUps];
    setFollowUps(updated);
    localStorage.setItem(`palmera_sales_followups_${slug}`, JSON.stringify(updated));
    setFollowUpNote("");

    // Add audit log
    try {
      const logsKey = `palmera_audit_logs_${slug}`;
      const savedLogs = localStorage.getItem(logsKey) || "[]";
      const logs = JSON.parse(savedLogs);
      const newLog = {
        id: "log_" + Date.now(),
        action: "SALES_FOLLOWUP_CREATED",
        details: `Seguimiento de ventas registrado para ${selectedContact.name} (${interactionType}).`,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(logsKey, JSON.stringify([newLog, ...logs].slice(0, 15)));
    } catch (e) {}

    window.dispatchEvent(new Event("palmera_sales_followup_created"));
    alert(`Seguimiento registrado con éxito para ${selectedContact.name}`);
  };

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.companyName && c.companyName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3 relative">
      {/* List of Contacts */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between border-b border-border/30 pb-3">
          <h3 className="text-sm font-bold text-foreground">Directorio de Clientes y Contactos</h3>
          <span className="text-[10px] bg-red-500/10 text-red-600 px-2.5 py-0.5 rounded-full font-semibold">
            {filtered.length} contactos
          </span>
        </div>

        {/* Search */}
        <SmartSearchInput value={searchQuery} onChange={setSearchQuery} suggestions={contacts.flatMap((contact) => [contact.name, contact.email, contact.companyName ?? ""])} placeholder="Buscar contacto..." />

        {/* Contacts Grid */}
        <div className="grid gap-3 sm:grid-cols-2 max-h-[500px] overflow-y-auto pr-1">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedContact(c)}
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                selectedContact?.id === c.id
                  ? "border-red-500/50 bg-red-500/5 shadow-xs"
                  : "border-border/40 bg-card hover:border-red-500/20"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center border font-bold ${
                  c.contactType === "COMPANY"
                    ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                    : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                }`}>
                  {c.contactType === "COMPANY" ? <Icons.Building2 className="h-4.5 w-4.5" /> : <Icons.User className="h-4.5 w-4.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-foreground truncate">{c.name}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{c.email || "Sin email"}</p>
                  
                  <div className="text-[10px] text-muted-foreground mt-2 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Icons.Phone className="h-3 w-3" />
                      {c.phone || "—"}
                    </span>
                    {c.phone && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartAssistCall(c);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/10 rounded-md text-[9px] font-bold cursor-pointer"
                      >
                        <Icons.PhoneCall className="h-2.5 w-2.5" />
                        <span>Llamar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-8 text-xs text-muted-foreground">
              No se encontraron contactos.
            </div>
          )}
        </div>
      </div>

      {/* Follow-up / Interaction logger */}
      <div className="space-y-4">
        {selectedContact ? (
          <div className="border border-border/40 bg-card p-5 rounded-2xl space-y-4 shadow-xs">
            <div className="border-b border-border/30 pb-3 flex justify-between items-start">
              <div>
                <span className="text-[9px] uppercase font-bold text-red-500 tracking-wider">Registrar Actividad</span>
                <h3 className="text-xs font-extrabold text-foreground truncate">{selectedContact.name}</h3>
              </div>
              {selectedContact.phone && (
                <button
                  onClick={() => handleStartAssistCall(selectedContact)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500 text-white text-[10px] font-bold shadow-md shadow-emerald-500/20 hover:shadow-lg cursor-pointer"
                >
                  <Icons.PhoneCall className="h-3.5 w-3.5" />
                  <span>Llamar con Guión</span>
                </button>
              )}
            </div>

            <form onSubmit={handleAddFollowUp} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Tipo de Actividad</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["CALL", "EMAIL", "MEETING", "NOTE"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setInteractionType(t)}
                      className={`py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                        interactionType === t
                          ? "bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-500"
                          : "border-border/50 bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t === "CALL" ? "Llamada" : t === "EMAIL" ? "Email" : t === "MEETING" ? "Reunión" : "Nota"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Detalle del Seguimiento</label>
                <textarea
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Detalla qué se habló, compromisos, próximos pasos..."
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex h-9 items-center justify-center rounded-lg bg-metallic-red text-white text-xs font-bold shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-all cursor-pointer"
              >
                <Icons.Save className="h-4 w-4 mr-1.5" />
                <span>Guardar Seguimiento</span>
              </button>
            </form>

            {/* List of past activities for this contact */}
            <div className="space-y-2.5 pt-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Historial Reciente</h4>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {followUps
                  .filter((fu) => fu.contactId === selectedContact.id)
                  .map((fu) => (
                    <div key={fu.id} className="p-2.5 rounded-lg border border-border/30 bg-muted/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-[8px] font-extrabold uppercase border px-1.5 py-0.2 rounded-full ${
                          fu.type === "CALL" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                          fu.type === "EMAIL" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                          fu.type === "MEETING" ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                          "bg-stone-500/10 text-stone-600 border-stone-500/20"
                        }`}>
                          {fu.type}
                        </span>
                        <span className="text-[8px] text-muted-foreground font-mono">
                          {new Date(fu.date).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                      <p className="text-[10px] text-foreground/80 leading-snug whitespace-pre-line font-medium">{fu.note}</p>
                    </div>
                  ))}
                {followUps.filter((fu) => fu.contactId === selectedContact.id).length === 0 && (
                  <p className="text-[9px] text-muted-foreground text-center py-2">Sin interacciones previas registradas.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-border/60 p-8 rounded-2xl text-center text-xs text-muted-foreground flex flex-col items-center justify-center h-full min-h-[300px]">
            <Icons.MousePointerClick className="h-8 w-8 text-muted-foreground/50 mb-2 animate-bounce" />
            <span>Selecciona un contacto para ver detalles y registrar seguimiento de ventas.</span>
          </div>
        )}
      </div>

      {/* Asistente de Llamada Activa / Modal overlay */}
      {assistCallContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-card border border-border/40 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-5 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </div>
                <h3 className="font-bold text-foreground text-sm">Asistente de Llamada en Curso</h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                {formatDuration(callDuration)}
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Left Side: Dynamic Icebreaker Script */}
              <div className="border border-border/40 p-4.5 rounded-2xl bg-muted/15 space-y-3">
                <span className="text-[9px] font-extrabold uppercase text-red-500 tracking-wider flex items-center gap-1">
                  <Icons.MessageSquareQuote className="h-3.5 w-3.5" />
                  <span>Guión de Apertura (Icebreaker)</span>
                </span>
                <p className="text-xs text-foreground/80 leading-relaxed font-semibold italic border-l-2 border-red-500/60 pl-3">
                  "{getCustomScriptForContact(assistCallContact)}"
                </p>
                <div className="text-[9px] text-muted-foreground flex items-center gap-1 mt-2">
                  <Icons.Info className="h-3 w-3 shrink-0" />
                  <span>Lee el guión arriba tal cual al responder para captar la atención de inmediato.</span>
                </div>
              </div>

              {/* Right Side: Qualification Checklist */}
              <div className="border border-border/40 p-4.5 rounded-2xl bg-background space-y-3.5">
                <span className="text-[9px] font-extrabold uppercase text-blue-500 tracking-wider flex items-center gap-1">
                  <Icons.CheckSquare className="h-3.5 w-3.5" />
                  <span>Cualificación de la Llamada</span>
                </span>
                
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 text-xs text-foreground font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.pax}
                      onChange={(e) => setChecklist({ ...checklist, pax: e.target.checked })}
                      className="mt-0.5 accent-emerald-500 cursor-pointer"
                    />
                    <span>¿Cuántas personas? (Aforo estimado)</span>
                  </label>

                  <label className="flex items-start gap-2.5 text-xs text-foreground font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.allergies}
                      onChange={(e) => setChecklist({ ...checklist, allergies: e.target.checked })}
                      className="mt-0.5 accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-red-600 dark:text-red-500 font-bold">Intolerancias/Alergias (Menú poco modificable)</span>
                  </label>

                  <label className="flex items-start gap-2.5 text-xs text-foreground font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.language}
                      onChange={(e) => setChecklist({ ...checklist, language: e.target.checked })}
                      className="mt-0.5 accent-emerald-500 cursor-pointer"
                    />
                    <span>Idioma preferido (Inglés o Castellano)</span>
                  </label>

                  <label className="flex items-start gap-2.5 text-xs text-foreground font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.date}
                      onChange={(e) => setChecklist({ ...checklist, date: e.target.checked })}
                      className="mt-0.5 accent-emerald-500 cursor-pointer"
                    />
                    <span>Rango de fechas y horarios tentativos</span>
                  </label>

                  <label className="flex items-start gap-2.5 text-xs text-foreground font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.budget}
                      onChange={(e) => setChecklist({ ...checklist, budget: e.target.checked })}
                      className="mt-0.5 accent-emerald-500 cursor-pointer"
                    />
                    <span className="font-bold">Presupuesto de 130€ + extras aceptado</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Note taking text area */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase block">Anotaciones de la conversación</label>
              <textarea
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                placeholder="Escribe comentarios, respuestas del cliente o acuerdos..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-border/50 bg-background text-foreground outline-hidden focus:border-red-500/50"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-border/30">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Icons.User className="h-4 w-4 text-muted-foreground" />
                <span>{assistCallContact.name} ({assistCallContact.phone})</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setAssistCallContact(null)}
                  className="px-4 py-2 border border-border/50 text-xs rounded-lg hover:bg-muted cursor-pointer font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAssistCall}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-md shadow-emerald-500/20 hover:bg-emerald-700 cursor-pointer flex items-center gap-1.5"
                >
                  <Icons.PhoneOff className="h-4 w-4" />
                  <span>Finalizar y Guardar Llamada</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
