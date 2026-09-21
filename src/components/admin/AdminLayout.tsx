"use client";

import React, { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { useCustomizer } from "@/context/CustomizerContext";
import * as Icons from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isCustomizerActive, toggleCustomizer } = useCustomizer();

  return (
    <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300">
      {/* 1. Global Customizer Visual Overlay Vignette (Pointer Events None so you can click through!) */}
      {isCustomizerActive && (
        <div className="fixed inset-0 pointer-events-none z-40 border-[6px] border-red-500/35 ring-[12px] ring-red-500/5 shadow-[inset_0_0_120px_rgba(245,158,11,0.12)] transition-all duration-500 ease-in-out" />
      )}

      {/* 2. Customizer Active Notice Banner */}
      {isCustomizerActive && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-linear-to-r from-red-600 to-red-500 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-lg border border-red-400 backdrop-blur-xs flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
          <Icons.Sparkles className="h-4 w-4 text-white animate-spin-slow" />
          <span>Modo Editor Activo: Haz clic en las etiquetas con contornos dorados para renombrar.</span>
        </div>
      )}

      {/* 3. Floating Bottom-Left Customizer Action Button */}
      <div className="fixed bottom-6 left-6 z-[100] flex items-center">
        <button
          onClick={toggleCustomizer}
          className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer ${
            isCustomizerActive
              ? "bg-red-500 text-white shadow-red-500/30 ring-4 ring-red-500/20"
              : "bg-card text-foreground hover:bg-muted border border-border/80 shadow-black/10"
          }`}
          title={isCustomizerActive ? "Salir de Modo Editor" : "Personalizar Textos de Interfaz (Odoo Mode)"}
        >
          {isCustomizerActive ? (
            <Icons.Check className="h-5.5 w-5.5 text-white animate-bounce" />
          ) : (
            <Icons.Wrench className="h-5.5 w-5.5 text-red-500" />
          )}
        </button>
      </div>

      {/* Sidebar Navigation Panel */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-col transition-all duration-300">
        {/* Top Action Bar */}
        <AdminTopbar isMenuOpen={sidebarOpen} onMenuClick={() => setSidebarOpen((open) => !open)} />

        {/* Content Viewport */}
        <main className="flex-1 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
