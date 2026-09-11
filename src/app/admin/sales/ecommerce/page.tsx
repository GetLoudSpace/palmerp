"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import Link from "next/link";

export default function EcommerceDashboardPage() {
  const [shop, setShop] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const [dashSearch, setDashSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [shopRes, ordersRes] = await Promise.all([
        fetch("/api/shop"),
        fetch("/api/shop/orders"),
      ]);

      if (shopRes.ok) {
        const shopData = await shopRes.json().catch(() => null);
        if (shopData?.success) setShop(shopData.shop);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json().catch(() => null);
        if (ordersData?.success) setOrders(ordersData.orders || []);
      }
    } catch (e) {
      console.error("Error cargando dashboard e-commerce:", e);
    } finally {
      setLoading(false);
    }
  };

  const getPublicUrl = () => {
    if (!shop) return "";
    if (shop.customDomain && shop.domainStatus === "VERIFIED") {
      return `https://${shop.customDomain}`;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "https://palmerp.es";
    return `${origin}/shop/${shop.slug || "tienda"}`;
  };

  const copyWhatsAppLink = () => {
    const url = getPublicUrl();
    const text = `🥖 ¡Hola! Ya podéis hacer vuestro pedido de pan para hoy desde este enlace: ${url}`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleDashRecogido = async (orderId: string) => {
    try {
      const res = await fetch("/api/shop/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, status: "DELIVERED" }) });
      const data = await res.json();
      if (data.success) setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "DELIVERED" } : o)));
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Icons.Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const totalToday = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  return (
    <div className="space-y-8 relative">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-4">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl flex items-center gap-2">
            <Icons.Store className="h-6 w-6 text-amber-500" />
            E-Commerce & Pedidos Online
          </div>
          <div className="text-xs text-muted-foreground block mt-1 flex items-center gap-2">
            <span>Configura tu tienda pública, gestiona pedidos del día y difunde el enlace por WhatsApp.</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Solution 1: Direct Open in New Tab Button */}
          <a
            href={getPublicUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <Icons.ExternalLink className="h-3.5 w-3.5" />
            <span>Abrir Web Cliente</span>
          </a>

          {/* Solution 2: In-ERP Modal Preview Button */}
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            <Icons.Eye className="h-3.5 w-3.5" />
            <span>Vista Previa ERP</span>
          </button>

          <button
            onClick={copyWhatsAppLink}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Icons.Check className="h-4 w-4" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Icons.Share2 className="h-4 w-4" />
                <span>Enlace WhatsApp</span>
              </>
            )}
          </button>

          <Link
            href="/admin/sales/ecommerce/shop"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground hover:bg-muted transition-all"
          >
            <Icons.Settings className="h-4 w-4 text-amber-500" />
            <span>Diseñar Web</span>
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card border border-border/40 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Pedidos Pendientes</div>
            <div className="text-2xl font-black text-amber-500 mt-1">{pendingOrders.length}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Icons.Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Total Pedidos Hoy</div>
            <div className="text-2xl font-black text-foreground mt-1">{orders.length}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Icons.ShoppingBag className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Ventas Estimadas</div>
            <div className="text-2xl font-black text-emerald-500 mt-1">{totalToday.toFixed(2)}€</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Icons.DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Modo Web Activo</div>
            <div className="text-sm font-bold text-foreground mt-1 uppercase flex items-center gap-1.5">
              {shop?.mode === "MINIMAL" ? (
                <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  Minimal ({shop?.templateId})
                </span>
              ) : (
                <span className="text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-md">
                  Custom (IA Chat)
                </span>
              )}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Icons.Sparkles className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs to Shop Sub-features */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/sales/ecommerce/shop"
          className="group bg-card border border-border/40 p-6 rounded-2xl hover:border-amber-500/40 transition-all space-y-3"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icons.LayoutTemplate className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-amber-500 transition-colors">
              1. Diseñar Web & Plantillas
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Elige entre las 10 plantillas del modo Minimal o chatea con la IA en el modo Custom.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/sales/ecommerce/orders"
          className="group bg-card border border-border/40 p-6 rounded-2xl hover:border-amber-500/40 transition-all space-y-3"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icons.ListOrdered className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-amber-500 transition-colors">
              2. Gestionar Pedidos ({pendingOrders.length} nuevos)
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Ve las encargas de pan en tiempo real y marca cuando están listas para recogida.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/sales/ecommerce/domain"
          className="group bg-card border border-border/40 p-6 rounded-2xl hover:border-amber-500/40 transition-all space-y-3"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icons.Globe className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-amber-500 transition-colors">
              3. Dominio Personalizado
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Conecta tu propio dominio (ej: `pedidos.panaderiajuan.es`) mientras el admin se queda en `palmerp.es`.
            </p>
          </div>
        </Link>
      </div>

      {/* Gestión rápida de pedidos — en dashboard principal */}
      <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/30 pb-3">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Icons.Clock className="h-4 w-4 text-amber-500" />
            Pedidos — gestión rápida
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Icons.Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Buscar código o nombre..." value={dashSearch} onChange={(e) => setDashSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-xs rounded-lg border bg-background w-48" />
            </div>
            <Link href="/admin/sales/ecommerce/orders" className="text-xs font-bold text-amber-500 hover:underline whitespace-nowrap">
              Ver todos →
            </Link>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Aún no hay pedidos. ¡Comparte el enlace!</div>
        ) : (
          <div className="divide-y divide-border/20 max-h-[380px] overflow-y-auto pr-1">
            {orders
              .filter((o) => {
                if (!dashSearch) return true;
                const q = dashSearch.toLowerCase();
                return o.customerName?.toLowerCase().includes(q) || o.pickupCode?.toLowerCase().includes(q) || o.id.toLowerCase().includes(q);
              })
              .slice(0, 20)
              .map((order) => (
                <div key={order.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-foreground flex items-center gap-2">
                      <span className="font-mono text-[11px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black">{order.pickupCode || order.id.slice(-6).toUpperCase()}</span>
                      {order.customerName}
                    </div>
                    <div className="text-muted-foreground text-[10px] truncate">
                      {order.pickupPoint?.name || "Sin punto"} • {order.pickupWindow?.label || ""} • {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {order.lines?.length || 0} prod
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-extrabold hidden sm:inline">{Number(order.totalAmount).toFixed(2)}€</span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${order.status === "PENDING" ? "bg-amber-500/10 text-amber-500" : order.status === "CONFIRMED" ? "bg-blue-500/10 text-blue-500" : order.status === "READY" ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-500/10 text-gray-500"}`}>{order.status}</span>
                    {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                      <button onClick={() => handleDashRecogido(order.id)} className="px-2.5 py-1 rounded-lg bg-gray-900 text-white font-bold text-[11px] hover:bg-black flex items-center gap-1">
                        <Icons.CheckCircle2 className="h-3 w-3" /> Recogido
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modal / Drawer for Live Web Preview */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border/40 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between p-4 border-b border-border/30 bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-sm text-foreground flex items-center gap-2">
                  <Icons.Eye className="h-4 w-4 text-emerald-500" />
                  Previsualización en Vivo de la Web de Pedidos
                </span>

                {/* Device Switcher */}
                <div className="flex items-center bg-background border border-border/40 rounded-xl p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                      previewDevice === "mobile"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icons.Smartphone className="h-3.5 w-3.5" />
                    <span>Móvil</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                      previewDevice === "desktop"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icons.Monitor className="h-3.5 w-3.5" />
                    <span>Escritorio</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={getPublicUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1 mr-2"
                >
                  Abrir en pestaña nueva <Icons.ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="h-8 w-8 rounded-xl bg-background border border-border/40 text-muted-foreground hover:text-foreground flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body / iframe */}
            <div className="flex-1 bg-gray-900 flex items-center justify-center p-4 overflow-hidden">
              <div
                className={`bg-white h-full transition-all duration-300 rounded-2xl overflow-hidden shadow-2xl border border-gray-700 ${
                  previewDevice === "mobile" ? "w-[380px] max-h-[720px] rounded-[36px] border-8 border-gray-800" : "w-full"
                }`}
              >
                <iframe
                  src={getPublicUrl()}
                  className="w-full h-full border-0"
                  title="Vista previa web de pedidos"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
