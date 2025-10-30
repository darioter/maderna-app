// src/lib/realtime.ts
import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

// Un único documento compartido por todo el equipo
const DATA_DOC_PATH = "maderna/shared_v1";

type Payload = {
  products: any[];
  orders: any[];
  productions: any[];
  orderSeq: number | string;
  pin: string;
  updatedAt?: any;
};

// Sube TODO el estado actual (sobrescribe el doc)
export async function pushSnapshotNow(payload: Payload) {
  try {
    await setDoc(
      doc(db, DATA_DOC_PATH),
      {
        ...payload,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true };
  } catch (e) {
    console.error("pushSnapshotNow error", e);
    return { ok: false, error: String(e) };
  }
}

// Baja TODO el estado una vez
export async function pullSnapshotOnce(): Promise<Payload | null> {
  try {
    const snap = await getDoc(doc(db, DATA_DOC_PATH));
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    return {
      products: data.products || [],
      orders: data.orders || [],
      productions: data.productions || [],
      orderSeq: data.orderSeq || 0,
      pin: data.pin || "1234",
      updatedAt: data.updatedAt || null,
    };
  } catch (e) {
    console.error("pullSnapshotOnce error", e);
    return null;
  }
}

// Suscripción en tiempo real: llama a cb cada vez que cambie el doc
export function subscribeRealtime(
  cb: (data: Payload | null) => void
): () => void {
  const unsub = onSnapshot(doc(db, DATA_DOC_PATH), (snap) => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    const data = snap.data() as any;
    cb({
      products: data.products || [],
      orders: data.orders || [],
      productions: data.productions || [],
      orderSeq: data.orderSeq || 0,
      pin: data.pin || "1234",
      updatedAt: data.updatedAt || null,
    });
  });
  return unsub;
}
