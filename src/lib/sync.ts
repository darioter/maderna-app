// Stubs de sincronización para compilar sin errores de tipos.
// Ajustá las firmas si más adelante querés tipar fino.

type AnyFn = (...args: any[]) => any;

export const pushProducts: AnyFn = async (payload: any) => {
  // acá enviarías "payload" a tu backend; por ahora, no-op
  return { ok: true };
};

export const pushOrders: AnyFn = async (payload: any) => {
  return { ok: true };
};

export const pushProductions: AnyFn = async (payload: any) => {
  return { ok: true };
};

export const pullAll: AnyFn = async () => {
  // devolvería { products, orders, productions } desde backend
  return { products: [], orders: [], productions: [] };
};
