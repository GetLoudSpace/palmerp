"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { UserProfile, PsychologicalProfile, Task, TaskPriority } from "@/types/core";

const priorityConfig: Record<TaskPriority, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", label: "Crítica" },
  high: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", label: "Alta" },
  medium: { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", label: "Media" },
  low: { color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/30", label: "Baja" },
};

export default function ProjectTasksPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [psychProfile, setPsychProfile] = useState<PsychologicalProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reflections, setReflections] = useState<any[]>([]);
  const [validationHistory, setValidationHistory] = useState<any[]>([]);
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"tasks" | "profile" | "wellbeing" | "insights">("tasks");
  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    const p = localStorage.getItem("palmera_user_profile");
    if (p) setProfile(JSON.parse(p));

    const pp = localStorage.getItem("palmera_psychological_profile");
    if (pp) setPsychProfile(JSON.parse(pp));

    const t = localStorage.getItem("palmera_daily_tasks");
    if (t) setTasks(JSON.parse(t));

    const r = localStorage.getItem("palmera_reflections");
    if (r) setReflections(JSON.parse(r));

    const vh = localStorage.getItem("palmera_validation_history");
    if (vh) {
      const history = JSON.parse(vh);
      setValidationHistory(history);
      const approved = history.filter((h: any) => h.action === "approved").length;
      const adjusted = history.filter((h: any) => h.action === "adjusted").length;
      const total = approved + adjusted + history.filter((h: any) => h.action === "rejected").length;
      if (total > 0) {
        setAccuracyScore(Math.round(((approved + adjusted * 0.5) / total) * 100));
      }
    }
  }, []);

  const avgMood = reflections.length > 0
    ? Math.round(reflections.reduce((sum, r) => sum + (r.mood || 5), 0) / reflections.length)
    : null;

  const avgEnergy = reflections.length > 0
    ? Math.round(reflections.reduce((sum, r) => sum + (r.energy || 5), 0) / reflections.length)
    : null;

  const recentReflections = reflections.slice(-7);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          psychProfile,
          reflections,
          validationHistory,
          tasks,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights);
      }
    } catch (e) {
      console.error("Failed to fetch insights:", e);
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] text-neutral-200" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/5 bg-[#0c0a09]/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-red-600 to-red-500 shadow-md shadow-red-500/20">
            <Icons.User className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">
              Mi <span className="text-red-500">Desarrollo</span>
            </h1>
            <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-semibold">
              {profile?.name || "Usuario"} · {profile?.role || ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-[11px] font-bold text-neutral-300 transition-all hover:bg-white/10"
          >
            <Icons.ArrowLeft className="h-4 w-4 text-red-500" />
            <span>Daily Scrum</span>
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Dailies</span>
              <Icons.MessageSquare className="h-4 w-4 text-red-500/60" />
            </div>
            <span className="text-2xl font-bold text-white">{profile?.dailyScrumCount || 0}</span>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Precisión IA</span>
              <Icons.Target className="h-4 w-4 text-red-500/60" />
            </div>
            <span className="text-2xl font-bold text-white">{accuracyScore !== null ? `${accuracyScore}%` : "—"}</span>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Ánimo medio</span>
              <Icons.Smile className="h-4 w-4 text-red-500/60" />
            </div>
            <span className="text-2xl font-bold text-white">{avgMood !== null ? `${avgMood}/10` : "—"}</span>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Energía media</span>
              <Icons.Zap className="h-4 w-4 text-red-500/60" />
            </div>
            <span className="text-2xl font-bold text-white">{avgEnergy !== null ? `${avgEnergy}/10` : "—"}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.02] rounded-lg p-1 border border-white/5 w-fit">
          {[
            { id: "tasks" as const, label: "Tareas", icon: Icons.ListTodo },
            { id: "profile" as const, label: "Mi Perfil", icon: Icons.User },
            { id: "wellbeing" as const, label: "Bienestar", icon: Icons.Heart },
            { id: "insights" as const, label: "Insights IA", icon: Icons.Lightbulb },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-red-500 text-white"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "tasks" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {tasks.length === 0 ? (
              <div className="text-center py-16">
                <Icons.ListTodo className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-neutral-400">Sin tareas aún</h3>
                <p className="text-xs text-neutral-500 mt-1">Haz tu Daily Scrum para generar tareas</p>
              </div>
            ) : (
              tasks.map((task) => {
                const pConfig = priorityConfig[task.priority];
                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${pConfig.bg} ${pConfig.border} border`}>
                      <div className={`h-2.5 w-2.5 rounded-full ${pConfig.color.replace("text", "bg")}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{task.title}</h4>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${pConfig.bg} ${pConfig.color} border ${pConfig.border}`}>
                          {pConfig.label}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-neutral-400 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {task.module && (
                          <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                            <Icons.Folder className="h-3 w-3" />
                            {task.module}
                          </span>
                        )}
                        {task.estimatedTime && (
                          <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                            <Icons.Clock className="h-3 w-3" />
                            {task.estimatedTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "profile" && psychProfile && (
          <div className="grid gap-6 md:grid-cols-2 animate-in fade-in duration-200">
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                <Icons.Briefcase className="h-4 w-4" />
                Estilo de Trabajo
              </h3>
              <div className="flex flex-wrap gap-2">
                {psychProfile.workStyle.map((ws) => (
                  <span key={ws} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                    {ws}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                <Icons.Zap className="h-4 w-4" />
                Patrón de Energía
              </h3>
              <span className="text-sm text-neutral-200">{psychProfile.energyPattern}</span>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                <Icons.Heart className="h-4 w-4" />
                Motivadores
              </h3>
              <div className="flex flex-wrap gap-2">
                {psychProfile.motivationDrivers.map((m) => (
                  <span key={m} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                <Icons.BookOpen className="h-4 w-4" />
                Estilo de Aprendizaje
              </h3>
              <span className="text-sm text-neutral-200">{psychProfile.learningStyle}</span>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                <Icons.Star className="h-4 w-4" />
                Fortalezas
              </h3>
              <div className="space-y-1.5">
                {psychProfile.strengths.map((s, i) => (
                  <p key={i} className="text-xs text-neutral-300 flex items-center gap-2">
                    <Icons.Check className="h-3 w-3 text-emerald-500" />
                    {s}
                  </p>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                <Icons.TrendingUp className="h-4 w-4" />
                Áreas de Crecimiento
              </h3>
              <div className="space-y-1.5">
                {psychProfile.growthAreas.map((g, i) => (
                  <p key={i} className="text-xs text-neutral-300 flex items-center gap-2">
                    <Icons.ArrowUpRight className="h-3 w-3 text-red-500" />
                    {g}
                  </p>
                ))}
              </div>
            </div>

            {psychProfile.notes && (
              <div className="md:col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                  <Icons.Eye className="h-4 w-4" />
                  Tu Visión
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed">{psychProfile.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "wellbeing" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {recentReflections.length === 0 ? (
              <div className="text-center py-16">
                <Icons.Heart className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-neutral-400">Sin registros aún</h3>
                <p className="text-xs text-neutral-500 mt-1">Tu bienestar se registrará con cada Daily Scrum</p>
              </div>
            ) : (
              <>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest">
                    Últimos 7 registros
                  </h3>
                  <div className="space-y-3">
                    {recentReflections.map((r, i) => (
                      <div key={i} className="flex items-center gap-4 text-xs">
                        <span className="text-neutral-500 w-24">
                          {new Date(r.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                        </span>
                        <div className="flex-1 flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Icons.Smile className="h-3.5 w-3.5 text-red-500/60" />
                            <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full bg-red-500" style={{ width: `${(r.mood || 5) * 10}%` }} />
                            </div>
                            <span className="text-neutral-400 w-8">{r.mood || 5}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Icons.Zap className="h-3.5 w-3.5 text-emerald-500/60" />
                            <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(r.energy || 5) * 10}%` }} />
                            </div>
                            <span className="text-neutral-400 w-8">{r.energy || 5}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {recentReflections.some((r) => r.note) && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
                    <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest">
                      Notas de bienestar
                    </h3>
                    {recentReflections.filter((r) => r.note).map((r, i) => (
                      <div key={i} className="text-xs text-neutral-400 leading-relaxed border-l-2 border-red-500/30 pl-3">
                        <span className="text-neutral-600">{new Date(r.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
                        <p className="mt-1">{r.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "insights" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {!insights && !loadingInsights && (
              <div className="text-center py-16">
                <Icons.Lightbulb className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-neutral-400">Descubre tus patrones</h3>
                <p className="text-xs text-neutral-500 mt-1 mb-4">La IA analizará tu perfil, bienestar y validaciones para generar insights personalizados</p>
                <button
                  onClick={fetchInsights}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-400 transition-colors"
                >
                  <Icons.Sparkles className="h-4 w-4" />
                  Generar Insights
                </button>
              </div>
            )}

            {loadingInsights && (
              <div className="text-center py-16">
                <div className="h-10 w-10 mx-auto mb-3 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                <h3 className="text-sm font-medium text-neutral-400">Analizando tus datos...</h3>
                <p className="text-xs text-neutral-500 mt-1">La IA está buscando patrones en tu actividad</p>
              </div>
            )}

            {insights && (
              <>
                <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl p-5 space-y-3">
                  <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                    <Icons.Sparkles className="h-4 w-4" />
                    Resumen Ejecutivo
                  </h3>
                  <p className="text-sm text-neutral-200 leading-relaxed">{insights.summary}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
                    <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                      <Icons.TrendingUp className="h-4 w-4" />
                      Fortalezas Observadas
                    </h3>
                    <ul className="space-y-2">
                      {insights.strengths?.map((s: string, i: number) => (
                        <li key={i} className="text-xs text-neutral-300 flex items-start gap-2">
                          <Icons.CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
                    <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                      <Icons.Target className="h-4 w-4" />
                      Oportunidades
                    </h3>
                    <ul className="space-y-2">
                      {insights.opportunities?.map((o: string, i: number) => (
                        <li key={i} className="text-xs text-neutral-300 flex items-start gap-2">
                          <Icons.ArrowRight className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                      <Icons.Heart className="h-4 w-4" />
                      Bienestar
                    </h3>
                    <p className="text-xs text-neutral-300 leading-relaxed">{insights.wellbeingInsight}</p>
                    {insights.moodTrend && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-neutral-500">Tendencia ánimo:</span>
                        <span className={`text-[10px] font-bold ${
                          insights.moodTrend === "up" ? "text-emerald-500" :
                          insights.moodTrend === "down" ? "text-red-500" : "text-neutral-400"
                        }`}>
                          {insights.moodTrend === "up" ? "↑ Subiendo" : insights.moodTrend === "down" ? "↓ Bajando" : "→ Estable"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                      <Icons.Zap className="h-4 w-4" />
                      Productividad
                    </h3>
                    <p className="text-xs text-neutral-300 leading-relaxed">{insights.productivityInsight}</p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                      <Icons.BookOpen className="h-4 w-4" />
                      Crecimiento
                    </h3>
                    <p className="text-xs text-neutral-300 leading-relaxed">{insights.growthRecommendation}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-violet-500/10 to-red-500/10 border border-violet-500/20 rounded-xl p-5 space-y-3">
                  <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest flex items-center gap-2">
                    <Icons.Lightbulb className="h-4 w-4" />
                    Consejo para Hoy
                  </h3>
                  <p className="text-sm text-neutral-200 leading-relaxed font-medium">{insights.actionableTip}</p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={fetchInsights}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Icons.RefreshCw className="h-3.5 w-3.5" />
                    Regenerar
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
