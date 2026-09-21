"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { SHARED_PRODUCT_CATALOG, SharedProduct } from "@/lib/productCatalog";

export type PurchasingItem = SharedProduct;

const INITIAL_PURCHASING_ITEMS: PurchasingItem[] = SHARED_PRODUCT_CATALOG;
/*
  {
    id: "p1",
    name: "Solomillo de Ternera Madurada",
    category: "FOOD_FRESH",
    supplier: "Carnes Selección S.L.",
    supplierPhone: "+34612345678",
    currentStock: 4.5,
    unit: "kg",
    dailyConsumption: 2.2,
    daysRemaining: 2.0,
    leadTimeDays: 2,
    reorderPoint: 5.0,
    suggestedOrderQty: 15,
    unitPrice: 28.5,
    lastPurchasePrice: 28.5,
    purchaseCadenceDays: 4,
    status: "CRITICAL",
  },
  {
    id: "p2",
    name: "Queso Parmesano Reggiano 24 Meses",
    category: "FOOD_FRESH",
    supplier: "GastroImport Italia",
    supplierPhone: "+34622334455",
    currentStock: 2.1,
    unit: "kg",
    dailyConsumption: 0.8,
    daysRemaining: 2.6,
    leadTimeDays: 3,
    reorderPoint: 3.0,
    suggestedOrderQty: 10,
    unitPrice: 19.8,
    lastPurchasePrice: 18.2, // Price hike!
    purchaseCadenceDays: 7,
    status: "WARNING",
  },
  {
    id: "p3",
    name: "Aceite de Oliva Virgen Extra 5L",
    category: "FOOD_DRY",
    supplier: "Aceites del Sur",
    supplierPhone: "+34633445566",
    currentStock: 3,
    unit: "garrafas",
    dailyConsumption: 0.5,
    daysRemaining: 6.0,
    leadTimeDays: 2,
    reorderPoint: 2.0,
    suggestedOrderQty: 6,
    unitPrice: 38.0,
    lastPurchasePrice: 38.0,
    purchaseCadenceDays: 12,
    status: "HEALTHY",
  },
  {
    id: "p4",
    name: "Detergente Lavavajillas Industrial 20L",
    category: "CLEANING",
    supplier: "Químicos e Higiene Pro",
    supplierPhone: "+34644556677",
    currentStock: 1,
    unit: "garrafa",
    dailyConsumption: 0.15,
    daysRemaining: 6.6,
    leadTimeDays: 4,
    reorderPoint: 1.5,
    suggestedOrderQty: 3,
    unitPrice: 45.0,
    lastPurchasePrice: 45.0,
    purchaseCadenceDays: 15,
    status: "WARNING",
  },
  {
    id: "p5",
    name: "Servilletas Cocktail Cero Celulosa (Paq 500u)",
    category: "TABLEWARE",
    supplier: "Suministros Hosteleros BCN",
    supplierPhone: "+34655667788",
    currentStock: 12,
    unit: "paquetes",
    dailyConsumption: 1.8,
    daysRemaining: 6.6,
    leadTimeDays: 2,
    reorderPoint: 6.0,
    suggestedOrderQty: 20,
    unitPrice: 8.9,
    lastPurchasePrice: 8.9,
    purchaseCadenceDays: 10,
    status: "HEALTHY",
  },
  {
    id: "p6",
    name: "Cajas Hamburguesa Kraft Compostable 100u",
    category: "PACKAGING",
    supplier: "EcoPack Takeaway",
    supplierPhone: "+34666778899",
    currentStock: 1.5,
    unit: "cajas",
    dailyConsumption: 0.8,
    daysRemaining: 1.8,
    leadTimeDays: 3,
    reorderPoint: 3.0,
    suggestedOrderQty: 10,
    unitPrice: 14.2,
    lastPurchasePrice: 14.2,
    purchaseCadenceDays: 7,
    status: "CRITICAL",
  },
]; */

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  FOOD_FRESH: { label: "Materia Prima Fresca", icon: "Utensils", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FOOD_DRY: { label: "Secos & Bodega", icon: "Package", color: "bg-red-50 text-red-700 border-red-200" },
  CLEANING: { label: "Limpieza & Higiene", icon: "Sparkles", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  TABLEWARE: { label: "Enseres & Menaje", icon: "Coffee", color: "bg-purple-50 text-purple-700 border-purple-200" },
  PACKAGING: { label: "Embalaje & Takeaway", icon: "Box", color: "bg-red-50 text-red-700 border-red-200" },
};

export default function PurchasingDashboard() {
  const [activeTab, setActiveTab] = useState<"predictive" | "orders" | "audit" | "catalog">("predictive");
  const [items, setItems] = useState<PurchasingItem[]>(INITIAL_PURCHASING_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredItems = items.filter((item) => {
    const matchCat = selectedCategory === "ALL" || item.category === selectedCategory;
    const matchSup = selectedSupplier === "ALL" || item.supplier === selectedSupplier;
    return matchCat && matchSup;
  });

  const criticalCount = items.filter((i) => i.status === "CRITICAL").length;
  const warningCount = items.filter((i) => i.status === "WARNING").length;

  const suppliers = Array.from(new Set(items.map((i) => i.supplier)));

  // Generate WhatsApp Order Text
  const generateWhatsAppOrderText = (supplierName: string) => {
    const supplierItems = items.filter((i) => i.supplier === supplierName && (i.status === "CRITICAL" || i.status === "WARNING"));
    if (supplierItems.length === 0) return "";

    let text = `*PEDIDO MATERIA PRIMA / SUMINISTROS*\n`;
    text += `*Restaurante Palmera*\n`;
    text += `---------------------------------\n`;
    supplierItems.forEach((i) => {
      text += `• *${i.name}*: ${i.suggestedOrderQty} ${i.unit}\n`;
    });
    text += `---------------------------------\n`;
    text += `Por favor confirmar fecha estimada de entrega. ¡Gracias!`;
    return text;
  };

  const handleSendWhatsAppOrder = (supplierName: string, phone: string) => {
    const message = generateWhatsAppOrderText(supplierName);
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`, "_blank");
    showToast(`Pedido enviado a ${supplierName} vía WhatsApp.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] bg-linear-to-r from-red-500 to-red-500 text-white font-bold text-xs py-3.5 px-6 rounded-2xl shadow-xl border border-white/20 flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-300">
          <Icons.CheckCircle className="h-4.5 w-4.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 px-3.5 py-1.5 rounded-xl text-xs font-bold">
            <Icons.AlertTriangle className="h-4 w-4" />
            <span>{criticalCount} Pedidos Urgentes</span>
          </div>
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-600 px-3.5 py-1.5 rounded-xl text-xs font-bold">
            <Icons.Clock className="h-4 w-4" />
            <span>{warningCount} Reposición Próxima</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center bg-card/65 backdrop-blur-md rounded-2xl p-1.5 border border-border/40 shadow-sm gap-1.5 overflow-x-auto scrollbar-none max-w-max">
        {[
          { id: "predictive", label: "Sugerencias de Compra IA", icon: Icons.BrainCircuit },
          { id: "orders", label: "Generador de Pedidos", icon: Icons.Truck },
          { id: "audit", label: "Auditoría de Albaranes", icon: Icons.FileCheck },
          { id: "catalog", label: "Catálogo de Productos", icon: Icons.PackageSearch },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2.5 px-4.5 text-xs font-bold transition-all rounded-xl cursor-pointer ${
                isActive
                  ? "bg-metallic-red text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SUGERENCIAS DE COMPRA IA */}
      {activeTab === "predictive" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card/40 p-4 rounded-2xl border border-border/30">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1">Categoría:</span>
              <button
                onClick={() => setSelectedCategory("ALL")}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                  selectedCategory === "ALL" ? "bg-red-500 text-white" : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                Todas
              </button>
              {Object.entries(CATEGORY_LABELS).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                    selectedCategory === key ? "bg-red-500 text-white" : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {info.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Proveedor:</span>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="bg-background border border-border/50 rounded-xl px-3 py-1.5 text-xs text-foreground outline-hidden focus:border-red-500 font-semibold"
              >
                <option value="ALL">Todos los proveedores</option>
                {suppliers.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Predictive Items Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const catInfo = CATEGORY_LABELS[item.category];
              return (
                <div
                  key={item.id}
                  className={`bg-card/75 backdrop-blur-md border p-5 rounded-2xl shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                    item.status === "CRITICAL"
                      ? "border-rose-500/40 bg-linear-to-b from-card to-rose-500/5"
                      : item.status === "WARNING"
                      ? "border-red-500/40 bg-linear-to-b from-card to-red-500/5"
                      : "border-border/40"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${catInfo.color}`}>
                        {catInfo.label}
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                        item.status === "CRITICAL"
                          ? "bg-rose-500 text-white"
                          : item.status === "WARNING"
                          ? "bg-red-500 text-white"
                          : "bg-emerald-500 text-white"
                      }`}>
                        {item.status === "CRITICAL" ? "Pedir Hoy" : item.status === "WARNING" ? "Próximo" : "Suficiente"}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-foreground tracking-tight">{item.name}</h3>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1">
                        <Icons.Store className="h-3 w-3 text-red-500" />
                        <span>{item.supplier}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-muted/30 p-3 rounded-xl border border-border/20 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Stock Actual</span>
                        <span className="font-extrabold text-foreground text-sm">{item.currentStock} {item.unit}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Días Restantes</span>
                        <span className={`font-extrabold text-sm ${item.daysRemaining <= item.leadTimeDays ? "text-rose-500" : "text-red-500"}`}>
                          ~{item.daysRemaining.toFixed(1)} días
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Consumo Diario</span>
                        <span className="font-semibold text-foreground">{item.dailyConsumption} {item.unit}/día</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Cadencia Compra</span>
                        <span className="font-semibold text-foreground">Cada {item.purchaseCadenceDays} días</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Pedido Sugerido</span>
                      <span className="text-xs font-extrabold text-red-500">
                        {item.suggestedOrderQty} {item.unit} (~{(item.suggestedOrderQty * item.unitPrice).toFixed(2)}€)
                      </span>
                    </div>

                    <button
                      onClick={() => handleSendWhatsAppOrder(item.supplier, item.supplierPhone)}
                      className="inline-flex h-8.5 items-center justify-center gap-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-all cursor-pointer shadow-xs"
                    >
                      <Icons.MessageSquare className="h-3.5 w-3.5" />
                      <span>Pedir por WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: GENERADOR DE PEDIDOS */}
      {activeTab === "orders" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-card/75 backdrop-blur-md p-5 rounded-3xl border border-border/40 space-y-4">
            <h3 className="text-xs font-black tracking-wider text-foreground uppercase flex items-center gap-2">
              <Icons.Truck className="h-4 w-4 text-red-500" />
              <span>Agrupación de Pedidos por Proveedor</span>
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              {suppliers.map((supplierName) => {
                const supplierItems = items.filter((i) => i.supplier === supplierName);
                const firstPhone = supplierItems[0]?.supplierPhone || "";
                const totalCost = supplierItems.reduce((acc, i) => acc + i.suggestedOrderQty * i.unitPrice, 0);

                return (
                  <div key={supplierName} className="bg-background/60 p-5 rounded-2xl border border-border/40 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{supplierName}</h4>
                        <span className="text-[11px] text-muted-foreground">{firstPhone}</span>
                      </div>
                      <span className="text-xs font-black text-red-500 bg-red-500/10 px-2.5 py-1 rounded-lg">
                        Total: ~{totalCost.toFixed(2)}€
                      </span>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Productos en la Orden:</span>
                      <div className="space-y-1.5">
                        {supplierItems.map((i) => (
                          <div key={i.id} className="flex justify-between items-center text-xs bg-muted/20 p-2 rounded-lg">
                            <span className="font-semibold text-foreground">{i.name}</span>
                            <span className="font-bold text-red-600">{i.suggestedOrderQty} {i.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleSendWhatsAppOrder(supplierName, firstPhone)}
                        className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs transition-all cursor-pointer shadow-xs"
                      >
                        <Icons.MessageSquare className="h-4 w-4" />
                        <span>Enviar Pedido WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDITORÍA DE ALBARANES */}
      {activeTab === "audit" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-card/75 backdrop-blur-md p-5 rounded-3xl border border-border/40 space-y-4">
            <h3 className="text-xs font-black tracking-wider text-foreground uppercase flex items-center gap-2">
              <Icons.FileCheck className="h-4 w-4 text-red-500" />
              <span>Auditoría de Albaranes vs Precios de Contrato</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Detección automática de desviaciones de precio cobradas por los proveedores respecto al precio pactado.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-border/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase">
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4">Proveedor</th>
                    <th className="py-3 px-4">Precio Pactado</th>
                    <th className="py-3 px-4">Último Albarán</th>
                    <th className="py-3 px-4">Desviación</th>
                    <th className="py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {items.map((i) => {
                    const diff = i.lastPurchasePrice - i.unitPrice;
                    const isHike = diff > 0;

                    return (
                      <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-foreground">{i.name}</td>
                        <td className="py-3.5 px-4 text-muted-foreground">{i.supplier}</td>
                        <td className="py-3.5 px-4 font-mono font-semibold">{i.unitPrice.toFixed(2)}€ / {i.unit}</td>
                        <td className="py-3.5 px-4 font-mono font-semibold">{i.lastPurchasePrice.toFixed(2)}€ / {i.unit}</td>
                        <td className="py-3.5 px-4 font-mono font-bold">
                          {isHike ? (
                            <span className="text-rose-500">+{diff.toFixed(2)}€ (+{((diff / i.unitPrice) * 100).toFixed(1)}%)</span>
                          ) : (
                            <span className="text-emerald-500">0.00€ (Sin cambios)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isHike ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                              Alerta Subida Precio
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              Conforme
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CATÁLOGO DE PRODUCTOS */}
      {activeTab === "catalog" && (
        <div className="bg-card/75 backdrop-blur-md p-5 rounded-3xl border border-border/40 space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black tracking-wider text-foreground uppercase flex items-center gap-2">
              <Icons.PackageSearch className="h-4 w-4 text-red-500" />
              <span>Catálogo Integrado de Productos & Parámetros de Compra</span>
            </h3>
            <button
              onClick={() => showToast("Formulario para añadir nuevo producto abierto.")}
              className="inline-flex h-8.5 items-center justify-center gap-1.5 px-3 rounded-xl bg-metallic-red font-bold text-white text-xs cursor-pointer"
            >
              <Icons.Plus className="h-4 w-4" />
              <span>Añadir Producto</span>
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <div key={item.id} className="bg-background/60 p-4 rounded-2xl border border-border/40 flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-foreground">{item.name}</h4>
                  <p className="text-[11px] text-muted-foreground">{item.supplier} • Lead Time: {item.leadTimeDays} días</p>
                </div>
                <span className="font-mono font-bold text-red-500">{item.unitPrice.toFixed(2)}€ / {item.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
