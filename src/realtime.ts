// src/realtime.ts
import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

// Colección/doc único donde se guarda el snapshot compartido
const COL = "maderna_state";
const DOC_ID = "shared_snapshot";

export type SharedSnapshot = {
  products?: unknown;
  orders?: unknown;
  productions?: unknown;
  orderSeq?: unknown;
  pin?: unknown;
  _updatedAt?: unknown;
};

export async function pullSnapshotOnce(): Promise<SharedSnapshot | null> {
  const ref = doc(db, COL, DOC_ID);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as SharedSnapshot) : null;
}

export async function pushSnapshotNow(payload: SharedSnapshot): Promise<void> {
  const ref = doc(db, COL, DOC_ID);
  await setDoc(
    ref,
    { ...payload, _updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export function subscribeRealtime(
  cb: (data: SharedSnapshot | null) => void
): () => void {
  const ref = doc(db, COL, DOC_ID);
  const un = onSnapshot(ref, (snap) => {
    cb(snap.exists() ? (snap.data() as SharedSnapshot) : null);
  });
  return un;
}
