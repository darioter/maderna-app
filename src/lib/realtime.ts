// src/lib/realtime.ts
import {
  writeBatch,
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// Tipos mínimos para compilar (coinciden con los de tu App.tsx)
export type Product = {
  id: string;
  name: string;
  hex: string;
  costPerKg?: number | null;
  pricePerKg?: number | null;
  priceStore?: number | null;
  category: string;
  code: string;
  barcode?: string;
  stockKg: number;
  active?: boolean;
};

export type OrderLine = {
  id: string;
  productId: string;
  qtyKg: number;
  pricePerKgAtSale: number;
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
  qtyKg: number;
  date: string;
};

// ============== Guardados remotos (batch upsert) ==============
export async function saveProductsRemote(list: Product[]) {
  const batch = writeBatch(db);
  for (const p of list) {
    batch.set(doc(db, "products", p.id), { ...p, _updatedAt: serverTimestamp() }, { merge: true });
  }
  await batch.commit();
}

export async function saveOrdersRemote(list: Order[]) {
  const batch = writeBatch(db);
  for (const o of list) {
    batch.set(doc(db, "orders", o.id), { ...o, _updatedAt: serverTimestamp() }, { merge: true });
  }
  await batch.commit();
}

export async function saveProductionsRemote(list: Production[]) {
  const batch = writeBatch(db);
  for (const pr of list) {
    batch.set(doc(db, "productions", pr.id), { ...pr, _updatedAt: serverTimestamp() }, { merge: true });
  }
  await batch.commit();
}

// Opcional: metadatos simples (ej: orderSeq, pin, updatedAt)
export async function saveMetaRemote(meta: Record<string, any>) {
  await setDoc(doc(db, "meta", "app"), { ...meta, _updatedAt: serverTimestamp() }, { merge: true });
}

// ============== Suscripción en tiempo real ==============
// Llama a los setters de tu App y, de paso, actualiza localStorage para cache offline.
export function subscribeRealtime(opts: {
  setProducts: (v: Product[]) => void;
  setOrders: (v: Order[]) => void;
  setProductions: (v: Production[]) => void;
}) {
  const unsubProducts = onSnapshot(
    collection(db, "products"),
    (snap) => {
      const items: Product[] = [];
      snap.forEach((d) => items.push(d.data() as Product));
      // cache local
      localStorage.setItem("maderna_products_v1", JSON.stringify(items));
      opts.setProducts(items);
    }
  );

  const unsubOrders = onSnapshot(
    query(collection(db, "orders"), orderBy("createdAt", "desc")),
    (snap) => {
      const items: Order[] = [];
      snap.forEach((d) => items.push(d.data() as Order));
      localStorage.setItem("maderna_orders_v1", JSON.stringify(items));
      opts.setOrders(items);
    }
  );

  const unsubProductions = onSnapshot(
    query(collection(db, "productions"), orderBy("date", "desc")),
    (snap) => {
      const items: Production[] = [];
      snap.forEach((d) => items.push(d.data() as Production));
      localStorage.setItem("maderna_productions_v1", JSON.stringify(items));
      opts.setProductions(items);
    }
  );

  return () => {
    unsubProducts();
    unsubOrders();
    unsubProductions();
  };
}
