import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const redirectAfterLogin = searchParams.get("redirectAfterLogin") || "";
    const pwaSessionId = searchParams.get("pwaSessionId") || "";

    // ホスト名・オリジンの判定 (Vercelリバースプロキシ対応)
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    const forwardedHost =
      req.headers.get("x-forwarded-host") || req.headers.get("host");
    const origin =
      req.headers.get("origin") ||
      (forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(req.url).origin);

    const clientId =
      process.env.LINE_CLIENT_ID_CONNECT || process.env.LINE_CLIENT_ID_NAVI;

    if (!clientId) {
      console.error(
        "❌ [API /api/line/get-url] LINE_CLIENT_ID_CONNECT が未設定です"
      );
      return NextResponse.json(
        {
          error: "Vercel 環境変数エラー: LINE_CLIENT_ID_CONNECT が設定されていません。",
          envStatus: {
            LINE_CLIENT_ID_CONNECT: !!process.env.LINE_CLIENT_ID_CONNECT,
            LINE_CLIENT_ID_NAVI: !!process.env.LINE_CLIENT_ID_NAVI,
            FIREBASE_SERVICE_ACCOUNT: !!process.env.FIREBASE_SERVICE_ACCOUNT,
            FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
            FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
            FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
          },
        },
        { status: 500 }
      );
    }

    const state = crypto.randomBytes(16).toString("hex");

    // Firestore に state を保存
    try {
      await adminDb.collection("oauthStates").doc(state).set({
        createdAt: new Date(),
        origin,
        redirectAfterLogin,
        pwaSessionId,
      });
    } catch (dbErr: any) {
      console.error(
        "❌ [API /api/line/get-url] Firestore (oauthStates) 保存失敗:",
        dbErr
      );
      return NextResponse.json(
        {
          error: `Firestore接続・認証エラー: ${dbErr?.message || "oauthStatesの保存に失敗しました"}`,
          stack: dbErr?.stack,
          envStatus: {
            hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
            serviceAccountLength: process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0,
            hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
            hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
            hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
          },
        },
        { status: 500 }
      );
    }

    const redirectUri = `${origin}/callback`;
    const loginUrl = `https://access.line.me/oauth2/v2.1/authorize?bot_prompt=aggressive&response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}&scope=openid%20profile`;

    return NextResponse.json({ loginUrl });
  } catch (err: any) {
    console.error("❌ [API /api/line/get-url] 全体ハンドラーエラー:", err);
    return NextResponse.json(
      {
        error: `サーバー内部エラー: ${err?.message || "Unknown error"}`,
        stack: err?.stack,
      },
      { status: 500 }
    );
  }
}
