import { db } from "@/src/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { toPlainObject } from "@/src/lib/firestore/utils";

/**
 * 設問一覧の取得
 */
export async function getEnqueteQuestions() {
  const qRef = doc(db, "configs", "enqueteQuestions");
  const snap = await getDoc(qRef);
  if (!snap.exists()) return [];
  const data = snap.data();
  return (data.questions || []).map((q: any) => toPlainObject(q));
}

/**
 * ログインユーザーの既存回答を取得
 */
export async function getExistingEnqueteAnswer(liveId: string, uid: string) {
  const ansRef = collection(db, "enqueteAnswers");
  const q = query(ansRef, where("liveId", "==", liveId), where("uid", "==", uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...toPlainObject(d.data()) };
}

/**
 * アンケート回答を保存
 */
export async function saveEnqueteAnswer({
  liveId,
  uid,
  answers,
  existingDocId,
}: {
  liveId: string;
  uid?: string;
  answers: Record<string, any>;
  existingDocId?: string;
}) {
  const payload = {
    liveId,
    uid: uid || null,
    common: answers,
    submittedAt: serverTimestamp(),
  };

  if (existingDocId) {
    const docRef = doc(db, "enqueteAnswers", existingDocId);
    await setDoc(docRef, payload, { merge: true });
  } else {
    await addDoc(collection(db, "enqueteAnswers"), payload);
  }
}

