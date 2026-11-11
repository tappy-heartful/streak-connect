import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const origin = req.headers.get("origin") || new URL(req.url).origin;
    const redirectAfterLogin = searchParams.get("redirectAfterLogin") || "";
    const pwaSessionId = searchParams.get("pwaSessionId") || "";

    const state = crypto.randomBytes(16).toString("hex");
    await adminDb.collection("oauthStates").doc(state).set({
      createdAt: new Date(),
      origin,
      redirectAfterLogin,
      pwaSessionId,
    });

    const clientId =
      process.env.LINE_CLIENT_ID_CONNECT || process.env.LINE_CLIENT_ID_NAVI;
    const redirectUri = `${origin}/callback`;
    const loginUrl = `https://access.line.me/oauth2/v2.1/authorize?bot_prompt=aggressive&response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}&scope=openid%20profile`;

    return NextResponse.json({ loginUrl });
  } catch (err) {
    console.error("Failed to generate LINE login URL:", err);
    return NextResponse.json(
      { error: "Failed to generate URL" },
      { status: 500 }
    );
  }
}

