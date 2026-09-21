"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";

export default function CustomDomainPage() {
  const [shop, setShop] = useState<any | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadShop();
  }, []);

  const loadShop = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shop");
      const data = await res.json();
      if (data.success && data.shop) {
        setShop(data.shop);
        setDomainInput(data.shop.customDomain || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/shop/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDomain: domainInput }),
      });
      const data = await res.json();
      if (data.success) {
        setShop(data.shop);
        setMessage({ type: "success", text: "Dominio guardado correctamente." });
      } else {
        setMessage({ type: "error", text: data.error || "Error al guardar el dominio." });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: "No se pudo guardar el dominio." });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDNS = async () => {
    setVerifying(true);
    setMessage(null);

    try {
      const res = await fetch("/api/shop/domain", { method: "PUT" });
      const data = await res.json();
      if (data.success) {
        setShop(data.shop);
        setMessage({
          type: data.verified ? "success" : "error",
          text: data.message,
        });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: "Error en la comprobación DNS." });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Icons.Loader2 className="h-8 w-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-border/30 pb-4">
        <h1 className="text-xl font-extrabold text-foreground md:text-2xl flex items-center gap-2">
          <Icons.Globe className="h-6 w-6 text-emerald-500" />
          Dominio Personalizado para tu Web de Ventas
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Conecta tu propio dominio (ej. <code className="bg-muted px-1 py-0.5 rounded">pedidos.panaderiajuan.es</code>) para tus clientes.
          El panel de administración seguirá seguro en <code className="bg-muted px-1 py-0.5 rounded">palmerp.es</code>.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
              : "bg-red-500/10 text-red-600 border-red-500/30"
          }`}
        >
          {message.type === "success" ? <Icons.CheckCircle2 className="h-4 w-4" /> : <Icons.AlertCircle className="h-4 w-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Domain Form Card */}
      <div className="bg-card border border-border/40 p-6 rounded-2xl space-y-6">
        <form onSubmit={handleSaveDomain} className="space-y-4">
          <div>
            <label className="text-xs font-extrabold uppercase text-foreground block mb-2">
              Nombre de Dominio Personalizado
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="ej. pedidos.panaderiajuan.es"
                className="flex-1 px-4 py-2.5 text-xs font-mono rounded-xl border border-border/50 bg-background outline-hidden focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 text-white font-bold text-xs px-5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
              >
                {saving ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Save className="h-4 w-4" />}
                <span>Guardar Dominio</span>
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Introduce tu subdominio o dominio sin `http://` ni `/` al final.
            </p>
          </div>
        </form>

        {/* Status & Verify Section */}
        {shop?.customDomain && (
          <div className="pt-4 border-t border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground">Estado DNS:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 ${
                  shop.domainStatus === "VERIFIED"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : shop.domainStatus === "FAILED"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {shop.domainStatus === "VERIFIED" ? (
                  <>
                    <Icons.CheckCircle2 className="h-3.5 w-3.5" /> Verificado & Activo
                  </>
                ) : shop.domainStatus === "FAILED" ? (
                  <>
                    <Icons.XCircle className="h-3.5 w-3.5" /> Registros no encontrados
                  </>
                ) : (
                  <>
                    <Icons.Clock className="h-3.5 w-3.5" /> Pendiente de verificación
                  </>
                )}
              </span>
            </div>

            <button
              onClick={handleVerifyDNS}
              disabled={verifying}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-card border border-border px-4 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50 transition-all cursor-pointer"
            >
              {verifying ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.RefreshCw className="h-4 w-4 text-red-500" />}
              <span>Comprobar Registros DNS Ahora</span>
            </button>
          </div>
        )}
      </div>

      {/* Step-by-Step DNS Instructions Box */}
      <div className="bg-card border border-border/40 p-6 rounded-2xl space-y-4">
        <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Icons.HelpCircle className="h-4 w-4 text-blue-500" />
          Instrucciones de Configuración DNS en tu Proveedor
        </h2>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Accede al panel de control de tu proveedor de dominio (GoDaddy, Cloudflare, Namecheap, Nominalia, IONOS, etc.) y añade el siguiente registro DNS:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-border/30 rounded-xl overflow-hidden">
            <thead className="bg-muted/50 font-extrabold text-foreground">
              <tr>
                <th className="p-3 border-b border-border/30">Tipo de Registro</th>
                <th className="p-3 border-b border-border/30">Nombre / Host</th>
                <th className="p-3 border-b border-border/30">Valor / Apunta a</th>
                <th className="p-3 border-b border-border/30">TTL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 font-mono text-[11px]">
              <tr>
                <td className="p-3 font-bold text-emerald-500">CNAME</td>
                <td className="p-3">{shop?.customDomain ? shop.customDomain.split(".")[0] : "pedidos"}</td>
                <td className="p-3 text-foreground font-bold">cname.palmerp.es</td>
                <td className="p-3">Automático / 3600</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-xs text-red-600 dark:text-red-400 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Icons.Info className="h-4 w-4 shrink-0" />
            Nota sobre propagación DNS:
          </div>
          <p className="text-[11px]">
            Los cambios DNS pueden tardar desde 5 minutos hasta 24 horas en propagarse mundialmente según tu proveedor.
          </p>
        </div>
      </div>
    </div>
  );
}
