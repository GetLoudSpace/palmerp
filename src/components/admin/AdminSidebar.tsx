"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { coreModules, PalmModesRegistry } from "@/modules/registry";
import EditableLabel from "./EditableLabel";
import { getTenantStorageKey } from "@/lib/clientStorage";

// Dynamic Icon resolver for Lucide icons
export const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (Icons as any)[name];
  if (!IconComponent) return <Icons.HelpCircle className={className} />;
  return <IconComponent className={className} />;
};

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_ACTIVE_MODES: string[] = [];

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  // Render the configured menu immediately, then reconcile it with tenant storage.
  // Starting empty made the sidebar briefly collapse to only the core modules on navigation.
  const [activeModes, setActiveModes] = useState<string[]>(DEFAULT_ACTIVE_MODES);

  const userEmail = session?.user?.email || "admin@palmera.io";
  const userName = session?.user?.name || "Usuario Admin";
  const userInitials = userName.charAt(0).toUpperCase();

  // Load active modes from DB (Setting) with fallback to localStorage
  useEffect(() => {
    const key = getTenantStorageKey("palmera_active_modes");
    const load = async () => {
      try {
        const res = await fetch("/api/admin/modes");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.modes)) {
            setActiveModes(data.modes);
            localStorage.setItem(key, JSON.stringify(data.modes));
            return;
          }
        }
      } catch {}
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setActiveModes(Array.isArray(parsed) ? parsed : DEFAULT_ACTIVE_MODES);
        } catch (e) {
          setActiveModes(DEFAULT_ACTIVE_MODES);
        }
      } else {
        setActiveModes(DEFAULT_ACTIVE_MODES);
        localStorage.setItem(key, JSON.stringify(DEFAULT_ACTIVE_MODES));
      }
    };
    load();
  }, []);

  // Listen to custom local storage changes to keep sidebar reactive
  useEffect(() => {
    const handleStorageChange = async () => {
      const key = getTenantStorageKey("palmera_active_modes");
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setActiveModes(Array.isArray(parsed) ? parsed : DEFAULT_ACTIVE_MODES);
        } catch (e) {}
      }
      // also sync to DB in background
      try {
        const modes = saved ? JSON.parse(saved) : [];
        if (Array.isArray(modes)) {
          await fetch("/api/admin/modes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modes }) });
        }
      } catch {}
    };

    window.addEventListener("storage", handleStorageChange);
    // Custom event listener for same-window updates
    window.addEventListener("palmera_modes_updated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("palmera_modes_updated", handleStorageChange);
    };
  }, []);

  const userRole = (session?.user as any)?.role as string | undefined;
  const isProfessor = userRole === "PROFESSOR";

  // Filter core modules: profesor solo ve educación + conversaciones mínimas
  const coreBase = coreModules.filter((m) => {
    if (isProfessor) return m.id === "conversations"; // profesor no ve contactos globales ni ajustes
    return m.id !== "settings";
  });
  const coreSettings = isProfessor ? [] : coreModules.filter((m) => m.id === "settings");

  // Get active mode configurations — profesor solo EDUCACION aunque admin haya activado otros
  const activeModeConfigsAll = activeModes
    .map((modeId) => PalmModesRegistry[modeId])
    .filter(Boolean);
  const activeModeConfigs = isProfessor
    ? activeModeConfigsAll.filter((m) => m.id === "EDUCACION")
    : activeModeConfigsAll;

  const operationsModes = activeModeConfigs.filter((m) => m.category === "Operaciones");
  const supportModes = isProfessor ? [] : activeModeConfigs.filter((m) => m.category === "Soporte" || m.category === "Estrategia");

  // Keep the active area open after route and browser back/forward navigation.
  useEffect(() => {
    const currentModule = [...coreModules, ...Object.values(PalmModesRegistry)].find((module) =>
      module.menuItems.some((item) => pathname === item.path)
    );

    if (currentModule) {
      setExpandedModule(currentModule.id);
      localStorage.setItem("palmera_sidebar_expanded_module", currentModule.id);
    }
  }, [pathname]);

  useEffect(() => {
    const savedExpandedModule = localStorage.getItem("palmera_sidebar_expanded_module");
    if (savedExpandedModule) setExpandedModule(savedExpandedModule);
  }, []);

  // Custom Sidebar sections
  const sections = [
    {
      title: "Núcleo ERP",
      apiKey: "sidebar.sec.core",
      items: coreBase,
    },
    {
      title: "Sectores Operativos",
      apiKey: "sidebar.sec.operations",
      items: operationsModes,
      visible: operationsModes.length > 0,
    },
    {
      title: "Soporte & Estrategia",
      apiKey: "sidebar.sec.support",
      items: supportModes,
      visible: supportModes.length > 0,
    },
    {
      title: "Sistema",
      apiKey: "sidebar.sec.system",
      items: coreSettings,
    },
  ];

  const toggleModule = (id: string) => {
    const nextModule = expandedModule === id ? null : id;
    setExpandedModule(nextModule);
    if (nextModule) localStorage.setItem("palmera_sidebar_expanded_module", nextModule);
    else localStorage.removeItem("palmera_sidebar_expanded_module");
  };

  return (
    <>
      {/* The drawer interaction is consistent on desktop and mobile. */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border/40 bg-white dark:bg-card text-card-foreground backdrop-blur-md transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border/40">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-metallic-orange shadow-md shadow-orange-500/20">
              <Icons.Palmtree className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight bg-linear-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text">
                <EditableLabel apiKey="sidebar.brand" defaultValue="Palm" />{" "}
                <span className="text-amber-500 font-semibold">
                  <EditableLabel apiKey="sidebar.accent" defaultValue="ERP" />
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block">
                <EditableLabel apiKey="sidebar.subtitle" defaultValue="Core Engine" />
              </div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted md:hidden"
          >
            <Icons.X className="h-5 w-5" />
          </button>
        </div>

        {/* Dynamic Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {sections.map((section) => {
            if (section.visible === false) return null;
            if (section.items.length === 0) return null;

            return (
              <div key={section.title} className="space-y-2">
                <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/75">
                  <EditableLabel
                    apiKey={section.apiKey}
                    defaultValue={section.title}
                  />
                </span>

                <div className="space-y-1">
                  {section.items.map((mod) => {
                    const isExpanded = expandedModule === mod.id;
                    const hasSubMenu = mod.menuItems && mod.menuItems.length > 0;
                    const isModuleActive = mod.menuItems.some((item) => pathname === item.path);

                    return (
                      <div key={mod.id} className="rounded-lg overflow-hidden">
                        {/* Module Button */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => hasSubMenu ? toggleModule(mod.id) : null}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              if (hasSubMenu) toggleModule(mod.id);
                            }
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer select-none outline-hidden ${
                            isModuleActive
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-500"
                              : "text-foreground/80 hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <DynamicIcon
                               name={mod.icon}
                               className={`h-5 w-5 ${
                                 isModuleActive ? "text-amber-700 dark:text-amber-500" : "text-muted-foreground group-hover:text-foreground"
                               }`}
                            />
                            <span>
                              <EditableLabel apiKey={`sidebar.module.${mod.id}`} defaultValue={mod.name} />
                            </span>
                          </div>
                          {hasSubMenu && (
                            <Icons.ChevronDown
                              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </div>

                        {/* Collapsible Submenu */}
                        {hasSubMenu && isExpanded && (
                          <div className="mt-1 ml-9 pl-2 border-l border-border/60 space-y-1 py-1 animate-in slide-in-from-top-1 duration-200">
                            {mod.menuItems.map((item) => {
                              const isSubActive = pathname === item.path;
                              return (
                                <Link
                                  key={`${mod.id}-${item.label}-${item.path}`}
                                  href={item.path}
                                  onClick={onClose}
                                  className={`block py-1.5 px-3 text-xs font-medium rounded-md transition-all duration-150 ${
                                    isSubActive
                                      ? "text-amber-500 bg-amber-500/5 font-semibold"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  }`}
                                >
                                  <EditableLabel apiKey={`sidebar.item.${item.path}`} defaultValue={item.label} />
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer with Session Profile & LogOut */}
        <div className="p-4 border-t border-border/40 bg-muted/20">
          <div className="flex items-center justify-between rounded-xl bg-card p-3 border border-border/50 shadow-xs gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-tr from-stone-200 to-stone-300 dark:from-stone-800 dark:to-stone-700 text-foreground font-bold border border-border/20">
                {userInitials}
              </div>
              <div className="overflow-hidden min-w-0">
                <h4 className="text-xs font-semibold text-foreground truncate">
                  {userName}
                </h4>
                <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
              </div>
            </div>
            {session && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0 cursor-pointer"
                title="Cerrar Sesión"
              >
                <Icons.LogOut className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
