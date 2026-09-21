"use client";

import React, { useState } from "react";
import * as Icons from "lucide-react";

export interface VacationRequest {
  id: string;
  employeeName: string;
  role: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  type: "VACATION" | "PERSONAL_DAYS" | "MEDICAL_LEAVE";
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes: string;
  hasOverlapWarning?: boolean;
}

const INITIAL_VACATION_REQUESTS: VacationRequest[] = [
  {
    id: "vr1",
    employeeName: "Marc Vila (Jefe de Cocina)",
    role: "COCINA",
    startDate: "2026-06-15",
    endDate: "2026-06-28",
    daysCount: 14,
    type: "VACATION",
    status: "PENDING",
    notes: "Vacaciones de verano familiares acordadas.",
    hasOverlapWarning: true, // Overlaps with Laura Gómez
  },
  {
    id: "vr2",
    employeeName: "Laura Gómez (Sous Chef)",
    role: "COCINA",
    startDate: "2026-06-20",
    endDate: "2026-06-27",
    daysCount: 7,
    type: "VACATION",
    status: "PENDING",
    notes: "Viaje personal.",
    hasOverlapWarning: true,
  },
  {
    id: "vr3",
    employeeName: "Elena Martínez (Camarera)",
    role: "SALA",
    startDate: "2026-07-01",
    endDate: "2026-07-10",
    daysCount: 10,
    type: "VACATION",
    status: "APPROVED",
    notes: "Vacaciones turno de julio.",
  },
  {
    id: "vr4",
    employeeName: "Javier Soler (Barman)",
    role: "BARRA",
    startDate: "2026-05-10",
    endDate: "2026-05-12",
    daysCount: 2,
    type: "PERSONAL_DAYS",
    status: "APPROVED",
    notes: "Asuntos propios.",
  },
];

export default function VacationRequestsTab() {
  const [requests, setRequests] = useState<VacationRequest[]>(INITIAL_VACATION_REQUESTS);
  const [showModal, setShowModal] = useState(false);

  // New Request Form
  const [empName, setEmpName] = useState("");
  const [role, setRole] = useState("COCINA");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<"VACATION" | "PERSONAL_DAYS" | "MEDICAL_LEAVE">("VACATION");
  const [notes, setNotes] = useState("");

  const handleUpdateStatus = (id: string, status: "APPROVED" | "REJECTED") => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newReq: VacationRequest = {
      id: "vr-" + Date.now(),
      employeeName: empName,
      role,
      startDate,
      endDate,
      daysCount,
      type,
      status: "PENDING",
      notes,
    };

    setRequests([newReq, ...requests]);
    setShowModal(false);
    setEmpName("");
    setNotes("");
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex justify-between items-center bg-card/40 p-4 rounded-2xl border border-border/30">
        <div>
          <h3 className="text-xs font-black tracking-wider text-foreground uppercase flex items-center gap-2">
            <Icons.CalendarDays className="h-4 w-4 text-red-500" />
            <span>Gestión de Vacaciones & Permisos de Personal</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Solicitudes de descansos, permisos por asuntos propios y bajas médicas con control de solapamientos.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex h-9 items-center justify-center gap-1.5 px-4 rounded-xl bg-metallic-red text-white font-bold text-xs cursor-pointer shadow-xs"
        >
          <Icons.Plus className="h-4 w-4" />
          <span>Solicitar Vacaciones</span>
        </button>
      </div>

      {/* Requests List */}
      <div className="grid gap-4 md:grid-cols-2">
        {requests.map((req) => (
          <div
            key={req.id}
            className={`bg-card/75 backdrop-blur-md p-5 rounded-2xl border transition-all space-y-4 ${
              req.hasOverlapWarning && req.status === "PENDING"
                ? "border-rose-500/40 bg-linear-to-b from-card to-rose-500/5"
                : "border-border/40"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-foreground">{req.employeeName}</h4>
                <span className="text-[10px] font-extrabold text-red-500 uppercase">{req.role}</span>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                  req.status === "APPROVED"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : req.status === "REJECTED"
                    ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                    : "bg-red-500/10 text-red-600 border border-red-500/20"
                }`}
              >
                {req.status === "APPROVED" ? "Aprobada" : req.status === "REJECTED" ? "Rechazada" : "Pendiente"}
              </span>
            </div>

            {/* Overlap Alert Badge */}
            {req.hasOverlapWarning && req.status === "PENDING" && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2 font-semibold">
                <Icons.AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Alerta de Solapamiento: Dos jefes de {req.role} solicitan las mismas fechas.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-3 rounded-xl">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Fechas Solicitadas</span>
                <span className="font-bold text-foreground">{req.startDate} ➔ {req.endDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Días Totales</span>
                <span className="font-black text-red-500 text-sm">{req.daysCount} días</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">"{req.notes}"</p>

            {req.status === "PENDING" && (
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus(req.id, "APPROVED")}
                  className="flex-1 inline-flex h-8.5 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs cursor-pointer"
                >
                  <Icons.Check className="h-4 w-4" />
                  <span>Aprobar</span>
                </button>
                <button
                  onClick={() => handleUpdateStatus(req.id, "REJECTED")}
                  className="flex-1 inline-flex h-8.5 items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-white text-xs cursor-pointer"
                >
                  <Icons.X className="h-4 w-4" />
                  <span>Rechazar</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card p-6 rounded-3xl border border-border/50 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-foreground">Solicitud de Vacaciones</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground uppercase text-[10px]">Empleado</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marc Vila"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full bg-background border border-border/50 rounded-xl p-2.5 text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground uppercase text-[10px]">Rol / Puesto</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-background border border-border/50 rounded-xl p-2.5 text-foreground"
                >
                  <option value="COCINA">Cocina</option>
                  <option value="SALA">Sala</option>
                  <option value="BARRA">Barra</option>
                  <option value="LIMPIEZA">Limpieza</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase text-[10px]">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-xl p-2 text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase text-[10px]">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-xl p-2 text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground uppercase text-[10px]">Notas de la solicitud</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Motivo o comentarios..."
                  className="w-full bg-background border border-border/50 rounded-xl p-2.5 text-foreground"
                />
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-metallic-red font-bold text-white text-xs cursor-pointer shadow-lg mt-2"
              >
                Enviar Solicitud
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
