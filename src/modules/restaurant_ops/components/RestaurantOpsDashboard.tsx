"use client";

import React, { useState } from "react";
import * as Icons from "lucide-react";
import WasteTrackerTab from "./WasteTrackerTab";
import HaccpComplianceTab from "./HaccpComplianceTab";
import DailyShiftReportTab from "./DailyShiftReportTab";

export default function RestaurantOpsDashboard() {
  const [activeTab, setActiveTab] = useState<"waste" | "haccp" | "daily">("waste");

  return (
    <div className="space-y-6">
      <div className="flex items-center bg-card/65 backdrop-blur-md rounded-2xl p-1.5 border border-border/40 shadow-sm gap-1.5 overflow-x-auto scrollbar-none max-w-max">
        {[
          { id: "waste", label: "Control de Mermas", icon: Icons.Trash2 },
          { id: "haccp", label: "Sanidad & HACCP", icon: Icons.Thermometer },
          { id: "daily", label: "Diario de Cierre Director", icon: Icons.ClipboardList },
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

      {activeTab === "waste" && <WasteTrackerTab />}
      {activeTab === "haccp" && <HaccpComplianceTab />}
      {activeTab === "daily" && <DailyShiftReportTab />}
    </div>
  );
}
