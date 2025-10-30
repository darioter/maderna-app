export type SyncPayload = {
  products?: unknown
  orders?: unknown
  productions?: unknown
  orderSeq?: number | string
  pin?: string
  updatedAt?: string
}

export type SyncResult = { updatedAt: string }

// no-op para compilar: luego metemos Firestore acá.
export function wireAutoSync(): void { /* noop */ }
export async function pullAll(): Promise<SyncResult> {
  return { updatedAt: new Date().toISOString() }
}
export async function drivePush(_payload?: SyncPayload): Promise<SyncResult> {
  return { updatedAt: new Date().toISOString() }
}
// debounce dummy
export function pushDebounced(): void { /* noop */ }
