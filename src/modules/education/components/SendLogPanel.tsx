"use client";
import React, { useCallback, useEffect, useState } from "react";
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
  origin?: string;
  sender?: { id: string; name: string };
};

type Teacher = { id: string; name: string; email: string };

type LegacyEntry = {
  id?: string;
  at?: string;
  sentAt?: string;
  lesson?: string;
  studentName?: string;
  instrument?: string;
  recipients?: { label?: string; phone?: string }[];
  toPhone?: string;
  body?: string;
  status?: string;
  link?: string;
  batchToken?: string;
};

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function postLegacy(payload: unknown): Promise<boolean> {
  try {
    const res = await fetch("/api/education/outbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Migración única: sube al servidor los registros que la versión anterior
 * guardaba en este navegador y los borra de localStorage.
 */
let legacyMigrationStarted = false;
async function migrateLegacyOutbox(): Promise<number> {
  if (typeof window === "undefined" || legacyMigrationStarted) return 0;
  legacyMigrationStarted = true;
  let migrated = 0;

  const reportKey = getTenantStorageKey("edu_wa_outbox");
  try {
    const raw = localStorage.getItem(reportKey);
    if (raw) {
      const arr = JSON.parse(raw) as LegacyEntry[];
      const valid = (Array.isArray(arr) ? arr : []).filter(
        (e) => e && typeof e.body === "string" && e.body.trim() && Array.isArray(e.recipients) && e.recipients.some((r) => r && r.phone)
      );
      if (valid.length === 0) {
        localStorage.removeItem(reportKey);
      } else {
        const results = await Promise.all(
          valid.map((e) =>
            postLegacy({
              lesson: e.lesson,
              instrument: e.instrument,
              body: e.body,
              origin: "reporte",
              channel: "WHATSAPP_ME",
              status: e.status === "SENT" ? "SENT" : "OPENED",
              sentAt: e.at,
              batchToken: e.id,
              recipients: (e.recipients || []).map((r) => ({ label: r.label, phone: r.phone })),
            })
          )
        );
        if (results.every(Boolean)) {
          localStorage.removeItem(reportKey);
          migrated += valid.length;
        }
      }
    }
  } catch {}

  const claseKey = getTenantStorageKey("edu_outbox");
  try {
    const raw = localStorage.getItem(claseKey);
    if (raw) {
      const arr = JSON.parse(raw) as LegacyEntry[];
      const valid = (Array.isArray(arr) ? arr : []).filter((e) => e && typeof e.body === "string" && e.body.trim() && e.toPhone);
      if (valid.length === 0) {
        localStorage.removeItem(claseKey);
      } else {
        const results = await Promise.all(
          valid.map((e) =>
            postLegacy({
              lesson: e.studentName,
              instrument: e.instrument,
              body: e.body,
              origin: "clase",
              channel: e.status === "SENT" ? "WHATSAPP_CLOUD" : "WHATSAPP_ME",
              status: e.status === "SENT" ? "SENT" : "OPENED",
              link: e.link,
              sentAt: e.sentAt || e.at,
              batchToken: e.batchToken || e.id,
              recipients: [{ label: "Alumno", phone: e.toPhone }],
            })
          )
        );
        if (results.every(Boolean)) {
          localStorage.removeItem(claseKey);
          migrated += valid.length;
        }
      }
    }
  } catch {}

  return migrated;
}

export default function SendLogPanel() {
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await migrateLegacyOutbox();
      const qs = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : "";
      const res = await fetch(`/api/education/outbox${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "No se pudo cargar el registro");
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setIsAdmin(!!data.isAdmin);
      setTeachers(Array.isArray(data.teachers) ? data.teachers : []);
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    const refresh = () => load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("palmera_outbox_updated", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("palmera_outbox_updated", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const clearAll = async () => {
    const scope = teacherId ? "los envíos del profesor seleccionado" : isAdmin ? "TODOS los envíos del centro" : "tus envíos";
    if (!confirm(`¿Borrar ${scope} del servidor? Esta acción no se puede deshacer.`)) return;
    try {
      const qs = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : "";
      const res = await fetch(`/api/education/outbox${qs}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "No se pudo vaciar");
      await load();
    } catch (e: unknown) {
      setError(errorMessage(e));
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const statusLabel = (e: OutboxEntry) => {
    if (e.status === "SENT" || e.status === "DELIVERED" || e.status === "READ") return { label: "Enviado (Cloud API)", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" };
    if (e.status === "FAILED") return { label: "Fallido", cls: "border-red-500/30 bg-red-500/10 text-red-700" };
    if (e.origin === "reporte") return { label: "Abierto en WhatsApp", cls: "border-sky-500/30 bg-sky-500/10 text-sky-700" };
    return { label: "Pendiente (wa.me)", cls: "border-sky-500/30 bg-sky-500/10 text-sky-700" };
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <Icons.MessageSquareText className="h-4 w-4 text-emerald-600" />
          Registro de envíos WhatsApp ({entries.length})
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="rounded-xl border border-border/40 bg-background px-2.5 py-1.5 text-[11px] font-bold"
              aria-label="Filtrar por profesor"
            >
              <option value="">Todos los profesores</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          {entries.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 rounded-xl border border-border/40 px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:bg-muted transition"
            >
              <Icons.Trash2 className="h-3.5 w-3.5" /> Vaciar
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Historial guardado en el servidor y compartido entre dispositivos: quién, cuándo y qué texto.
        {isAdmin ? " Como administrador ves los envíos de todo el centro y puedes filtrar por profesor." : " Ves tus propios envíos."}
      </p>
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {loading ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Cargando registro…
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Aún no hay envíos registrados.
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-auto">
          {entries.map((e) => {
            const st = statusLabel(e);
            return (
              <div key={e.id} className="rounded-xl border border-border/40 bg-background p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
                    <Icons.CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {e.lesson}
                    {e.instrument && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{e.instrument}</span>}
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{fmt(e.at)}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  👤 {e.recipients.map((r) => `${r.label} (${r.phone})`).join(" · ")}
                  {e.sender?.name ? <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{e.sender.name}</span> : null}
                </div>
                <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-2 text-[11px] font-sans leading-relaxed">{e.body}</pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
