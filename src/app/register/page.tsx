"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import * as Icons from "lucide-react";

function RegisterForm() {
  const searchParams = useSearchParams();
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ tenantSlug: string; url: string } | null>(null);

  // Read search parameters for pre-filling invite info
  useEffect(() => {
    const code = searchParams.get("code");
    const email = searchParams.get("email");
    const name = searchParams.get("name");
    const company = searchParams.get("company");

    if (code) setInviteCode(code);
    if (email) setAdminEmail(email);
    if (name) setAdminName(name);
    if (company) {
      setCompanyName(company);
      const cleaned = company
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      setSubdomain(cleaned);
    }
  }, [searchParams]);

  // Clean subdomain input dynamically
  const handleSubdomainChange = (val: string) => {
    const cleaned = val
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setSubdomain(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          subdomain,
          adminName,
          adminEmail,
          adminPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ocurrió un error al crear la organización.");
      } else {
        // Track registration in invitation log if there was an invite code
        if (inviteCode) {
          try {
            const savedLogs = localStorage.getItem("palmera_superadmin_invites") || "[]";
            const logs = JSON.parse(savedLogs);
            const updated = logs.map((inv: any) => 
              inv.code === inviteCode ? { ...inv, isUsed: true, usedAt: new Date().toISOString(), usedBy: subdomain } : inv
            );
            localStorage.setItem("palmera_superadmin_invites", JSON.stringify(updated));
          } catch (e) {
            console.error("Error updating local invites:", e);
          }
        }

        // Calculate login URL
        let loginUrl = "";
        if (typeof window !== "undefined") {
          const host = window.location.host; 
          
          if (host.includes("localhost") || host.includes("127.0.0.1")) {
            loginUrl = `http://${data.tenantSlug}.localhost:3000/login`;
          } else {
            const parts = host.split(".");
            const baseDomain = parts.slice(-2).join(".");
            loginUrl = `https://${data.tenantSlug}.${baseDomain}/login`;
          }
        }
        setSuccessData({ tenantSlug: data.tenantSlug, url: loginUrl });
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor. Por favor, inténtelo de nuevo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="w-full max-w-lg p-8 bg-card/65 backdrop-blur-md rounded-3xl border border-emerald-500/35 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
          <Icons.PartyPopper className="h-7 w-7 animate-bounce" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-foreground">
            ¡Espacio de Trabajo Listo!
          </h1>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Felicidades. Hemos configurado exitosamente el entorno de Palmera para <span className="font-bold text-emerald-400">{companyName}</span>.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/20 text-left space-y-3 font-medium">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Slug del Tenant:</span>
            <span className="font-mono text-emerald-400 font-bold">{successData.tenantSlug}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Tu URL de Acceso:</span>
            <a href={successData.url} className="font-mono text-red-500 font-bold hover:underline">
              {successData.url}
            </a>
          </div>
        </div>

        <a
          href={successData.url}
          className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-metallic-red font-bold text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all active:scale-98 cursor-pointer text-xs"
        >
          <span>Ir al Login de mi Empresa</span>
          <Icons.ArrowRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg p-8 bg-card/65 backdrop-blur-md rounded-3xl border border-border/40 shadow-2xl space-y-6 relative overflow-hidden my-8 animate-in zoom-in-95 duration-200">
      {/* Glowing lights */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />

      {/* Header */}
      <div className="text-center space-y-2 relative">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-metallic-red text-white shadow-lg shadow-red-500/20 mb-2">
          <Icons.Palmtree className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
          Crear Instancia Privada
        </h1>
        
        {inviteCode ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/25 px-3 py-1 text-[10px] font-bold text-red-600 dark:text-red-400">
            <Icons.KeyRound className="h-3 w-3 animate-pulse" />
            <span>Invitación Activa: {inviteCode}</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Registra tu empresa para obtener un espacio de trabajo independiente.
          </p>
        )}
      </div>

      {/* Error Block */}
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-[11px] leading-relaxed flex items-start gap-2 animate-in fade-in duration-200">
          <Icons.AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="border-b border-border/30 pb-3 mb-2">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block">1. Datos de tu Empresa</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nombre de Empresa</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Gastroshows S.L."
              disabled={loading}
              className="w-full rounded-xl border border-border/50 bg-background/50 py-2.5 px-3.5 text-xs text-foreground placeholder-muted-foreground/60 outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all"
            />
          </div>

          {/* Subdomain / Slug */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Subdominio URL</label>
            <div className="relative flex items-center">
              <input
                type="text"
                required
                value={subdomain}
                onChange={(e) => handleSubdomainChange(e.target.value)}
                placeholder="gastroshows"
                disabled={loading}
                className="w-full rounded-xl border border-border/50 bg-background/50 py-2.5 pr-20 pl-3.5 text-xs text-foreground placeholder-muted-foreground/60 outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all font-mono"
              />
              <span className="absolute right-3 text-[10px] font-semibold text-muted-foreground/70 pointer-events-none">
                .palmerp.es
              </span>
            </div>
          </div>
        </div>

        <div className="border-b border-border/30 pb-3 pt-2 mb-2">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block">2. Administrador del Sistema</span>
        </div>

        {/* Admin Name */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nombre Completo</label>
          <input
            type="text"
            required
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            placeholder="Renato García"
            disabled={loading}
            className="w-full rounded-xl border border-border/50 bg-background/50 py-2.5 px-3.5 text-xs text-foreground placeholder-muted-foreground/60 outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Admin Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Correo Electrónico</label>
            <input
              type="email"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@gastroshows.es"
              disabled={loading}
              className="w-full rounded-xl border border-border/50 bg-background/50 py-2.5 px-3.5 text-xs text-foreground placeholder-muted-foreground/60 outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all"
            />
          </div>

          {/* Admin Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contraseña</label>
            <input
              type="password"
              required
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              disabled={loading}
              minLength={6}
              className="w-full rounded-xl border border-border/50 bg-background/50 py-2.5 px-3.5 text-xs text-foreground placeholder-muted-foreground/60 outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all font-mono"
            />
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-metallic-red font-bold text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all active:scale-98 cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-4 text-xs"
        >
          {loading ? (
            <Icons.Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <>
              <span>Crear mi Espacio de Trabajo</span>
              <Icons.ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer Login */}
      <div className="text-center text-[11px] text-muted-foreground pt-4 border-t border-border/30">
        ¿Tu empresa ya está registrada?{" "}
        <a href="/login" className="text-red-500 hover:text-red-600 font-bold">
          Inicia Sesión
        </a>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex-1 min-h-screen flex items-center justify-center p-4 relative">
      <Suspense fallback={
        <div className="flex h-32 w-32 items-center justify-center">
          <Icons.Loader2 className="h-8 w-8 text-red-500 animate-spin" />
        </div>
      }>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
