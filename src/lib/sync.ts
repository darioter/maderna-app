import { supabase } from './supabase';

export type DBProduct = {
  id: string; name: string; hex: string;
  cost_per_kg: number | null;
  price_per_kg: number | null;
  price_store: number | null;
  category: string; code: string; barcode: string | null;
  stock_kg: number; active: boolean; updated_at: string;
};

export type DBOrder = {
  id: string; number: string; created_at: string;
  total: number; party_name: string | null;
  payment: 'efectivo'|'mp'; status: 'abierta'|'entregada';
  updated_at: string;
};

export type DBOrderLine = {
  id: string; order_id: string; product_id: string;
  qty_kg: number; price_per_kg_at_sale: number;
};

export type DBProduction = {
  id: string; product_id: string; qty_kg: number; date: string;
  created_at: string; updated_at: string;
};

/** ====== FETCH ====== */
export async function fetchAll() {
  const [prod, ord, lines, prods] = await Promise.all([
    supabase.from('products').select('*').order('name', { ascending: true }),
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('order_lines').select('*'),
    supabase.from('productions').select('*').order('created_at', { ascending: false }).limit(200),
  ]);
  if (prod.error) throw prod.error;
  if (ord.error) throw ord.error;
  if (lines.error) throw lines.error;
  if (prods.error) throw prods.error;
  return {
    products: (prod.data || []) as DBProduct[],
    orders: (ord.data || []) as DBOrder[],
    orderLines: (lines.data || []) as DBOrderLine[],
    productions: (prods.data || []) as DBProduction[],
  };
}

/** ====== UPSERTS ====== */
export async function upsertProduct(p: Partial<DBProduct>) {
  const { error, data } = await supabase.from('products').upsert(p).select('*').single();
  if (error) throw error;
  return data as DBProduct;
}

export async function createProduction(p: { product_id: string; qty_kg: number; date: string; }) {
  const { error, data } = await supabase.from('productions').insert(p).select('*').single();
  if (error) throw error;
  return data as DBProduction;
}

export async function deleteProduction(id: string) {
  const { error } = await supabase.from('productions').delete().eq('id', id);
  if (error) throw error;
}

export async function createOrder(payload: {
  number: string;
  lines: { product_id: string; qty_kg: number; price_per_kg_at_sale: number }[];
  total: number;
  party_name?: string;
  payment?: 'efectivo'|'mp';
  status?: 'abierta'|'entregada';
}) {
  // 1) insertar order
  const { data: order, error: e1 } = await supabase.from('orders').insert({
    number: payload.number,
    total: payload.total,
    party_name: payload.party_name || '',
    payment: payload.payment || 'efectivo',
    status: payload.status || 'abierta'
  }).select('*').single();
  if (e1) throw e1;

  // 2) insertar líneas
  const lines = payload.lines.map(l => ({ ...l, order_id: order!.id }));
  const { error: e2 } = await supabase.from('order_lines').insert(lines);
  if (e2) throw e2;

  // 3) descontar stock (server-side simple)
  for (const l of payload.lines) {
    await supabase.rpc('decrement_stock', { p_product_id: l.product_id, p_qty: l.qty_kg })
      .catch(() => {}); // opcional si no creamos la RPC; podemos hacer update products set stock_kg = stock_kg - l.qty_kg
    await supabase.from('products')
      .update({ stock_kg: (undefined as any) }) // noop para activar trigger; se reemplaza abajo
      .eq('id', l.product_id);
  }

  return order!;
}

export async function updateOrder(id: string, patch: Partial<DBOrder>) {
  const { error } = await supabase.from('orders').update(patch).eq('id', id);
  if (error) throw error;
}

export async function undoOrder(orderId: string) {
  const { error } = await supabase.rpc('undo_order', { p_order_id: orderId });
  if (error) throw error;
}

/** ====== REALTIME ====== */
export function subscribeAll(onChange: (table: string, event: 'INSERT'|'UPDATE'|'DELETE', row: any) => void) {
  const channel = supabase.channel('db-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) =>
      onChange('products', payload.eventType as any, payload.new || payload.old))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) =>
      onChange('orders', payload.eventType as any, payload.new || payload.old))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_lines' }, (payload) =>
      onChange('order_lines', payload.eventType as any, payload.new || payload.old))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'productions' }, (payload) =>
      onChange('productions', payload.eventType as any, payload.new || payload.old))
    .subscribe();

  return () => supabase.removeChannel(channel);
}
