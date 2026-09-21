"use client";

import { FormEvent, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import SmartSearchInput from "@/components/SmartSearchInput";

type ReservationStatus = "Confirmada" | "Pendiente" | "En espera" | "Llegó" | "Sentada" | "Cerrada" | "No-show" | "Cancelada";
type ReservationTab = "agenda" | "communications" | "history";

interface Reservation {
  id: string;
  time: string;
  customer: string;
  phone: string;
  email: string;
  pax: number;
  zone: string;
  table?: string;
  status: ReservationStatus;
  source: "Web" | "Teléfono" | "WhatsApp" | "Walk-in";
  occasion?: string;
  allergies: string[];
  notes: string;
  estimatedSpend: number;
  actualSpend?: number;
  confirmation: "Enviada" | "Pendiente" | "No necesaria";
  lastContact: string;
}

interface Communication {
  id: string;
  reservationId: string;
  type: "WhatsApp" | "Email" | "Llamada";
  title: string;
  detail: string;
  time: string;
  status: "Enviada" | "Pendiente" | "Recibida";
}

const INITIAL_RESERVATIONS: Reservation[] = [
  { id: "r-1042", time: "20:00", customer: "Laura Sánchez", phone: "+34 644 218 903", email: "laura.sanchez@email.com", pax: 2, zone: "Sala", table: "M-07", status: "Confirmada", source: "Web", occasion: "Aniversario", allergies: [], notes: "Prefiere una mesa tranquila.", estimatedSpend: 96, confirmation: "Enviada", lastContact: "Hoy, 10:32" },
  { id: "r-1043", time: "20:15", customer: "Marc Vila", phone: "+34 677 904 121", email: "marc.vila@email.com", pax: 4, zone: "Terraza", table: "T-03", status: "Confirmada", source: "WhatsApp", allergies: ["Frutos secos"], notes: "Una persona con alergia. Confirmar contaminación cruzada al llegar.", estimatedSpend: 180, confirmation: "Enviada", lastContact: "Ayer, 18:04" },
  { id: "r-1044", time: "20:30", customer: "Grupo Ortega", phone: "+34 622 334 455", email: "carlos.ortega@gmail.com", pax: 8, zone: "Privado", status: "Pendiente", source: "Teléfono", occasion: "Cena de empresa", allergies: [], notes: "Solicita menú cerrado y factura a nombre de empresa.", estimatedSpend: 520, confirmation: "Pendiente", lastContact: "Ayer, 12:20" },
  { id: "r-1045", time: "21:00", customer: "Nuria y compañía", phone: "+34 699 805 116", email: "nuria@email.com", pax: 6, zone: "Sala", table: "M-12", status: "Llegó", source: "Web", allergies: ["Gluten"], notes: "Esperando a dos comensales.", estimatedSpend: 270, confirmation: "Enviada", lastContact: "Hoy, 20:54" },
  { id: "r-1046", time: "21:30", customer: "Jordi Ferrer", phone: "+34 612 778 210", email: "jordi@email.com", pax: 2, zone: "Barra", table: "B-02", status: "Sentada", source: "Walk-in", allergies: [], notes: "Cliente recurrente.", estimatedSpend: 70, actualSpend: 64, confirmation: "No necesaria", lastContact: "Hoy, 21:34" },
  { id: "r-1047", time: "22:00", customer: "Clara Benet", phone: "+34 633 540 019", email: "clara@email.com", pax: 3, zone: "Sala", status: "Confirmada", source: "Web", allergies: [], notes: "Llega con carrito de bebé.", estimatedSpend: 135, confirmation: "Enviada", lastContact: "Hoy, 09:12" },
];

const INITIAL_COMMUNICATIONS: Communication[] = [
  { id: "c-1", reservationId: "r-1042", type: "WhatsApp", title: "Confirmación enviada", detail: "Reserva confirmada para 2 personas a las 20:00.", time: "Hoy, 10:32", status: "Enviada" },
  { id: "c-2", reservationId: "r-1044", type: "Llamada", title: "Pendiente de confirmar menú", detail: "El cliente debe elegir entre menú de empresa A o B.", time: "Ayer, 12:20", status: "Pendiente" },
  { id: "c-3", reservationId: "r-1045", type: "WhatsApp", title: "Aviso de llegada", detail: "El cliente informa de que llegará con retraso de 10 minutos.", time: "Hoy, 20:54", status: "Recibida" },
];

const STATUS_STYLES: Record<ReservationStatus, string> = {
  Confirmada: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  Pendiente: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
  "En espera": "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  Llegó: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
  Sentada: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
  Cerrada: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  "No-show": "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
  Cancelada: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

function nextStatus(status: ReservationStatus): ReservationStatus | null {
  if (status === "Confirmada" || status === "Pendiente") return "Llegó";
  if (status === "Llegó" || status === "En espera") return "Sentada";
  if (status === "Sentada") return "Cerrada";
  return null;
}

export default function ReservationsDashboard() {
  const [activeTab, setActiveTab] = useState<ReservationTab>("agenda");
  const [reservations, setReservations] = useState<Reservation[]>(INITIAL_RESERVATIONS);
  const [communications, setCommunications] = useState<Communication[]>(INITIAL_COMMUNICATIONS);
  const [selectedId, setSelectedId] = useState("r-1045");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todas" | ReservationStatus>("Todas");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState("");
  const [newTime, setNewTime] = useState("22:30");
  const [newPax, setNewPax] = useState("2");
  const [newPhone, setNewPhone] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const selected = reservations.find((reservation) => reservation.id === selectedId) ?? reservations[0];
  const visibleReservations = useMemo(() => reservations.filter((reservation) => {
    const matchesQuery = `${reservation.customer} ${reservation.phone} ${reservation.id}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "Todas" || reservation.status === statusFilter;
    return matchesQuery && matchesStatus;
  }), [query, reservations, statusFilter]);
  const confirmed = reservations.filter((reservation) => ["Confirmada", "Llegó", "Sentada"].includes(reservation.status)).length;
  const expectedPax = reservations.filter((reservation) => !["Cancelada", "No-show", "Cerrada"].includes(reservation.status)).reduce((total, reservation) => total + reservation.pax, 0);
  const projectedRevenue = reservations.filter((reservation) => !["Cancelada", "No-show"].includes(reservation.status)).reduce((total, reservation) => total + reservation.estimatedSpend, 0);
  const selectedCommunications = communications.filter((communication) => communication.reservationId === selected?.id);

  function updateStatus(id: string, status: ReservationStatus) {
    setReservations((current) => current.map((reservation) => reservation.id === id ? { ...reservation, status } : reservation));
  }

  function advanceSelected() {
    if (!selected) return;
    const status = nextStatus(selected.status);
    if (status) updateStatus(selected.id, status);
  }

  function sendConfirmation() {
    if (!selected) return;
    setReservations((current) => current.map((reservation) => reservation.id === selected.id ? { ...reservation, confirmation: "Enviada", lastContact: "Ahora" } : reservation));
    setCommunications((current) => [{ id: `c-${Date.now()}`, reservationId: selected.id, type: "WhatsApp", title: "Confirmación enviada", detail: `Confirmación enviada a ${selected.phone}.`, time: "Ahora", status: "Enviada" }, ...current]);
  }

  function createReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newCustomer.trim() || !newPhone.trim()) return;
    const id = `r-${Date.now().toString().slice(-4)}`;
    const reservation: Reservation = { id, time: newTime, customer: newCustomer.trim(), phone: newPhone.trim(), email: "", pax: Number(newPax) || 2, zone: "Por asignar", status: "Pendiente", source: "Teléfono", allergies: [], notes: newNotes.trim() || "Sin notas añadidas.", estimatedSpend: (Number(newPax) || 2) * 42, confirmation: "Pendiente", lastContact: "Ahora" };
    setReservations((current) => [...current, reservation].sort((a, b) => a.time.localeCompare(b.time)));
    setSelectedId(id);
    setCommunications((current) => [{ id: `c-${Date.now()}`, reservationId: id, type: "Llamada", title: "Reserva creada", detail: "Pendiente de enviar confirmación y asignar mesa.", time: "Ahora", status: "Recibida" }, ...current]);
    setNewCustomer("");
    setNewPhone("");
    setNewNotes("");
    setShowNewForm(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-border/50 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex items-center gap-2"><Icons.CalendarDays className="h-5 w-5 text-red-500" /><h1 className="text-2xl font-black tracking-tight text-foreground">Reservas</h1></div><p className="mt-1 text-xs text-muted-foreground">Agenda y seguimiento completo del cliente, desde la confirmación hasta el cierre.</p></div>
        <button onClick={() => setShowNewForm((current) => !current)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-metallic-red px-4 py-3 text-xs font-bold text-white shadow-lg"><Icons.Plus className="h-4 w-4" />Nueva reserva</button>
      </div>

      {showNewForm && <form onSubmit={createReservation} className="grid gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 md:grid-cols-2 xl:grid-cols-[1.4fr_0.7fr_0.5fr_1fr_1.6fr_auto] xl:items-end"><label className="text-xs font-bold">Cliente<input value={newCustomer} onChange={(event) => setNewCustomer(event.target.value)} placeholder="Nombre y apellidos" className="mt-2 w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm font-normal outline-none focus:border-red-500" /></label><label className="text-xs font-bold">Hora<input type="time" value={newTime} onChange={(event) => setNewTime(event.target.value)} className="mt-2 w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm font-normal outline-none focus:border-red-500" /></label><label className="text-xs font-bold">Pax<input type="number" min="1" value={newPax} onChange={(event) => setNewPax(event.target.value)} className="mt-2 w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm font-normal outline-none focus:border-red-500" /></label><label className="text-xs font-bold">Teléfono<input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} placeholder="+34..." className="mt-2 w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm font-normal outline-none focus:border-red-500" /></label><label className="text-xs font-bold">Notas<input value={newNotes} onChange={(event) => setNewNotes(event.target.value)} placeholder="Alergias, ocasión, preferencias..." className="mt-2 w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm font-normal outline-none focus:border-red-500" /></label><button type="submit" className="rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background">Crear</button></form>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Reservas confirmadas", value: confirmed, note: "con seguimiento activo", icon: Icons.BadgeCheck, color: "text-emerald-500" }, { label: "Pax previstos", value: expectedPax, note: "para el servicio de hoy", icon: Icons.Users, color: "text-sky-500" }, { label: "Venta proyectada", value: `${projectedRevenue.toLocaleString("es-ES")} €`, note: "sin cancelaciones", icon: Icons.Coins, color: "text-red-500" }, { label: "Alertas", value: reservations.filter((reservation) => reservation.confirmation === "Pendiente" || reservation.allergies.length > 0).length, note: "requieren una acción", icon: Icons.Siren, color: "text-red-500" }].map((metric) => { const Icon = metric.icon; return <article key={metric.label} className="rounded-2xl border border-border/50 bg-card/65 p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{metric.label}</span><Icon className={`h-5 w-5 ${metric.color}`} /></div><div className="mt-2 text-2xl font-black text-foreground">{metric.value}</div><p className="mt-1 text-xs text-muted-foreground">{metric.note}</p></article>; })}
      </section>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border/50 bg-card/60 p-2 shadow-sm">
        {([{ id: "agenda", label: "Agenda", icon: Icons.CalendarRange }, { id: "communications", label: "Comunicaciones", icon: Icons.MessageSquareText }, { id: "history", label: "Historial", icon: Icons.History }] as const).map((tab) => { const Icon = tab.icon; return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${activeTab === tab.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="h-4 w-4" />{tab.label}</button>; })}
      </div>

      {activeTab === "agenda" && <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-3xl border border-border/50 bg-card/65 p-5 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border/50 pb-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-lg font-black">Hoy · Servicio de cena</h2><p className="mt-1 text-xs text-muted-foreground">{reservations.length} reservas · {expectedPax} personas previstas</p></div><div className="flex gap-2"><SmartSearchInput value={query} onChange={setQuery} suggestions={reservations.flatMap((reservation) => [reservation.customer, reservation.phone, reservation.id])} placeholder="Buscar cliente..." className="w-48" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "Todas" | ReservationStatus)} className="rounded-xl border border-border/60 bg-background px-2 py-2 text-xs text-foreground outline-none"><option>Todas</option>{(["Confirmada", "Pendiente", "Llegó", "Sentada", "Cerrada", "No-show"] as ReservationStatus[]).map((status) => <option key={status}>{status}</option>)}</select></div></div>
          <div className="mt-4 space-y-2">{visibleReservations.map((reservation) => <button key={reservation.id} onClick={() => setSelectedId(reservation.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${selected?.id === reservation.id ? "border-red-500/40 bg-red-500/5 shadow-sm" : "border-border/40 bg-background/20 hover:bg-muted/40"}`}><div className="w-14 shrink-0 text-center"><div className="text-lg font-black text-foreground">{reservation.time}</div><div className="text-[10px] font-bold text-muted-foreground">{reservation.pax} pax</div></div><div className="h-10 w-px bg-border/60" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-foreground">{reservation.customer}</span><span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[reservation.status]}`}>{reservation.status}</span></div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{reservation.zone}{reservation.table ? ` · ${reservation.table}` : " · Mesa por asignar"}</span><span>{reservation.source}</span>{reservation.allergies.length > 0 && <span className="font-bold text-red-600 dark:text-red-300">Alergia: {reservation.allergies.join(", ")}</span>}</div></div><Icons.ChevronRight className="h-4 w-4 text-muted-foreground" /></button>)}{visibleReservations.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No hay reservas con estos filtros.</div>}</div>
        </section>

        {selected && <ReservationDetail reservation={selected} communications={selectedCommunications} onAdvance={advanceSelected} onSendConfirmation={sendConfirmation} onUpdateStatus={updateStatus} />}
      </div>}

      {activeTab === "communications" && <section className="rounded-3xl border border-border/50 bg-card/65 p-5 shadow-sm"><div className="border-b border-border/50 pb-4"><h2 className="text-lg font-black">Bandeja de comunicaciones</h2><p className="mt-1 text-xs text-muted-foreground">Cada contacto queda vinculado a su reserva y a una próxima acción.</p></div><div className="mt-4 space-y-3">{communications.map((communication) => <div key={communication.id} className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/20 p-4"><div className={`rounded-xl p-2 ${communication.type === "WhatsApp" ? "bg-emerald-500/10 text-emerald-500" : communication.type === "Llamada" ? "bg-red-500/10 text-red-500" : "bg-sky-500/10 text-sky-500"}`}>{communication.type === "WhatsApp" ? <Icons.MessageCircle className="h-5 w-5" /> : communication.type === "Llamada" ? <Icons.Phone className="h-5 w-5" /> : <Icons.Mail className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold text-foreground">{communication.title}</h3><span className="text-xs text-muted-foreground">{communication.time}</span></div><p className="mt-1 text-xs text-muted-foreground">{communication.detail}</p><div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-muted-foreground"><span>{communication.type}</span><span>·</span><span className={communication.status === "Pendiente" ? "text-red-600 dark:text-red-300" : "text-emerald-600 dark:text-emerald-300"}>{communication.status}</span><button onClick={() => setSelectedId(communication.reservationId)} className="ml-2 text-foreground underline underline-offset-2">Abrir reserva</button></div></div></div>)}</div></section>}

      {activeTab === "history" && <section className="rounded-3xl border border-border/50 bg-card/65 p-5 shadow-sm"><div className="border-b border-border/50 pb-4"><h2 className="text-lg font-black">Historial y aprendizaje</h2><p className="mt-1 text-xs text-muted-foreground">Revisa qué ocurrió con cada reserva para mejorar previsiones y comunicación.</p></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr className="border-b border-border/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><th className="px-3 py-3">Reserva</th><th className="px-3 py-3">Resultado</th><th className="px-3 py-3">Estimado</th><th className="px-3 py-3">Real</th><th className="px-3 py-3">Variación</th></tr></thead><tbody className="divide-y divide-border/30">{reservations.filter((reservation) => reservation.status === "Cerrada" || reservation.actualSpend !== undefined).map((reservation) => { const actual = reservation.actualSpend ?? reservation.estimatedSpend; const variation = actual - reservation.estimatedSpend; return <tr key={reservation.id}><td className="px-3 py-4 font-bold">{reservation.customer}<span className="ml-2 font-normal text-muted-foreground">{reservation.time} · {reservation.pax} pax</span></td><td className="px-3 py-4"><span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[reservation.status]}`}>{reservation.status}</span></td><td className="px-3 py-4 text-muted-foreground">{reservation.estimatedSpend.toFixed(2)} €</td><td className="px-3 py-4 font-bold">{actual.toFixed(2)} €</td><td className={`px-3 py-4 font-bold ${variation >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{variation >= 0 ? "+" : ""}{variation.toFixed(2)} €</td></tr>; })}</tbody></table></div></section>}
    </div>
  );
}

interface ReservationDetailProps {
  reservation: Reservation;
  communications: Communication[];
  onAdvance: () => void;
  onSendConfirmation: () => void;
  onUpdateStatus: (id: string, status: ReservationStatus) => void;
}

function ReservationDetail({ reservation, communications, onAdvance, onSendConfirmation, onUpdateStatus }: ReservationDetailProps) {
  const next = nextStatus(reservation.status);
  return <aside className="rounded-3xl border border-border/50 bg-card/75 p-5 shadow-sm xl:sticky xl:top-24 xl:h-fit"><div className="flex items-start justify-between border-b border-border/50 pb-4"><div><div className="flex items-center gap-2"><span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[reservation.status]}`}>{reservation.status}</span><span className="text-xs text-muted-foreground">#{reservation.id.replace("r-", "")}</span></div><h2 className="mt-2 text-xl font-black text-foreground">{reservation.customer}</h2><p className="mt-1 text-xs text-muted-foreground">{reservation.time} · {reservation.pax} personas · {reservation.zone}{reservation.table ? ` · ${reservation.table}` : ""}</p></div><div className="rounded-xl bg-red-500/10 p-2 text-red-500"><Icons.UserRound className="h-5 w-5" /></div></div>
    <div className="mt-5 grid grid-cols-2 gap-2"><a href={`tel:${reservation.phone}`} className="flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-background/30 px-3 py-2.5 text-xs font-bold hover:bg-muted"><Icons.Phone className="h-4 w-4" />Llamar</a><button onClick={onSendConfirmation} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"><Icons.MessageCircle className="h-4 w-4" />Confirmar</button></div>
    <div className="mt-5 rounded-2xl border border-border/40 bg-background/25 p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Seguimiento del cliente</span><span className="text-[10px] text-muted-foreground">Último contacto: {reservation.lastContact}</span></div><div className="mt-4 flex items-center gap-1">{["Reserva", "Confirmación", "Llegada", "Mesa", "Cierre"].map((step, index) => { const reached = (reservation.status === "Cerrada" || (reservation.status === "Sentada" && index < 4) || (reservation.status === "Llegó" && index < 3) || (["Confirmada", "Pendiente"].includes(reservation.status) && index < 2)); return <div key={step} className="flex min-w-0 flex-1 flex-col items-center gap-2"><div className={`h-2.5 w-2.5 rounded-full ${reached ? "bg-red-500" : "bg-muted"}`} /><span className={`text-center text-[9px] ${reached ? "font-bold text-foreground" : "text-muted-foreground"}`}>{step}</span>{index < 4 && <div className={`absolute h-px w-[12%] ${reached ? "bg-red-500/50" : "bg-border"}`} />}</div>; })}</div></div>
    <div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl border border-border/40 p-3"><span className="text-[10px] font-bold uppercase text-muted-foreground">Consumo previsto</span><div className="mt-1 text-lg font-black">{reservation.estimatedSpend.toFixed(0)} €</div></div><div className="rounded-xl border border-border/40 p-3"><span className="text-[10px] font-bold uppercase text-muted-foreground">Consumo real</span><div className="mt-1 text-lg font-black">{reservation.actualSpend !== undefined ? `${reservation.actualSpend.toFixed(0)} €` : "Pendiente"}</div></div></div>
    <div className="mt-5 space-y-3"><div className="flex items-start gap-3"><Icons.Phone className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><div className="text-xs font-bold">{reservation.phone}</div><div className="text-[10px] text-muted-foreground">{reservation.email || "Sin email registrado"}</div></div></div><div className="flex items-start gap-3"><Icons.HeartHandshake className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><div className="text-xs font-bold">{reservation.occasion || "Sin ocasión indicada"}</div><div className="text-[10px] text-muted-foreground">{reservation.notes}</div></div></div>{reservation.allergies.length > 0 && <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3"><Icons.TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /><div><div className="text-xs font-bold text-red-700 dark:text-red-300">Atención alimentaria</div><div className="text-[10px] text-muted-foreground">{reservation.allergies.join(", ")} · confirmar con cocina y sala</div></div></div>}</div>
    <div className="mt-5 border-t border-border/50 pt-4"><div className="flex flex-wrap gap-2"><button disabled={!next} onClick={onAdvance} className="flex-1 rounded-xl bg-foreground px-3 py-2.5 text-xs font-bold text-background disabled:cursor-not-allowed disabled:opacity-40">{next ? `Marcar: ${next}` : "Flujo completado"}</button><button onClick={() => onUpdateStatus(reservation.id, "No-show")} className="rounded-xl border border-red-500/20 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-500/10 dark:text-red-300">No-show</button></div></div>
    <div className="mt-5 border-t border-border/50 pt-4"><div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Últimas comunicaciones</span><span className="text-[10px] text-muted-foreground">{communications.length}</span></div>{communications.length === 0 ? <p className="text-xs text-muted-foreground">Aún no hay comunicaciones registradas.</p> : communications.map((communication) => <div key={communication.id} className="mb-2 rounded-xl bg-background/30 p-3"><div className="flex justify-between gap-2 text-xs font-bold"><span>{communication.title}</span><span className="text-[10px] font-normal text-muted-foreground">{communication.time}</span></div><p className="mt-1 text-[10px] text-muted-foreground">{communication.detail}</p></div>)}</div>
  </aside>;
}
