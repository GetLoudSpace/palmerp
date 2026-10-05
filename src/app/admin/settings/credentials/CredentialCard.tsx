// src/app/admin/settings/credentials/CredentialCard.tsx
// Tarjeta por credencial: badge de estado + campo de pegado (jamás precargado)
// + Guardar/Reemplazar + Eliminar. Los valores nunca se muestran tras guardar.
"use client";

import React from "react";
import * as Icons from "lucide-react";
import type { CredentialDef } from "@/lib/credentials";
import type { CredStatus } from "./useCredentials";

const SAVED_PLACEHOLDER = "•••••• guardado (pega el nuevo para reemplazar)";

function SourceBadge({ status }: { status: CredStatus }) {
  if (status.source === "vault")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
        <Icons.Lock className="h-3 w-3" /> Conectado · cifrado
      </span>
    );
  if (status.source === "env")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
        <Icons.Server className="h-3 w-3" /> Activo desde servidor
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
      Pendiente
    </span>
  );
}

interface Props {
  def: CredentialDef;
  status: CredStatus;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  saving: boolean;
  onSave: () => void;
  onRemove: () => void;
}

export default function CredentialCard({
  def,
  status,
  value,
  onChange,
  visible,
  onToggleVisible,
  saving,
  onSave,
  onRemove,
}: Props) {
  return (
    <div className="rounded-xl border border-border/40 bg-background p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-bold">{status.label}</div>
        <SourceBadge status={status} />
      </div>
      <p className="text-[10px] text-muted-foreground">{status.hint}</p>
      <div className="flex gap-1.5">
        {def.multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={status.source === "vault" ? SAVED_PLACEHOLDER : def.placeholder}
            rows={3}
            spellCheck={false}
            className="flex-1 rounded-lg border border-border/50 bg-card px-3 py-2 font-mono text-[11px] outline-none focus:border-red-500"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={status.source === "vault" ? SAVED_PLACEHOLDER : def.placeholder}
            type={def.secret && !visible ? "password" : "text"}
            autoComplete="off"
            spellCheck={false}
            className="flex-1 rounded-lg border border-border/50 bg-card px-3 py-2 font-mono text-xs outline-none focus:border-red-500"
          />
        )}
        {def.secret && (
          <button
            type="button"
            title={visible ? "Ocultar mientras escribes" : "Mostrar mientras escribes"}
            onClick={onToggleVisible}
            className="rounded-lg border border-border/50 px-2.5 text-muted-foreground hover:bg-muted"
          >
            {visible ? <Icons.EyeOff className="h-4 w-4" /> : <Icons.Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !value.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-3 py-2 text-xs font-bold disabled:opacity-40 hover:opacity-90"
        >
          {saving ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.Save className="h-3.5 w-3.5" />}
          {status.source === "vault" ? "Reemplazar" : "Guardar cifrado"}
        </button>
        {status.source === "vault" && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-500/10"
          >
            <Icons.Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
