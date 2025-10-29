// src/lib/sync.ts
// Cliente para sincronizar con el Apps Script (Drive)

const GAS_URL = import.meta.env.VITE_GAS_URL as string; // ponelo en .env

type Product = {
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
type OrderLine = {
  id: string;
  productId: string;
  qtyKg: number;
  pricePerKgAtSale: number;
};
type Order = {
  id: string;
  number: string;
  createdAt: string;
  lines: OrderLine[];
  total: number;
  partyName?: string;
  payment?: 'efectivo' | 'mp';
  status?: 'abierta' | 'entregada';
};
type Production = {
  id: string;
  productId: string;
  qtyKg: number;
  date: string;
};

type CloudState = {
  products: Product[];
  orders: Order[];
  productions: Production[];
  orderSeq: number;
  pin: string;
  updatedAt: string; // ISO
};

const LS_KEYS = {
  products: 'maderna_products_v1',
  orders: 'maderna_orders_v1',
  productions: 'maderna_productions_v1',
  orderSeq: 'maderna_order_seq_v1',
  pin: 'maderna_admin_pin_v1',
  updatedAt: 'maderna_updated_at_v1',
};

// ---------- helpers localStorage ----------
function getLocalUpdatedAt(): string {
  return localStorage.getItem(LS_KEYS.updatedAt) || '1970-01-01T00:00:00.000Z';
}
function setLocalUpdatedAt(iso?: string) {
  const now = iso || new Date().toISOString();
  localStorage.setItem(LS_KEYS.updatedAt, now);
  return now;
}
function snapshotLocal(): CloudState {
  const products = JSON.parse(localStorage.getItem(LS_KEYS.products) || '[]');
  const orders = JSON.parse(localStorage.getItem(LS_KEYS.orders) || '[]');
  const productions = JSON.parse(localStorage.getItem(LS_KEYS.productions) || '[]');
  const orderSeq = Number(localStorage.getItem(LS_KEYS.orderSeq) || '0');
  const pin = localStorage.getItem(LS_KEYS.pin) || '1234';
  const updatedAt = getLocalUpdatedAt();
  return { products, orders, productions, orderSeq, pin, updatedAt };
}
function applyCloudToLocal(s: CloudState) {
  localStorage.setItem(LS_KEYS.products, JSON.stringify(s.products || []));
  localStorage.setItem(LS_KEYS.orders, JSON.stringify(s.orders || []));
  localStorage.setItem(LS_KEYS.productions, JSON.stringify(s.productions || []));
  localStorage.setItem(LS_KEYS.orderSeq, String(s.orderSeq || 0));
  localStorage.setItem(LS_KEYS.pin, s.pin || '1234');
  setLocalUpdatedAt(s.updatedAt || new Date().toISOString());
}

// ---------- fetch wrappers ----------
async function getJSON(url: string) {
  const r = await fetch(url, { method: 'GET' });
  return r.json();
}
async function postJSON(url: string, body: any) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify(body),
  });
  return r.json();
}

// ---------- API público ----------
export async function pullAll(): Promise<CloudState | null> {
  if (!GAS_URL) return null;
  try {
    const res = await getJSON(GAS_URL);
    if (!res?.ok) return null;
    const cloud: CloudState = res.state;
    const localUpdated = getLocalUpdatedAt();
    if (cloud.updatedAt && cloud.updatedAt > localUpdated) {
      applyCloudToLocal(cloud);
    }
    return cloud;
  } catch {
    return null;
  }
}

export async function pushAllNow(force = false): Promise<boolean> {
  if (!GAS_URL) return false;
  try {
    // asegurar updatedAt local actualizado
    const updatedAt = setLocalUpdatedAt();
    const state = { ...snapshotLocal(), updatedAt };
    const res = await postJSON(GAS_URL, { action: 'push', state, force });
    return !!res?.ok;
  } catch {
    return false;
  }
}

export function setUpdatedNow() {
  setLocalUpdatedAt();
}
export function getUpdatedAt() {
  return getLocalUpdatedAt();
}

// debounce simple para no spamear
let _t: number | null = null;
export function pushDebounced(delay = 1200) {
  if (_t) window.clearTimeout(_t);
  _t = window.setTimeout(() => {
    pushAllNow().catch(() => {});
  }, delay);
}

// Hook de arranque: pull inicial y timer de pull soft
export function wireAutoSync() {
  pullAll().catch(() => {});
  // cada 30s traer por si hubo cambios en otro dispositivo
  window.setInterval(() => pullAll().catch(() => {}), 30000);
}
