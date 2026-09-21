"use client";

import React, { useState } from "react";
import * as Icons from "lucide-react";

export interface WasteItem {
  id: string;
  date: string;
  productName: string;
  quantity: number;
  unit: string;
  reason: "EXPIRATION" | "SPOILAGE" | "KITCHEN_ERROR" | "CUSTOMER_RETURN" | "BREAKAGE";
  costAmount: number;
  reportedBy: string;
}

const INITIAL_WASTE_ITEMS: WasteItem[] = [
  {
    id: "w1",
    date: "2026-05-20",
    productName: "Lomo de Atún Rojo (Caducidad)",
    quantity: 1.2,
    unit: "kg",
    reason: "EXPIRATION",
    costAmount: 42.0,
    reportedBy: "Marc Vila (Jefe de Cocina)",
  },
  {
    id: "w2",
    date: "2026-05-19",
    productName: "Botella Vino Reserva (Rotura en sala)",
    quantity: 1,
    unit: "botella",
    reason: "BREAKAGE",
    costAmount: 24.5,
    reportedBy: "Carlos Ruiz (Maître)",
  },
  {
    id: "w3",
    date: "2026-05-18",
    productName: "Plato Solomillo devuelto (Punto carne incorrecto)",
    quantity: 1,
    unit: "ración",
    reason: "CUSTOMER_RETURN",
    costAmount: 18.0,
    reportedBy: "Elena Martínez",
  },
];

export default function WasteTrackerTab() {
  const [wasteList, setWasteList] = useState<WasteItem[]>(INITIAL_WASTE_ITEMS);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState("kg");
  const [reason, setReason] = useState<"EXPIRATION" | "SPOILAGE" | "KITCHEN_ERROR" | "CUSTOMER_RETURN" | "BREAKAGE">("EXPIRATION");
  const [costAmount, setCostAmount] = useState<number>(10);
  const [reportedBy, setReportedBy] = useState("Director de Restaurante");

  const totalWasteLoss = wasteList.reduce((acc, item) => acc + item.costAmount, 0);

  const handleAddWaste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || costAmount <= 0) return;

    const newWaste: WasteItem = {
      id: "w-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      productName,
      quantity,
      unit,
      reason,
      costAmount,
      reportedBy,
    };

    setWasteList([newWaste, ...wasteList]);
    setShowModal(false);
    setProductName("");
    setCostAmount(10);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Metric */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-card/65 backdrop-blur-md p-6 rounded-3xl border border-border/40 gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Icons.Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-foreground">Control de Mermas & Desperdicio Alimentario</h3>
            <p className="text-xs text-muted-foreground">
              Registro de productos tirados, caducados o rotos con cálculo de impacto monetario directo en el margen.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Pérdida por Mermas (Mes)</span>
            <span className="text-2xl font-black text-rose-500">{totalWasteLoss.toFixed(2)}€</span>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex h-9 items-center justify-center gap-1.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-white text-xs cursor-pointer shadow-xs"
          >
            <Icons.Plus className="h-4 w-4" />
            <span>Registrar Merma</span>
          </button>
        </div>
      </div>

      {/* Waste Items Table */}
      <div className="overflow-x-auto rounded-3xl border border-border/40 bg-card/75 backdrop-blur-md shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/40 bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase">
              <th className="py-3.5 px-4">Fecha</th>
              <th className="py-3.5 px-4">Producto & Detalle</th>
              <th className="py-3.5 px-4">Cantidad</th>
              <th className="py-3.5 px-4">Causa / Motivo</th>
              <th className="py-3.5 px-4">Pérdida Monetaria</th>
              <th className="py-3.5 px-4">Reportado Por</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {wasteList.map((item) => (
              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3.5 px-4 font-mono text-muted-foreground">{item.date}</td>
                <td className="py-3.5 px-4 font-bold text-foreground">{item.productName}</td>
                <td className="py-3.5 px-4 font-semibold text-foreground">{item.quantity} {item.unit}</td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    {item.reason === "EXPIRATION" ? "Caducidad" : item.reason === "BREAKAGE" ? "Rotura" : item.reason === "CUSTOMER_RETURN" ? "Devolución Cliente" : "Error Cocina"}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono font-black text-rose-500 text-sm">-{item.costAmount.toFixed(2)}€</td>
                <td className="py-3.5 px-4 text-muted-foreground">{item.reportedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card p-6 rounded-3xl border border-border/50 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-200 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-foreground">Registrar Nueva Merma</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddWaste} className="space-y-3">
              <div>
                <label className="font-bold text-muted-foreground uppercase text-[10px]">Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Solomillo de atún"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-background border border-border/50 rounded-xl p-2.5 text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground uppercase text-[10px]">Cantidad</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-background border border-border/50 rounded-xl p-2.5 text-foreground font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground uppercase text-[10px]">Unidad</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-xl p-2.5 text-foreground font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground uppercase text-[10px]">Causa</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as any)}
                    className="w-full bg-background border border-border/50 rounded-xl p-2.5 text-foreground"
                  >
                    <option value="EXPIRATION">Caducidad</option>
                    <option value="BREAKAGE">Rotura</option>
                    <option value="CUSTOMER_RETURN">Devolución Cliente</option>
                    <option value="KITCHEN_ERROR">Error Cocina</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-muted-foreground uppercase text-[10px]">Coste Estimado (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costAmount}
                    onChange={(e) => setCostAmount(Number(e.target.value))}
                    className="w-full bg-background border border-border/50 rounded-xl p-2.5 text-foreground font-extrabold text-red-500"
                  />
                </div>
              </div>

              <button type="submit" className="w-full h-10 rounded-xl bg-rose-600 font-bold text-white text-xs cursor-pointer shadow-lg mt-2">
                Guardar Registro de Merma
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
