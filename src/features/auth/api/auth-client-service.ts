import { auth, db } from "@/src/lib/firebase";
import { signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { globalLineLoginUrl } from "@/src/lib/functions";

export async function processLineCallback(code: string, state: string, redirectUri: string) {
  // 1. 自前認証サーバーでLINEトークン検証 & Firebaseカスタムトークン取得
  const res = await fetch(`${globalLineLoginUrl}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, state, redirectUri }),
  });
  const data = await res.json();

  if (data.error) throw new Error(data.error);

  // 2. Firebaseカスタムトークンでサインイン
  const { user } = await signInWithCustomToken(auth, data.customToken);

  // 3. Firestore connectUsers ドキュメント作成/更新
  const userRef = doc(db, "connectUsers", user.uid);
  const snap = await getDoc(userRef);

  const userData = {
    displayName: data.profile?.displayName || "Guest",
    pictureUrl: data.profile?.pictureUrl || "",
    lastLoginAt: serverTimestamp(),
    ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
  };

  await setDoc(userRef, userData, { merge: true });
  const updatedSnap = await getDoc(userRef);
  const finalData = updatedSnap.data();

  return {
    user,
    finalData,
    redirectAfterLogin: data.redirectAfterLogin || "/home",
  };
}

