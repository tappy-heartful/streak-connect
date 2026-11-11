import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";

/**
 * LINE Connect公式アカウント用アクセストークン取得
 */
function getLineConnectAccessToken(): string | null {
  return (
    process.env.LINE_ACCESS_TOKEN_CONNECT ||
    process.env.LINE_CHANNEL_ACCESS_TOKEN_CONNECT ||
    null
  );
}

/**
 * LINE Push メッセージ送信 (Connect用)
 */
export async function sendLinePushConnect(
  toLineUid: string,
  messageText: string
): Promise<boolean> {
  const token = getLineConnectAccessToken();
  if (!token) {
    console.warn("LINE_ACCESS_TOKEN_CONNECT is not set. Skipping LINE notification.");
    return false;
  }
  if (!toLineUid) {
    console.warn("Target LINE UID is empty.");
    return false;
  }

  try {
    const payload = {
      to: toLineUid,
      messages: [{ type: "text", text: messageText }],
    };

    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LINE Push API error (${response.status}):`, errorText);
      return false;
    }

    return true;
  } catch (err) {
    console.error("LINE Push API request failed:", err);
    return false;
  }
}

/**
 * ユーザーUIDから LINE UID を取得
 */
export async function getLineUidByUid(uid: string): Promise<string | null> {
  try {
    const docSnap = await adminDb.collection("lineMessagingIds").doc(uid).get();
    if (!docSnap.exists) return null;
    const data = docSnap.data();
    return data?.lineUid || null;
  } catch (err) {
    console.error("Failed to fetch lineUid for uid:", uid, err);
    return null;
  }
}

