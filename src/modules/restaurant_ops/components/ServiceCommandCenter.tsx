"use client";

import { useMemo, useState } from "react";
import * as Icons from "lucide-react";

type ServicePhase = "preparation" | "service" | "closing";
type Priority = "Crítica" | "Alta" | "Media";

interface Task {
  id: number;
  title: string;
  detail: string;
  owner: string;
  priority: Priority;
  done: boolean;
}

interface AlertItem {
  id: number;
  title: string;
  detail: string;
  action: string;
  priority: Priority;
  resolved: boolean;
}

interface Incident {
  id: number;
  title: string;
  detail: string;
  area: string;
  time: string;
  status: "Abierta" | "En curso" | "Resuelta";
}

const initialTasks: Task[] = [
  { id: 1, title: "Confirmar sustitución en barra", detail: "Falta 1 persona para el pico de 21:00", owner: "Dirección", priority: "Crítica", done: false },
  { id: 2, title: "Preparar salsa de la casa", detail: "18 raciones previstas para el servicio", owner: "Cocina", priority: "Alta", done: false },
  { id: 3, title: "Revisar cámara de postres", detail: "Última lectura registrada hace 2 h", owner: "Cocina", priority: "Media", done: false },
  { id: 4, title: "Briefing de equipo", detail: "Repasar grupo de 14 y alergias confirmadas", owner: "Encargada", priority: "Alta", done: true },
];

const initialAlerts: AlertItem[] = [
  { id: 1, title: "Capacidad de cocina al límite", detail: "La previsión supera el ritmo seguro entre 21:00 y 21:30.", action: "Activar menú reducido", priority: "Crítica", resolved: false },
  { id: 2, title: "Mesa 12 lleva 14 min esperando", detail: "La comanda está retenida en pase por un segundo plato.", action: "Avisar a sala y pase", priority: "Alta", resolved: false },
  { id: 3, title: "Stock bajo de tónica premium", detail: "Quedan 8 unidades y el ritmo actual agotaría el producto.", action: "Proponer sustitución", priority: "Media", resolved: false },
];

const initialIncidents: Incident[] = [
  { id: 1, title: "Comanda incompleta", detail: "Mesa 12 espera el segundo plato", area: "Pase", time: "21:14", status: "En curso" },
  { id: 2, title: "Copa rota en terraza", detail: "Sin cliente afectado. Retirada y limpieza completadas.", area: "Terraza", time: "20:42", status: "Resuelta" },
];

const phaseLabels: Record<ServicePhase, { label: string; description: string }> = {
  preparation: { label: "Preparación", description: "Deja el turno listo antes de abrir" },
  service: { label: "Servicio", description: "Prioriza lo que necesita decisión ahora" },
  closing: { label: "Cierre", description: "Concilia, aprende y deja el siguiente turno preparado" },
};

function priorityClasses(priority: Priority): string {
  if (priority === "Crítica") return "bg-red-500/12 text-red-700 dark:text-red-300 border-red-500/20";
  if (priority === "Alta") return "bg-red-500/12 text-red-700 dark:text-red-300 border-red-500/20";
  return "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/20";
}

export default function ServiceCommandCenter() {
  const [phase, setPhase] = useState<ServicePhase>("preparation");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentDetail, setIncidentDetail] = useState("");
  const [saved, setSaved] = useState(false);

  const completedTasks = tasks.filter((task) => task.done).length;
  const openAlerts = alerts.filter((alert) => !alert.resolved).length;
  const openIncidents = incidents.filter((incident) => incident.status !== "Resuelta").length;
  const progress = Math.round((completedTasks / tasks.length) * 100);

  const phaseSummary = useMemo(() => {
    if (phase === "preparation") return { value: `${completedTasks}/${tasks.length}`, label: "tareas listas", tone: "text-red-600 dark:text-red-400" };
    if (phase === "service") return { value: `${openAlerts}`, label: "alertas activas", tone: "text-red-600 dark:text-red-400" };
    return { value: `${openIncidents}`, label: "pendientes de cierre", tone: "text-sky-600 dark:text-sky-400" };
  }, [completedTasks, openAlerts, openIncidents, phase, tasks.length]);

  function toggleTask(id: number) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  }

  function resolveAlert(id: number) {
    setAlerts((current) => current.map((alert) => alert.id === id ? { ...alert, resolved: true } : alert));
  }

  function saveIncident(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!incidentTitle.trim()) return;
    setIncidents((current) => [
      { id: Date.now(), title: incidentTitle.trim(), detail: incidentDetail.trim() || "Sin detalle añadido", area: "Dirección", time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }), status: "Abierta" },
      ...current,
    ]);
    setIncidentTitle("");
    setIncidentDetail("");
    setShowIncidentForm(false);
  }

  function saveShift() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2600);
  }

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-card/75 p-6 shadow-xl backdrop-blur-md md:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Centro de dirección · Hoy, 31 agosto
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Turno actual</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground md:text-5xl">Cena · 19:30–00:30</h1>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 lg:min-w-52">
            <div className="flex items-center justify-between gap-8 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><span>Estado del turno</span><Icons.Clock3 className="h-4 w-4 text-red-500" /></div>
            <div className="mt-1 text-xl font-black text-red-700 dark:text-red-300">Preparación</div>
            <div className="mt-1 text-xs text-muted-foreground">Actualizado hace 2 min</div>
          </div>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-2xl border border-border/50 bg-card/60 p-2 shadow-sm">
        {(Object.keys(phaseLabels) as ServicePhase[]).map((item) => {
          const active = phase === item;
          return <button key={item} onClick={() => setPhase(item)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${active ? "bg-foreground text-background shadow-lg" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><span className={`h-2 w-2 rounded-full ${active ? "bg-red-400" : "bg-muted-foreground/40"}`} />{phaseLabels[item].label}</button>;
        })}
      </nav>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Ventas previstas", value: "4.850 €", note: "+8% vs. sábado anterior", icon: Icons.TrendingUp, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Cubiertos previstos", value: "118", note: "14 reservas pendientes", icon: Icons.Users, color: "text-sky-600 dark:text-sky-400" },
          { label: "Equipo confirmado", value: "11 / 12", note: "Falta responsable de barra", icon: Icons.UserCheck, color: "text-red-600 dark:text-red-400" },
          { label: phaseSummary.label, value: phaseSummary.value, note: phaseLabels[phase].description, icon: phase === "service" ? Icons.Siren : phase === "closing" ? Icons.ClipboardCheck : Icons.ListChecks, color: phaseSummary.tone },
        ].map((metric) => { const Icon = metric.icon; return <article key={metric.label} className="rounded-2xl border border-border/50 bg-card/70 p-5 shadow-sm"><div className="flex items-start justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</span><Icon className={`h-5 w-5 ${metric.color}`} /></div><div className="mt-3 text-2xl font-black tracking-tight text-foreground">{metric.value}</div><div className="mt-1 text-xs text-muted-foreground">{metric.note}</div></article>; })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-3xl border border-border/50 bg-card/70 p-6 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border/50 pb-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Icons.ListChecks className="h-5 w-5 text-red-500" /><h2 className="text-lg font-black">Prioridades del turno</h2></div><p className="mt-1 text-xs text-muted-foreground">El equipo sabe qué hacer y dirección sabe qué desbloquear.</p></div><div className="text-right"><div className="text-2xl font-black text-foreground">{progress}%</div><div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">completado</div></div></div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-linear-to-r from-red-500 to-red-600 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
          <div className="mt-5 space-y-3">{tasks.map((task) => <div key={task.id} className={`flex items-start gap-3 rounded-2xl border p-4 transition-all ${task.done ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/50 bg-background/30"}`}><button aria-label={task.done ? "Marcar tarea como pendiente" : "Completar tarea"} onClick={() => toggleTask(task.id)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${task.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border hover:border-red-500"}`}>{task.done && <Icons.Check className="h-3.5 w-3.5" />}</button><div className="min-w-0 flex-1"><div className={`font-bold ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</div><div className="mt-1 text-xs text-muted-foreground">{task.detail}</div><div className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${priorityClasses(task.priority)}`}>{task.priority}</span><span className="text-[10px] font-semibold text-muted-foreground">Responsable: {task.owner}</span></div></div>{task.done ? <Icons.CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Icons.ArrowUpRight className="h-4 w-4 text-muted-foreground" />}</div>)}</div>
        </section>

        <section className="rounded-3xl border border-red-500/15 bg-card/70 p-6 shadow-sm"><div className="flex items-start justify-between border-b border-border/50 pb-5"><div><div className="flex items-center gap-2"><Icons.Siren className="h-5 w-5 text-red-500" /><h2 className="text-lg font-black">Decisiones pendientes</h2></div><p className="mt-1 text-xs text-muted-foreground">Alertas agrupadas por impacto operativo.</p></div><span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-black text-red-600 dark:text-red-300">{openAlerts} activas</span></div><div className="mt-5 space-y-3">{alerts.filter((alert) => !alert.resolved).map((alert) => <div key={alert.id} className="rounded-2xl border border-border/50 bg-background/30 p-4"><div className="flex items-start justify-between gap-3"><div><span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold ${priorityClasses(alert.priority)}`}>{alert.priority}</span><h3 className="mt-2 text-sm font-bold text-foreground">{alert.title}</h3></div><Icons.AlertTriangle className="h-4 w-4 shrink-0 text-red-500" /></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{alert.detail}</p><button onClick={() => resolveAlert(alert.id)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-3 py-2.5 text-xs font-bold text-background transition hover:opacity-85"><Icons.Check className="h-4 w-4" />{alert.action}</button></div>)}{openAlerts === 0 && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center"><Icons.ShieldCheck className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-2 text-sm font-bold">Sin decisiones urgentes</p><p className="mt-1 text-xs text-muted-foreground">El servicio está bajo control.</p></div>}</div></section>
      </div>

      <section className="rounded-3xl border border-border/50 bg-card/70 p-6 shadow-sm"><div className="flex flex-col gap-3 border-b border-border/50 pb-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Icons.Radio className="h-5 w-5 text-sky-500" /><h2 className="text-lg font-black">Incidencias en seguimiento</h2></div><p className="mt-1 text-xs text-muted-foreground">Registrar los hechos ayuda a resolver ahora y mejorar el siguiente servicio.</p></div><button onClick={() => setShowIncidentForm((current) => !current)} className="flex items-center justify-center gap-2 rounded-xl bg-metallic-red px-4 py-2.5 text-xs font-bold text-white"><Icons.Plus className="h-4 w-4" />Registrar incidencia</button></div>
        {showIncidentForm && <form onSubmit={saveIncident} className="mt-5 grid gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 md:grid-cols-[0.8fr_1.2fr_auto] md:items-end"><label className="text-xs font-bold">Incidencia<input value={incidentTitle} onChange={(event) => setIncidentTitle(event.target.value)} placeholder="Ej. Producto agotado" className="mt-2 w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm font-normal outline-none focus:border-red-500" /></label><label className="text-xs font-bold">Detalle<input value={incidentDetail} onChange={(event) => setIncidentDetail(event.target.value)} placeholder="Qué ocurre y a quién afecta" className="mt-2 w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm font-normal outline-none focus:border-red-500" /></label><button type="submit" className="rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background">Guardar</button></form>}
        <div className="mt-5 grid gap-3 md:grid-cols-2">{incidents.map((incident) => <div key={incident.id} className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/25 p-4"><div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${incident.status === "Resuelta" ? "bg-emerald-500" : incident.status === "En curso" ? "bg-red-500" : "bg-red-500"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">{incident.title}</h3><span className="text-[10px] font-bold text-muted-foreground">{incident.time}</span></div><p className="mt-1 text-xs text-muted-foreground">{incident.detail}</p><div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-muted-foreground"><span>{incident.area}</span><span>·</span><span className={incident.status === "Resuelta" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>{incident.status}</span></div></div></div>)}</div>
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-red-500/20 bg-linear-to-br from-red-500/10 via-card/70 to-card/70 p-6 shadow-sm md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><Icons.Sparkles className="h-5 w-5 text-red-500" /><h2 className="text-lg font-black">Cierre de dirección</h2></div><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Al finalizar el turno, Palmera reunirá ventas, tiempos, incidencias y mermas para preparar tres decisiones concretas para mañana.</p></div><button onClick={saveShift} className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-xs font-bold text-red-700 transition hover:bg-red-500/25 dark:text-red-300"><Icons.FileCheck2 className="h-4 w-4" />{saved ? "Turno guardado" : "Preparar cierre"}</button></section>
    </div>
  );
}
