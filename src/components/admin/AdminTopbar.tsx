"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import SmartSearchInput from "@/components/SmartSearchInput";
import { coreModules, PalmModesRegistry } from "@/modules/registry";

interface AdminTopbarProps {
  onMenuClick: () => void;
  isMenuOpen: boolean;
}

export default function AdminTopbar({ onMenuClick, isMenuOpen }: AdminTopbarProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const searchSuggestions = [
    ...coreModules.flatMap((module) => [module.name, ...module.menuItems.map((item) => item.label)]),
    ...Object.values(PalmModesRegistry).flatMap((module) => [module.name, ...module.menuItems.map((item) => item.label)]),
  ];

  const [shopSlug, setShopSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/shop").then(r=>r.json()).then(d=>{ if(d?.success && d.shop?.slug) setShopSlug(d.shop.slug); }).catch(()=>{});
  }, []);

  // Initialize theme from HTML class list
  useEffect(() => {
    const isDarkTheme = document.documentElement.classList.contains("dark");
    setIsDark(isDarkTheme);
  }, []);

  // Toggle Dark Mode
  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Get current page name from path
  const getPageTitle = () => {
    if (pathname === "/admin") return "Dashboard Principal";
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length <= 1) return "Consola";
    
    // Capitalize last segment
    const lastSeg = segments[segments.length - 1];
    const decoded = decodeURIComponent(lastSeg).replace(/-/g, " ");
    return decoded.charAt(0).toUpperCase() + decoded.slice(1);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/40 bg-background/80 px-6 backdrop-blur-md">
      {/* Left side: Hamburger (Mobile) & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl border border-border/50 bg-card/60 p-2 text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
          aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <Icons.X className="h-5 w-5" /> : <Icons.Menu className="h-5 w-5" />}
        </button>

        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground md:text-base">
            {getPageTitle()}
          </h2>
          <div className="hidden items-center gap-1.5 text-[10px] text-muted-foreground md:flex">
            <span>Palmera</span>
            <Icons.ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="font-medium text-foreground/75">Admin Console</span>
          </div>
        </div>
      </div>

      {/* Right side: Global Actions (Search, Dark Mode, Profile) */}
      <div className="flex items-center gap-3">
        {shopSlug && (
          <a href={`/shop/${shopSlug}`} target="_blank" rel="noopener noreferrer" className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-amber-500 text-white px-3.5 py-1.5 text-xs font-black shadow hover:bg-amber-600">
            <Icons.ShoppingBag className="h-4 w-4" /> Pedir pan (vista cliente)
          </a>
        )}
        {/* Search Bar - hidden on mobile */}
        <SmartSearchInput value={globalSearch} onChange={setGlobalSearch} suggestions={searchSuggestions} placeholder="Buscar en Palmera..." className="hidden w-64 md:block" />

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
          title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {isDark ? (
            <Icons.Sun className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
          ) : (
            <Icons.Moon className="h-4.5 w-4.5" />
          )}
        </button>

        {/* Language Switcher */}
        <button className="flex h-8 items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2 text-xs font-semibold text-foreground hover:bg-muted">
          <Icons.Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <span>ES</span>
        </button>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
          <Icons.Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background" />
        </button>

        <div className="h-5 w-px bg-border/50 mx-1" />

        {/* Quick Profile Pill */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-tr from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-amber-500 font-bold border border-amber-500/20">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
