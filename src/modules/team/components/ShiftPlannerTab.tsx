"use client";

import React, { useState } from "react";
import * as Icons from "lucide-react";

export interface EmployeeShift {
  id: string;
  name: string;
  role: "COCINA" | "SALA" | "BARRA" | "LIMPIEZA";
  contractHours: number;
  assignedHours: number;
  hourlyRate: number;
  shifts: Record<string, "MAÑANA" | "TARDE" | "NOCHE" | "FIESTA" | "VACACIONES">;
}

const INITIAL_EMPLOYEE_SHIFTS: EmployeeShift[] = [
  {
    id: "e1",
    name: "Marc Vila (Jefe de Cocina)",
    role: "COCINA",
    contractHours: 40,
    assignedHours: 40,
    hourlyRate: 16.5,
    shifts: {
      Lun: "MAÑANA",
      Mar: "MAÑANA",
      Mié: "MAÑANA",
      Jue: "NOCHE",
      Vie: "NOCHE",
      Sáb: "FIESTA",
      Dom: "FIESTA",
    },
  },
  {
    id: "e2",
    name: "Laura Gómez (Sous Chef)",
    role: "COCINA",
    contractHours: 40,
    assignedHours: 40,
    hourlyRate: 14.0,
    shifts: {
      Lun: "FIESTA",
      Mar: "FIESTA",
      Mié: "NOCHE",
      Jue: "NOCHE",
      Vie: "NOCHE",
      Sáb: "NOCHE",
      Dom: "MAÑANA",
    },
  },
  {
    id: "e3",
    name: "Carlos Ruiz (Maître / Encargado Sala)",
    role: "SALA",
    contractHours: 40,
    assignedHours: 42,
    hourlyRate: 15.0,
    shifts: {
      Lun: "MAÑANA",
      Mar: "MAÑANA",
      Mié: "FIESTA",
      Jue: "FIESTA",
      Vie: "NOCHE",
      Sáb: "NOCHE",
      Dom: "NOCHE",
    },
  },
  {
    id: "e4",
    name: "Elena Martínez (Camarera Senior)",
    role: "SALA",
    contractHours: 30,
    assignedHours: 30,
    hourlyRate: 12.0,
    shifts: {
      Lun: "FIESTA",
      Mar: "TARDE",
      Mié: "TARDE",
      Jue: "TARDE",
      Vie: "NOCHE",
      Sáb: "NOCHE",
      Dom: "FIESTA",
    },
  },
  {
    id: "e5",
    name: "Javier Soler (Barman)",
    role: "BARRA",
    contractHours: 40,
    assignedHours: 40,
    hourlyRate: 13.5,
    shifts: {
      Lun: "NOCHE",
      Mar: "NOCHE",
      Mié: "NOCHE",
      Jue: "FIESTA",
      Vie: "FIESTA",
      Sáb: "NOCHE",
      Dom: "NOCHE",
    },
  },
];

const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const SHIFT_COLORS: Record<string, string> = {
  MAÑANA: "bg-red-500/15 text-red-600 border-red-500/30",
  TARDE: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  NOCHE: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  FIESTA: "bg-stone-500/10 text-stone-500 border-stone-500/20",
  VACACIONES: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
};

export default function ShiftPlannerTab() {
  const [employees, setEmployees] = useState<EmployeeShift[]>(INITIAL_EMPLOYEE_SHIFTS);
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [estimatedSales, setEstimatedSales] = useState<number>(18500);

  const filteredEmployees = employees.filter((e) => selectedRole === "ALL" || e.role === selectedRole);

  const totalAssignedHours = employees.reduce((acc, e) => acc + e.assignedHours, 0);
  const totalWeeklyLaborCost = employees.reduce((acc, e) => acc + e.assignedHours * e.hourlyRate, 0);
  const laborCostPercentage = estimatedSales > 0 ? (totalWeeklyLaborCost / estimatedSales) * 100 : 0;

  const cycleShift = (empId: string, day: string) => {
    const sequence: ("MAÑANA" | "TARDE" | "NOCHE" | "FIESTA" | "VACACIONES")[] = [
      "MAÑANA",
      "TARDE",
      "NOCHE",
      "FIESTA",
      "VACACIONES",
    ];

    setEmployees((prev) =>
      prev.map((e) => {
        if (e.id === empId) {
          const current = e.shifts[day];
          const currentIndex = sequence.indexOf(current);
          const nextShift = sequence[(currentIndex + 1) % sequence.length];
          return {
            ...e,
            shifts: { ...e.shifts, [day]: nextShift },
          };
        }
        return e;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-card/75 backdrop-blur-md p-5 rounded-2xl border border-border/40 space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Horas Asignadas Semana</span>
          <div className="text-2xl font-black text-foreground">{totalAssignedHours}h</div>
          <span className="text-[11px] text-muted-foreground">En {employees.length} empleados activos</span>
        </div>

        <div className="bg-card/75 backdrop-blur-md p-5 rounded-2xl border border-border/40 space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Masa Salarial Semanal</span>
          <div className="text-2xl font-black text-red-500">{totalWeeklyLaborCost.toFixed(2)}€</div>
          <span className="text-[11px] text-muted-foreground">Promedio: {(totalWeeklyLaborCost / employees.length).toFixed(0)}€ / empleado</span>
        </div>

        <div className="bg-card/75 backdrop-blur-md p-5 rounded-2xl border border-border/40 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ratio Labor Cost %</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${laborCostPercentage <= 30 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
              {laborCostPercentage <= 30 ? "Objetivo OK (<30%)" : "Alerta >30%"}
            </span>
          </div>
          <div className={`text-2xl font-black ${laborCostPercentage <= 30 ? "text-emerald-500" : "text-rose-500"}`}>
            {laborCostPercentage.toFixed(1)}%
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">Venta Prevista:</span>
            <input
              type="number"
              value={estimatedSales}
              onChange={(e) => setEstimatedSales(Number(e.target.value))}
              className="w-24 bg-background border border-border/50 rounded-lg px-2 py-0.5 text-xs text-foreground font-bold"
            />
            <span className="text-[10px] text-muted-foreground">€</span>
          </div>
        </div>
      </div>

      {/* Role Filter & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card/40 p-4 rounded-2xl border border-border/30">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Puesto:</span>
          {["ALL", "COCINA", "SALA", "BARRA", "LIMPIEZA"].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                selectedRole === role ? "bg-red-500 text-white" : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {role === "ALL" ? "Todos" : role}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span> Mañana
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span> Tarde
          <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span> Noche
          <span className="inline-block w-2 h-2 rounded-full bg-stone-400"></span> Fiesta
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span> Vacaciones
        </div>
      </div>

      {/* Shift Matrix Table */}
      <div className="overflow-x-auto rounded-3xl border border-border/40 bg-card/75 backdrop-blur-md shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/40 bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase">
              <th className="py-3.5 px-4 min-w-[200px]">Empleado & Rol</th>
              <th className="py-3.5 px-2 text-center">Horas</th>
              {DAYS_OF_WEEK.map((day) => (
                <th key={day} className="py-3.5 px-2 text-center min-w-[90px]">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-bold text-foreground">{emp.name}</div>
                  <span className="text-[10px] text-red-500 font-extrabold uppercase">{emp.role}</span>
                </td>
                <td className="py-3.5 px-2 text-center">
                  <span className={`font-mono font-bold ${emp.assignedHours > emp.contractHours ? "text-red-500" : "text-foreground"}`}>
                    {emp.assignedHours}/{emp.contractHours}h
                  </span>
                </td>
                {DAYS_OF_WEEK.map((day) => {
                  const shiftVal = emp.shifts[day] || "FIESTA";
                  const colorClass = SHIFT_COLORS[shiftVal];

                  return (
                    <td key={day} className="py-3 px-1.5 text-center">
                      <button
                        onClick={() => cycleShift(emp.id, day)}
                        className={`w-full py-1.5 px-2 rounded-xl text-[10px] font-black border transition-all cursor-pointer select-none active:scale-95 ${colorClass}`}
                      >
                        {shiftVal}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
