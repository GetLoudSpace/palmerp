"use client";

import React, { useState } from "react";
import * as Icons from "lucide-react";

export default function DailyShiftReportTab() {
  const [salesComida, setSalesComida] = useState<number>(2450);
  const [salesBebida, setSalesBebida] = useState<number>(890);
  const [totalPax, setTotalPax] = useState<number>(78);
  const [incidents, setIncidents] = useState<string>("Servicio fluido. El grupo de la mesa 12 felicitó al chef. Rotura de 1 copa de vino en terraza.");
  const [isSaved, setIsSaved] = useState(false);

  const totalSales = salesComida + salesBebida;
  const ticketMedio = totalPax > 0 ? totalSales / totalPax : 0;

  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card/65 backdrop-blur-md p-6 rounded-3xl border border-border/40 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <Icons.ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Diario de Cierre de Servicio del Director</h3>
              <p className="text-xs text-muted-foreground">Informe de turno: ventas, comensales, ticket medio e incidencias operativas.</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-red-500 bg-red-500/10 px-3 py-1 rounded-xl">
            Turno: Comida {new Date().toLocaleDateString()}
          </span>
        </div>

        {/* Sales & Metric Inputs */}
        <form onSubmit={handleSaveReport} className="space-y-6 text-xs">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="bg-background/60 p-4 rounded-2xl border border-border/40 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Ventas Comida (€)</label>
              <input
                type="number"
                value={salesComida}
                onChange={(e) => setSalesComida(Number(e.target.value))}
                className="w-full bg-background border border-border/50 rounded-xl p-2 font-black text-lg text-foreground"
              />
            </div>

            <div className="bg-background/60 p-4 rounded-2xl border border-border/40 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Ventas Bebida (€)</label>
              <input
                type="number"
                value={salesBebida}
                onChange={(e) => setSalesBebida(Number(e.target.value))}
                className="w-full bg-background border border-border/50 rounded-xl p-2 font-black text-lg text-foreground"
              />
            </div>

            <div className="bg-background/60 p-4 rounded-2xl border border-border/40 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Comensales (Pax)</label>
              <input
                type="number"
                value={totalPax}
                onChange={(e) => setTotalPax(Number(e.target.value))}
                className="w-full bg-background border border-border/50 rounded-xl p-2 font-black text-lg text-foreground"
              />
            </div>

            <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/30 space-y-1">
              <span className="text-[10px] font-bold text-red-600 uppercase block">Ticket Medio / Pax</span>
              <div className="text-xl font-black text-red-500">{ticketMedio.toFixed(2)}€</div>
              <span className="text-[10px] text-muted-foreground block">Total: {totalSales.toFixed(2)}€</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-muted-foreground uppercase text-[10px]">Notas de Dirección e Incidencias del Servicio</label>
            <textarea
              rows={4}
              value={incidents}
              onChange={(e) => setIncidents(e.target.value)}
              className="w-full bg-background border border-border/50 rounded-2xl p-3 text-foreground text-xs leading-relaxed"
            />
          </div>

          <div className="flex justify-end items-center gap-3">
            {isSaved && (
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <Icons.CheckCircle className="h-4 w-4" /> Guardado Correctamente
              </span>
            )}
            <button
              type="submit"
              className="px-6 h-10 rounded-xl bg-metallic-red font-bold text-white text-xs cursor-pointer shadow-lg"
            >
              Guardar Diario de Cierre
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
