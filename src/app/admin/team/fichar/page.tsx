// src/app/admin/team/fichar/page.tsx
// Feature #13: terminal de fichaje SIMPLE para móvil. Pensada para abrirse
// directa y añadirse al escritorio (Compartir → Añadir a pantalla de inicio).
// PIN pad → registra ENTRADA/SALIDA (auto-toggle) del dueño del PIN + lista de hoy.
"use client";

import React, { useCallback, useEffect, useState } from "react";
import * as Icons from "lucide-react";

interface TodayEntry {
  id: string;
  userName: string;
  kind: string;
  at: string;
}

export default function FicharPage() {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{ kind: string; userName: string; at: string } | null>(null);
  const [today, setToday] = useState<TodayEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadToday = useCallback(async () => {
    try {
      const res = await fetch("/api/team/clock");
      if (!res.ok) return;
      const data = await res.json();
      setToday(data.today || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  const press = (d: string) => {
    setError(null);
    setPin((p) => (p.length >= 8 ? p : p + d));
  };

  const submit = async () => {
    if (!/^\d{4,8}$/.test(pin)) {
      setError("PIN de 4-8 dígitos");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/team/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo fichar");
      setLast({ kind: data.kind, userName: data.userName, at: data.at });
      setPin("");
      await loadToday();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo fichar");
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 py-6">
      <div className="text-center">
        <h1 className="text-xl font-black tracking-tight">Fichar</h1>
        <p className="text-xs text-muted-foreground">Marca tu PIN y registra tu entrada o salida</p>
      </div>

      {last && (
        <div
          className={`rounded-2xl border p-5 text-center ${
            last.kind === "IN"
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-sky-500/40 bg-sky-500/10"
          }`}
        >
          <div className={`text-2xl font-black ${last.kind === "IN" ? "text-emerald-600" : "text-sky-600"}`}>
            {last.kind === "IN" ? "✓ ENTRADA" : "→ SALIDA"}
          </div>
          <div className="mt-1 text-sm font-bold">{last.userName}</div>
          <div className="text-xs text-muted-foreground">{fmtTime(last.at)}</div>
        </div>
      )}

      <div className="rounded-2xl border border-border/40 bg-card p-5">
        <div className="mb-4 flex h-14 items-center justify-center rounded-xl bg-muted/50 font-mono text-3xl font-bold tracking-[0.5em]">
          {"•".repeat(pin.length) || <span className="text-sm font-sans font-medium tracking-normal text-muted-foreground">Tu PIN</span>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              className="h-14 rounded-xl border border-border/40 bg-background text-xl font-bold hover:bg-muted active:scale-95 transition"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="h-14 rounded-xl border border-border/40 bg-background text-muted-foreground hover:bg-muted active:scale-95 transition"
            title="Borrar"
          >
            <Icons.Delete className="h-5 w-5 mx-auto" />
          </button>
          <button
            onClick={() => press("0")}
            className="h-14 rounded-xl border border-border/40 bg-background text-xl font-bold hover:bg-muted active:scale-95 transition"
          >
            0
          </button>
          <button
            onClick={() => setPin("")}
            className="h-14 rounded-xl border border-border/40 bg-background text-xs font-bold text-muted-foreground hover:bg-muted active:scale-95 transition"
            title="Limpiar"
          >
            C
          </button>
        </div>
        {error && <p className="mt-3 text-center text-xs font-bold text-destructive">{error}</p>}
        <button
          onClick={submit}
          disabled={busy || pin.length < 4}
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-lg font-black text-background disabled:opacity-40 active:scale-[0.98] transition"
        >
          {busy ? <Icons.Loader2 className="h-5 w-5 animate-spin" /> : <Icons.Fingerprint className="h-5 w-5" />}
          <span>{busy ? "Fichando..." : "FICHAR"}</span>
        </button>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card p-4">
        <h2 className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">Hoy en el equipo</h2>
        {loading ? (
          <p className="text-xs text-muted-foreground">Cargando...</p>
        ) : today.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aún no hay fichajes hoy.</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {today.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-xs">
                <span className="font-bold">{t.userName}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      t.kind === "IN" ? "bg-emerald-500/15 text-emerald-700" : "bg-sky-500/15 text-sky-700"
                    }`}
                  >
                    {t.kind === "IN" ? "ENTRADA" : "SALIDA"}
                  </span>
                  {fmtTime(t.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-border/60 p-4 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-bold text-foreground">Acceso directo:</span> en el móvil, abre el menú Compartir
        (iPhone) o ⋮ (Android) → <span className="font-bold text-foreground">Añadir a pantalla de inicio</span>.
        Así fichas con un toque, sin navegar por menús.
      </div>
    </div>
  );
}
