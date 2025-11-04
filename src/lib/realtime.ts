// src/lib/realtime.ts
// Stubs seguros para producción. No rompen si no hay backend.

export type Product = {
  id: string; name: string; hex: string;
  costPerKg?: number | null;
  pricePerKg?: number | null;
  priceStore?: number | null;
  category: string; code: string; barcode?: string;
  stockKg: number; active?: boolean;
};

export type OrderLine = {
  id: string; productId: string; qtyKg: number; pricePerKgAtSale: number;
};

export type Order = {
  id: string; number: string; createdAt: string;
  lines: OrderLine[]; total: number;
  partyName?: string; payment?: "efectivo" | "mp"; status?: "abierta" | "entregada";
};

export type Production = { id: string; productId: string; qtyKg: number; date: string };

// ============ NO-OPS (no hacen nada, sólo evitan errores) ============
export async function saveProductsRemote(_rows: Product[]): Promise<void> { /* no-op */ }
export async function saveOrdersRemote(_rows: Order[]): Promise<void> { /* no-op */ }
export async function saveProductionsRemote(_rows: Production[]): Promise<void> { /* no-op */ }

// Pull remoto (si no hay backend, devuelve null y la app sigue con localStorage)
export async function pullAllRemote(): Promise<{
  products: Product[]; orders: Order[]; productions: Production[];
} | null> {
  return null;
}
