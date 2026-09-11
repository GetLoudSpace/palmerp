"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { MINIMAL_TEMPLATES } from "@/components/shop/MinimalTemplates";

export default function ShopConfiguratorPage() {
  const [shop, setShop] = useState<any | null>(null);
  const [mode, setMode] = useState<"MINIMAL" | "CUSTOM">("MINIMAL");
  const [templateId, setTemplateId] = useState("obrador-tradicional");
  const [products, setProducts] = useState<any[]>([]);
  const [pickupPoints, setPickupPoints] = useState<any[]>([]);
  const [windows, setWindows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [newWinPointId, setNewWinPointId] = useState("");
  const [newWinLabel, setNewWinLabel] = useState("");
  const [newWinStart, setNewWinStart] = useState("08:00");
  const [newWinEnd, setNewWinEnd] = useState("13:00");
  const [newWinCap, setNewWinCap] = useState("30");

  // Form states for new product
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("1.50");
  const [newProdMax, setNewProdMax] = useState("50");
  const [newProdDesc, setNewProdDesc] = useState("");

  // Form states for new pickup point
  const [newPtName, setNewPtName] = useState("");
  const [newPtAddr, setNewPtAddr] = useState("");
  const [newPtSched, setNewPtSched] = useState("");

  // AI Chat states for Custom Mode
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "¡Hola! Soy tu asistente de diseño. Dime cómo quieres que sea tu página web (colores, distribución, imágenes o historia del negocio) y generaré el diseño en tiempo real." },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [aiBuilding, setAiBuilding] = useState(false);

  useEffect(() => {
    loadShopInfo();
  }, []);

  const loadShopInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shop");
      const data = await res.json();
      if (data.success && data.shop) {
        setShop(data.shop);
        setMode(data.shop.mode || "MINIMAL");
        setTemplateId(data.shop.templateId || "obrador-tradicional");
        setProducts(data.shop.products || []);
        setPickupPoints(data.shop.pickupPoints || []);
      }
      // cargar franjas configurables
      try {
        const wRes = await fetch("/api/shop/pickup-windows");
        const wData = await wRes.json();
        if (wData.success) setWindows(wData.windows || []);
      } catch {}
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShopConfig = async (overrideData?: any) => {
    setSaving(true);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          templateId,
          name: shop?.name,
          description: shop?.description,
          ...overrideData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShop(data.shop);
        showToast("¡Configuración guardada!");
      }
    } catch (e) {
      showToast("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    try {
      const res = await fetch("/api/shop/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProdName,
          price: newProdPrice,
          maxDaily: newProdMax,
          currentStock: newProdMax,
          description: newProdDesc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts([...products, data.product]);
        setNewProdName("");
        setNewProdDesc("");
        showToast("Producto añadido");
      }
    } catch (e) {
      showToast("Error al añadir producto");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await fetch(`/api/shop/products?id=${id}`, { method: "DELETE" });
      setProducts(products.filter((p) => p.id !== id));
      showToast("Producto eliminado");
    } catch (e) {
      showToast("Error al eliminar");
    }
  };

  const handleAddPickupPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPtName.trim()) return;

    try {
      const res = await fetch("/api/shop/pickup-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPtName,
          address: newPtAddr,
          schedule: newPtSched,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPickupPoints([...pickupPoints, data.pickupPoint]);
        setNewPtName("");
        setNewPtAddr("");
        setNewPtSched("");
        showToast("Punto de recogida añadido");
      }
    } catch (e) {
      showToast("Error al añadir punto");
    }
  };

  const handleDeletePickupPoint = async (id: string) => {
    try {
      await fetch(`/api/shop/pickup-points?id=${id}`, { method: "DELETE" });
      setPickupPoints(pickupPoints.filter((pt) => pt.id !== id));
      setWindows(windows.filter((w: any) => w.pickupPointId !== id));
      showToast("Punto de recogida eliminado");
    } catch (e) {
      showToast("Error al eliminar punto");
    }
  };

  const handleAddWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWinPointId || !newWinLabel.trim()) return;
    try {
      const res = await fetch("/api/shop/pickup-windows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickupPointId: newWinPointId, label: newWinLabel, start: newWinStart, end: newWinEnd, capacity: newWinCap }),
      });
      const data = await res.json();
      if (data.success) {
        setWindows([...windows, data.window]);
        setNewWinLabel("");
        showToast("Franja añadida");
      } else showToast(data.error || "Error");
    } catch { showToast("Error al añadir franja"); }
  };

  const handleDeleteWindow = async (id: string) => {
    try {
      await fetch(`/api/shop/pickup-windows?id=${id}`, { method: "DELETE" });
      setWindows(windows.filter((w: any) => w.id !== id));
      showToast("Franja eliminada");
    } catch { showToast("Error"); }
  };

  const handleUpdateProductStock = async (p: any, newMax: string) => {
    const max = Math.max(0, parseInt(newMax, 10) || 0);
    const delta = max - Number(p.maxDaily);
    try {
      const res = await fetch("/api/shop/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, name: p.name, price: String(p.price), maxDaily: String(max), currentStock: String(Math.max(0, Number(p.currentStock) + delta)), description: p.description || "" }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts(products.map((x) => (x.id === p.id ? { ...x, maxDaily: max, currentStock: Math.max(0, Number(x.currentStock) + delta) } : x)));
        showToast(`Producción actualizada: ${max} ud (stock ajustado ${delta >= 0 ? "+" : ""}${delta})`);
      }
    } catch { showToast("Error al actualizar"); }
  };

  const handleSendAIChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || aiBuilding) return;

    const userText = inputPrompt;
    setInputPrompt("");
    const newHistory = [...chatMessages, { role: "user" as const, content: userText }];
    setChatMessages(newHistory);
    setAiBuilding(true);

    try {
      const res = await fetch("/api/shop/ai-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: newHistory,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages([...newHistory, { role: "assistant", content: data.message }]);
        if (data.customHtml) {
          setShop({ ...shop, customHtml: data.customHtml, customCss: data.customCss });
          showToast("¡Diseño web actualizado por la IA!");
        }
      } else {
        setChatMessages([...newHistory, { role: "assistant", content: `Error: ${data.error}` }]);
      }
    } catch (e: any) {
      setChatMessages([...newHistory, { role: "assistant", content: "No se pudo conectar con el motor de IA." }]);
    } finally {
      setAiBuilding(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Icons.Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative pb-12">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[100] bg-emerald-600 text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <Icons.CheckCircle className="h-4 w-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-foreground md:text-2xl flex items-center gap-2">
            <Icons.LayoutTemplate className="h-6 w-6 text-amber-500" />
            Configurador de Web & Modos
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Elige entre el Modo Minimal (10 Plantillas sin código) o el Modo Custom (Diseño conversacional con IA).
          </p>
        </div>

        <button
          onClick={() => handleSaveShopConfig()}
          disabled={saving}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-metallic-orange text-white px-5 text-xs font-bold shadow-md hover:bg-amber-600 disabled:opacity-50 transition-all cursor-pointer"
        >
          {saving ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Save className="h-4 w-4" />}
          <span>Guardar Cambios</span>
        </button>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 gap-4 bg-card border border-border/40 p-2 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            setMode("MINIMAL");
            handleSaveShopConfig({ mode: "MINIMAL" });
          }}
          className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            mode === "MINIMAL"
              ? "bg-amber-500 text-white shadow-md"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Icons.LayoutGrid className="h-4 w-4" />
          <span>Modo Minimal (10 Plantillas)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("CUSTOM");
            handleSaveShopConfig({ mode: "CUSTOM" });
          }}
          className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            mode === "CUSTOM"
              ? "bg-purple-600 text-white shadow-md"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Icons.Bot className="h-4 w-4" />
          <span>Modo Custom (IA Conversacional Chat)</span>
        </button>
      </div>

      {/* MINIMAL MODE: 10 Templates Selector */}
      {mode === "MINIMAL" && (
        <div className="space-y-6">
          <div className="bg-card border border-border/40 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Icons.Sparkles className="h-4 w-4 text-amber-500" />
              Selecciona una de las 10 Plantillas Prediseñadas
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {MINIMAL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTemplateId(t.id);
                    handleSaveShopConfig({ templateId: t.id });
                  }}
                  className={`flex flex-col justify-between text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    templateId === t.id
                      ? "border-amber-500 bg-amber-500/10 shadow-md ring-2 ring-amber-500/20"
                      : "border-border/40 bg-background hover:border-border"
                  }`}
                >
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md inline-block">
                      {t.badge}
                    </span>
                    <h3 className="font-extrabold text-xs text-foreground">{t.name}</h3>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{t.description}</p>
                  </div>
                  {templateId === t.id && (
                    <div className="mt-3 text-[10px] font-extrabold text-amber-500 flex items-center gap-1">
                      <Icons.CheckCircle2 className="h-3.5 w-3.5" /> Activa
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM MODE: Conversational AI Web Builder */}
      {mode === "CUSTOM" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Chat interface */}
          <div className="bg-card border border-border/40 rounded-2xl p-5 flex flex-col h-[550px]">
            <div className="flex items-center justify-between border-b border-border/30 pb-3 mb-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Icons.MessageSquare className="h-4 w-4 text-purple-500" />
                Chat con IA Diseñador Web
              </h2>
              <span className="text-[10px] bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded font-bold">
                GPT / Claude / Nvidia
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 text-xs ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white font-medium rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none border border-border/40"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {aiBuilding && (
                <div className="flex items-center gap-2 text-xs text-purple-500 font-bold p-3 bg-purple-500/5 rounded-xl border border-purple-500/20">
                  <Icons.Loader2 className="h-4 w-4 animate-spin" />
                  <span>La IA está generando tu diseño web...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSendAIChat} className="mt-4 pt-3 border-t border-border/30 flex gap-2">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ej. Pon un tono rústico, añade foto de panadero y cambia el título..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-border/50 bg-background outline-hidden focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={aiBuilding || !inputPrompt.trim()}
                className="bg-purple-600 text-white font-bold text-xs px-4 rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Icons.Send className="h-3.5 w-3.5" />
                <span>Enviar</span>
              </button>
            </form>
          </div>

          {/* Right: Live Preview Panel */}
          <div className="bg-card border border-border/40 rounded-2xl p-5 flex flex-col h-[550px]">
            <div className="flex items-center justify-between border-b border-border/30 pb-3 mb-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Icons.Eye className="h-4 w-4 text-emerald-500" />
                Previsualización en Vivo
              </h2>
              <a
                href={`/shop/${shop?.slug}`}
                target="_blank"
                className="text-[10px] text-amber-500 font-bold hover:underline flex items-center gap-1"
              >
                Abrir en nueva pestaña <Icons.ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex-1 bg-white rounded-xl overflow-hidden border border-border/40 p-4 text-black overflow-y-auto">
              {shop?.customHtml ? (
                <div>
                  {shop.customCss && <style dangerouslySetInnerHTML={{ __html: shop.customCss }} />}
                  <div dangerouslySetInnerHTML={{ __html: shop.customHtml }} />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 text-center">
                  Escribe en el chat con la IA para empezar a diseñar tu página web personalizada.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTS & PICKUP POINTS MANAGEMENT */}
      <div className="grid gap-6 lg:grid-cols-2 pt-4">
        {/* Products Management */}
        <div className="bg-card border border-border/40 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Icons.ShoppingBag className="h-4 w-4 text-amber-500" />
              Gestión de Productos del Día
            </h2>

            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch("/api/products?isSellable=true");
                  const data = await res.json();
                  if (data.success && data.products.length > 0) {
                    const ids = data.products.map((p: any) => p.id);
                    const impRes = await fetch("/api/shop/import-products", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ coreProductIds: ids }),
                    });
                    const impData = await impRes.json();
                    if (impData.success) {
                      showToast(impData.message);
                      loadShopInfo();
                    }
                  } else {
                    showToast("No hay productos vendibles en el Catálogo Pilar.");
                  }
                } catch (e) {
                  showToast("Error al importar productos.");
                }
              }}
              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Icons.Download className="h-3.5 w-3.5" />
              <span>Importar de Catálogo Pilar</span>
            </button>
          </div>

          <form onSubmit={handleAddProduct} className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/30">
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                type="text"
                placeholder="Nombre (ej. Pan Cereal)"
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border/50 bg-background"
                required
              />
              <input
                type="number"
                step="0.1"
                placeholder="Precio (€)"
                value={newProdPrice}
                onChange={(e) => setNewProdPrice(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border/50 bg-background"
                required
              />
              <input
                type="number"
                placeholder="Stock Diario"
                value={newProdMax}
                onChange={(e) => setNewProdMax(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border/50 bg-background"
                required
              />
            </div>
            <input
              type="text"
              placeholder="Descripción breve (opcional)"
              value={newProdDesc}
              onChange={(e) => setNewProdDesc(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-border/50 bg-background"
            />
            <button
              type="submit"
              className="w-full py-2 bg-amber-500 text-white font-bold text-xs rounded-lg hover:bg-amber-600 cursor-pointer"
            >
              + Añadir Producto Al Catálogo
            </button>
          </form>

          <div className="divide-y divide-border/30">
            {products.map((p) => (
              <div key={p.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex-1">
                  <div className="font-bold text-foreground">{p.name} — {Number(p.price).toFixed(2)}€</div>
                  <div className="text-[10px] text-muted-foreground">
                    Quedan: {p.currentStock} / Producción hoy: {p.maxDaily}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} defaultValue={p.maxDaily} id={`max-${p.id}`} placeholder="max" className="w-16 px-2 py-1 text-xs rounded border border-border/50 bg-background" />
                  <button onClick={() => { const el = document.getElementById(`max-${p.id}`) as HTMLInputElement; handleUpdateProductStock(p, el?.value || String(p.maxDaily)); }} className="px-2 py-1 rounded bg-amber-500 text-white font-bold hover:bg-amber-600">Ajustar</button>
                  <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:text-red-600 p-1"><Icons.Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pickup Points Management */}
        <div className="bg-card border border-border/40 p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Icons.MapPin className="h-4 w-4 text-emerald-500" />
            Puntos de Reparto / Recogida
          </h2>

          <form onSubmit={handleAddPickupPoint} className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/30">
            <input
              type="text"
              placeholder="Nombre del punto (ej. Plaza Mayor)"
              value={newPtName}
              onChange={(e) => setNewPtName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-border/50 bg-background"
              required
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Dirección completa"
                value={newPtAddr}
                onChange={(e) => setNewPtAddr(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border/50 bg-background"
              />
              <input
                type="text"
                placeholder="Horario (ej. 10:00 - 11:00)"
                value={newPtSched}
                onChange={(e) => setNewPtSched(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border/50 bg-background"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 cursor-pointer"
            >
              + Añadir Punto de Recogida
            </button>
          </form>

          <div className="divide-y divide-border/30">
            {pickupPoints.map((pt) => (
              <div key={pt.id} className="py-2.5 space-y-2 text-xs border-b border-border/20 last:border-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground">{pt.name}</div>
                    <div className="text-[10px] text-muted-foreground">{pt.address} {pt.schedule ? `(${pt.schedule})` : ""}</div>
                  </div>
                  <button onClick={() => handleDeletePickupPoint(pt.id)} className="text-red-500 hover:text-red-600 p-1"><Icons.Trash2 className="h-4 w-4" /></button>
                </div>
                {/* Franjas configurables por punto */}
                <div className="ml-2 pl-3 border-l-2 border-amber-500/20 space-y-1.5">
                  <div className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1"><Icons.Clock className="h-3 w-3" /> Franjas ({windows.filter((w: any) => w.pickupPointId === pt.id).length})</div>
                  {windows.filter((w: any) => w.pickupPointId === pt.id).map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between bg-muted/20 px-2 py-1 rounded">
                      <span className="font-semibold">{w.label} <span className="text-muted-foreground"> {w.start}-{w.end} </span> <span className="ml-1 bg-amber-500/10 px-1.5 py-0.5 rounded">Cap: {w.capacity}</span></span>
                      <button onClick={() => handleDeleteWindow(w.id)} className="text-red-400 hover:text-red-600"><Icons.X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {windows.filter((w: any) => w.pickupPointId === pt.id).length === 0 && <div className="text-[10px] text-muted-foreground">Sin franjas — añade mañana/tarde abajo</div>}
                </div>
              </div>
            ))}
          </div>
          {/* Añadir franja */}
          {pickupPoints.length > 0 && (
            <form onSubmit={handleAddWindow} className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
              <div className="text-[10px] font-bold text-amber-700 uppercase">+ Añadir franja configurable</div>
              <div className="grid gap-2 sm:grid-cols-5">
                <select value={newWinPointId} onChange={(e) => setNewWinPointId(e.target.value)} className="px-2 py-1.5 text-xs rounded border bg-background col-span-2" required>
                  <option value="">Punto…</option>{pickupPoints.map((pt) => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                </select>
                <input type="text" placeholder="Mañana" value={newWinLabel} onChange={(e) => setNewWinLabel(e.target.value)} className="px-2 py-1.5 text-xs rounded border bg-background" required />
                <input type="time" value={newWinStart} onChange={(e) => setNewWinStart(e.target.value)} className="px-2 py-1.5 text-xs rounded border bg-background" />
                <input type="time" value={newWinEnd} onChange={(e) => setNewWinEnd(e.target.value)} className="px-2 py-1.5 text-xs rounded border bg-background" />
              </div>
              <div className="flex gap-2">
                <input type="number" min={1} placeholder="Capacidad" value={newWinCap} onChange={(e) => setNewWinCap(e.target.value)} className="flex-1 px-2 py-1.5 text-xs rounded border bg-background" />
                <button type="submit" className="px-4 py-1.5 bg-amber-500 text-white font-bold text-xs rounded hover:bg-amber-600">Añadir</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
