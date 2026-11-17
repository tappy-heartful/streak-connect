import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { Live } from "@/src/lib/firestore/types";

export async function getLiveServer(liveId: string): Promise<Live | null> {
  const docSnap = await adminDb.collection("lives").doc(liveId).get();
  if (!docSnap.exists) return null;
  return toPlainObject<Live>({ id: docSnap.id, ...docSnap.data() });
}
