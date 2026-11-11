import { db } from "@/src/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Live } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

/**
 * ライブ詳細情報の取得
 */
export async function getLiveById(liveId: string): Promise<Live | null> {
  const liveRef = doc(db, "lives", liveId);
  const snap = await getDoc(liveRef);
  if (!snap.exists()) return null;
  return toPlainObject<Live>({ id: snap.id, ...snap.data() });
}

/**
 * ユーザーのチケット予約状況チェック
 */
export async function checkUserTicket(liveId: string, uid: string): Promise<boolean> {
  const ticketRef = doc(db, "tickets", `${liveId}_${uid}`);
  const snap = await getDoc(ticketRef);
  return snap.exists();
}

