"use server";

import { adminDb } from "@/src/lib/firebase-admin";
import { sendLinePushConnect, getLineUidByUid } from "@/src/lib/line";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { TicketData } from "../types/ticket";
import { Live } from "@/src/lib/firestore/types";

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

    // 4. 来場者リスト本文の生成
    let listText = "";
    if (isInvite) {
      const groups = ticket.groups || [];
      listText =
        `【ご招待者様一覧】\n` +
        groups
          .map((g: any, i: number) => {
            const comps = (g.companions || []).filter(Boolean).join("、");
            return `▼ グループ${i + 1}: ${g.groupName || "名称未設定"}\n${comps ? `  ${comps}` : "  (来場者未登録)"}`;
          })
          .join("\n") +
        "\n\n";
    } else {
      const comps = (ticket.companions || []).filter(Boolean).join("、");
      listText =
        `【予約者様一覧】\n` +
        `代表者: ${ticket.representativeName || "未設定"}\n` +
        (comps ? `同伴者: ${comps}\n\n` : "\n");
    }

    const message =
      `Swing Streak Jazz Orchestra です！\n\n` +
      `${userDisplayName} 様\n` +
      `ライブチケットの${isUpdate ? "予約変更" : "お取り置き"}が完了いたしました。\n\n` +
      liveInfoText +
      `【予約番号】\n` +
      `${ticket.reservationNo}\n\n` +
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

/**
 * チケット情報の取得 (Server Component用)
 */
export async function getTicketServer(ticketId: string): Promise<TicketData | null> {
  const snap = await adminDb.collection("tickets").doc(ticketId).get();
  if (!snap.exists) return null;
  return toPlainObject<TicketData>({ id: snap.id, ...snap.data() });
}

/**
 * ライブ情報の取得 (Server Component用)
 */
export async function getLiveServer(liveId: string): Promise<Live | null> {
  const snap = await adminDb.collection("lives").doc(liveId).get();
  if (!snap.exists) return null;
  return toPlainObject<Live>({ id: snap.id, ...snap.data() });
}

/**
 * 楽団メンバーチェック (Server Component用)
 */
export async function checkIsBandMemberServer(uid: string): Promise<boolean> {
  const snap = await adminDb.collection("users").doc(uid).get();
  return snap.exists;
}

/**
 * 予約画面初期データ取得（チケット・楽団員判定をServer Actionで一括高速取得）
 */
export async function getTicketReserveInitialDataAction(liveId: string, uid: string) {
  const ticketId = `${liveId}_${uid}`;
  const [ticketDoc, userDoc] = await Promise.all([
    adminDb.collection("tickets").doc(ticketId).get(),
    adminDb.collection("users").doc(uid).get(),
  ]);

  const isMember = userDoc.exists;
  let ticket: TicketData | null = null;

  if (ticketDoc.exists) {
    const data = ticketDoc.data()!;
    let needsUpdate = false;
    const updates: any = {};

    if (data.resType === "invite") {
      let baseNo = data.reservationNo?.split("-")[0];
      const isInvalidBase =
        !baseNo ||
        baseNo.startsWith("000") ||
        baseNo.length !== 4 ||
        isNaN(Number(baseNo));

      const groups = data.groups || [];
      const hasMismatchedGroups = groups.some((g: any) => {
        const gParent = g.reservationNo?.split("-")[0];
        return (
          !g.reservationNo ||
          gParent !== baseNo ||
          g.reservationNo.startsWith("000")
        );
      });

      if (isInvalidBase || hasMismatchedGroups) {
        baseNo = Math.floor(1000 + Math.random() * 9000).toString();
        const fixedGroups = groups.map((g: any, i: number) => ({
          ...g,
          reservationNo: `${baseNo}-${i + 1}`,
        }));
        data.reservationNo = baseNo;
        data.groups = fixedGroups;
        updates.reservationNo = baseNo;
        updates.groups = fixedGroups;
        needsUpdate = true;
      }
    } else {
      const resNo = data.reservationNo;
      const isInvalid =
        !resNo ||
        resNo.startsWith("000") ||
        resNo.length !== 4 ||
        isNaN(Number(resNo));
      if (isInvalid) {
        const newNo = Math.floor(1000 + Math.random() * 9000).toString();
        data.reservationNo = newNo;
        updates.reservationNo = newNo;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      try {
        await adminDb.collection("tickets").doc(ticketId).update(updates);
      } catch (e) {
        console.warn("Server action ticket reservationNo repair failed:", e);
      }
    }

    ticket = toPlainObject<TicketData>({ id: ticketDoc.id, ...data });
  }

  return { ticket, isMember };
}
