"use client";

import React, { useState } from "react";
import * as Icons from "lucide-react";

export interface TemperatureLog {
  id: string;
  time: string;
  equipmentName: string;
  targetTemp: string;
  recordedTemp: number;
  status: "OK" | "WARNING" | "CRITICAL";
  inspector: string;
}

const INITIAL_TEMP_LOGS: TemperatureLog[] = [
  { id: "t1", time: "09:00", equipmentName: "Cámara de Pescados & Mariscos", targetTemp: "1ºC a 3ºC", recordedTemp: 2.1, status: "OK", inspector: "Marc Vila" },
  { id: "t2", time: "09:00", equipmentName: "Cámara de Carnes", targetTemp: "1ºC a 4ºC", recordedTemp: 3.4, status: "OK", inspector: "Marc Vila" },
  { id: "t3", time: "09:05", equipmentName: "Congelador Principal (-18ºC)", targetTemp: "-22ºC a -18ºC", recordedTemp: -19.2, status: "OK", inspector: "Laura Gómez" },
  { id: "t4", time: "14:30", equipmentName: "Cámara de Verduras & Lácteos", targetTemp: "2ºC a 5ºC", recordedTemp: 6.8, status: "WARNING", inspector: "Laura Gómez" },
];

export default function HaccpComplianceTab() {
  const [logs, setLogs] = useState<TemperatureLog[]>(INITIAL_TEMP_LOGS);

  return (
    <div className="space-y-6">
      <div className="bg-card/65 backdrop-blur-md p-6 rounded-3xl border border-border/40 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Icons.Thermometer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Control Sanitario & Registro de Temperaturas HACCP / APPCC</h3>
              <p className="text-xs text-muted-foreground">Auditoría diaria obligatoria de cámaras frigoríficas y congeladores.</p>
            </div>
          </div>
          <button className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs cursor-pointer">
            + Nuevo Registro Temperatura
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase">
                <th className="py-3 px-4">Hora</th>
                <th className="py-3 px-4">Equipo / Cámara</th>
                <th className="py-3 px-4">Rango Objetivo</th>
                <th className="py-3 px-4">Temperatura Medida</th>
                <th className="py-3 px-4">Inspector</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold">{log.time}</td>
                  <td className="py-3 px-4 font-semibold text-foreground">{log.equipmentName}</td>
                  <td className="py-3 px-4 text-muted-foreground">{log.targetTemp}</td>
                  <td className="py-3 px-4 font-mono font-black text-sm text-foreground">{log.recordedTemp}ºC</td>
                  <td className="py-3 px-4 text-muted-foreground">{log.inspector}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      log.status === "OK" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                    }`}>
                      {log.status === "OK" ? "Conforme (OK)" : "Alerta Desviación"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
