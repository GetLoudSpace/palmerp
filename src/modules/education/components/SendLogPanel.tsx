"use client";
import React, { useEffect, useState, useCallback } from "react";
import * as Icons from "lucide-react";
import { getTenantStorageKey } from "@/lib/clientStorage";

type OutboxEntry = {
  id: string;
  at: string;
  lesson: string;
  instrument?: string;
  recipients: { label: string; phone: string }[];
  body: string;
  status?: string;
  origin: "reporte" | "clase";
};

function loadEntries(): OutboxEntry[] {
  const out: OutboxEntry[] = [];
  try {
    const raw = JSON.parse(localStorage.getItem(getTenantStorageKey("edu_wa_outbox")) || "[]");
    for (const e of raw) out.push({ ...e, origin: "reporte" as const });
  } catch {}
  try {
    const raw = JSON.parse(localStorage.getItem(getTenantStorageKey("edu_outbox")) || "[]");
    for (const e of raw) {
      out.push({
        id: String(e.id),
        at: e.sentAt || e.at || new Date().toISOString(),
        lesson: String(e.studentName || ""),
        recipients: [{ label: "Alumno", phone: String(e.toPhone || "") }],
        body: String(e.body || ""),
        status: String(e.status || "QUEUED"),
        origin: "clase" as const,
      });
    }
  } catch {}
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}

export default function SendLogPanel() {
  const [entries, setEntries] = useState<OutboxEntry[]>([]);

  const load = useCallback(() => {
    const all = loadEntries();
    const seen = new Set<string>();
    setEntries(all.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true))));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("palmera_wa_outbox_updated", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("palmera_wa_outbox_updated", load);
      window.removeEventListener("storage", load);
    };
  }, [load]);

  const clearAll = () => {
    if (!confirm("¿Borrar todo el registro de envíos de este dispositivo?")) return;
    localStorage.removeItem(getTenantStorageKey("edu_wa_outbox"));
    localStorage.removeItem(getTenantStorageKey("edu_outbox"));
    window.dispatchEvent(new Event("palmera_wa_outbox_updated"));
    setEntries([]);
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <Icons.MessageSquareText className="h-4 w-4 text-emerald-600" />
          Registro de envíos WhatsApp ({entries.length})
        </div>
        {entries.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-xl border border-border/40 px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:bg-muted transition"
          >
            <Icons.Trash2 className="h-3.5 w-3.5" /> Vaciar
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Historial local (en este navegador) de los reportes abiertos por WhatsApp: quién, cuándo y qué texto.
      </p>
      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Aún no hay envíos registrados desde este dispositivo.
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-auto">
          {entries.map((e) => (
            <div key={e.id} className="rounded-xl border border-border/40 bg-background p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold flex items-center gap-2">
                  <Icons.CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {e.lesson}
                  {e.instrument && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{e.instrument}</span>}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      e.status === "SENT"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                        : "border-sky-500/30 bg-sky-500/10 text-sky-700"
                    }`}
                  >
                    {e.status === "SENT" ? "Enviado (Cloud API)" : e.origin === "reporte" ? "Abierto en WhatsApp" : "Pendiente (wa.me)"}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">{fmt(e.at)}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                👤 {e.recipients.map((r) => `${r.label} (${r.phone})`).join(" · ")}
              </div>
              <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-2 text-[11px] font-sans leading-relaxed">{e.body}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
