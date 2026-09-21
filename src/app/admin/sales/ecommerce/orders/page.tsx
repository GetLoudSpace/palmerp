"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";

export default function OrdersManagerPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shop/orders");
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState("");

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/shop/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus, verifiedAt: (data.order as any)?.verifiedAt || o.verifiedAt } : o)));
      } else alert(data.error || "Error");
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecogido = async (orderId: string) => {
    await handleUpdateStatus(orderId, "DELIVERED");
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = filterStatus === "ALL" ? true : o.status === filterStatus;
    if (!matchesStatus) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      o.customerName?.toLowerCase().includes(q) ||
      o.pickupCode?.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) ||
      o.pickupWindow?.label?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Icons.Loader2 className="h-8 w-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-foreground md:text-2xl flex items-center gap-2">
            <Icons.ListOrdered className="h-6 w-6 text-red-500" />
            Gestión de Pedidos
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Revisa los pedidos de pan y encargos recibidos hoy desde la web pública.
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground hover:bg-muted transition-all cursor-pointer"
        >
          <Icons.RefreshCw className="h-4 w-4 text-red-500" />
          <span>Refrescar Pedidos</span>
        </button>
      </div>

      {/* Search by name/code */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Icons.Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar por nombre o código 4 dígitos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border/50 bg-background outline-hidden focus:border-red-500" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {["ALL", "PENDING", "CONFIRMED", "READY", "DELIVERED", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer shrink-0 ${
                filterStatus === st
                  ? "bg-red-500 text-white shadow-md"
                  : "bg-card border border-border/40 text-muted-foreground hover:bg-muted"
              }`}
            >
              {st === "ALL"
                ? `Todos (${orders.length})`
                : st === "PENDING"
                ? `Pendientes (${orders.filter((o) => o.status === "PENDING").length})`
                : st === "CONFIRMED"
                ? `Confirmados (${orders.filter((o) => o.status === "CONFIRMED").length})`
                : st === "READY"
                ? `Listos (${orders.filter((o) => o.status === "READY").length})`
                : st === "DELIVERED"
                ? `Entregados (${orders.filter((o) => o.status === "DELIVERED").length})`
                : st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List / Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-card border border-border/40 p-12 rounded-2xl text-center text-xs text-muted-foreground">
          No hay pedidos con el estado seleccionado.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`bg-card border rounded-2xl p-5 space-y-4 shadow-xs transition-all ${
                order.status === "PENDING"
                  ? "border-red-500/50 ring-2 ring-red-500/10"
                  : "border-border/40"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    #{order.pickupCode || order.id.slice(-6).toUpperCase()} • {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {order.pickupCode && <span className="ml-1 px-1.5 py-0.5 rounded bg-red-500 text-white font-black tracking-widest">CODE {order.pickupCode}</span>}
                  </span>
                  <h3 className="font-extrabold text-sm text-foreground mt-0.5">{order.customerName}</h3>
                  {order.customerPhone && (
                    <a href={`tel:${order.customerPhone}`} className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 mt-0.5">
                      <Icons.Phone className="h-3 w-3" /> {order.customerPhone}
                    </a>
                  )}
                </div>
                <span className="text-base font-black text-red-500">{Number(order.totalAmount).toFixed(2)}€</span>
              </div>

              {(order.pickupPoint || order.pickupWindow) && (
                <div className="bg-muted/30 p-2.5 rounded-xl text-xs space-y-0.5 border border-border/20">
                  {order.pickupPoint && <div className="font-bold text-foreground flex items-center gap-1"><Icons.MapPin className="h-3.5 w-3.5 text-emerald-500" />{order.pickupPoint.name}</div>}
                  {order.pickupWindow && <div className="text-[11px] font-bold text-red-600">Franja: {order.pickupWindow.label} {order.pickupWindow.start}-{order.pickupWindow.end} (Cap {order.pickupWindow.capacity})</div>}
                  {order.pickupDate && <div className="text-[10px] text-muted-foreground">Fecha recogida: {new Date(order.pickupDate).toLocaleDateString()}</div>}
                  {!order.pickupWindow && order.pickupPoint?.schedule && <div className="text-[10px] text-muted-foreground pl-4">🕒 {order.pickupPoint.schedule}</div>}
                </div>
              )}

              {/* Order Lines */}
              <div className="space-y-1.5 pt-2 border-t border-border/20">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Productos encargados:</div>
                <div className="space-y-1">
                  {order.lines.map((line: any) => (
                    <div key={line.id} className="flex justify-between text-xs font-medium text-foreground">
                      <span>
                        <strong className="text-red-500">{line.quantity}x</strong> {line.product?.name || "Producto"}
                      </span>
                      <span>{(Number(line.unitPrice) * line.quantity).toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              </div>

              {order.notes && (
                <div className="text-[11px] bg-red-500/10 text-red-600 dark:text-red-400 p-2 rounded-lg italic border border-red-500/20">
                  "{order.notes}"
                </div>
              )}

              {/* Acciones simplificadas: Recogido / Finalizar sin código */}
              <div className="pt-2 border-t border-border/20 flex flex-wrap gap-1.5">
                {order.status === "PENDING" && (
                  <button onClick={() => handleUpdateStatus(order.id, "CONFIRMED")} className="flex-1 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700">Confirmar</button>
                )}
                {(order.status === "PENDING" || order.status === "CONFIRMED") && (
                  <button onClick={() => handleUpdateStatus(order.id, "READY")} className="flex-1 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700">Listo</button>
                )}
                {(order.status === "READY" || order.status === "CONFIRMED" || order.status === "PENDING") && (
                  <button onClick={() => handleRecogido(order.id)} className="flex-1 py-1.5 bg-gray-900 text-white font-bold text-xs rounded-lg hover:bg-black flex items-center justify-center gap-1.5">
                    <Icons.CheckCircle2 className="h-4 w-4" /> {order.status === "READY" ? "Recogido" : "Finalizar pedido"}
                  </button>
                )}
                {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
                  <button onClick={() => handleUpdateStatus(order.id, "CANCELLED")} className="px-2.5 py-1.5 text-red-500 hover:bg-red-500/10 font-bold text-xs rounded-lg">Cancelar</button>
                )}
              </div>
              {order.pickupCode && <div className="text-[10px] text-muted-foreground text-center">Código cliente: <span className="font-mono font-bold">{order.pickupCode}</span> — buscable arriba</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
