"use client";
import React, { useState } from "react";
import * as Icons from "lucide-react";
import ClassReportPanel from "./ClassReportPanel";
import GuitarCourseViewer from "./GuitarCourseViewer";
import SendLogPanel from "./SendLogPanel";

type Tab = "clases" | "guitarra" | "registro";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "clases", label: "Clases de hoy", icon: Icons.CalendarCheck },
  { id: "guitarra", label: "Curso Guitarra", icon: Icons.Music2 },
  { id: "registro", label: "Registro de envíos", icon: Icons.MessageSquareText },
];

export default function TeacherTabs() {
  const [tab, setTab] = useState<Tab>("clases");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                active
                  ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
                  : "border-border/40 bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>
      {tab === "clases" && <ClassReportPanel />}
      {tab === "guitarra" && <GuitarCourseViewer />}
      {tab === "registro" && <SendLogPanel />}
    </div>
  );
}
