import admin from "firebase-admin";

function safeParseJson(raw: string): any {
  let cleaned = raw.trim();
  if (
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('"') && cleaned.endsWith('"'))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (err1: any) {
    try {
      const sanitized = cleaned
        .replace(/\r\n/g, "\\n")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\n");
      return JSON.parse(sanitized);
    } catch {
      return null;
    }
  }
}

function getServiceAccountCredential() {
  // 1. FIREBASE_SERVICE_ACCOUNT (JSON)
  const rawSa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (rawSa) {
    try {
      const sa = safeParseJson(rawSa);
      if (sa && sa.project_id && sa.client_email && sa.private_key) {
        return admin.credential.cert({
          projectId: sa.project_id,
          clientEmail: sa.client_email,
          privateKey: sa.private_key.replace(/\\n/g, "\n"),
        });
      }
    } catch (e: any) {
      console.error("❌ [Firebase Admin] Credential JSON parse error:", e?.message);
    }
  }

  // 2. 個別環境変数 (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    });
  }

  return null;
}

if (!admin.apps.length) {
  const credential = getServiceAccountCredential();
  if (credential) {
    admin.initializeApp({
      credential,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    console.warn("⚠️ [Firebase Admin] Credentials not configured yet.");
  }
}

export const adminAuth = admin.apps.length
  ? admin.auth()
  : (new Proxy({}, {
      get: () => () => {
        throw new Error("Firebase Admin Auth is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT or FIREBASE_PRIVATE_KEY.");
      },
    }) as ReturnType<typeof admin.auth>);

export const adminDb = admin.apps.length
  ? admin.firestore()
  : (new Proxy({}, {
      get: () => () => {
        throw new Error("Firebase Admin Firestore is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT or FIREBASE_PRIVATE_KEY.");
      },
    }) as ReturnType<typeof admin.firestore>);

export const adminStorage = admin.apps.length
  ? admin.storage()
  : (new Proxy({}, {
      get: () => () => {
        throw new Error("Firebase Admin Storage is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT or FIREBASE_PRIVATE_KEY.");
      },
    }) as ReturnType<typeof admin.storage>);
