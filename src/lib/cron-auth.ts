import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * 安全な文字列一致比較（タイミング攻撃防止）
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * CRON実行リクエストの認証検証
 *
 * 【セキュリティ仕様】
 * 1. 本番環境 (NODE_ENV === "production"):
 *    - 環境変数 CRON_SECRET が設定されていない場合は、未認証の第三者による不正実行・スパム送信を防ぐため
 *      フェイルセーフとして即座にアクセスを拒否 (500 / 401) します。
 *    - Authorization (Bearer) または x-cron-secret ヘッダーと CRON_SECRET を厳格に比較検証します。
 * 2. 開発・ローカル環境 (NODE_ENV !== "production"):
 *    - CRON_SECRET が未設定の場合のみ、ローカル動作検証のためにアクセスを許可します。
 */
export function verifyCronAuth(req: NextRequest): { ok: boolean; reason?: string } {
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (!cronSecret) {
    if (isProduction) {
      console.error(
        "❌ [CRON Auth] 本番環境で CRON_SECRET が未設定のため実行を拒否しました。Vercelの環境変数を設定してください。"
      );
      return {
        ok: false,
        reason: "Server configuration error: CRON_SECRET is required in production",
      };
    }
    // 開発環境のみ未設定を許可
    return { ok: true };
  }

  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7).trim()
    : null;
  const customHeader = req.headers.get("x-cron-secret");

  const providedToken = bearerToken || customHeader;
  if (!providedToken) {
    return { ok: false, reason: "Unauthorized: Missing authentication token" };
  }

  if (!safeCompare(providedToken, cronSecret)) {
    return { ok: false, reason: "Unauthorized: Invalid CRON_SECRET" };
  }

  return { ok: true };
}

