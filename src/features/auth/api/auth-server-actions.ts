"use server";

import { adminDb } from "@/src/lib/firebase-admin";
import { toPlainObject } from "@/src/lib/firestore/utils";

/**
 * ユーザー情報の取得 (Server Action)
 */
export async function getConnectUserServer(uid: string) {
  try {
    const snap = await adminDb.collection("connectUsers").doc(uid).get();
    if (!snap.exists) return null;
    return toPlainObject({ id: snap.id, ...snap.data() });
  } catch (e) {
    console.error("getConnectUserServer error:", e);
    return null;
  }
}
