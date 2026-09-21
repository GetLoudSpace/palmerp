"use client";

import React, { useState } from "react";
import * as Icons from "lucide-react";
import ShiftPlannerTab from "./ShiftPlannerTab";
import VacationRequestsTab from "./VacationRequestsTab";

export default function TeamDashboard() {
  const [activeTab, setActiveTab] = useState<"shifts" | "vacations" | "clocking">("shifts");

  return (
    <div className="space-y-6">
      {/* Tabs Bar */}
      <div className="flex items-center bg-card/65 backdrop-blur-md rounded-2xl p-1.5 border border-border/40 shadow-sm gap-1.5 overflow-x-auto scrollbar-none max-w-max">
        {[
          { id: "shifts", label: "Cuadrante de Turnos", icon: Icons.Calendar },
          { id: "vacations", label: "Vacaciones & Permisos", icon: Icons.Palmtree },
          { id: "clocking", label: "Control de Fichajes", icon: Icons.Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2.5 px-4.5 text-xs font-bold transition-all rounded-xl cursor-pointer ${
                isActive
                  ? "bg-metallic-red text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "shifts" && <ShiftPlannerTab />}
      {activeTab === "vacations" && <VacationRequestsTab />}
      {activeTab === "clocking" && (
        <div className="bg-card/75 backdrop-blur-md p-6 rounded-3xl border border-border/40 space-y-4">
          <h3 className="text-xs font-black tracking-wider text-foreground uppercase flex items-center gap-2">
            <Icons.Clock className="h-4 w-4 text-red-500" />
            <span>Terminal de Fichaje en Tiempo Real (PIN / QR)</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Terminal interactiva para registro de entradas, salidas y descansos del personal.
          </p>
          <div className="p-8 bg-background/60 rounded-2xl border border-border/40 text-center space-y-3">
            <Icons.QrCode className="h-12 w-12 text-red-500 mx-auto animate-pulse" />
            <div className="text-sm font-bold text-foreground">Escanea tu código de fichaje o ingresa tu PIN</div>
            <div className="flex justify-center gap-2">
              <input type="password" placeholder="••••" className="w-32 bg-background border border-border/50 rounded-xl text-center font-mono text-lg tracking-widest p-2" />
              <button className="px-4 bg-red-500 text-white font-bold text-xs rounded-xl">Fichar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
