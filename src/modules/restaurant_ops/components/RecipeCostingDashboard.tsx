"use client";

import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SmartSearchInput from "@/components/SmartSearchInput";
import { getSharedProduct, SHARED_PRODUCT_CATALOG } from "@/lib/productCatalog";

type RecipeKind = "Plato" | "Subreceta" | "Bebida";
type RecipeStatus = "Activa" | "Borrador";
interface RecipeLine { productId: string; quantity: number; unit: "g" | "ml" | "ud"; waste: number; }
interface Recipe { id: string; name: string; category: string; kind: RecipeKind; status: RecipeStatus; portions: number; salePrice: number; lines: RecipeLine[]; updatedAt: string; }

const INITIAL_RECIPES: Recipe[] = [
  { id: "r1", name: "Solomillo, jugo de carne y parmentier", category: "Carta · Principales", kind: "Plato", status: "Activa", portions: 1, salePrice: 29, updatedAt: "Hoy, 09:42", lines: [{ productId: "p1", quantity: 220, unit: "g", waste: 12 }, { productId: "p2", quantity: 35, unit: "g", waste: 0 }, { productId: "p3", quantity: 18, unit: "ml", waste: 4 }] },
  { id: "r2", name: "Vinagreta de la casa", category: "Cocina base", kind: "Subreceta", status: "Activa", portions: 12, salePrice: 0, updatedAt: "Ayer, 18:10", lines: [{ productId: "p3", quantity: 420, unit: "ml", waste: 0 }] },
  { id: "r3", name: "Parmentier de patata ahumada", category: "Cocina base", kind: "Subreceta", status: "Borrador", portions: 10, salePrice: 0, updatedAt: "28 ago, 16:30", lines: [{ productId: "p2", quantity: 250, unit: "g", waste: 2 }] },
];

const euro = (value: number) => `${value.toFixed(2).replace(".", ",")} €`;
const recipeCost = (line: RecipeLine) => {
  const product = getSharedProduct(line.productId);
  if (!product) return 0;
  return (line.quantity * (1 + line.waste / 100) / product.purchaseToRecipeFactor) * product.unitPrice;
};

export default function RecipeCostingDashboard() {
  const [recipes, setRecipes] = useState(INITIAL_RECIPES);
  const [selectedId, setSelectedId] = useState("r1");
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"Todas" | RecipeKind>("Todas");
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedId) ?? recipes[0];
  const filteredRecipes = useMemo(() => recipes.filter((recipe) => {
    const matchesQuery = `${recipe.name} ${recipe.category}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"));
    return matchesQuery && (kindFilter === "Todas" || recipe.kind === kindFilter);
  }), [kindFilter, query, recipes]);
  const batchCost = selectedRecipe.lines.reduce((total, line) => total + recipeCost(line), 0);
  const portionCost = batchCost / selectedRecipe.portions;
  const foodCostPercent = selectedRecipe.salePrice > 0 ? (portionCost / selectedRecipe.salePrice) * 100 : 0;
  const productNames = SHARED_PRODUCT_CATALOG.flatMap((product) => [product.name, product.supplier]);

  const addIngredient = () => {
    const product = SHARED_PRODUCT_CATALOG.find((item) => item.category.startsWith("FOOD"));
    if (!product) return;
    setRecipes((current) => current.map((recipe) => recipe.id === selectedRecipe.id ? { ...recipe, lines: [...recipe.lines, { productId: product.id, quantity: 100, unit: product.recipeUnit, waste: 0 }] } : recipe));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-red-600"><Icons.Scale className="h-4 w-4" /> Coste de producto</div><h1 className="mt-2 text-2xl font-black tracking-tight">Escandallos</h1><p className="mt-1 text-sm text-muted-foreground">Recetas, rendimientos y márgenes conectados al catálogo maestro del ERP.</p></div>
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700"><Icons.Database className="h-4 w-4" /> Productos compartidos · sin duplicados</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3"><Metric icon={Icons.NotebookTabs} label="Escandallos activos" value={`${recipes.filter((recipe) => recipe.status === "Activa").length}`} detail="1 pendiente de revisión" /><Metric icon={Icons.ChartNoAxesCombined} label="Food cost medio" value="29,8%" detail="Objetivo operativo < 32%" /><Metric icon={Icons.TriangleAlert} label="Revisar costes" value="2" detail="Cambios de proveedor" tone="warning" /></div>

      <div className="grid min-h-[620px] gap-4 lg:grid-cols-[300px_minmax(0,1fr)_285px]">
        <section className="rounded-3xl border border-border/60 bg-card/70 p-3 shadow-sm">
          <div className="flex items-center justify-between px-2 pb-3"><div><h2 className="text-sm font-black">Catálogo de recetas</h2><p className="mt-1 text-[11px] text-muted-foreground">{recipes.length} registros · una sola fuente</p></div><button onClick={() => setShowCreate(true)} className="rounded-xl bg-metallic-red p-2 text-white" aria-label="Nuevo escandallo"><Icons.Plus className="h-4 w-4" /></button></div>
          <SmartSearchInput value={query} onChange={setQuery} suggestions={recipes.flatMap((recipe) => [recipe.name, recipe.category])} placeholder="Buscar por letra..." className="mb-2" />
          <div className="mb-2 flex gap-1 overflow-x-auto">{(["Todas", "Plato", "Subreceta", "Bebida"] as const).map((filter) => <button key={filter} onClick={() => setKindFilter(filter)} className={`whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-bold ${kindFilter === filter ? "bg-red-500/15 text-red-700" : "text-muted-foreground hover:bg-muted"}`}>{filter}</button>)}</div>
          <div className="space-y-1">{filteredRecipes.map((recipe) => <button key={recipe.id} onClick={() => setSelectedId(recipe.id)} className={`w-full rounded-2xl p-3 text-left transition ${selectedRecipe.id === recipe.id ? "bg-red-500/10 ring-1 ring-red-500/30" : "hover:bg-muted/60"}`}><div className="flex items-start justify-between gap-2"><span className="text-xs font-extrabold text-foreground">{recipe.name}</span><span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${recipe.status === "Activa" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{recipe.status}</span></div><div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground"><span>{recipe.kind} · {recipe.portions} {recipe.portions === 1 ? "ración" : "raciones"}</span><span>{recipe.salePrice ? euro(recipe.salePrice) : "Producción"}</span></div></button>)}</div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-start sm:justify-between"><div><span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{selectedRecipe.category} · {selectedRecipe.kind}</span><h2 className="mt-1 text-xl font-black">{selectedRecipe.name}</h2><p className="mt-1 text-xs text-muted-foreground">Versión activa · actualizado {selectedRecipe.updatedAt}</p></div><button onClick={() => setShowCreate(true)} className="flex items-center justify-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-xs font-bold hover:bg-muted"><Icons.Pencil className="h-3.5 w-3.5" /> Editar ficha</button></div>
          <div className="mt-5 flex items-center justify-between"><div><h3 className="text-sm font-black">Composición</h3><p className="mt-1 text-xs text-muted-foreground">Las líneas apuntan a productos maestros, no almacenan copias.</p></div><button onClick={addIngredient} className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"><Icons.Plus className="h-3.5 w-3.5" /> Añadir producto</button></div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-border/50"><table className="w-full text-left text-xs"><thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-3 py-3">Producto maestro</th><th className="px-3 py-3">Cantidad</th><th className="px-3 py-3">Merma</th><th className="px-3 py-3 text-right">Coste</th></tr></thead><tbody>{selectedRecipe.lines.map((line, index) => { const product = getSharedProduct(line.productId); return <tr key={`${selectedRecipe.id}-${line.productId}-${index}`} className="border-t border-border/40"><td className="px-3 py-3"><div className="font-bold text-foreground">{product?.name ?? "Producto no encontrado"}</div><div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><Icons.Link2 className="h-3 w-3 text-emerald-600" /> ID {line.productId} · {product?.supplier}</div></td><td className="px-3 py-3 font-semibold">{line.quantity} {line.unit}</td><td className="px-3 py-3 text-muted-foreground">{line.waste}%</td><td className="px-3 py-3 text-right font-black">{euro(recipeCost(line))}</td></tr>; })}</tbody></table></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-muted/40 p-3"><span className="text-[10px] text-muted-foreground">Rendimiento</span><strong className="mt-1 block text-lg font-black">{selectedRecipe.portions} <small className="text-xs font-bold">ración{selectedRecipe.portions !== 1 && "es"}</small></strong></div><div className="rounded-2xl bg-muted/40 p-3"><span className="text-[10px] text-muted-foreground">Coste lote</span><strong className="mt-1 block text-lg font-black">{euro(batchCost)}</strong></div><div className="rounded-2xl bg-muted/40 p-3"><span className="text-[10px] text-muted-foreground">Precio venta</span><strong className="mt-1 block text-lg font-black">{selectedRecipe.salePrice ? euro(selectedRecipe.salePrice) : "No aplica"}</strong></div></div>
        </section>

        <aside className="space-y-4"><div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-black"><Icons.ChartNoAxesCombined className="h-4 w-4 text-red-500" /> Rentabilidad</div><div className="mt-5 flex items-end justify-between"><div><span className="text-[10px] text-muted-foreground">Coste por ración</span><strong className="mt-1 block text-3xl font-black">{euro(portionCost)}</strong></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${foodCostPercent <= 32 ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"}`}>{foodCostPercent.toFixed(1)}% food cost</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${foodCostPercent <= 32 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${Math.min(foodCostPercent, 100)}%` }} /></div><div className="mt-4 flex justify-between text-xs"><span className="text-muted-foreground">Margen bruto</span><strong className="text-emerald-700">{selectedRecipe.salePrice ? euro(selectedRecipe.salePrice - portionCost) : "-"}</strong></div></div><div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5"><div className="flex items-start gap-3"><Icons.DatabaseZap className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><div><h3 className="text-xs font-black text-emerald-800">Sincronización ERP</h3><p className="mt-1 text-[11px] leading-relaxed text-emerald-800/75">El coste se recalcula usando el último precio del producto maestro. Si Compras cambia el proveedor o la unidad, esta receta se actualiza sin duplicar datos.</p></div></div></div><div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm"><h3 className="text-xs font-black">Próximas acciones</h3><div className="mt-3 space-y-3 text-xs"><Action icon={Icons.RefreshCw} text="Recalcular por cambios de coste" /><Action icon={Icons.Scale} text="Escalar receta a producción" /><Action icon={Icons.FileClock} text="Ver historial de versiones" /></div></div></aside>
      </div>
      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4" onClick={() => setShowCreate(false)}><div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-lg font-black">Nuevo escandallo</h2><button onClick={() => setShowCreate(false)} aria-label="Cerrar"><Icons.X className="h-5 w-5" /></button></div><p className="mt-2 text-xs text-muted-foreground">La nueva ficha usará productos existentes del catálogo maestro.</p><label className="mt-5 block text-xs font-bold">Nombre de receta<input className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-red-500" placeholder="Ej. Ensalada de temporada" /></label><label className="mt-4 block text-xs font-bold">Producto inicial<SmartSearchInput value="" onChange={() => undefined} suggestions={productNames} placeholder="Buscar producto maestro..." emptyActionLabel="Crear nuevo producto en el catálogo maestro" onEmptyAction={() => setShowCreateProduct(true)} className="mt-2" /></label><button onClick={() => setShowCreate(false)} className="mt-6 w-full rounded-xl bg-metallic-red py-3 text-xs font-black text-white">Crear borrador</button></div></div>}
      {showCreateProduct && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/30 p-4" onClick={() => setShowCreateProduct(false)}><div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><span className="text-[10px] font-black uppercase tracking-[0.15em] text-red-600">Catálogo maestro</span><h2 className="mt-1 text-lg font-black">Crear producto</h2></div><button onClick={() => setShowCreateProduct(false)} aria-label="Cerrar"><Icons.X className="h-5 w-5" /></button></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Se dará de alta como producto común para Compras, Escandallos, Stock y TPV.</p><label className="mt-5 block text-xs font-bold">Nombre del producto<input autoFocus className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-red-500" placeholder="Ej. Tomate cherry ecológico" /></label><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-bold">Unidad de compra<select className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"><option>kg</option><option>litros</option><option>unidades</option><option>cajas</option></select></label><label className="text-xs font-bold">Coste unitario<input type="number" min="0" step="0.01" className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-red-500" placeholder="0,00 €" /></label></div><button onClick={() => { setShowCreateProduct(false); setShowCreate(false); }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-metallic-red py-3 text-xs font-black text-white"><Icons.Database className="h-4 w-4" /> Guardar en catálogo maestro</button></div></div>}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail, tone = "normal" }: { icon: LucideIcon; label: string; value: string; detail: string; tone?: "normal" | "warning" }) { return <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><Icon className={`h-4 w-4 ${tone === "warning" ? "text-red-500" : "text-emerald-600"}`} /> {label}</div><div className="mt-2 text-2xl font-black">{value}</div><div className="mt-1 text-[10px] text-muted-foreground">{detail}</div></div>; }
function Action({ icon: Icon, text }: { icon: LucideIcon; text: string }) { return <button className="flex w-full items-center gap-2 rounded-xl p-2 text-left font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><Icon className="h-3.5 w-3.5 text-red-500" />{text}<Icons.ChevronRight className="ml-auto h-3.5 w-3.5" /></button>; }
