"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { MINIMAL_TEMPLATES, MinimalTemplateDef } from "./MinimalTemplates";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  image: string | null;
  maxDaily: number;
  currentStock: number;
}

interface PickupWindow {
  id: string;
  label: string;
  start: string;
  end: string;
  capacity: number;
  isActive: boolean;
}

interface PickupPoint {
  id: string;
  name: string;
  address: string | null;
  schedule: string | null;
  windows?: PickupWindow[];
}

interface ShopData {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  mode: "MINIMAL" | "CUSTOM";
  templateId: string;
  customHtml?: string | null;
  customCss?: string | null;
  paymentProvider?: string | null;
  products: Product[];
  pickupPoints: PickupPoint[];
}

export default function PublicShopView({ shop }: { shop: ShopData }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedPointId, setSelectedPointId] = useState<string>(
    shop.pickupPoints[0]?.id || ""
  );
  const allWindows = shop.pickupPoints.flatMap((p) => (p.windows || []).map((w) => ({ ...w, pointName: p.name, pointId: p.id })));
  const windowsForPoint = (shop.pickupPoints.find((p) => p.id === selectedPointId)?.windows || []).filter((w) => w.isActive);
  const [selectedWindowId, setSelectedWindowId] = useState<string>(windowsForPoint[0]?.id || "");
  const [pickupDate, setPickupDate] = useState<string>(new Date().toISOString().slice(0, 10));
  useEffect(() => {
    const w = (shop.pickupPoints.find((p) => p.id === selectedPointId)?.windows || []).filter((w: any) => w.isActive)[0];
    if (w) setSelectedWindowId(w.id);
  }, [selectedPointId]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [phoneLogin, setPhoneLogin] = useState("");
  const [phoneContact, setPhoneContact] = useState<any | null>(null);
  const [phoneOrders, setPhoneOrders] = useState<any[]>([]);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const tpl: MinimalTemplateDef =
    MINIMAL_TEMPLATES.find((t) => t.id === shop.templateId) || MINIMAL_TEMPLATES[0];

  const updateQuantity = (productId: string, delta: number, maxStock: number) => {
    const current = cart[productId] || 0;
    const next = Math.max(0, Math.min(maxStock, current + delta));
    setCart({ ...cart, [productId]: next });
  };

  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = shop.products.reduce((sum, p) => {
    const qty = cart[p.id] || 0;
    return sum + Number(p.price) * qty;
  }, 0);

  const handlePhoneLookup = async () => {
    const p = phoneLogin.trim().replace(/\D/g, "");
    if (p.length < 9) { setErrorMsg("Introduce 9 dígitos sin +34"); return; }
    setPhoneLoading(true);
    try {
      const res = await fetch(`/api/shop/${shop.slug}/client?phone=${encodeURIComponent(p)}`);
      const data = await res.json();
      if (data.success) {
        setPhoneContact(data.contact);
        setPhoneOrders(data.orders || []);
        if (data.contact) {
          setCustomerName(data.contact.name || customerName);
          setCustomerPhone(p.slice(-9));
        }
        setErrorMsg(null);
      } else setErrorMsg(data.error || "No se encontró");
    } catch { setErrorMsg("Error al consultar"); }
    finally { setPhoneLoading(false); }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg("Por favor escribe tu nombre.");
      return;
    }

    const items = Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (items.length === 0) {
      setErrorMsg("Selecciona al menos 1 producto para hacer el pedido.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/shop/${shop.slug}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          pickupPointId: selectedPointId,
          pickupWindowId: windowsForPoint.length > 0 ? selectedWindowId || windowsForPoint[0]?.id : undefined,
          pickupDate: pickupDate || undefined,
          notes,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al procesar el pedido.");
      }

      setSuccessOrder(data.order);
      setCart({});
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo realizar el pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  if (successOrder) {
    return (
      <div className={`min-h-screen ${tpl.bgClass} flex items-center justify-center p-4`}>
        <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-emerald-500/30 p-8 rounded-3xl shadow-2xl text-center space-y-6">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 animate-bounce">
            <Icons.CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">¡Pedido Confirmado!</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Gracias <span className="font-bold text-emerald-600">{successOrder.customerName}</span>, hemos registrado tu pedido correctamente.
            </p>
          </div>

          {/* Código 4 dígitos minimalista */}
          {successOrder.pickupCode && (
            <div className="bg-red-500/10 border-2 border-red-500/30 p-5 rounded-2xl space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-red-600">Código de recogida</div>
              <div className="text-4xl font-black tracking-[0.3em] text-red-600 font-mono">{successOrder.pickupCode}</div>
              <div className="text-xs text-gray-600">Muestra este código o tu nombre en el obrador</div>
              <button onClick={() => navigator.clipboard?.writeText(successOrder.pickupCode)} className="text-xs font-bold text-red-600 hover:underline">Copiar código</button>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-left space-y-2 text-xs text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between border-b pb-2 border-gray-200 dark:border-gray-700">
              <span className="font-bold">Nº Pedido:</span>
              <span className="font-mono">{successOrder.pickupCode || successOrder.id.slice(-6).toUpperCase()}</span>
            </div>
            <div className="flex justify-between border-b pb-2 border-gray-200 dark:border-gray-700">
              <span className="font-bold">Total a pagar en entrega:</span>
              <span className="font-bold text-emerald-600 text-sm">{Number(successOrder.totalAmount).toFixed(2)}€</span>
            </div>
            {successOrder.pickupPoint && (
              <div>
                <span className="font-bold block">Punto de Recogida:</span>
                <span>{successOrder.pickupPoint.name} {successOrder.pickupPoint.schedule ? `- ${successOrder.pickupPoint.schedule}` : ""}</span>
              </div>
            )}
            {successOrder.pickupWindow && (
              <div>
                <span className="font-bold block">Franja:</span>
                <span>{successOrder.pickupWindow.label} {successOrder.pickupWindow.start}-{successOrder.pickupWindow.end}</span>
              </div>
            )}
            {successOrder.pickupDate && <div className="text-[11px] text-gray-500">Fecha: {new Date(successOrder.pickupDate).toLocaleDateString()}</div>}
          </div>

          <button onClick={() => setSuccessOrder(null)} className={`w-full py-3 rounded-xl font-bold text-xs ${tpl.primaryBtnClass} transition-transform active:scale-95`}>
            Hacer otro pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${tpl.bgClass} ${tpl.fontStyle} pb-24`}>
      {/* Custom CSS injection if in Custom mode */}
      {shop.mode === "CUSTOM" && shop.customCss && (
        <style dangerouslySetInnerHTML={{ __html: shop.customCss }} />
      )}

      {/* Header Banner */}
      <header className={`bg-gradient-to-r ${tpl.headerStyle} text-white py-10 px-4 shadow-lg text-center relative overflow-hidden`}>
        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-white/90">
            {tpl.name} • Pedidos Directos
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{shop.name}</h1>
          {shop.description && <p className="text-sm sm:text-base text-white/80 max-w-xl mx-auto">{shop.description}</p>}
          <button onClick={() => document.getElementById("palmera-order-section")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-full font-black text-sm shadow-lg hover:scale-105 transition-transform">
            <Icons.ShoppingBag className="h-5 w-5 text-red-600" /> Pedir pan
          </button>
        </div>
      </header>

      {/* Sticky cart + phone bar */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Icons.Phone className="h-4 w-4 text-emerald-600" />
            <input type="tel" inputMode="numeric" placeholder="Tu teléfono (sin +34)" value={phoneLogin} onChange={(e) => setPhoneLogin(e.target.value.replace(/\D/g, "").slice(0,9))} onKeyDown={(e)=> e.key==="Enter" && handlePhoneLookup()} className="w-36 px-2 py-1.5 rounded-lg border text-xs bg-gray-50 dark:bg-gray-800" />
            <button onClick={handlePhoneLookup} disabled={phoneLoading} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-50">{phoneLoading ? "..." : "Ver pedidos"}</button>
            {phoneContact && <span className="hidden sm:inline text-emerald-600 font-bold">Hola, {phoneContact.name} • {phoneOrders.length} pedidos</span>}
          </div>
          <button onClick={() => setShowCart(true)} className="relative inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full font-black text-xs shadow hover:bg-red-600">
            <Icons.ShoppingCart className="h-4 w-4" /> {totalItems} • {totalPrice.toFixed(2)}€
            {totalItems>0 && <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{totalItems}</span>}
          </button>
        </div>
      </div>

      {/* Main Content: Render Custom HTML or Minimal Template Catalog */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {shop.mode === "CUSTOM" && shop.customHtml ? (
          <div
            className="prose max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: shop.customHtml }}
          />
        ) : null}

        {/* Pickup Points + Franjas Banner - minimalista */}
        {shop.pickupPoints.length > 0 && (
          <section className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Icons.MapPin className="h-4 w-4 text-emerald-500" /> Puntos de Recogida
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {shop.pickupPoints.map((pt) => (
                <label key={pt.id} onClick={() => { setSelectedPointId(pt.id); const w = pt.windows?.[0]?.id; if (w) setSelectedWindowId(w); }} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedPointId === pt.id ? "border-emerald-500 bg-emerald-500/5 shadow-xs" : "border-gray-200 dark:border-gray-800 hover:border-gray-300"}`}>
                  <input type="radio" name="pickupPoint" checked={selectedPointId === pt.id} onChange={() => setSelectedPointId(pt.id)} className="mt-1 accent-emerald-500" />
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">{pt.name}</div>
                    {pt.address && <div className="text-[11px] text-gray-500">{pt.address}</div>}
                    {pt.schedule && <div className="text-[10px] font-semibold text-emerald-600 mt-1">🕒 {pt.schedule}</div>}
                  </div>
                </label>
              ))}
            </div>
            {/* Franjas configurables */}
            {windowsForPoint.length > 0 && (
              <div>
                <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5"><Icons.Clock className="h-4 w-4 text-red-500" /> Elige horario de recogida</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {windowsForPoint.map((w) => (
                    <label key={w.id} onClick={() => setSelectedWindowId(w.id)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${selectedWindowId === w.id ? "border-red-500 bg-red-500/5" : "border-gray-200 dark:border-gray-700"}`}>
                      <div>
                        <div className="text-xs font-bold">{w.label}</div>
                        <div className="text-[11px] text-gray-500">{w.start} - {w.end}</div>
                      </div>
                      <span className="text-[10px] font-bold bg-red-500/10 text-red-600 px-2 py-0.5 rounded">Cap {w.capacity}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-2">
                  <label className="text-xs font-bold text-gray-600 block mb-1">Fecha de recogida</label>
                  <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} min={new Date().toISOString().slice(0,10)} className="w-full px-3 py-1.5 text-xs rounded-xl border bg-gray-50 dark:bg-gray-800" />
                </div>
              </div>
            )}
          </section>
        )}

        {/* Products Section */}
        <section id="palmera-order-section" className="space-y-4">
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <Icons.ShoppingBag className={`h-5 w-5 ${tpl.accentTextClass}`} />
            Productos Disponibles Hoy
          </h2>

          {shop.products.length === 0 ? (
            <div className="text-center py-12 bg-white/50 rounded-2xl text-gray-500 text-sm">
              No hay productos cargados en este momento.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {shop.products.map((product) => {
                const qty = cart[product.id] || 0;
                const isSoldOut = product.currentStock <= 0;

                return (
                  <div
                    key={product.id}
                    className={`flex flex-col justify-between p-5 rounded-2xl border transition-all ${tpl.cardClass} ${
                      isSoldOut ? "opacity-60 grayscale-[40%]" : ""
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-extrabold text-base leading-tight">{product.name}</h3>
                        <span className="text-base font-black px-2.5 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 shrink-0 ml-2">
                          {Number(product.price).toFixed(2)}€
                        </span>
                      </div>
                      {product.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      {isSoldOut ? (
                        <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-md">
                          ¡Agotado hoy!
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-gray-500">
                          Quedan: <strong className="text-gray-900 dark:text-white">{product.currentStock}</strong>
                        </span>
                      )}

                      {!isSoldOut && (
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, -1, product.currentStock)}
                            disabled={qty === 0}
                            className="h-8 w-8 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center font-bold text-sm shadow-xs disabled:opacity-30 active:scale-95 transition-all"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-extrabold text-xs">{qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, 1, product.currentStock)}
                            disabled={qty >= product.currentStock}
                            className="h-8 w-8 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center font-bold text-sm shadow-xs disabled:opacity-30 active:scale-95 transition-all"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Customer Order Checkout Box */}
        {totalItems > 0 && (
          <form
            onSubmit={handlePlaceOrder}
            className="bg-white dark:bg-gray-900 border-2 border-emerald-500/40 p-6 rounded-3xl shadow-xl space-y-4 animate-in slide-in-from-bottom-4 duration-300"
          >
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
              <h3 className="font-extrabold text-base flex items-center gap-2 text-emerald-600">
                <Icons.CheckCircle2 className="h-5 w-5" />
                Resumen de tu pedido ({totalItems} uds)
              </h3>
              <span className="text-xl font-black text-emerald-600">{totalPrice.toFixed(2)}€</span>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
                <Icons.AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Tu nombre (Obligatorio) *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej. María García"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Teléfono (Opcional para avisos)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Ej. 612 345 678"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Observaciones o nota adicional
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. El pan bien tostado por favor"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-hidden focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 rounded-2xl font-black text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer`}
            >
              {submitting ? (
                <>
                  <Icons.Loader2 className="h-5 w-5 animate-spin" />
                  <span>Enviando pedido...</span>
                </>
              ) : (
                <>
                  <Icons.Send className="h-5 w-5" />
                  <span>Confirmar Pedido • {totalPrice.toFixed(2)}€</span>
                </>
              )}
            </button>

            <p className="text-[10px] text-center text-gray-400">
              Pago directo en el punto de recogida. No se requiere tarjeta online.
            </p>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl font-black text-xs bg-red-500 text-white hover:bg-red-600 flex items-center justify-center gap-2">
                <Icons.Package className="h-4 w-4" /> Recoger en tienda • {totalPrice.toFixed(2)}€
              </button>
              <button type="button" onClick={async (e)=>{ e.preventDefault(); const shopRes = await fetch(`/api/shop/${shop.slug}/client?phone=${encodeURIComponent(customerPhone||phoneLogin)}`).then(r=>r.json()).catch(()=>null); handlePlaceOrder(e as any); }} className="flex-1 py-3 rounded-xl font-black text-xs bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-2">
                <Icons.CreditCard className="h-4 w-4" /> Pagar con Redsys
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Cart Popup */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={()=>setShowCart(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-black flex items-center gap-2"><Icons.ShoppingCart className="h-5 w-5 text-red-500" /> Tu carrito ({totalItems})</h3>
              <button onClick={()=>setShowCart(false)} className="p-2 rounded-full hover:bg-gray-100"><Icons.X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {Object.entries(cart).filter(([,q])=> (q as number)>0).map(([pid,qty])=>{
                const p = shop.products.find(x=>x.id===pid);
                if(!p) return null;
                return <div key={pid} className="flex justify-between items-center p-2 rounded-xl bg-gray-50 dark:bg-gray-800"><div><div className="font-bold text-sm">{p.name}</div><div className="text-xs text-gray-500">{Number(p.price).toFixed(2)}€ × {qty as number}</div></div><div className="flex items-center gap-1"><button onClick={()=>updateQuantity(pid,-1, p.currentStock)} className="h-7 w-7 rounded bg-white border">-</button><span className="w-6 text-center font-bold text-xs">{String(qty)}</span><button onClick={()=>updateQuantity(pid,1, p.currentStock)} className="h-7 w-7 rounded bg-white border">+</button></div></div>;
              })}
              {totalItems===0 && <div className="text-center py-8 text-sm text-gray-500">Carrito vacío</div>}
            </div>
            <div className="p-4 border-t space-y-3">
              <div className="flex justify-between font-black">Total <span>{totalPrice.toFixed(2)}€</span></div>
              {phoneOrders.length>0 && <div className="text-xs text-gray-600">Historial: {phoneOrders.length} pedidos previos con este teléfono</div>}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={(e)=>{ setShowCart(false); handlePlaceOrder(e as any); }} className="py-3 rounded-xl bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1"><Icons.Package className="h-4 w-4" /> Recoger</button>
                <button onClick={(e)=>{ setShowCart(false); handlePlaceOrder(e as any); }} className="py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1"><Icons.CreditCard className="h-4 w-4" /> Pagar Redsys</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone history mini */}
      {phoneContact && phoneOrders.length>0 && (
        <div className="max-w-3xl mx-auto px-4 pb-4">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs">
            <div className="font-bold text-emerald-700">Historial de {phoneContact.name} ({phoneLogin})</div>
            <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
              {phoneOrders.slice(0,5).map((o:any)=><div key={o.id} className="flex justify-between"><span>#{o.pickupCode || o.id.slice(-6)} {o.pickupWindow?.label || ""} {new Date(o.pickupDate||o.createdAt).toLocaleDateString()}</span><span>{Number(o.totalAmount).toFixed(2)}€ {o.status}</span></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
