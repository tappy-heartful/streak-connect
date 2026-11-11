import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

let app: App | null = null;

function initFirebaseAdmin(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const rawSa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (rawSa) {
    try {
      let cleaned = rawSa.trim();
      // 前後のシングルクォートやダブルクォートを取り除く
      if (
        (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
        (cleaned.startsWith('"') && cleaned.endsWith('"'))
      ) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      const serviceAccount = JSON.parse(cleaned);
      return initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } catch (e: any) {
      console.error(
        "❌ [Firebase Admin] FIREBASE_SERVICE_ACCOUNT の JSON パースに失敗しました:",
        e?.message
      );
    }
  }

  // 個別の環境変数による初期化フォールバック
  if (process.env.FIREBASE_PROJECT_ID) {
    try {
      return initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } catch (e: any) {
      console.error(
        "❌ [Firebase Admin] 個別環境変数による初期化に失敗しました:",
        e?.message
      );
    }
  }

  console.error(
    "❌ [Firebase Admin] 認証情報が見つかりません。FIREBASE_SERVICE_ACCOUNT または FIREBASE_PROJECT_ID などの環境変数を Vercel に設定してください。"
  );
  // 初期化なしでダミー作成（呼び出し時にエラーを分かりやすく報告）
  return initializeApp();
}

try {
  app = initFirebaseAdmin();
} catch (e) {
  console.error("Firebase Admin initialization error:", e);
}

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    const auth = app ? getAuth(app) : getAuth();
    const value = (auth as any)[prop];
    return typeof value === "function" ? value.bind(auth) : value;
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    const db = app ? getFirestore(app) : getFirestore();
    const value = (db as any)[prop];
    return typeof value === "function" ? value.bind(db) : value;
  },
});

export const adminStorage: Storage = new Proxy({} as Storage, {
  get(_, prop) {
    const storage = app ? getStorage(app) : getStorage();
    const value = (storage as any)[prop];
    return typeof value === "function" ? value.bind(storage) : value;
  },
});
