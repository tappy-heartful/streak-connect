"use server";

import { adminDb } from "@/src/lib/firebase-admin";
import { sendLinePushConnect, getLineUidByUid } from "@/src/lib/line";

/**
 * 予約完了時の LINE 通知送信 Server Action
 */
export async function sendTicketReservationNoticeAction(
  ticketId: string,
  isUpdate: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const ticketDoc = await adminDb.collection("tickets").doc(ticketId).get();
    if (!ticketDoc.exists) {
      return { success: false, error: "Ticket not found" };
    }
    const ticket = ticketDoc.data()!;
    const isInvite = ticket.resType === "invite";

    // 1. LINE UID の取得
    const lineUid = await getLineUidByUid(ticket.uid);
    if (!lineUid) {
      console.warn(`[TicketNotice] UID: ${ticket.uid} の LINE UID が見つかりません。通知をスキップします。`);
      return { success: false, error: "LINE UID not found" };
    }

    // 2. ユーザー表示名の取得
    let userDisplayName = "お客様";
    const userDoc = await adminDb.collection("connectUsers").doc(ticket.uid).get();
    if (userDoc.exists && userDoc.data()?.displayName) {
      userDisplayName = userDoc.data()!.displayName;
    }

    // 3. ライブ情報の取得
    let liveInfoText = "";
    if (ticket.liveId) {
      const liveDoc = await adminDb.collection("lives").doc(ticket.liveId).get();
      if (liveDoc.exists) {
        const live = liveDoc.data()!;
        liveInfoText =
          `━━━━━━━━━━━━━━\n` +
          `公演: ${live.title || ""}\n` +
          `日付: ${live.date || ""}\n` +
          `  (開場${live.open || "--:--"} / 開演${live.start || "--:--"}）\n` +
          `前売料金: ${live.advance || live.feeAdvance || ""}\n` +
          `会場: ${live.venue || ""}\n` +
          (live.venueUrl ? `${live.venueUrl}\n` : "") +
          `━━━━━━━━━━━━━━\n\n`;
      }
    }

    // 4. メッセージ組み立て
    const statusLabel = isUpdate
      ? "ご予約内容を更新しました"
      : "ご予約ありがとうございます";

    let listText = "";
    if (isInvite) {
      if (ticket.groups && ticket.groups.length > 0) {
        listText = "【招待グループ一覧】\n";
        ticket.groups.forEach((g: any) => {
          const guestNames =
            g.companions && g.companions.length > 0
              ? g.companions.filter((c: string) => c !== "").join("様、") + "様"
              : "（ゲストなし）";
          listText += `・${g.groupName}: ${guestNames}\n`;
        });
      }
    } else {
      if (ticket.companions && ticket.companions.length > 0) {
        const validComps = ticket.companions.filter((c: string) => c !== "");
        if (validComps.length > 0) {
          listText = `同伴者様: ${validComps.join("様、")}様\n`;
        }
      }
    }

    const message =
      `${userDisplayName} 様\n\n` +
      `🎫 ${statusLabel}！\n` +
      `${
        isInvite
          ? "ライブにご招待する各グループに詳細URL（確認画面より取得可能）を共有して"
          : "以下のチケットURLを当日会場受付にてご提示"
      }ください🙇‍♀️\n\n` +
      liveInfoText +
      `予約番号: ${ticket.reservationNo || "----"}\n` +
      `${isInvite ? "予約担当" : "代表者"}: ${ticket.representativeName} 様\n` +
      listText +
      `合計人数: ${ticket.totalCount} 名様\n` +
      `予約種別: ${isInvite ? "ご招待" : "一般"}\n\n` +
      `チケットの確認・詳細表示: \n` +
      `https://ssjo.vercel.app/ticket-detail/${ticketId}`;

    // 5. LINE 送信
    const isSent = await sendLinePushConnect(lineUid, message);
    if (!isSent) {
      console.error(`[TicketNotice] LINE Push送信に失敗しました (Ticket ID: ${ticketId})`);
      return { success: false, error: "LINE push failed" };
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[TicketNotice] エラー発生 (Ticket ID: ${ticketId}):`, err);
    return { success: false, error: err?.message };
  }
}

