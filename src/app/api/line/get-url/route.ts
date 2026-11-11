import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const origin = req.headers.get("origin") || new URL(req.url).origin;
    const redirectAfterLogin = searchParams.get("redirectAfterLogin") || "";
    const pwaSessionId = searchParams.get("pwaSessionId") || "";

    const clientId =
      process.env.LINE_CLIENT_ID_CONNECT || process.env.LINE_CLIENT_ID_NAVI;

    if (!clientId) {
      console.error(
        "❌ [API /api/line/get-url] LINE_CLIENT_ID_CONNECT が環境変数に設定されていません。"
      );
      return NextResponse.json(
        {
          error:
            "サーバー設定エラー: LINE_CLIENT_ID_CONNECT が設定されていません。Vercelの環境変数を確認してください。",
        },
        { status: 500 }
      );
    }

    const state = crypto.randomBytes(16).toString("hex");

    try {
      await adminDb.collection("oauthStates").doc(state).set({
        createdAt: new Date(),
        origin,
        redirectAfterLogin,
        pwaSessionId,
      });
    } catch (dbErr: any) {
      console.error("❌ [API /api/line/get-url] Firestore (oauthStates) への保存に失敗:", dbErr);
      return NextResponse.json(
        {
          error: `Firestore接続エラー: ${dbErr?.message || "oauthStatesの保存に失敗しました"}`,
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
    console.error("❌ [API /api/line/get-url] 予期せぬエラー:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate URL" },
      { status: 500 }
    );
  }
}
