/**
 * ==============================================================================
 * STREAK CONNECT 当日リマインドBot (StreakConnect_Reminder_Bot.js)
 * ==============================================================================
 *
 * 【概要】
 * Swing Streak Jazz Orchestra 向けファンポータル (Streak Connect) の定期実行Botです。
 * 外部ライブラリ（FirestoreApp等）やFirebase秘密鍵、LINEトークンをGAS側に一切持つことなく、
 * Vercel (Next.js) の認証付きCronエンドポイント (/api/cron/reminder) を
 * セキュアに呼び出して当日チケットリマインド通知を実行します。
 *
 * ※ 予約時即時通知は Vercel サーバーサイドから直接送信されるため、
 *    以前の 1分おき予約監視トリガー（sendTicketNotices）は不要となりました。
 *
 * ------------------------------------------------------------------------------
 * 【設定するトリガー（1つのみ）】
 * - sendDayOfReminders: 【時間ベースのタイマー】「分ベースのタイマー」>「15分おき」
 *
 * 【スクリプトプロパティ（PropertiesService）の設定項目（合計2つのみ）】
 * GAS画面左メニューの歯車アイコン「プロジェクトの設定」→「スクリプト プロパティ」で登録します：
 * - BASE_URL    : Streak Connect の公開URL (例: https://ssjo.vercel.app)
 * - CRON_SECRET : APIエンドポイント保護用の認証シークレットトークン（Vercelの環境変数 CRON_SECRET と同一）
 * ==============================================================================
 */

// ==========================================
// 共通定数・スクリプトプロパティの取得
// ==========================================
const props = PropertiesService.getScriptProperties();
const BASE_URL = props.getProperty("BASE_URL") || "https://ssjo.vercel.app";
const CRON_SECRET = props.getProperty("CRON_SECRET") || "";

// ==============================================================================
// トリガー関数: 当日リマインド通知実行 (sendDayOfReminders)
// ==============================================================================
/**
 * 15分おきに実行する当日リマインド関数
 * 推奨トリガー: 15分おき
 */
function sendDayOfReminders() {
  Logger.log("========== [15分おき] 当日リマインド通知処理を開始します ==========");
  try {
    callCronApi("/api/cron/reminder", false);
    Logger.log("========== [15分おき] 当日リマインド通知処理 正常終了 ==========");
  } catch (err) {
    Logger.log("❌ 当日リマインド実行エラー: " + err.toString());
  }
}

// ==============================================================================
// 【テスト用関数】強制実行テストを行う関数
// ==============================================================================
/**
 * リマインド通知の強制テスト実行（開場時間判定をスキップして即時検証）
 */
function testReminderExecution() {
  Logger.log("========== [テスト実行] 当日リマインド通知 開始 ==========");
  try {
    callCronApi("/api/cron/reminder", true);
    Logger.log("========== [テスト実行] 当日リマインド通知 正常終了 ==========");
  } catch (err) {
    Logger.log("❌ リマインドテストエラー: " + err.toString());
  }
}

// ==============================================================================
// Streak Connect Cron API 呼び出し処理
// ==============================================================================
/**
 * Streak Connect サーバーAPIを安全に呼び出す処理 (POST 送信)
 * @param {string} endpoint - APIパス (例: "/api/cron/reminder")
 * @param {boolean} isForce - 開場時間判定等をスキップして強制実行するかどうか
 */
function callCronApi(endpoint, isForce) {
  const cleanBaseUrl = BASE_URL.replace(/\/$/, "");
  const url = cleanBaseUrl + endpoint + (isForce ? "?force=true" : "");
  Logger.log("APIエンドポイントを呼び出します: " + url);

  const headers = {
    "User-Agent": "StreakConnect-GAS-Cron-Bot/2.0",
    "Content-Type": "application/json",
  };
  if (CRON_SECRET) {
    headers["Authorization"] = "Bearer " + CRON_SECRET;
    headers["x-cron-secret"] = CRON_SECRET;
  }

  const options = {
    method: "POST",
    muteHttpExceptions: true,
    headers: headers,
    payload: JSON.stringify({ isForce: isForce, timestamp: new Date().toISOString() }),
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();

  Logger.log("HTTPステータスコード: " + statusCode);
  Logger.log("レスポンス内容: " + responseText);

  if (statusCode >= 200 && statusCode < 300) {
    let result = {};
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      result = { message: responseText };
    }

    Logger.log("✅ Cron処理が正常に実行されました！ 結果: " + JSON.stringify(result));
  } else {
    throw new Error(
      "API呼び出しに失敗しました (HTTP " + statusCode + "): " + responseText
    );
  }
}

