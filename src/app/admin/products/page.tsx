"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";

interface CoreProduct {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  productType: "STORABLE" | "CONSUMABLE" | "SERVICE" | "MANUFACTURED_KIT";
  price: number | string;
  cost: number | string;
  uom: string;
  isSellable: boolean;
  isPurchasable: boolean;
  isComponent: boolean;
  image: string | null;
  stockQty?: number | string | null;
  lowStockThreshold?: number | string | null;
  bomLinesAsParent?: BomLine[];
}

interface BomLine {
  id: string;
  parentId: string;
  ingredientId: string;
  quantity: number;
  uom: string;
  notes: string | null;
  ingredient: CoreProduct;
}

export default function CoreProductsPage() {
  const [products, setProducts] = useState<CoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal / Drawer state
  const [activeModalProduct, setActiveModalProduct] = useState<CoreProduct | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "bom">("general");

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    productType: "STORABLE" as "STORABLE" | "CONSUMABLE" | "SERVICE" | "MANUFACTURED_KIT",
    price: "0.00",
    cost: "0.00",
    uom: "ud",
    isSellable: true,
    isPurchasable: true,
    isComponent: false,
    stockQty: "0",
    lowStockThreshold: "",
  });

  // BOM Form states
  const [bomLines, setBomLines] = useState<BomLine[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [bomQuantity, setBomQuantity] = useState("0.5");
  const [bomUom, setBomUom] = useState("kg");
  const [bomNotes, setBomNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [filterType]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "ALL") {
        if (filterType === "SELLABLE") params.set("isSellable", "true");
        else if (filterType === "COMPONENT") params.set("isComponent", "true");
        else params.set("type", filterType);
      }
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = async (product?: CoreProduct) => {
    if (product) {
      setActiveModalProduct(product);
      setIsCreatingNew(false);
      setFormData({
        name: product.name,
        code: product.code || "",
        description: product.description || "",
        productType: product.productType,
        price: String(product.price),
        cost: String(product.cost),
        uom: product.uom,
        isSellable: product.isSellable,
        isPurchasable: product.isPurchasable,
        isComponent: product.isComponent,
        stockQty: String((product as any).stockQty ?? "0"),
        lowStockThreshold: String((product as any).lowStockThreshold ?? ""),
      });

      // Load BOM lines if any
      fetchBomLines(product.id);
    } else {
      setActiveModalProduct(null);
      setIsCreatingNew(true);
      setFormData({
        name: "",
        code: "",
        description: "",
        productType: "STORABLE",
        price: "0.00",
        cost: "0.00",
        uom: "ud",
        isSellable: true,
        isPurchasable: true,
        isComponent: false,
        stockQty: "0",
        lowStockThreshold: "",
      });
      setBomLines([]);
    }
    setActiveTab("general");
  };

  const fetchBomLines = async (productId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}/bom`);
      const data = await res.json();
      if (data.success) {
        setBomLines(data.bomLines || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeModalProduct?.id,
          ...formData,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Producto guardado con éxito.");
        loadProducts();
        if (isCreatingNew) {
          setActiveModalProduct(data.product);
          setIsCreatingNew(false);
        }
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch (e: any) {
      showToast("Error al guardar producto.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("¿Eliminar este producto del catálogo central?")) return;
    try {
      await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      setProducts(products.filter((p) => p.id !== id));
      setActiveModalProduct(null);
      showToast("Producto eliminado.");
    } catch (e) {
      showToast("Error al eliminar.");
    }
  };

  const handleAddBomLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalProduct) return;
    if (!selectedIngredientId) {
      showToast("Selecciona un ingrediente.");
      return;
    }

    try {
      const res = await fetch(`/api/products/${activeModalProduct.id}/bom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId: selectedIngredientId,
          quantity: bomQuantity,
          uom: bomUom,
          notes: bomNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBomLines([...bomLines, data.bomLine]);
        setSelectedIngredientId("");
        setBomNotes("");
        showToast("Ingrediente añadido a la receta.");
        loadProducts(); // refresh cost
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch (e) {
      showToast("Error al añadir ingrediente.");
    }
  };

  const handleDeleteBomLine = async (lineId: string) => {
    if (!activeModalProduct) return;
    try {
      await fetch(`/api/products/${activeModalProduct.id}/bom?lineId=${lineId}`, {
        method: "DELETE",
      });
      setBomLines(bomLines.filter((l) => l.id !== lineId));
      showToast("Ingrediente eliminado de la receta.");
      loadProducts();
    } catch (e) {
      showToast("Error al eliminar ingrediente.");
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Filter component ingredients available for selection in BOM
  const availableIngredients = products.filter((p) => p.id !== activeModalProduct?.id);

  return (
    <div className="space-y-8 relative pb-12">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[100] bg-emerald-600 text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <Icons.CheckCircle className="h-4 w-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-4">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl flex items-center gap-2">
            <Icons.PackageCheck className="h-6 w-6 text-amber-500" />
            Catálogo Pilar de Productos & Recetas (Odoo 19)
          </div>
          <div className="text-xs text-muted-foreground block mt-1">
            Gestión centralizada de productos, componentes, materias primas y listas de ingredientes (BOM).
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-metallic-orange text-white px-4 text-xs font-bold shadow-md hover:bg-amber-600 transition-all cursor-pointer"
        >
          <Icons.Plus className="h-4 w-4" />
          <span>Nuevo Producto Pilar</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "ALL", label: "Todos los Productos" },
            { id: "SELLABLE", label: "Vendibles (E-Commerce/Ventas)" },
            { id: "COMPONENT", label: "Ingredientes / Materia Prima" },
            { id: "MANUFACTURED_KIT", label: "Recetas / Productos Compuestos (BOM)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer shrink-0 ${
                filterType === tab.id
                  ? "bg-amber-500 text-white shadow-md"
                  : "bg-card border border-border/40 text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Icons.Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              loadProducts();
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border/50 bg-background outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* Products Grid / Cards */}
      {loading ? (
        <div className="flex h-[300px] items-center justify-center">
          <Icons.Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-card border border-border/40 p-12 rounded-2xl text-center text-xs text-muted-foreground">
          No hay productos en este filtro. ¡Pulsa "Nuevo Producto Pilar" para añadir uno!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.id}
              onClick={() => handleOpenModal(p)}
              className="bg-card border border-border/40 rounded-2xl p-5 space-y-4 hover:border-amber-500/40 transition-all cursor-pointer group shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  {p.code && (
                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase bg-muted/50 px-2 py-0.5 rounded">
                      {p.code}
                    </span>
                  )}
                  <h3 className="font-extrabold text-sm text-foreground group-hover:text-amber-500 transition-colors mt-1">
                    {p.name}
                  </h3>
                </div>

                <span
                  className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase ${
                    p.productType === "MANUFACTURED_KIT"
                      ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                      : p.productType === "CONSUMABLE"
                      ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      : p.productType === "SERVICE"
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  }`}
                >
                  {p.productType === "MANUFACTURED_KIT"
                    ? "Receta / BOM"
                    : p.productType === "CONSUMABLE"
                    ? "Materia Prima"
                    : p.productType}
                </span>
              </div>

              {p.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              )}

              {/* Price & Cost Info */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block">Precio Venta:</span>
                  <span className="font-extrabold text-foreground">{Number(p.price).toFixed(2)}€ / {p.uom}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block">Coste Receta:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{Number(p.cost).toFixed(2)}€</span>
                </div>
              </div>

              {/* Ingredient badge summary */}
              {p.bomLinesAsParent && p.bomLinesAsParent.length > 0 && (
                <div className="bg-purple-500/5 border border-purple-500/20 p-2 rounded-xl text-[10px] text-purple-600 dark:text-purple-400 font-semibold flex items-center justify-between">
                  <span>🥗 Contiene {p.bomLinesAsParent.length} ingrediente(s)</span>
                  <Icons.ChevronRight className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Drawer for Editing Product & BOM */}
      {(activeModalProduct || isCreatingNew) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border/40 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-border/30 bg-muted/20 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Icons.Package className="h-5 w-5 text-amber-500" />
                  {isCreatingNew ? "Crear Nuevo Producto Pilar" : `Editar: ${activeModalProduct?.name}`}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Configuración de datos de producto estilo Odoo 19 y lista de ingredientes.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveModalProduct(null);
                  setIsCreatingNew(false);
                }}
                className="h-8 w-8 rounded-xl bg-background border border-border/40 flex items-center justify-center font-bold text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs: General vs Receta/BOM */}
            {!isCreatingNew && (
              <div className="flex border-b border-border/30 bg-card px-5">
                <button
                  type="button"
                  onClick={() => setActiveTab("general")}
                  className={`py-3 px-4 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                    activeTab === "general"
                      ? "border-amber-500 text-amber-500"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Información General
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("bom")}
                  className={`py-3 px-4 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "bom"
                      ? "border-purple-500 text-purple-500"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icons.UtensilsCrossed className="h-3.5 w-3.5" />
                  <span>Lista de Ingredientes (BOM / Receta)</span>
                  {bomLines.length > 0 && (
                    <span className="bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {bomLines.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {activeTab === "general" || isCreatingNew ? (
                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1">Nombre del Producto *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="ej. Pan de Masa Madre"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border/50 bg-background outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1">SKU / Código Referencia</label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="ej. PAN-MM-01"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border/50 bg-background outline-hidden focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Descripción</label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detalles del producto o elaboración..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border/50 bg-background outline-hidden focus:border-amber-500"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1">Tipo de Producto (Odoo 19)</label>
                      <select
                        value={formData.productType}
                        onChange={(e) => setFormData({ ...formData, productType: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border/50 bg-background outline-hidden focus:border-amber-500"
                      >
                        <option value="STORABLE">STORABLE (Almacenable)</option>
                        <option value="CONSUMABLE">CONSUMABLE (Materia Prima)</option>
                        <option value="SERVICE">SERVICE (Servicio)</option>
                        <option value="MANUFACTURED_KIT">MANUFACTURED (Receta/BOM)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1">Precio Venta (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border/50 bg-background outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1">Unidad de Medida (UOM)</label>
                      <select
                        value={formData.uom}
                        onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border/50 bg-background outline-hidden focus:border-amber-500"
                      >
                        <option value="ud">ud (Unidad)</option>
                        <option value="kg">kg (Kilogramos)</option>
                        <option value="g">g (Gramos)</option>
                        <option value="l">l (Litros)</option>
                        <option value="ml">ml (Mililitros)</option>
                        <option value="pack">pack (Paquete)</option>
                      </select>
                    </div>
                  </div>

                  {/* Stock para ingredientes */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1">Stock actual ({formData.uom})</label>
                      <input type="number" step="0.001" value={formData.stockQty} onChange={(e) => setFormData({ ...formData, stockQty: e.target.value })} placeholder="ej. 50 para harina kg" className="w-full px-3 py-2 text-xs rounded-xl border border-border/50 bg-background outline-hidden focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1">Umbral aviso bajo stock</label>
                      <input type="number" step="0.001" value={formData.lowStockThreshold} onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })} placeholder="ej. 5" className="w-full px-3 py-2 text-xs rounded-xl border border-border/50 bg-background outline-hidden focus:border-amber-500" />
                    </div>
                    <div className="flex items-end text-[10px] text-muted-foreground">Dejar vacío = sin alerta. Al vender pan se descuenta automático del ingrediente.</div>
                  </div>

                  {/* Flags */}
                  <div className="grid gap-2 sm:grid-cols-3 pt-2">
                    <label className="flex items-center gap-2 p-3 rounded-xl border border-border/30 bg-muted/20 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={formData.isSellable}
                        onChange={(e) => setFormData({ ...formData, isSellable: e.target.checked })}
                        className="accent-amber-500"
                      />
                      <span className="font-bold">Se puede Vender</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 rounded-xl border border-border/30 bg-muted/20 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={formData.isComponent}
                        onChange={(e) => setFormData({ ...formData, isComponent: e.target.checked })}
                        className="accent-purple-500"
                      />
                      <span className="font-bold">Es Ingrediente / Componente</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 rounded-xl border border-border/30 bg-muted/20 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={formData.isPurchasable}
                        onChange={(e) => setFormData({ ...formData, isPurchasable: e.target.checked })}
                        className="accent-blue-500"
                      />
                      <span className="font-bold">Se puede Comprar</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/30">
                    {!isCreatingNew && activeModalProduct && (
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(activeModalProduct.id)}
                        className="text-red-500 font-bold text-xs hover:underline flex items-center gap-1"
                      >
                        <Icons.Trash2 className="h-4 w-4" /> Eliminar Producto
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={saving}
                      className="ml-auto bg-amber-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {saving ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Save className="h-4 w-4" />}
                      <span>Guardar Cambios</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* TAB: RECETA / BOM (INGREDIENTS LIST) */
                <div className="space-y-6">
                  <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                        Coste Total Calculado de Ingredientes:
                      </div>
                      <div className="text-xl font-black text-purple-600 dark:text-purple-400">
                        {Number(activeModalProduct?.cost || 0).toFixed(2)}€ / {activeModalProduct?.uom}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground text-right">
                      El coste se actualiza sumando automáticamente las cantidades por el precio de cada materia prima.
                    </div>
                  </div>

                  {/* Add Ingredient Form */}
                  <form onSubmit={handleAddBomLine} className="bg-muted/30 p-4 rounded-2xl border border-border/30 space-y-3">
                    <span className="text-xs font-extrabold uppercase text-foreground block">
                      + Añadir Ingrediente a la Receta
                    </span>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <select
                        value={selectedIngredientId}
                        onChange={(e) => setSelectedIngredientId(e.target.value)}
                        className="sm:col-span-2 px-3 py-2 text-xs rounded-xl border border-border/50 bg-background outline-hidden focus:border-purple-500"
                        required
                      >
                        <option value="">-- Selecciona Ingrediente --</option>
                        {availableIngredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.uom}) — Coste: {Number(ing.cost).toFixed(2)}€
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.001"
                          placeholder="Cantidad"
                          value={bomQuantity}
                          onChange={(e) => setBomQuantity(e.target.value)}
                          className="w-1/2 px-3 py-2 text-xs rounded-xl border border-border/50 bg-background"
                          required
                        />
                        <select
                          value={bomUom}
                          onChange={(e) => setBomUom(e.target.value)}
                          className="w-1/2 px-2 py-2 text-xs rounded-xl border border-border/50 bg-background"
                        >
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="l">l</option>
                          <option value="ml">ml</option>
                          <option value="ud">ud</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-700 cursor-pointer"
                    >
                      Añadir Ingrediente a la Lista (BOM)
                    </button>
                  </form>

                  {/* List of Ingredients */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Ingredientes Configurados ({bomLines.length})
                    </span>

                    {bomLines.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground bg-muted/10 rounded-xl">
                        Este producto no tiene ingredientes asignados aún.
                      </div>
                    ) : (
                      <div className="divide-y divide-border/20 border border-border/30 rounded-xl overflow-hidden">
                        {bomLines.map((line) => {
                          const lineCost = Number(line.ingredient?.cost || 0) * line.quantity;
                          return (
                            <div key={line.id} className="p-3 bg-card flex items-center justify-between text-xs">
                              <div>
                                <div className="font-bold text-foreground">
                                  {line.quantity} {line.uom} • {line.ingredient?.name || "Ingrediente"}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  Coste ingrediente: {Number(line.ingredient?.cost || 0).toFixed(2)}€/{line.ingredient?.uom}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-extrabold text-purple-600 dark:text-purple-400">
                                  +{lineCost.toFixed(2)}€
                                </span>
                                <button
                                  onClick={() => handleDeleteBomLine(line.id)}
                                  className="text-red-500 hover:text-red-600 p-1"
                                >
                                  <Icons.Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
