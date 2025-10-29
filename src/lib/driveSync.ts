// src/lib/driveSync.ts
import { DRIVE_SYNC_URL, DRIVE_SYNC_KEY, DRIVE_SYNC_ENABLED } from './config';

export type DriveDB<Product, Order, Production> = {
  products: Product[];
  orders: Order[];
  productions: Production[];
  orderSeq: number;
  pin: string;
  updatedAt: string; // ISO
};

async function httpGet(url: string) {
  const u = `${url}?key=${encodeURIComponent(DRIVE_SYNC_KEY)}`;
  const res = await fetch(u, { method: 'GET' });
  return res.json();
}
async function httpPost(url: string, body: any) {
  const res = await fetch(`${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: DRIVE_SYNC_KEY, db: body }),
  });
  return res.json();
}

export async function drivePull<TP,TO,TR>(): Promise<DriveDB<TP,TO,TR> | null> {
  if (!DRIVE_SYNC_ENABLED) return null;
  try {
    const r = await httpGet(DRIVE_SYNC_URL);
    if (r && r.ok && r.db) return r.db as DriveDB<TP,TO,TR>;
  } catch {}
  return null;
}

export async function drivePush<TP,TO,TR>(db: DriveDB<TP,TO,TR>): Promise<DriveDB<TP,TO,TR> | null> {
  if (!DRIVE_SYNC_ENABLED) return null;
  try {
    const r = await httpPost(DRIVE_SYNC_URL, db);
    if (r && r.ok && r.db) return r.db as DriveDB<TP,TO,TR>;
  } catch {}
  return null;
}
