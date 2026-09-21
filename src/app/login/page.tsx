"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import * as Icons from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read error parameter from URL (e.g. redirected from middleware)
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "TenantMismatch") {
      setError("No tienes acceso a esta organización. Tu cuenta pertenece a otro espacio de trabajo.");
    } else if (err === "CredentialsSignin") {
      setError("Credenciales incorrectas. Por favor, verifica tu correo y contraseña.");
    }
  }, [searchParams]);

  // Instancia independiente: slug fijado por entorno (ignora hostname).
  const pinnedSlug = (process.env.NEXT_PUBLIC_PINNED_TENANT_SLUG || "").trim().toLowerCase();

  // Determine tenant from subdomain/hostname
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (pinnedSlug) {
        setTenantSlug(pinnedSlug);
      } else {
        const hostname = window.location.hostname;
        const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");

        let slug = "";
        if (isLocalhost) {
          const parts = hostname.split(".");
          if (parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www") {
            slug = parts[0];
          } else {
            slug = "gastroshows"; // Local development fallback
          }
        } else {
          const parts = hostname.split(".");
          if (parts.length > 2 && parts[0] !== "www") {
            slug = parts[0];
          } else {
            slug = "gastroshows";
          }
        }
        setTenantSlug(slug);
      }

      // Superadmin Bypass Check
      const params = new URLSearchParams(window.location.search);
      const bypassToken = params.get("bypass_token");
      const userId = params.get("user");

      if (bypassToken && userId) {
        signIn("credentials", {
          bypassToken,
          userId,
          tenantSlug: pinnedSlug || tenantSlug,
          redirect: true,
          callbackUrl: "/admin",
        });
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const callbackUrl = searchParams.get("callbackUrl") || "/admin";

    try {
      const result = await signIn("credentials", {
        email,
        password,
        tenantSlug,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        if (result.error.includes("CredentialsSignin")) {
          setError("Correo o contraseña incorrectos para esta organización.");
        } else {
          setError("Error al iniciar sesión: " + result.error);
        }
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError("Ha ocurrido un error inesperado. Inténtelo de nuevo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-card/65 backdrop-blur-md rounded-3xl border border-border/40 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Decorative pulse orange light */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />

      {/* Header section */}
      <div className="text-center space-y-2 relative">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-metallic-red text-white shadow-lg shadow-red-500/20 mb-2">
          <Icons.Palmtree className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
          Iniciar Sesión
        </h1>
        <p className="text-xs text-muted-foreground">
          Accede a tu cuenta de Palmera en <span className="font-bold text-red-500 uppercase tracking-wider">{tenantSlug}</span>
        </p>
      </div>

      {/* Error alert block */}
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-[11px] leading-relaxed flex items-start gap-2 animate-in fade-in duration-200">
          <Icons.AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Icons.Mail className="h-3.5 w-3.5 text-muted-foreground/80" />
            <span>Correo Electrónico</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@gastroshows.es"
            disabled={loading}
            className="w-full rounded-xl border border-border/50 bg-background/50 py-2.5 px-3.5 text-xs text-foreground placeholder-muted-foreground/60 outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Icons.Lock className="h-3.5 w-3.5 text-muted-foreground/80" />
            <span>Contraseña</span>
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            className="w-full rounded-xl border border-border/50 bg-background/50 py-2.5 px-3.5 text-xs text-foreground placeholder-muted-foreground/60 outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all font-mono"
          />
        </div>

        {/* Forgot password */}
        <div className="flex items-center justify-between text-[11px]">
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              className="rounded-sm border-border text-red-500 focus:ring-red-500 h-3.5 w-3.5"
            />
            <span>Recordarme</span>
          </label>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert("Por favor, póngase en contacto con el administrador del sistema para restablecer su contraseña.");
            }}
            className="text-red-500 hover:text-red-600 font-semibold"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-metallic-red font-bold text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all active:scale-98 cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-2 text-xs"
        >
          {loading ? (
            <Icons.Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <>
              <span>Entrar al Sistema</span>
              <Icons.ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer register link (oculto en instancia pineada: no se crean workspaces aquí) */}
      {!pinnedSlug && (
        <div className="text-center text-[11px] text-muted-foreground pt-4 border-t border-border/30">
          ¿Tu empresa es nueva en Palmera?{" "}
          <a href="/register" className="text-red-500 hover:text-red-600 font-bold">
            Crea tu espacio de trabajo
          </a>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 min-h-screen flex items-center justify-center p-4 relative">
      <Suspense fallback={
        <div className="flex h-32 w-32 items-center justify-center">
          <Icons.Loader2 className="h-8 w-8 text-red-500 animate-spin" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
