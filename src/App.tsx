diff --git a/src/App.tsx b/src/App.tsx
index 89a8c01c183bbd2e55e8be9144732988dc91b3f5..57ac8dc3e9390278d9141251cada9660c680cf93 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -1,145 +1,194 @@
-import React, { useEffect, useMemo, useState } from "react";
-// --- Estados auxiliares (confirmación de borrar venta) ---
-const [deleteOrderAskId, setDeleteOrderAskId] = useState<string | null>(null);
-
-// --- Editor de producto ---
-const [editing, setEditing] = useState<Product | null>(null);
-
-function saveProduct(p: Product) {
-  setProducts((prev) => {
-    const exists = prev.some((x) => x.id === p.id);
-    const next = exists ? prev.map((x) => (x.id === p.id ? { ...x, ...p } : x)) : [p, ...prev];
-    saveProducts(next);
-    return next;
-  });
-  setEditing(null);
-}
-
-function deleteOrder(id: string) {
-  const ord = orders.find((o) => o.id === id);
-  if (!ord) return;
-  // Restaurar stock
-  for (const l of ord.lines) {
-    adjustStock(l.productId, l.qtyKg);
-  }
-  const next = orders.filter((o) => o.id !== id);
-  setOrders(next);
-  saveOrders(next);
-}
-
-function handleDeleteOrderClick(id: string) {
-  if (deleteOrderAskId !== id) {
-    setDeleteOrderAskId(id);
-    window.setTimeout(() => {
-      setDeleteOrderAskId((curr) => (curr === id ? null : curr));
-    }, 4000);
-    return;
-  }
-  deleteOrder(id);
-  setDeleteOrderAskId(null);
-}
+import type { FC, ReactNode } from "react";
+import { useEffect, useMemo, useState } from "react";
 
 /* =============================
    Utilidades & Constantes
 ============================= */
 const LS_KEYS = {
   products: "maderna_products_v1",
   orders: "maderna_orders_v1",
   productions: "maderna_productions_v1",
   orderSeq: "maderna_order_seq_v1",
   pin: "maderna_admin_pin_v1",
 };
 
 function currency(n?: number) {
   if (n == null || isNaN(n as number)) return "—";
   try {
     return new Intl.NumberFormat("es-AR", {
       style: "currency",
       currency: "ARS",
       maximumFractionDigits: 0,
     }).format(Number(n));
   } catch {
     return `${n}`;
   }
 }
 
 function todayISO() {
   const d = new Date();
   d.setHours(0, 0, 0, 0);
-   d.toISOString().split("T")[0];
+  return d.toISOString().split("T")[0];
 }
 
 function uid() {
   return Math.random().toString(36).slice(2, 10);
 }
 
 /* =============================
    Tipos
 ============================= */
 export type Product = {
   id: string;
   name: string;
   hex: string;
   costPerKg?: number | null;
   pricePerKg?: number | null; // precio base receta (kg)
   priceStore?: number | null; // PVP tienda
   category: string;
   code: string;
   barcode?: string;
   stockKg: number; // si es "unid", representa unidades
   active?: boolean;
 };
 
 export type OrderLine = {
   id: string;
   productId: string;
   qtyKg: number; // kg o unidades
   pricePerKgAtSale: number; // PVP congelado al momento de la venta
 };
 
 export type Order = {
   id: string;
   number: string;
   createdAt: string;
   lines: OrderLine[];
   total: number;
   partyName?: string;
   payment?: "efectivo" | "mp";
   status?: "abierta" | "entregada";
 };
 
 export type Production = {
   id: string;
   productId: string;
   qtyKg: number; // kg o unidades
   date: string; // YYYY-MM-DD
 };
 
+type ProductDraft = {
+  id: string;
+  name: string;
+  hex: string;
+  costPerKg: string;
+  pricePerKg: string;
+  priceStore: string;
+  category: string;
+  code: string;
+  barcode: string;
+  stockKg: string;
+  active: boolean;
+};
+
+function unitLabelFromCategory(category: string): "kg" | "unid" {
+  return category === "Medallones" ? "unid" : "kg";
+}
+
 // Unidad por producto (kg o unidades)
 function unitLabel(p: Product): "kg" | "unid" {
-  return p.category === "Medallones" ? "unid" : "kg";
+  return unitLabelFromCategory(p.category);
+}
+
+function numberToDraftInput(value?: number | null): string {
+  return value == null ? "" : String(value);
+}
+
+function productToDraft(product: Product): ProductDraft {
+  return {
+    id: product.id,
+    name: product.name,
+    hex: product.hex,
+    costPerKg: numberToDraftInput(product.costPerKg ?? null),
+    pricePerKg: numberToDraftInput(product.pricePerKg ?? null),
+    priceStore: numberToDraftInput(product.priceStore ?? null),
+    category: product.category,
+    code: product.code,
+    barcode: product.barcode ?? "",
+    stockKg: numberToDraftInput(product.stockKg),
+    active: !!product.active,
+  };
+}
+
+function parseOptionalNumberField(raw: string): number | null | typeof NaN {
+  const normalized = raw.trim().replace(",", ".");
+  if (!normalized) return null;
+  const parsed = Number(normalized);
+  return Number.isFinite(parsed) ? parsed : NaN;
+}
+
+function productFromDraft(draft: ProductDraft): { ok: true; value: Product } | { ok: false; error: string } {
+  const name = draft.name.trim();
+  if (!name) return { ok: false, error: "Ingresá un nombre" };
+
+  const category = draft.category.trim();
+  if (!category) return { ok: false, error: "Ingresá una categoría" };
+
+  const code = draft.code.trim();
+  if (!code) return { ok: false, error: "Ingresá un código" };
+
+  const costPerKg = parseOptionalNumberField(draft.costPerKg);
+  if (Number.isNaN(costPerKg)) return { ok: false, error: "Costo inválido" };
+
+  const pricePerKg = parseOptionalNumberField(draft.pricePerKg);
+  if (Number.isNaN(pricePerKg)) return { ok: false, error: "Precio de receta inválido" };
+
+  const priceStore = parseOptionalNumberField(draft.priceStore);
+  if (Number.isNaN(priceStore)) return { ok: false, error: "PVP tienda inválido" };
+
+  const stockField = parseOptionalNumberField(draft.stockKg);
+  if (Number.isNaN(stockField)) return { ok: false, error: "Stock inválido" };
+  const stockKg = stockField ?? 0;
+  if (stockKg < 0) return { ok: false, error: "El stock no puede ser negativo" };
+
+  return {
+    ok: true,
+    value: {
+      id: draft.id,
+      name,
+      hex: draft.hex || "#cccccc",
+      costPerKg: costPerKg ?? null,
+      pricePerKg: pricePerKg ?? null,
+      priceStore: priceStore ?? null,
+      category,
+      code,
+      barcode: draft.barcode.trim() || undefined,
+      stockKg,
+      active: draft.active,
+    },
+  };
 }
 
 // =============================
 // Datos iniciales (seed)
 // =============================
 const seedProducts: Product[] = [
   { id: uid(), name: "Milanesa de Pollo (sin provenzal)", hex: "#A3E4B3", costPerKg: 4859.44, pricePerKg: 11570.1, priceStore: 12000, category: "Milanesas", code: "MIL-PO-CL", barcode: "7791234567001", stockKg: 0, active: true },
   { id: uid(), name: "Milanesa de Pollo (con provenzal)", hex: "#45B39D", costPerKg: 5709.87, pricePerKg: 11895.56, priceStore: 12000, category: "Milanesas", code: "MIL-PO-PR", barcode: "7791234567002", stockKg: 0, active: true },
   { id: uid(), name: "Milanesa de Nalga", hex: "#F1948A", costPerKg: 10465.04, pricePerKg: 16611.17, priceStore: 16500, category: "Milanesas", code: "MIL-NA-PR", barcode: "7791234567012", stockKg: 0, active: true },
   { id: uid(), name: "Milanesa de Peceto", hex: "#C0392B", costPerKg: null, pricePerKg: null, priceStore: null, category: "Milanesas", code: "MIL-PE-PR", barcode: "", stockKg: 0, active: true },
   { id: uid(), name: "Ribs estilo Kansas BBQ", hex: "#D98880", costPerKg: 6682.55, pricePerKg: 15910.85, priceStore: 16000, category: "Prod. Fresco", code: "PF-RIBS", barcode: "7791234567010", stockKg: 0, active: true },
   { id: uid(), name: "Bastones de papa", hex: "#F9E79F", costPerKg: 4214.58, pricePerKg: 9365.74, priceStore: 10000, category: "Acompañamientos", code: "AC-BASTON", barcode: "7791234567007", stockKg: 0, active: true },
   { id: uid(), name: "Caritas de papa", hex: "#F4D03F", costPerKg: 5581.25, pricePerKg: 11162.5, priceStore: 11700, category: "Acompañamientos", code: "AC-CARITAS", barcode: "7791234567005", stockKg: 0, active: true },
   { id: uid(), name: "Papas Noisette", hex: "#F5B041", costPerKg: 5631.25, pricePerKg: 11262.5, priceStore: 11800, category: "Acompañamientos", code: "AC-NOISETTE", barcode: "7791234567006", stockKg: 0, active: true },
   { id: uid(), name: "Pechugitas rebozadas", hex: "#85C1E9", costPerKg: null, pricePerKg: null, priceStore: null, category: "Snack & Kids", code: "AC-PECHU", barcode: "", stockKg: 0, active: true },
   { id: uid(), name: "Nuggets crocantes", hex: "#2E86C1", costPerKg: 8881.25, pricePerKg: 14802.08, priceStore: 14000, category: "Snack & Kids", code: "AC-NUGGETS", barcode: "7791234567008", stockKg: 0, active: true },
   { id: uid(), name: "Pechugas Frescas", hex: "#F39DC4", costPerKg: 8695.31, pricePerKg: 15809.66, priceStore: 16500, category: "Prod. Fresco", code: "PF-PECHUGA", barcode: "7791234567009", stockKg: 0, active: true },
   { id: uid(), name: "Medallones de Pollo x 12", hex: "#9DC610", costPerKg: 6950.7, pricePerKg: 11983.97, priceStore: 12000, category: "Medallones", code: "ME-POLLO12", barcode: "7791234567010", stockKg: 0, active: true },
   { id: uid(), name: "Medallones de Pollo x 6", hex: "#E77326", costPerKg: 3875.18, pricePerKg: 7045.79, priceStore: 7000, category: "Medallones", code: "ME-POLLO6", barcode: "7791234567011", stockKg: 0, active: true },
   { id: uid(), name: "Varios", hex: "#9900ff", costPerKg: null, pricePerKg: null, priceStore: null, category: "Varios", code: "VARIOS", barcode: "", stockKg: 0, active: true },
 ];
 
 
 // =============================
 // Persistencia
@@ -192,97 +241,94 @@ function saveProductions(list: Production[]) {
 function loadSeq(): number {
   const n = Number(localStorage.getItem(LS_KEYS.orderSeq) || "0");
   return Number.isFinite(n) ? n : 0;
 }
 
 function saveSeq(n: number) {
   localStorage.setItem(LS_KEYS.orderSeq, String(n));
 }
 
 function loadPin(): string {
   return localStorage.getItem(LS_KEYS.pin) || "1234";
 }
 
 function savePin(pin: string) {
   localStorage.setItem(LS_KEYS.pin, pin);
 }
 // =============================
 // FIN Persistencia
 // =============================
 
 /* =============================
    UI helpers
 ============================= */
 type SectionProps = {
   title: string;
-  right?: React.ReactNode;
-  children?: React.ReactNode;
+  right?: ReactNode;
+  children?: ReactNode;
 };
 
 const Section = ({ title, right, children }: SectionProps) => (
   <div className="mb-4">
     <div className="flex items-center justify-between mb-2">
       <h2 className="text-lg font-semibold">{title}</h2>
       {right}
     </div>
     {children}
   </div>
 );
 
-const Pill: React.FC<{ text: string; className?: string }> = ({ text, className }) => (
+const Pill: FC<{ text: string; className?: string }> = ({ text, className }) => (
   <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-100 ${className || ""}`}>{text}</span>
 );
 
 /* =============================
    App principal
 ============================= */
 export default function App() {
   const [tab, setTab] = useState<"inventario" | "comanda" | "produccion" | "reportes" | "admin">("inventario");
   const [products, setProducts] = useState<Product[]>(() => loadProducts());
   const [orders, setOrders] = useState<Order[]>(() => loadOrders());
   useEffect(() => {
     setOrders((prev) =>
       prev.map((o) => ({
         ...o,
         payment: o.payment ?? "efectivo",
         status: o.status ?? "abierta",
       }))
     );
   }, []);
   const [productions, setProductions] = useState<Production[]>(() => loadProductions());
   const [search, setSearch] = useState("");
   const [isAdmin, setIsAdmin] = useState(false);
   const [pinInput, setPinInput] = useState("");
   const [pinOk, setPinOk] = useState(false);
   const [barcode, setBarcode] = useState("");
   const [prodEditing, setProdEditing] = useState<Production | null>(null);
   const [deleteAskId, setDeleteAskId] = useState<string | null>(null);
   const [deleteOrderAskId, setDeleteOrderAskId] = useState<string | null>(null);
-  const [editing, setEditing] = useState<Product | null>(null);
-   // Confirmación para eliminar una venta
-  const [deleteOrderAskId, setDeleteOrderAskId] = useState<string | null>(null);
-
+  const [editing, setEditing] = useState<ProductDraft | null>(null);
 
   useEffect(() => saveProducts(products), [products]);
   useEffect(() => saveOrders(orders), [orders]);
   useEffect(() => saveProductions(productions), [productions]);
 
   const filtered = useMemo(() => {
     const term = search.trim().toLowerCase();
     const bar = barcode.trim();
     return products.filter((p) => {
       if (!p.active) return false;
       const byText = !term || `${p.name} ${p.code} ${p.category}`.toLowerCase().includes(term);
       const byBarcode = !bar || (p.barcode || "").includes(bar);
       return byText && byBarcode;
     });
   }, [products, search, barcode]);
 
   function adjustStock(productId: string, deltaKg: number) {
     setProducts((prev) =>
       prev.map((p) => (p.id === productId ? { ...p, stockKg: Math.max(0, Number(p.stockKg || 0) + deltaKg) } : p))
     );
   }
 
   function addProduction(productId: string, qtyKg: number, date: string) {
     const prod: Production = { id: uid(), productId, qtyKg, date };
     setProductions((prev) => [prod, ...prev]);
@@ -301,98 +347,148 @@ export default function App() {
   function handleDeleteClick(id: string) {
     if (deleteAskId !== id) {
       setDeleteAskId(id);
       window.setTimeout(() => {
         setDeleteAskId((curr) => (curr === id ? null : curr));
       }, 4000);
       return;
     }
     deleteProduction(id);
     setDeleteAskId(null);
   }
 
   function updateProduction(id: string, newQtyKg: number, newDate: string) {
     setProductions((prev) => {
       const pr = prev.find((x) => x.id === id);
       if (!pr) return prev;
       const delta = Number(newQtyKg) - Number(pr.qtyKg);
       adjustStock(pr.productId, delta);
       const next = prev.map((x) => (x.id === id ? { ...x, qtyKg: Number(newQtyKg), date: newDate } : x));
       saveProductions(next);
       return next;
     });
     setProdEditing(null);
   }
 
+  function saveProduct(draft: ProductDraft) {
+    const parsed = productFromDraft(draft);
+    if (!parsed.ok) {
+      alert(parsed.error);
+      return;
+    }
+
+    const product = parsed.value;
+    setProducts((prev) => {
+      const exists = prev.some((x) => x.id === product.id);
+      const next = exists ? prev.map((x) => (x.id === product.id ? { ...x, ...product } : x)) : [product, ...prev];
+      saveProducts(next);
+      return next;
+    });
+    setEditing(null);
+  }
+
+  function startNewProduct() {
+    setEditing({
+      id: uid(),
+      name: "",
+      hex: "#cccccc",
+      costPerKg: "",
+      pricePerKg: "",
+      priceStore: "",
+      category: "",
+      code: "",
+      barcode: "",
+      stockKg: "0",
+      active: true,
+    });
+  }
+
+  function openProductEditor(product: Product) {
+    setEditing(productToDraft(product));
+  }
+
+  function toggleProductActive(productId: string) {
+    setProducts((prev) => {
+      const next = prev.map((p) => (p.id === productId ? { ...p, active: !p.active } : p));
+      saveProducts(next);
+      return next;
+    });
+  }
+
+  function updateEditing(patch: Partial<ProductDraft>) {
+    setEditing((curr) => (curr ? { ...curr, ...patch } : curr));
+  }
+
   /* =============================
      Comanda / Ventas
   ============================= */
   function tryLogin(pin: string) {
     const saved = loadPin();
     if (pin === saved) {
       setPinOk(true);
       setIsAdmin(true); // fix
       setPinInput("");
     } else {
       alert("PIN incorrecto");
     }
   }
 
   function updateOrder(id: string, patch: Partial<Order>) {
     setOrders((prev) => {
       const next = prev.map((o) => (o.id === id ? { ...o, ...patch } : o));
       saveOrders(next);
       return next;
     });
   }
 
   function deleteOrder(id: string) {
     const ord = orders.find((o) => o.id === id);
     if (!ord) return;
     for (const l of ord.lines) adjustStock(l.productId, l.qtyKg); // restaurar stock
     const next = orders.filter((o) => o.id !== id);
     setOrders(next);
     saveOrders(next);
   }
 
   function handleDeleteOrderClick(id: string) {
     if (deleteOrderAskId !== id) {
       setDeleteOrderAskId(id);
       window.setTimeout(() => {
         setDeleteOrderAskId((curr) => (curr === id ? null : curr));
       }, 4000);
       return;
     }
     deleteOrder(id);
     setDeleteOrderAskId(null);
   }
 
   type DraftLine = { id: string; productId: string; qtyKg: number };
   const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
 
   function addDraftLine(p?: Product) {
-    const pid = p?.id || (products[0]?.id ?? "");
+    const fallbackId = products.find((prod) => prod.active)?.id || products[0]?.id || "";
+    const pid = p?.id || fallbackId;
     setDraftLines((d) => [...d, { id: uid(), productId: pid, qtyKg: 1 }]);
   }
   function removeDraftLine(id: string) {
     setDraftLines((d) => d.filter((l) => l.id !== id));
   }
 
   const draftTotal = useMemo(() => {
     return draftLines.reduce((acc, l) => {
       const p = products.find((x) => x.id === l.productId);
       if (!p) return acc;
       const price = Number((p.priceStore ?? p.pricePerKg) || 0);
       return acc + l.qtyKg * price;
     }, 0);
   }, [draftLines, products]);
 
   function issueOrder() {
     if (!draftLines.length) return alert("Agregá al menos un ítem a la comanda.");
     for (const l of draftLines) {
       const p = products.find((x) => x.id === l.productId);
       if (!p) continue;
       if (p.stockKg < l.qtyKg) {
         return alert(`Stock insuficiente en ${p.name}. Disponible: ${p.stockKg} ${unitLabel(p)}`);
       }
     }
     const seq = Number(localStorage.getItem(LS_KEYS.orderSeq) || "0") + 1;
@@ -404,204 +500,74 @@ export default function App() {
     const lines: OrderLine[] = draftLines.map((l) => {
       const p = products.find((x) => x.id === l.productId)!;
       return {
         id: uid(),
         productId: l.productId,
         qtyKg: l.qtyKg,
         pricePerKgAtSale: Number((p.priceStore ?? p.pricePerKg) || 0),
       };
     });
     const total = lines.reduce((acc, l) => acc + l.qtyKg * l.pricePerKgAtSale, 0);
 
     const order: Order = {
       id: uid(),
       number,
       createdAt: new Date().toISOString(),
       lines,
       total,
       payment: "efectivo",
       status: "abierta",
       partyName: "",
     };
     setOrders((o) => [order, ...o]);
     for (const l of draftLines) adjustStock(l.productId, -l.qtyKg);
     setDraftLines([]);
     alert(`Comanda ${number} generada. Total: ${currency(total)}`);
-     function deleteOrder(id: string) {
-  const ord = orders.find((o) => o.id === id);
-  if (!ord) return;
-  // Restaurar stock
-  for (const l of ord.lines) {
-    adjustStock(l.productId, l.qtyKg);
   }
-  const next = orders.filter((o) => o.id !== id);
-  setOrders(next);
-  saveOrders(next);
-}
-
-function handleDeleteOrderClick(id: string) {
-  if (deleteOrderAskId !== id) {
-    setDeleteOrderAskId(id);
-    window.setTimeout(() => {
-      setDeleteOrderAskId((curr) => (curr === id ? null : curr));
-    }, 4000);
-    return;
-  }
-  deleteOrder(id);
-  setDeleteOrderAskId(null);
-   {/* Productos (activar/editar) */}
-<Section
-  title="Productos (activar/editar)"
-  right={
-    <button
-      className="px-3 py-2 rounded-xl bg-black text-white"
-      onClick={() =>
-        setEditing({
-          id: uid(),
-          name: "",
-          hex: "#cccccc",
-          costPerKg: 0,
-          pricePerKg: 0,
-          priceStore: 0,
-          category: "",
-          code: "",
-          barcode: "",
-          stockKg: 0,
-          active: true,
-        })
-      }
-    >
-      + Nuevo
-    </button>
-  }
->
-  <div className="space-y-2">
-    {products.map((p) => (
-      <div key={p.id} className="p-3 rounded-2xl border">
-        <div className="flex items-center gap-3">
-          <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: p.hex }} />
-          <div className="flex-1 min-w-0">
-            <div className="font-medium truncate">{p.name || <i className="text-gray-400">(sin nombre)</i>}</div>
-            <div className="text-xs text-gray-500">
-              {p.code} • {p.category || "Sin categoría"}
-            </div>
-          </div>
-          <div className="grid gap-1">
-            <button className="text-xs px-2 py-1 rounded-lg bg-gray-100" onClick={() => setEditing(p)}>
-              Editar
-            </button>
-            <button
-              className="text-xs px-2 py-1 rounded-lg bg-gray-100"
-              onClick={() =>
-                setProducts((prev) =>
-                  prev.map((px) => (px.id === p.id ? { ...px, active: !px.active } : px))
-                )
-              }
-            >
-              {p.active ? "Desactivar" : "Activar"}
-            </button>
-          </div>
-        </div>
-        <div className="text-xs text-gray-500 mt-2">
-          C: {currency(p.costPerKg ?? undefined)}/{unitLabel(p)} • PV receta: {currency(p.pricePerKg ?? undefined)}/{unitLabel(p)} • PVP tienda: {currency(p.priceStore ?? undefined)} • Stock: {Number(p.stockKg || 0).toFixed(2)} {unitLabel(p)}
-        </div>
-      </div>
-    ))}
-  </div>
-</Section>
-
-{/* Modal editor producto */}
-{editing && (
-  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm grid place-items-center p-4 z-20">
-    <div className="bg-white rounded-2xl p-4 w-full max-w-md">
-      <div className="flex items-center justify-between mb-2">
-        <h3 className="font-semibold">Editar producto</h3>
-        <button className="text-sm" onClick={() => setEditing(null)}>✕</button>
-      </div>
-      <div className="grid grid-cols-2 gap-2">
-        <input className="col-span-2 px-3 py-2 rounded-xl border" placeholder="Nombre" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
-        <input className="px-3 py-2 rounded-xl border" placeholder="Código" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
-        <input className="px-3 py-2 rounded-xl border" placeholder="Categoría" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
-        <input className="px-3 py-2 rounded-xl border" placeholder="Barras" value={editing.barcode || ""} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} />
-        <input className="px-3 py-2 rounded-xl border" placeholder="#HEX" value={editing.hex} onChange={(e) => setEditing({ ...editing, hex: e.target.value })} />
-        <input type="number" step="0.01" className="px-3 py-2 rounded-xl border" placeholder={`Costo/${unitLabel(editing as Product)}`} value={editing.costPerKg ?? 0} onChange={(e) => setEditing({ ...editing, costPerKg: Number(e.target.value) })} />
-        <input type="number" step="0.01" className="px-3 py-2 rounded-xl border" placeholder={`PV receta/${unitLabel(editing as Product)}`} value={editing.pricePerKg ?? 0} onChange={(e) => setEditing({ ...editing, pricePerKg: Number(e.target.value) })} />
-        <input type="number" step="0.01" className="px-3 py-2 rounded-xl border" placeholder="PVP tienda" value={editing.priceStore ?? 0} onChange={(e) => setEditing({ ...editing, priceStore: Number(e.target.value) })} />
-        <input type="number" step="0.01" className="px-3 py-2 rounded-xl border" placeholder={`Stock ${unitLabel(editing as Product)}`} value={editing.stockKg} onChange={(e) => setEditing({ ...editing, stockKg: Number(e.target.value) })} />
-        <div className="col-span-2 flex items-center justify-between mt-2">
-          <label className="text-sm flex items-center gap-2">
-            <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
-            Activo
-          </label>
-          <div className="grid grid-cols-2 gap-2">
-            <button className="px-3 py-2 rounded-xl bg-gray-100" onClick={() => setEditing(null)}>Cancelar</button>
-            <button className="px-3 py-2 rounded-xl bg-emerald-600 text-white" onClick={() => saveProduct(editing!)}>Guardar</button>
-          </div>
-        </div>
-      </div>
-    </div>
-  </div>
-)}
-
-}
-
 
   /* =============================
      Reportes
   ============================= */
   const today = todayISO();
   const [reportDate, setReportDate] = useState<string>(today);
   const [showOlderPendings, setShowOlderPendings] = useState<boolean>(true);
   const dateOf = (iso: string) => iso.slice(0, 10);
 
   const dayOrders = useMemo(() => orders.filter((o) => dateOf(o.createdAt) === reportDate), [orders, reportDate]);
   const dayDelivered = useMemo(() => dayOrders.filter((o) => o.status === "entregada"), [dayOrders]);
   const dayOpen = useMemo(() => dayOrders.filter((o) => o.status !== "entregada"), [dayOrders]);
 
   const dayTotal = useMemo(() => dayOrders.reduce((acc, o) => acc + o.total, 0), [dayOrders]);
   const dayTotalDelivered = useMemo(() => dayDelivered.reduce((acc, o) => acc + o.total, 0), [dayDelivered]);
   const dayTotalOpen = useMemo(() => dayOpen.reduce((acc, o) => acc + o.total, 0), [dayOpen]);
 
   const dayCountCash = useMemo(() => dayOrders.filter((o) => o.payment === "efectivo").length, [dayOrders]);
   const dayCountMP = useMemo(() => dayOrders.filter((o) => o.payment === "mp").length, [dayOrders]);
 
   const olderPendings = useMemo(
     () => orders.filter((o) => o.status !== "entregada" && dateOf(o.createdAt) < reportDate),
     [orders, reportDate]
-// Editor modal de producto
-const [editing, setEditing] = useState<Product | null>(null);
-
-function saveProduct(p: Product) {
-  setProducts((prev) => {
-    const exists = prev.some((x) => x.id === p.id);
-    const next = exists ? prev.map((x) => (x.id === p.id ? { ...x, ...p } : x)) : [p, ...prev];
-    saveProducts(next);
-    return next;
-  });
-  setEditing(null);
-}
-
   );
 
   /* =============================
      Render
   ============================= */
   return (
     <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
       {/* Header */}
       <header className="px-4 pt-4 pb-2 sticky top-0 bg-gray-50 z-10">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-2xl bg-black text-white grid place-items-center text-lg font-bold shadow">LM</div>
           <div className="flex-1">
             <h1 className="text-xl font-bold leading-tight">La Esquina de Maderna</h1>
             <p className="text-xs text-gray-500 -mt-0.5">App de Stock & Ventas — Beta</p>
           </div>
           <button
             className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${isAdmin ? "bg-emerald-600 text-white" : "bg-gray-200"}`}
             onClick={() => (isAdmin ? setIsAdmin(false) : setTab("admin"))}
           >
             {isAdmin ? "Admin ON" : "Admin"}
           </button>
         </div>
       </header>
 
       {/* Main */}
@@ -908,360 +874,470 @@ function saveProduct(p: Product) {
                       <div className="text-sm font-semibold">{Number(p.stockKg || 0).toFixed(2)} {unitLabel(p)}</div>
                     </div>
                   ))}
                 {!products.some((p) => p.active && (p.stockKg || 0) <= 2) && <div className="text-sm text-gray-500">Todo con stock OK.</div>}
               </div>
             </Section>
           </div>
         )}
 
         {/* Admin — ahora es un componente aparte */}
         {tab === "admin" && (
           <AdminPanel
             pinOk={pinOk}
             pinInput={pinInput}
             setPinInput={setPinInput}
             tryLogin={tryLogin}
             productions={productions}
             products={products}
             setProdEditing={setProdEditing}
             handleDeleteClick={handleDeleteClick}
             deleteAskId={deleteAskId}
             orders={orders}
             today={today}
             handleDeleteOrderClick={handleDeleteOrderClick}
             deleteOrderAskId={deleteOrderAskId}
+            onNewProduct={startNewProduct}
+            onEditProduct={openProductEditor}
+            onToggleProductActive={toggleProductActive}
           />
         )}
       </main>
 
       {/* Modal editar producción */}
       {prodEditing && (
         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm grid place-items-center p-4 z-20">
           <div className="bg-white rounded-2xl p-4 w-full max-w-md">
             <div className="flex items-center justify-between mb-2">
               <h3 className="font-semibold">Editar producción</h3>
               <button className="text-sm" onClick={() => setProdEditing(null)}>✕</button>
             </div>
             <div className="grid gap-2">
               <div className="text-sm text-gray-600">{products.find((p) => p.id === prodEditing.productId)?.name}</div>
               <label className="text-xs">
                 Cantidad ({(() => { const prd = products.find((p) => p.id === prodEditing.productId); return prd ? unitLabel(prd) : "kg"; })()})
               </label>
               <input type="number" min={0.1} step={0.1} className="px-3 py-2 rounded-xl border" defaultValue={prodEditing.qtyKg} id="editQtyKg" />
               <label className="text-xs">Fecha</label>
               <input type="date" className="px-3 py-2 rounded-xl border" defaultValue={prodEditing.date} id="editDate" />
               <div className="grid grid-cols-2 gap-2 mt-2">
                 <button className="px-3 py-2 rounded-xl bg-gray-100" onClick={() => setProdEditing(null)}>Cancelar</button>
                 <button
                   className="px-3 py-2 rounded-xl bg-emerald-600 text-white"
                   onClick={() => {
                     const qty = Number((document.getElementById("editQtyKg") as HTMLInputElement).value);
                     const date = (document.getElementById("editDate") as HTMLInputElement).value;
                     if (!qty || qty <= 0) return alert("Cantidad inválida");
                     if (!date) return alert("Fecha inválida");
                     updateProduction(prodEditing.id, qty, date);
                   }}
                 >
                   Guardar cambios
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
 
+      {editing ? (
+        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm grid place-items-center p-4 z-20">
+          <div className="bg-white rounded-2xl p-4 w-full max-w-md">
+            <div className="flex items-center justify-between mb-2">
+              <h3 className="font-semibold">Editar producto</h3>
+              <button className="text-sm" onClick={() => setEditing(null)}>
+                ✕
+              </button>
+            </div>
+            <div className="grid grid-cols-2 gap-2">
+              <input
+                className="col-span-2 px-3 py-2 rounded-xl border"
+                placeholder="Nombre"
+                value={editing.name}
+                onChange={(e) => updateEditing({ name: e.target.value })}
+              />
+              <input
+                className="px-3 py-2 rounded-xl border"
+                placeholder="Código"
+                value={editing.code}
+                onChange={(e) => updateEditing({ code: e.target.value })}
+              />
+              <input
+                className="px-3 py-2 rounded-xl border"
+                placeholder="Categoría"
+                value={editing.category}
+                onChange={(e) => updateEditing({ category: e.target.value })}
+              />
+              <input
+                className="px-3 py-2 rounded-xl border"
+                placeholder="Barras"
+                value={editing.barcode}
+                onChange={(e) => updateEditing({ barcode: e.target.value })}
+              />
+              <input
+                className="px-3 py-2 rounded-xl border"
+                placeholder="#HEX"
+                value={editing.hex}
+                onChange={(e) => updateEditing({ hex: e.target.value })}
+              />
+              <input
+                type="number"
+                step="0.01"
+                className="px-3 py-2 rounded-xl border"
+                placeholder={`Costo/${unitLabelFromCategory(editing.category)}`}
+                value={editing.costPerKg}
+                onChange={(e) => updateEditing({ costPerKg: e.target.value })}
+              />
+              <input
+                type="number"
+                step="0.01"
+                className="px-3 py-2 rounded-xl border"
+                placeholder={`PV receta/${unitLabelFromCategory(editing.category)}`}
+                value={editing.pricePerKg}
+                onChange={(e) => updateEditing({ pricePerKg: e.target.value })}
+              />
+              <input
+                type="number"
+                step="0.01"
+                className="px-3 py-2 rounded-xl border"
+                placeholder="PVP tienda"
+                value={editing.priceStore}
+                onChange={(e) => updateEditing({ priceStore: e.target.value })}
+              />
+              <input
+                type="number"
+                step="0.01"
+                min="0"
+                className="px-3 py-2 rounded-xl border"
+                placeholder={`Stock ${unitLabelFromCategory(editing.category)}`}
+                value={editing.stockKg}
+                onChange={(e) => updateEditing({ stockKg: e.target.value })}
+              />
+              <div className="col-span-2 flex items-center justify-between mt-2">
+                <label className="text-sm flex items-center gap-2">
+                  <input
+                    type="checkbox"
+                    checked={!!editing.active}
+                    onChange={(e) => updateEditing({ active: e.target.checked })}
+                  />
+                  Activo
+                </label>
+                <div className="grid grid-cols-2 gap-2">
+                  <button className="px-3 py-2 rounded-xl bg-gray-100" onClick={() => setEditing(null)}>
+                    Cancelar
+                  </button>
+                  <button
+                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white"
+                    onClick={() => editing && saveProduct(editing)}
+                  >
+                    Guardar
+                  </button>
+                </div>
+              </div>
+            </div>
+          </div>
+        </div>
+      ) : null}
+
       {/* Bottom nav */}
       <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
         <div className="max-w-xl mx-auto grid grid-cols-5">
           {[
             { key: "inventario", label: "Inventario", icon: "📦" },
             { key: "comanda", label: "Comanda", icon: "🧾" },
             { key: "produccion", label: "Producción", icon: "🥣" },
             { key: "reportes", label: "Reportes", icon: "📈" },
             { key: "admin", label: "Admin", icon: "🔒" },
           ].map((it) => (
             <button
               key={it.key}
               className={`py-2 text-xs flex flex-col items-center ${tab === (it.key as any) ? "text-black" : "text-gray-500"}`}
               onClick={() => setTab(it.key as any)}
             >
               <div className="text-lg">{it.icon}</div>
               <div>{it.label}</div>
             </button>
           ))}
         </div>
       </nav>
     </div>
   );
 }
 
 /* =============================
    Subcomponentes
 ============================= */
-const ProductionForm: React.FC<{ products: Product[]; onAdd: (productId: string, qtyKg: number, date: string) => void }> = ({ products, onAdd }) => {
-  const [productId, setProductId] = useState(products[0]?.id || "");
+const ProductionForm: FC<{ products: Product[]; onAdd: (productId: string, qtyKg: number, date: string) => void }> = ({ products, onAdd }) => {
+  const firstActiveId = useMemo(
+    () => products.find((p) => p.active)?.id || products[0]?.id || "",
+    [products]
+  );
+  const [productId, setProductId] = useState(firstActiveId);
   const [qty, setQty] = useState(1);
   const [date, setDate] = useState(todayISO());
 
   const prd = products.find((p) => p.id === productId);
   const isUnid = prd ? unitLabel(prd) === "unid" : false;
 
+  useEffect(() => {
+    if (!productId || !products.some((p) => p.id === productId && p.active)) {
+      setProductId(firstActiveId);
+    }
+  }, [productId, firstActiveId, products]);
+
   return (
     <div className="grid gap-2">
       <select className="px-3 py-2 rounded-xl border" value={productId} onChange={(e) => setProductId(e.target.value)}>
         {products.filter((p) => p.active).map((p) => (
           <option key={p.id} value={p.id}>
             {p.name}
           </option>
         ))}
       </select>
       <div className="flex items-center gap-2">
         <input
           type="number"
           min={isUnid ? 1 : 0.1}
           step={isUnid ? 1 : 0.1}
           className="flex-1 px-3 py-2 rounded-xl border"
           value={qty}
           onChange={(e) => setQty(Number(e.target.value))}
         />
         <span className="text-sm text-gray-600">{prd ? unitLabel(prd) : "kg"}</span>
       </div>
       <input type="date" className="px-3 py-2 rounded-xl border" value={date} onChange={(e) => setDate(e.target.value)} />
       <button
         className="w-full mt-1 py-3 rounded-2xl bg-black text-white font-semibold"
         onClick={() => {
           if (!productId) return alert("Elegí un producto");
           if (!qty || qty <= 0) return alert("Cantidad inválida");
           onAdd(productId, qty, date);
           setQty(1);
         }}
       >
         Cargar producción
       </button>
     </div>
   );
 };
 
-{/* Admin */}
-{tab === "admin" && (
-  <div>
-    {!pinOk ? (
-      <Section title="Acceso administrador">
-        <div className="space-y-3">
-          <input
-            className="w-full px-3 py-2 rounded-xl border"
-            placeholder="PIN"
-            value={pinInput}
-            onChange={(e) => setPinInput(e.target.value)}
-            type="password"
-            inputMode="numeric"
-          />
-          <button
-            className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-semibold"
-            onClick={() => tryLogin(pinInput)}
-          >
-            Entrar
-          </button>
-          <div className="text-xs text-gray-500">PIN por defecto: 1234</div>
-        </div>
-      </Section>
-    ) : (
-      <>
-        {/* Producciones (borrar/ajustar) */}
-        <Section title="Producciones (borrar/ajustar)" right={<Pill text={`Total: ${productions.length}`} />}>
-          <div className="space-y-2 max-h-72 overflow-auto pr-1">
-            {productions.map((pr) => {
-              const p = products.find((x) => x.id === pr.productId);
-              return (
-                <div key={pr.id} className="flex items-center justify-between p-2 rounded-xl border bg-gray-50">
-                  <div className="text-sm truncate">
-                    <b>{p?.name || "Producto"}</b> • {pr.qtyKg} {p ? unitLabel(p) : "kg"} •{" "}
-                    <span className="text-gray-500">{pr.date}</span>
-                  </div>
-                  <div className="flex items-center gap-2">
-                    <button className="px-2 py-1 text-xs bg-gray-100 rounded-lg" onClick={() => setProdEditing(pr)}>
-                      Editar
-                    </button>
-                    <button className="px-2 py-1 text-xs bg-red-100 rounded-lg" onClick={() => handleDeleteClick(pr.id)}>
-                      {deleteAskId === pr.id ? "Confirmar" : "Eliminar"}
-                    </button>
-                  </div>
-                </div>
-              );
-            })}
-            {!productions.length && (
-              <div className="text-sm text-gray-500">Sin producciones cargadas.</div>
-            )}
-          </div>
-        </Section>
-
-        {/* Ventas (eliminar por error) */}
-        <Section
-          title="Ventas (eliminar por error)"
-          right={<Pill text={`Últimas: ${orders.length}`} />}
-        >
-          <div className="space-y-2 max-h-72 overflow-auto pr-1">
-            {orders.slice(0, 30).map((o) => (
-              <div key={o.id} className="p-3 rounded-2xl border bg-white">
-                <div className="flex items-center justify-between">
-                  <div className="font-medium">{o.number}</div>
-                  <div className="text-sm">{currency(o.total)}</div>
-                </div>
-                <div className="text-xs text-gray-500">
-                  {new Date(o.createdAt).toLocaleString()} •{" "}
-                  {o.payment === "mp" ? "Mercado Pago" : "Efectivo"} •{" "}
-                  {o.status === "entregada" ? "Entregada" : "Abierta"}
-                </div>
-
-                <div className="mt-2 text-xs">
-                  {o.lines.map((l) => {
-                    const p = products.find((x) => x.id === l.productId);
-                    return (
-                      <div key={l.id} className="flex justify-between">
-                        <span>
-                          {p?.name || "Producto"} × {l.qtyKg}
-                        </span>
-                        <span>{currency(l.qtyKg * l.pricePerKgAtSale)}</span>
-                      </div>
-                    );
-                  })}
-                </div>
-
-                <div className="mt-2 flex items-center justify-end">
-                  <button
-                    className={`px-2 py-1 text-xs rounded-lg ${
-                      o.status === "entregada"
-                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
-                        : "bg-red-100"
-                    }`}
-                    onClick={() => o.status !== "entregada" && handleDeleteOrderClick(o.id)}
-                    disabled={o.status === "entregada"}
-                    title={
-                      o.status === "entregada"
-                        ? "No se puede eliminar una venta entregada"
-                        : "Eliminar comanda y restaurar stock"
-                    }
-                  >
-                    {o.status === "entregada"
-                      ? "No disponible"
-                      : deleteOrderAskId === o.id
-                      ? "Confirmar eliminar"
-                      : "Eliminar"}
-                  </button>
-                </div>
-              </div>
-            ))}
-            {!orders.length && <div className="text-sm text-gray-500">Sin ventas todavía.</div>}
-          </div>
-        </Section>
+/* =============================
+   Admin Panel (extraído)
+============================= */
+function AdminPanel(props: {
+  pinOk: boolean;
+  pinInput: string;
+  setPinInput: (v: string) => void;
+  tryLogin: (pin: string) => void;
+  productions: Production[];
+  products: Product[];
+  setProdEditing: (p: Production | null) => void;
+  handleDeleteClick: (id: string) => void;
+  deleteAskId: string | null;
+  orders: Order[];
+  today: string;
+  handleDeleteOrderClick: (id: string) => void;
+  deleteOrderAskId: string | null;
+  onNewProduct: () => void;
+  onEditProduct: (product: Product) => void;
+  onToggleProductActive: (productId: string) => void;
+}) {
+  const {
+    pinOk,
+    pinInput,
+    setPinInput,
+    tryLogin,
+    productions,
+    products,
+    setProdEditing,
+    handleDeleteClick,
+    deleteAskId,
+    orders,
+    today,
+    handleDeleteOrderClick,
+    deleteOrderAskId,
+    onNewProduct,
+    onEditProduct,
+    onToggleProductActive,
+  } = props;
 
-        {/* Productos (activar/editar) */}
-        <Section
-          title="Productos (activar/editar)"
-          right={
+  return (
+    <div>
+      {!pinOk ? (
+        <Section title="Acceso administrador">
+          <div className="space-y-3">
+            <input
+              className="w-full px-3 py-2 rounded-xl border"
+              placeholder="PIN"
+              value={pinInput}
+              onChange={(e) => setPinInput(e.target.value)}
+              type="password"
+              inputMode="numeric"
+            />
             <button
-              className="px-3 py-2 rounded-xl bg-black text-white"
-              onClick={() =>
-                setEditing({
-                  id: uid(),
-                  name: "",
-                  hex: "#cccccc",
-                  costPerKg: 0,
-                  pricePerKg: 0,
-                  priceStore: 0,
-                  category: "",
-                  code: "",
-                  barcode: "",
-                  stockKg: 0,
-                  active: true,
-                })
-              }
+              className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-semibold"
+              onClick={() => tryLogin(pinInput)}
             >
-              + Nuevo
+              Entrar
             </button>
-          }
-        >
-          <div className="space-y-2">
-            {products.map((p) => (
-              <div key={p.id} className="p-3 rounded-2xl border">
-                <div className="flex items-center gap-3">
-                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: p.hex }} />
-                  <div className="flex-1 min-w-0">
-                    <div className="font-medium truncate">
-                      {p.name || <i className="text-gray-400">(sin nombre)</i>}
+            <div className="text-xs text-gray-500">PIN por defecto: 1234</div>
+          </div>
+        </Section>
+      ) : (
+        <>
+          <Section title="Producciones (borrar/ajustar)" right={<Pill text={`Total: ${productions.length}`} />}>
+            <div className="space-y-2 max-h-72 overflow-auto pr-1">
+              {productions.map((pr) => {
+                const p = products.find((x) => x.id === pr.productId);
+                return (
+                  <div key={pr.id} className="flex items-center justify-between p-2 rounded-xl border bg-gray-50">
+                    <div className="text-sm truncate">
+                      <b>{p?.name || "Producto"}</b> • {pr.qtyKg} {p ? unitLabel(p) : "kg"} •{" "}
+                      <span className="text-gray-500">{pr.date}</span>
                     </div>
-                    <div className="text-xs text-gray-500">
-                      {p.code} • {p.category || "Sin categoría"}
+                    <div className="flex items-center gap-2">
+                      <button className="px-2 py-1 text-xs bg-gray-100 rounded-lg" onClick={() => setProdEditing(pr)}>
+                        Editar
+                      </button>
+                      <button className="px-2 py-1 text-xs bg-red-100 rounded-lg" onClick={() => handleDeleteClick(pr.id)}>
+                        {deleteAskId === pr.id ? "Confirmar" : "Eliminar"}
+                      </button>
                     </div>
                   </div>
-                  <div className="grid gap-1">
-                    <button className="text-xs px-2 py-1 rounded-lg bg-gray-100" onClick={() => setEditing(p)}>
-                      Editar
-                    </button>
+                );
+              })}
+              {!productions.length && <div className="text-sm text-gray-500">Sin producciones cargadas.</div>}
+            </div>
+          </Section>
+
+          <Section
+            title="Ventas (eliminar por error)"
+            right={<Pill text={`Hoy: ${orders.filter((o) => o.createdAt.slice(0, 10) === today).length}`} />}
+          >
+            <div className="space-y-2 max-h-72 overflow-auto pr-1">
+              {orders.slice(0, 30).map((o) => (
+                <div key={o.id} className="p-3 rounded-2xl border bg-white">
+                  <div className="flex items-center justify-between">
+                    <div className="font-medium">{o.number}</div>
+                    <div className="text-sm">{currency(o.total)}</div>
+                  </div>
+                  <div className="text-xs text-gray-500">
+                    {new Date(o.createdAt).toLocaleString()} • {o.payment === "mp" ? "Mercado Pago" : "Efectivo"} •{" "}
+                    {o.status === "entregada" ? "Entregada" : "Abierta"}
+                  </div>
+
+                  <div className="mt-2 text-xs">
+                    {o.lines.map((l) => {
+                      const p = products.find((x) => x.id === l.productId);
+                      return (
+                        <div key={l.id} className="flex justify-between">
+                          <span>
+                            {p?.name || "Producto"} × {l.qtyKg}
+                          </span>
+                          <span>{currency(l.qtyKg * l.pricePerKgAtSale)}</span>
+                        </div>
+                      );
+                    })}
+                  </div>
+
+                  <div className="mt-2 flex items-center justify-end">
                     <button
-                      className="text-xs px-2 py-1 rounded-lg bg-gray-100"
-                      onClick={() =>
-                        setProducts((prev) =>
-                          prev.map((px) => (px.id === p.id ? { ...px, active: !px.active } : px))
-                        )
+                      className={`px-2 py-1 text-xs rounded-lg ${
+                        o.status === "entregada" ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-red-100"
+                      }`}
+                      onClick={() => o.status !== "entregada" && handleDeleteOrderClick(o.id)}
+                      disabled={o.status === "entregada"}
+                      title={
+                        o.status === "entregada"
+                          ? "No se puede eliminar una venta entregada"
+                          : "Eliminar comanda y restaurar stock"
                       }
                     >
-                      {p.active ? "Desactivar" : "Activar"}
+                      {o.status === "entregada"
+                        ? "No disponible"
+                        : deleteOrderAskId === o.id
+                        ? "Confirmar eliminar"
+                        : "Eliminar"}
                     </button>
                   </div>
                 </div>
-                <div className="text-xs text-gray-500 mt-2">
-                  C: {currency(p.costPerKg ?? undefined)}/{unitLabel(p)} • PV receta:{" "}
-                  {currency(p.pricePerKg ?? undefined)}/{unitLabel(p)} • PVP tienda:{" "}
-                  {currency(p.priceStore ?? undefined)} • Stock:{" "}
-                  {Number(p.stockKg || 0).toFixed(2)} {unitLabel(p)}
-                </div>
-              </div>
-            ))}
-          </div>
-        </Section>
+              ))}
+              {!orders.length && <div className="text-sm text-gray-500">Sin ventas todavía.</div>}
+            </div>
+          </Section>
 
-        {/* Modal editor producto */}
-        {editing && (
-          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm grid place-items-center p-4 z-20">
-            <div className="bg-white rounded-2xl p-4 w-full max-w-md">
-              <div className="flex items-center justify-between mb-2">
-                <h3 className="font-semibold">Editar producto</h3>
-                <button className="text-sm" onClick={() => setEditing(null)}>✕</button>
-              </div>
-              <div className="grid grid-cols-2 gap-2">
-                <input className="col-span-2 px-3 py-2 rounded-xl border" placeholder="Nombre" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
-                <input className="px-3 py-2 rounded-xl border" placeholder="Código" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
-                <input className="px-3 py-2 rounded-xl border" placeholder="Categoría" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
-                <input className="px-3 py-2 rounded-xl border" placeholder="Barras" value={editing.barcode || ""} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} />
-                <input className="px-3 py-2 rounded-xl border" placeholder="#HEX" value={editing.hex} onChange={(e) => setEditing({ ...editing, hex: e.target.value })} />
-                <input type="number" step="0.01" className="px-3 py-2 rounded-xl border" placeholder={`Costo/${unitLabel(editing as Product)}`} value={editing.costPerKg ?? 0} onChange={(e) => setEditing({ ...editing, costPerKg: Number(e.target.value) })} />
-                <input type="number" step="0.01" className="px-3 py-2 rounded-xl border" placeholder={`PV receta/${unitLabel(editing as Product)}`} value={editing.pricePerKg ?? 0} onChange={(e) => setEditing({ ...editing, pricePerKg: Number(e.target.value) })} />
-                <input type="number" step="0.01" className="px-3 py-2 rounded-xl border" placeholder="PVP tienda" value={editing.priceStore ?? 0} onChange={(e) => setEditing({ ...editing, priceStore: Number(e.target.value) })} />
-                <input type="number" step="0.01" className="px-3 py-2 rounded-xl border" placeholder={`Stock ${unitLabel(editing as Product)}`} value={editing.stockKg} onChange={(e) => setEditing({ ...editing, stockKg: Number(e.target.value) })} />
-                <div className="col-span-2 flex items-center justify-between mt-2">
-                  <label className="text-sm flex items-center gap-2">
-                    <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
-                    Activo
-                  </label>
-                  <div className="grid grid-cols-2 gap-2">
-                    <button className="px-3 py-2 rounded-xl bg-gray-100" onClick={() => setEditing(null)}>Cancelar</button>
-                    <button className="px-3 py-2 rounded-xl bg-emerald-600 text-white" onClick={() => saveProduct(editing!)}>Guardar</button>
+          <Section
+            title="Productos (activar/editar)"
+            right={
+              <button className="px-3 py-2 rounded-xl bg-black text-white" onClick={onNewProduct}>
+                + Nuevo
+              </button>
+            }
+          >
+            <div className="space-y-2">
+              {products.map((p) => (
+                <div key={p.id} className="p-3 rounded-2xl border">
+                  <div className="flex items-center gap-3">
+                    <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: p.hex }} />
+                    <div className="flex-1 min-w-0">
+                      <div className="font-medium truncate">
+                        {p.name || <i className="text-gray-400">(sin nombre)</i>}
+                      </div>
+                      <div className="text-xs text-gray-500">
+                        {p.code} • {p.category || "Sin categoría"}
+                      </div>
+                    </div>
+                    <div className="grid gap-1">
+                      <button className="text-xs px-2 py-1 rounded-lg bg-gray-100" onClick={() => onEditProduct(p)}>
+                        Editar
+                      </button>
+                      <button
+                        className="text-xs px-2 py-1 rounded-lg bg-gray-100"
+                        onClick={() => onToggleProductActive(p.id)}
+                      >
+                        {p.active ? "Desactivar" : "Activar"}
+                      </button>
+                    </div>
+                  </div>
+                  <div className="text-xs text-gray-500 mt-2">
+                    C: {currency(p.costPerKg ?? undefined)}/{unitLabel(p)} • PV receta: {currency(p.pricePerKg ?? undefined)}/
+                    {unitLabel(p)} • PVP tienda: {currency(p.priceStore ?? undefined)} • Stock: {Number(p.stockKg || 0).toFixed(2)}{' '}
+                    {unitLabel(p)}
                   </div>
                 </div>
-              </div>
+              ))}
             </div>
-          </div>
-        )}
-      </>
-    )}
-  </div>
-)}
+          </Section>
+
+          <Section title="Seguridad">
+            <div className="flex items-center gap-2">
+              <input
+                className="flex-1 px-3 py-2 rounded-xl border"
+                placeholder="Nuevo PIN"
+                onChange={(e) => setPinInput(e.target.value)}
+              />
+              <button
+                className="px-3 py-2 rounded-xl bg-gray-100"
+                onClick={() => {
+                  if (!pinInput.trim()) return alert("Ingresá un PIN");
+                  savePin(pinInput.trim());
+                  setPinInput("");
+                  alert("PIN actualizado");
+                }}
+              >
+                Guardar
+              </button>
+            </div>
+          </Section>
+        </>
+      )}
+    </div>
+  );
+}
 
 /* =============================
    Tests (sanity checks)
 ============================= */
 if (typeof window !== "undefined") {
   const TABS = ["inventario", "comanda", "produccion", "reportes", "admin"];
   console.assert(TABS.length === 5, "Debe haber 5 tabs");
 }
