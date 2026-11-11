import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

let app: App | null = null;

function safeParseJson(raw: string): any {
  let cleaned = raw.trim();
  // 前後のクォートを取り除く
  if (
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('"') && cleaned.endsWith('"'))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (err1: any) {
    // 制御文字（生の改行）などが混入している場合のフォールバック
    try {
      // 未エスケープの改行文字をエスケープして再試行
      const sanitized = cleaned
        .replace(/\r\n/g, "\\n")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\n");
      return JSON.parse(sanitized);
    } catch (err2: any) {
      console.error(
        "❌ [Firebase Admin] FIREBASE_SERVICE_ACCOUNT パース失敗:",
        err1?.message,
        err2?.message
      );
      throw new Error(`FIREBASE_SERVICE_ACCOUNT の JSON パースに失敗しました: ${err1?.message}`);
    }
  }
}

function getServiceAccountCredential() {
  // 1. FIREBASE_SERVICE_ACCOUNT (JSON文字列) の検証
  const rawSa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (rawSa) {
    try {
      const sa = safeParseJson(rawSa);
      if (sa.project_id && sa.client_email && sa.private_key) {
        return cert({
          projectId: sa.project_id,
          clientEmail: sa.client_email,
          privateKey: sa.private_key.replace(/\\n/g, "\n"),
        });
      }
    } catch (e: any) {
      console.error("❌ [Firebase Admin] Credential 取得エラー:", e?.message);
    }
  }

  // 2. 個別環境変数 (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    });
  }

  return null;
}

function initFirebaseAdmin(): App | null {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const credential = getServiceAccountCredential();
  if (!credential) {
    console.error(
      "❌ [Firebase Admin] 認証情報が設定されていません。Vercel に FIREBASE_SERVICE_ACCOUNT または (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) を設定してください。"
    );
    return null;
  }

  try {
    return initializeApp({
      credential,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (err: any) {
    console.error("❌ [Firebase Admin] 初期化エラー:", err?.message);
    return null;
  }
}

try {
  app = initFirebaseAdmin();
} catch (e: any) {
  console.error("Firebase Admin top-level init exception:", e?.message);
}

function ensureApp(): App {
  if (!app) {
    app = initFirebaseAdmin();
  }
  if (!app) {
    throw new Error(
      "Firebase Admin の初期化に失敗しました。Vercel の環境変数 (FIREBASE_SERVICE_ACCOUNT または FIREBASE_PRIVATE_KEY 等) を確認してください。"
    );
  }
  return app;
}

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    const currentApp = ensureApp();
    const auth = getAuth(currentApp);
    const value = (auth as any)[prop];
    return typeof value === "function" ? value.bind(auth) : value;
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    const currentApp = ensureApp();
    const db = getFirestore(currentApp);
    const value = (db as any)[prop];
    return typeof value === "function" ? value.bind(db) : value;
  },
});

export const adminStorage: Storage = new Proxy({} as Storage, {
  get(_, prop) {
    const currentApp = ensureApp();
    const storage = getStorage(currentApp);
    const value = (storage as any)[prop];
    return typeof value === "function" ? value.bind(storage) : value;
  },
});
