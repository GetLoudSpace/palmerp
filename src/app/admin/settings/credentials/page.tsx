// src/app/admin/settings/credentials/page.tsx
// Espacio "Credenciales": pegar tokens una vez y listo. El servidor los cifra
// (AES-256-GCM) y los usa donde toca sin que NADIE pueda leerlos después:
// esta pantalla jamás muestra valores, solo badges Conectado/Pendiente.
"use client";

import React from "react";
import * as Icons from "lucide-react";
import { CREDENTIAL_DEFS } from "@/lib/credentials";
import { useCredentials } from "./useCredentials";
import CredentialCard from "./CredentialCard";

const GROUPS = [
  {
    id: "whatsapp" as const,
    title: "WhatsApp Cloud API",
    icon: <Icons.MessageCircle className="h-4 w-4 text-emerald-600" />,
    note: "Al guardar, el reporte de fin de clase pasa de wa.me manual a envío automático.",
  },
  {
    id: "google" as const,
    title: "Google Calendar",
    icon: <Icons.Calendar className="h-4 w-4 text-sky-600" />,
    note: "Al guardar, el Profesor ve los eventos reales del día. Sin esto, usa la agenda interna.",
  },
];

export default function CredentialsPage() {
  const {
    creds,
    keyReady,
    loading,
    values,
    setValue,
    show,
    toggleShow,
    saving,
    testPhone,
    setTestPhone,
    testing,
    toast,
    save,
    remove,
    sendTest,
  } = useCredentials();

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[100] rounded-2xl px-5 py-3 text-xs font-bold shadow-xl border backdrop-blur flex items-center gap-2 ${
            toast.ok
              ? "bg-emerald-600 text-white border-emerald-400"
              : "bg-red-600 text-white border-red-400"
          }`}
        >
          {toast.ok ? <Icons.CheckCircle className="h-4 w-4" /> : <Icons.AlertTriangle className="h-4 w-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="flex flex-col gap-2 border-b border-border/30 pb-4">
        <div className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <Icons.KeyRound className="h-5 w-5 text-red-500" />
          Credenciales
        </div>
        <p className="text-xs text-muted-foreground max-w-2xl">
          Pega cada clave una vez y queda <strong>cifrada</strong>. Se usa automáticamente en
          WhatsApp y Google Calendar. <strong>Por seguridad, aquí nunca se muestran los valores</strong>,
          ni siquiera a ti: solo verás si está conectada o pendiente. Para cambiarla, pega la nueva encima.
        </p>
      </div>

      {!keyReady && !loading && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-xs text-red-700 flex items-start gap-2">
          <Icons.AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>Falta la llave maestra del servidor</strong> (<code className="font-mono">CREDENTIALS_ENCRYPTION_KEY</code>).
            Pide al técnico que la configure con <code className="font-mono">openssl rand -base64 32</code>.
            Hasta entonces no se puede guardar nada (nada se guarda en claro, por diseño).
          </span>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Icons.Loader2 className="h-4 w-4 animate-spin" /> Cargando estado…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.id} className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-black">
                {g.icon}
                {g.title}
              </div>
              <p className="text-[11px] text-muted-foreground">{g.note}</p>
              {CREDENTIAL_DEFS.filter((d) => d.group === g.id).map((def) => {
                const status = creds.find((x) => x.key === def.key);
                if (!status) return null;
                return (
                  <CredentialCard
                    key={def.key}
                    def={def}
                    status={status}
                    value={values[def.key] || ""}
                    onChange={(v) => setValue(def.key, v)}
                    visible={!!show[def.key]}
                    onToggleVisible={() => toggleShow(def.key)}
                    saving={saving === def.key}
                    onSave={() => save(def.key)}
                    onRemove={() => remove(def.key)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Prueba WhatsApp */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
        <div className="text-sm font-black flex items-center gap-2">
          <Icons.Send className="h-4 w-4 text-emerald-600" />
          Probar WhatsApp
        </div>
        <p className="text-[11px] text-muted-foreground">
          Envía un mensaje de prueba a tu móvil usando la credencial guardada, sin mostrarla.
        </p>
        <div className="flex gap-2 max-w-md">
          <input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="+34 600 123 123"
            inputMode="tel"
            className="flex-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={sendTest}
            disabled={testing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 hover:bg-emerald-500"
          >
            {testing ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.Send className="h-3.5 w-3.5" />}
            Enviar prueba
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-muted/15 p-4 text-[11px] text-muted-foreground leading-relaxed flex gap-2">
        <Icons.ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
        <span>
          <strong className="text-foreground">Cómo se protege:</strong> cifrado AES-256-GCM con llave
          maestra solo del servidor, un cifrado por tenant, ningún endpoint devuelve valores, cada
          guardado/borrado/prueba queda en auditoría (solo el nombre de la clave, nunca el valor),
          y solo rol ADMIN puede abrir esta página y sus APIs.
        </span>
      </div>
    </div>
  );
}
