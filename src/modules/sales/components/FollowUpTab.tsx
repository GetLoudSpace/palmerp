"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { getDefaultSlug } from "@/lib/clientStorage";
import SmartSearchInput from "@/components/SmartSearchInput";

interface FollowUp {
  id: string;
  contactId: string;
  contactName: string;
  type: "CALL" | "EMAIL" | "MEETING" | "NOTE";
  note: string;
  date: string;
}

export default function FollowUpTab() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [filterType, setFilterType] = useState<"ALL" | FollowUp["type"]>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const getSlug = () => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const parts = hostname.split(".");
    return parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www" ? parts[0] : getDefaultSlug();
  };

  useEffect(() => {
    const slug = getSlug();
    const storageKey = `palmera_sales_followups_${slug}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setFollowUps(JSON.parse(saved));
      } catch (e) {
        setFollowUps([]);
      }
    }
  }, []);

  const filtered = followUps.filter((fu) => {
    const matchesType = filterType === "ALL" || fu.type === filterType;
    const matchesSearch =
      fu.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fu.note.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Bitácora de Interacciones y Seguimiento</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Historial unificado de llamadas, reuniones y correos electrónicos con potenciales clientes.</p>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-muted/15 p-4 rounded-xl border border-border/40">
        <SmartSearchInput value={searchQuery} onChange={setSearchQuery} suggestions={followUps.flatMap((followUp) => [followUp.contactName, followUp.note])} placeholder="Buscar por cliente o anotación..." className="max-w-sm flex-1" />

        <div className="flex flex-wrap gap-1.5">
          {(["ALL", "CALL", "EMAIL", "MEETING", "NOTE"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                filterType === t
                  ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-500"
                  : "border-border/50 bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {t === "ALL" ? "Todos" : t === "CALL" ? "Llamadas" : t === "EMAIL" ? "Emails" : t === "MEETING" ? "Reuniones" : "Notas"}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline View */}
      <div className="relative pl-6 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-0.5 before:bg-border/60">
        {filtered.map((fu) => (
          <div key={fu.id} className="relative group">
            {/* Timeline dot */}
            <div className={`absolute -left-[20px] top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-background flex items-center justify-center transition-transform group-hover:scale-110 duration-150 ${
              fu.type === "CALL" ? "border-blue-500" :
              fu.type === "EMAIL" ? "border-red-500" :
              fu.type === "MEETING" ? "border-purple-500" :
              "border-stone-500"
            }`}>
              <div className={`h-1.5 w-1.5 rounded-full ${
                fu.type === "CALL" ? "bg-blue-500" :
                fu.type === "EMAIL" ? "bg-red-500" :
                fu.type === "MEETING" ? "bg-purple-500" :
                "bg-stone-500"
              }`} />
            </div>

            {/* Timeline content card */}
            <div className="bg-card border border-border/40 hover:border-red-500/20 p-4 rounded-2xl shadow-xs space-y-2 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground hover:text-red-500 transition-colors cursor-pointer mr-2">
                    {fu.contactName}
                  </span>
                  <span className={`text-[8px] font-extrabold uppercase border px-2 py-0.2 rounded-full ${
                    fu.type === "CALL" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                    fu.type === "EMAIL" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                    fu.type === "MEETING" ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                    "bg-stone-500/10 text-stone-600 border-stone-500/20"
                  }`}>
                    {fu.type === "CALL" ? "Llamada" : fu.type === "EMAIL" ? "Correo" : fu.type === "MEETING" ? "Reunión" : "Nota"}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {new Date(fu.date).toLocaleString("es-ES")}
                </span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                {fu.note}
              </p>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-xs text-muted-foreground border border-dashed border-border/40 rounded-2xl bg-card">
            No se han registrado interacciones coincidentes.
          </div>
        )}
      </div>
    </div>
  );
}
