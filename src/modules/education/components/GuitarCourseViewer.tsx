"use client";
import React, { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import {
  GUITAR_40,
  GUITAR_COURSE_META,
  GUITAR_GOALS,
  GUITAR_SKILLS,
  buildGuitarDailyBrief,
  getGuitarLessonForWeek,
  type GuitarLessonScript,
  type GuitarScriptLevel,
} from "../data/guitar-40";
import { getTenantStorageKey } from "@/lib/clientStorage";

const LEVELS: Array<{ key: GuitarScriptLevel | "TODAS"; label: string }> = [
  { key: "TODAS", label: "Todas" },
  { key: "PRINCIPIANTE", label: "Principiante" },
  { key: "MEDIO", label: "Medio" },
  { key: "AVANZADO", label: "Avanzado" },
];

const LEVEL_STYLE: Record<string, string> = {
  PRINCIPIANTE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  MEDIO: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25",
  AVANZADO: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25",
};

function levelBadge(level: GuitarScriptLevel): string {
  return LEVEL_STYLE[level] ?? "bg-muted text-muted-foreground";
}

function skillLabel(key: string): string {
  return GUITAR_SKILLS.find((s) => s.key === key)?.label ?? key;
}

export default function GuitarCourseViewer() {
  const [level, setLevel] = useState<GuitarScriptLevel | "TODAS">("TODAS");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [week, setWeek] = useState<number>(1);
  const [done, setDone] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [variant, setVariant] = useState<Record<string, "espanola" | "acustica" | "electrica">>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(getTenantStorageKey("edu_guitar_done"));
      if (raw) {
        const arr: unknown = JSON.parse(raw);
        if (Array.isArray(arr)) setDone(arr.filter((x): x is string => typeof x === "string"));
      }
    } catch { /* vacío */ }
  }, []);

  const persist = (next: string[]) => {
    setDone(next);
    try {
      localStorage.setItem(getTenantStorageKey("edu_guitar_done"), JSON.stringify(next));
    } catch { /* sin almacenamiento */ }
  };

  const toggleDone = (id: string) => {
    persist(done.includes(id) ? done.filter((d) => d !== id) : [...done, id]);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GUITAR_40.filter((c) => {
      if (level !== "TODAS" && c.level !== level) return false;
      if (!q) return true;
      return [c.id, c.title, c.objective, c.song, ...c.skillKeys].join(" ").toLowerCase().includes(q);
    });
  }, [level, query]);

  const progressBy = (lv: GuitarScriptLevel): { total: number; ok: number } => {
    const all = GUITAR_40.filter((c) => c.level === lv);
    return { total: all.length, ok: all.filter((c) => done.includes(c.id)).length };
  };

  const todayLesson: GuitarLessonScript = useMemo(() => getGuitarLessonForWeek(week), [week]);

  const copyBrief = async (lesson: GuitarLessonScript) => {
    const text = buildGuitarDailyBrief(lesson);
    try {
      await navigator.clipboard.writeText(text);
      setToast(`Guion ${lesson.id} copiado para WhatsApp`);
    } catch {
      setToast(`Guion ${lesson.id} listo para copiar manualmente`);
    }
    window.setTimeout(() => setToast(null), 2500);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background shadow-lg">
          {toast}
        </div>
      )}

      {/* Cabecera curso */}
      <div className="rounded-3xl border border-border/40 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-600">
              <Icons.Guitar className="h-4 w-4" /> Curso anual · Guitarra
            </div>
            <h1 className="mt-1 text-xl font-black">40 clases × 30′ — Principiante · Medio · Avanzado</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {GUITAR_COURSE_META.distribution} · {GUITAR_COURSE_META.totalContactMin / 60}h presenciales +{" "}
              {GUITAR_COURSE_META.suggestedHomeMinPerDay}′/día en casa · Todas las guitarras · Todas las edades
            </p>
          </div>
          <div className="flex gap-2">
            {(["PRINCIPIANTE", "MEDIO", "AVANZADO"] as GuitarScriptLevel[]).map((lv) => {
              const p = progressBy(lv);
              return (
                <div key={lv} className={`rounded-2xl border px-3 py-2 text-center text-[11px] font-bold ${levelBadge(lv)}`}>
                  <div>{lv.slice(0, 4)}.</div>
                  <div>
                    {p.ok}/{p.total}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Guion hoy */}
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black">Guion de hoy</span>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setWeek((w) => Math.max(1, w - 1))}
                className="rounded-lg border border-border/40 bg-background px-2 py-1 text-xs font-bold"
                aria-label="Semana anterior"
              >
                ←
              </button>
              <span className="rounded-lg bg-background px-2 py-1 font-mono text-xs font-bold">Semana {week}</span>
              <button
                onClick={() => setWeek((w) => Math.min(40, w + 1))}
                className="rounded-lg border border-border/40 bg-background px-2 py-1 text-xs font-bold"
                aria-label="Semana siguiente"
              >
                →
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${levelBadge(todayLesson.level)}`}>
              {todayLesson.id} · {todayLesson.level}
            </span>
            <span className="text-sm font-bold">{todayLesson.title}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{todayLesson.objective}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setOpenId(todayLesson.id);
                setLevel("TODAS");
                setQuery(todayLesson.id);
              }}
              className="rounded-xl bg-foreground px-3 py-2 text-xs font-bold text-background"
            >
              Abrir ficha completa
            </button>
            <button
              onClick={() => copyBrief(todayLesson)}
              className="rounded-xl border border-border/40 bg-background px-3 py-2 text-xs font-bold"
            >
              Copiar guion 60s
            </button>
          </div>
        </div>

        {/* Metas por nivel */}
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {GUITAR_GOALS.map((g) => (
            <div key={g.key} className="rounded-2xl border border-border/40 bg-background p-3">
              <div className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{g.scope.replace("TRIMESTER_", "Tri ")}</div>
              <div className="text-xs font-bold">{g.title}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Pasa si: {g.passCriteria}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {LEVELS.map((l) => (
          <button
            key={l.key}
            onClick={() => setLevel(l.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              level === l.key ? "bg-foreground text-background" : "bg-background hover:bg-muted"
            }`}
          >
            {l.label}
          </button>
        ))}
        <div className="relative ml-auto min-w-52 flex-1 md:max-w-72">
          <Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar: C07, cejilla, pentatónica, blues…"
            className="w-full rounded-xl border border-border/40 bg-background py-2.5 pl-9 pr-3 text-xs outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Lista ordenada */}
      <div className="space-y-2">
        {filtered.map((c) => {
          const open = openId === c.id;
          const isDone = done.includes(c.id);
          const v = variant[c.id] ?? "espanola";
          return (
            <div key={c.id} className={`rounded-2xl border bg-card transition ${open ? "border-red-500/40 shadow-md" : "border-border/40"}`}>
              <button
                onClick={() => setOpenId(open ? null : c.id)}
                className="flex w-full items-start gap-3 p-4 text-left"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted font-mono text-xs font-black">
                  {c.index}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-muted-foreground">{c.id}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${levelBadge(c.level)}`}>{c.level}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">Tri {c.trimester}</span>
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-700">Dif {c.difficulty}/5</span>
                    {isDone && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Hecha ✓</span>}
                  </span>
                  <span className="mt-1 block text-sm font-bold leading-snug">{c.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {c.song} · Skills: {c.skillKeys.map(skillLabel).join(", ")}
                  </span>
                </span>
                <Icons.ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
              </button>

              {open && (
                <div className="space-y-3 border-t border-border/30 p-4">
                  <div className="rounded-xl bg-muted/60 p-3 text-xs">
                    <span className="font-black">Objetivo: </span>
                    {c.objective}
                  </div>
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs">
                    <span className="font-black">Base científica: </span>
                    {c.science}
                  </div>

                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="rounded-xl border border-border/40 bg-background p-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Calentar 5′</div>
                      <p className="mt-1 text-xs leading-relaxed">{c.warmup5}</p>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-background p-3 md:col-span-1">
                      <div className="text-[11px] font-black uppercase tracking-wider text-red-600">Bloque 20′</div>
                      <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs leading-relaxed">
                        {c.main20.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-background p-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-violet-600">Cierre 5′</div>
                      <p className="mt-1 text-xs leading-relaxed">{c.close5}</p>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-xl border border-border/40 bg-background p-3 text-xs">
                      <span className="font-black">Casa {c.homeMinPerDay}′ × 5: </span>
                      {c.homePractice}
                    </div>
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs">
                      <span className="font-black">Pasa si: </span>
                      {c.passCriteria}
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-xl bg-muted/60 p-3 text-xs">
                      <span className="font-black">Niños: </span>
                      {c.kidAdapt}
                    </div>
                    <div className="rounded-xl bg-muted/60 p-3 text-xs">
                      <span className="font-black">Adultos: </span>
                      {c.adultAdapt}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-background p-3">
                    <div className="flex gap-1">
                      {(["espanola", "acustica", "electrica"] as const).map((k) => (
                        <button
                          key={k}
                          onClick={() => setVariant((prev) => ({ ...prev, [c.id]: k }))}
                          className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize ${v === k ? "bg-foreground text-background" : "bg-muted"}`}
                        >
                          {k === "espanola" ? "Española" : k === "acustica" ? "Acústica" : "Eléctrica"}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed">{c.guitarVariants[v]}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="font-bold text-muted-foreground">Canción:</span>
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-bold text-red-700">{c.song}</span>
                    <span className="ml-2 font-bold text-muted-foreground">Repaso:</span>
                    {c.reviewFrom.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      c.reviewFrom.map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setQuery(r);
                            setLevel("TODAS");
                          }}
                          className="rounded-full border border-border/40 px-2 py-0.5 font-mono font-bold hover:bg-muted"
                        >
                          {r}
                        </button>
                      ))
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-border/30 pt-3">
                    <button
                      onClick={() => toggleDone(c.id)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold ${isDone ? "bg-emerald-500 text-white" : "bg-foreground text-background"}`}
                    >
                      {isDone ? "Hecha ✓ (desmarcar)" : "Marcar hecha"}
                    </button>
                    <button
                      onClick={() => copyBrief(c)}
                      className="rounded-xl border border-border/40 bg-background px-3 py-2 text-xs font-bold"
                    >
                      Copiar guion 60s
                    </button>
                    <button
                      onClick={() => showToast(`Propuesta casa: ${c.homeMinPerDay}′ — ver Biblioteca`)}
                      className="rounded-xl border border-border/40 bg-background px-3 py-2 text-xs font-bold"
                    >
                      Ver en Biblioteca →
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Sin resultados. Prueba con “cejilla”, “C07” o “blues”.
          </div>
        )}
      </div>
    </div>
  );
}
