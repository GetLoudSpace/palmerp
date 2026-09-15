"use client";

import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";

type Check = {
  success: boolean;
  local: { version: string; commitShort: string | null; branch: string | null; dirty: boolean };
  upstream: { repo: string; branch: string; commitShort: string | null; version: string | null } | null;
  updateAvailable: boolean;
  behindByCommits: number | null;
  reason: string;
  lastBackup: { at: string | null; ageHours: number | null };
  lastUpdate: { at: string | null; details: string | null };
};

export default function UpdatesPage() {
  const [data, setData] = useState<Check | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/updates", { cache: "no-store" });
      const j = (await res.json()) as Check;
      if (!j.success) throw new Error((j as unknown as { error: string }).error);
      setData(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopyOk(id); setTimeout(() => setCopyOk(null), 1500); } catch {}
  };

  const cmdsVercel = `git fetch upstream
git merge upstream/main --no-edit --no-ff
npm ci --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
npm run build
git push origin main`;

  const cmdMini = `node scripts/fleet-update.mjs --apply`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-4">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl flex items-center gap-2">
            <Icons.RefreshCw className="h-6 w-6 text-amber-600" />
            Actualizaciones Fleet
          </div>
          <div className="text-xs text-muted-foreground mt-1">Actualiza tu ERP como lo hace PalmerP — 1 click, con backup previo y verificación.</div>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/50 bg-card px-4 text-xs font-bold hover:bg-muted disabled:opacity-50">
          <Icons.RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Comprobar
        </button>
      </div>

      {loading && <div className="rounded-2xl border border-border/30 bg-card p-6 text-sm text-muted-foreground">Comprobando upstream...</div>}
      {err && <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-700">{err}</div>}

      {data && (
        <>
          {/* Semáforo */}
          <div className={`rounded-2xl border p-5 ${data.updateAvailable ? "border-amber-500/25 bg-amber-500/10" : "border-emerald-500/25 bg-emerald-500/10"}`}>
            <div className="flex items-start gap-3">
              <div className={`rounded-xl p-2 ${data.updateAvailable ? "bg-amber-500/20 text-amber-700" : "bg-emerald-500/20 text-emerald-700"}`}>
                {data.updateAvailable ? <Icons.ArrowUpCircle className="h-6 w-6" /> : <Icons.CheckCircle2 className="h-6 w-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-foreground">{data.updateAvailable ? "Actualización disponible" : "Al día"}</div>
                <div className="text-xs text-muted-foreground mt-1">{data.reason}</div>
                {data.behindByCommits !== null && data.behindByCommits > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-200">
                    <Icons.GitCommit className="h-3.5 w-3.5" /> {data.behindByCommits} commit(s) por detrás
                  </div>
                )}
              </div>
              <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${data.updateAvailable ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"}`}>
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" /> {data.updateAvailable ? "ACCIÓN" : "VERDE"}
              </span>
            </div>
          </div>

          {/* Versiones */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/40 bg-card p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-amber-600">Tu instancia (local)</div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Versión</span><span className="font-mono font-bold">v{data.local.version}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Commit</span><span className="font-mono">{data.local.commitShort || "—"} {data.local.dirty ? "(dirty)" : ""}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span className="font-mono">{data.local.branch || "—"}</span></div>
              </div>
            </div>
            <div className="rounded-2xl border border-border/40 bg-card p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-blue-600">Repo base (upstream)</div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Repo</span><span className="font-mono">{data.upstream?.repo || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span className="font-mono">{data.upstream?.branch || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Commit</span><span className="font-mono">{data.upstream?.commitShort || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Versión</span><span className="font-mono">{data.upstream?.version ? `v${data.upstream.version}` : "—"}</span></div>
              </div>
            </div>
          </div>

          {/* Backup warning */}
          <div className={`rounded-2xl border p-4 text-xs ${data.lastBackup.ageHours !== null && data.lastBackup.ageHours > 48 ? "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200" : "border-border/40 bg-muted/20 text-muted-foreground"}`}>
            <div className="font-bold flex items-center gap-2"><Icons.Shield className="h-4 w-4" /> Backup previo: {data.lastBackup.at ? `${new Date(data.lastBackup.at).toLocaleString()} — hace ${data.lastBackup.ageHours}h` : "sin registro"}</div>
            <div className="mt-1">Recomendado: backup &lt;24h antes de actualizar. El script hace backup automático, pero verifica semáforo verde en <code>/api/fleet/backup-heartbeat</code>.</div>
          </div>

          {data.lastUpdate.at && (
            <div className="rounded-xl border border-border/30 bg-card p-3 text-xs text-muted-foreground">Último update registrado: {new Date(data.lastUpdate.at).toLocaleString()} — {data.lastUpdate.details}</div>
          )}

          {/* 1-click */}
          <div className="rounded-2xl border border-border/40 bg-card p-6">
            <div className="text-sm font-black text-foreground flex items-center gap-2"><Icons.Zap className="h-4 w-4 text-amber-600" /> Actualizar ahora</div>
            <p className="text-xs text-muted-foreground mt-1">Elige tu hosting. Ambos hacen lo mismo: backup → merge upstream → deps → migrate → build → deploy.</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {/* Vercel */}
              <div className="rounded-xl border border-border/30 bg-background p-4">
                <div className="text-xs font-bold text-foreground flex items-center gap-2"><Icons.Cloud className="h-4 w-4" /> Vercel (GitHub)</div>
                <div className="text-[11px] text-muted-foreground mt-1">En tu portátil, dentro del repo del cliente:</div>
                <div className="mt-3 relative rounded-lg bg-zinc-950 p-3 pr-10 font-mono text-[11px] leading-4 text-zinc-100 overflow-auto">
                  <pre className="whitespace-pre-wrap break-words">{cmdsVercel}</pre>
                  <button onClick={() => copy(cmdsVercel, "vercel")} className="absolute right-2 top-2 rounded-md bg-zinc-800 p-1.5 hover:bg-zinc-700">
                    {copyOk === "vercel" ? <Icons.Check className="h-3.5 w-3.5 text-emerald-400" /> : <Icons.Copy className="h-3.5 w-3.5 text-zinc-300" />}
                  </button>
                </div>
                <div className="text-[11px] text-muted-foreground mt-2">Hace <code>git push origin main</code> → Vercel despliega solo (1-2 min). Verifica en Vercel → Deployments.</div>
              </div>

              {/* MiniPC */}
              <div className="rounded-xl border border-border/30 bg-background p-4">
                <div className="text-xs font-bold text-foreground flex items-center gap-2"><Icons.Server className="h-4 w-4" /> MiniPC (on-premise)</div>
                <div className="text-[11px] text-muted-foreground mt-1">En el MiniPC, en <code>/opt/palmerp</code>:</div>
                <div className="mt-3 relative rounded-lg bg-zinc-950 p-3 pr-10 font-mono text-[11px] leading-4 text-zinc-100">
                  <pre>{cmdMini}</pre>
                  <button onClick={() => copy(cmdMini, "mini")} className="absolute right-2 top-2 rounded-md bg-zinc-800 p-1.5 hover:bg-zinc-700">
                    {copyOk === "mini" ? <Icons.Check className="h-3.5 w-3.5 text-emerald-400" /> : <Icons.Copy className="h-3.5 w-3.5 text-zinc-300" />}
                  </button>
                </div>
                <div className="text-[11px] text-muted-foreground mt-2">Script <code>scripts/fleet-update.mjs --apply</code> hace todo + <code>pm2 restart</code> si existe. Usa <code>--dry-run</code> para simular.</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a href="https://github.com/Palm-ERP/palmerp/commits/main" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border/40 bg-card px-3 py-2 text-xs font-bold hover:bg-muted">
                <Icons.GitBranch className="h-4 w-4" /> Ver cambios upstream
              </a>
              <button onClick={load} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700">
                <Icons.RefreshCw className="h-4 w-4" /> Volver a comprobar
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs leading-5 text-amber-900 dark:text-amber-100">
              <strong>Seguridad:</strong> el script hace <code>npx tsc</code> + <code>npm run build</code> antes de push. Si falla, no despliega. Si hay conflictos <code>git merge --abort</code> y resuelve manual. Siempre hay backup previo en <code>/data/backups/palmerp</code> + vault 90d.
            </div>
          </div>

          {/* Help */}
          <div className="rounded-2xl border border-border/40 bg-muted/10 p-5 text-xs leading-6 text-muted-foreground">
            <div className="font-bold text-foreground">¿Qué actualiza exactamente?</div>
            Todo lo que tú actualizas: <code>src/lib/</code>, <code>src/modules/</code>, <code>prisma/schema.prisma</code> (migrations), <code>src/app/</code>, estilos y el propio sistema de backup. Los datos del cliente (Tenant, Users, Contacts, pedidos) no se tocan. Las migrations son <code>npx prisma migrate deploy</code> (no destructivas).
            <div className="mt-2">Upstream configurable vía <code>PALMERP_UPSTREAM_REPO=Palm-ERP/palmerp</code> y <code>PALMERP_UPSTREAM_BRANCH=main</code> en <code>.env</code>. Para repos privados, añade <code>GITHUB_TOKEN</code>.</div>
          </div>
        </>
      )}
    </div>
  );
}
