import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/src/lib/firebase-admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { code, state, redirectUri } = await req.json();

    // 1. State 検証
    const stateRef = adminDb.collection("oauthStates").doc(state);
    const stateDoc = await stateRef.get();
    if (!stateDoc.exists) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }
    const stateData = stateDoc.data();
    await stateRef.delete();

    const clientId =
      process.env.LINE_CLIENT_ID_CONNECT || process.env.LINE_CLIENT_ID_NAVI!;
    const clientSecret =
      process.env.LINE_CLIENT_SECRET_CONNECT ||
      process.env.LINE_CLIENT_SECRET_NAVI!;

    // 2. LINE トークン交換
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      console.error("LINE token error:", tokenData);
      return NextResponse.json(
        { error: tokenData.error_description || "Token exchange failed" },
        { status: 400 }
      );
    }

    // 2.5 友だち状態チェック（取得できる場合のみ）
    let isFriend = false;
    try {
      const friendRes = await fetch("https://api.line.me/friendship/v1/status", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (friendRes.ok) {
        const friendData = await friendRes.json();
        isFriend = !!friendData.friendFlag;
      }
    } catch (e) {
      console.warn("Friendship status check warning:", e);
    }

    // 3. IDトークン検証
    const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      body: new URLSearchParams({
        id_token: tokenData.id_token,
        client_id: clientId,
      }),
    });
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || verifyData.error) {
      console.error("LINE verify error:", verifyData);
      return NextResponse.json(
        { error: verifyData.error_description || "Token verification failed" },
        { status: 400 }
      );
    }

    // 4. カスタムトークン発行
    const rawLineUid = verifyData.sub;
    const salt = process.env.SALT || "";
    const pepper = process.env.PEPPER || "";
    const hashedUserId = crypto
      .createHash("sha256")
      .update(salt + rawLineUid + pepper)
      .digest("hex");

    const customToken = await adminAuth.createCustomToken(hashedUserId);

    // 5. lineMessagingIds の更新
    await adminDb
      .collection("lineMessagingIds")
      .doc(hashedUserId)
      .set(
        {
          lineUid: rawLineUid,
          isConnect: true,
          isFriend,
          updatedAt: new Date(),
        },
        { merge: true }
      );

    // PWAログイン用のセッション同期処理
    let isPwaLogin = false;
    if (stateData?.pwaSessionId) {
      isPwaLogin = true;
      await adminDb
        .collection("pwaAuthSessions")
        .doc(stateData.pwaSessionId)
        .set({
          customToken,
          profile: {
            displayName: verifyData.name || "",
            pictureUrl: verifyData.picture || "",
          },
          createdAt: new Date(),
          status: "completed",
          uid: hashedUserId,
        });
    }

    return NextResponse.json({
      customToken,
      profile: {
        displayName: verifyData.name || "",
        pictureUrl: verifyData.picture || "",
      },
      redirectAfterLogin: stateData?.redirectAfterLogin || "",
      isPwaLogin,
    });
  } catch (err: any) {
    console.error("Authentication failed:", err);
    return NextResponse.json(
      { error: err?.message || "Authentication failed" },
      { status: 500 }
    );
  }
}

