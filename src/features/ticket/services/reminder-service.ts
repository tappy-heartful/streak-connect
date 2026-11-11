import { adminDb } from "@/src/lib/firebase-admin";
import { sendLinePushConnect, getLineUidByUid } from "@/src/lib/line";

/**
 * 日本時間 (JST) の yyyy.MM.dd 文字列を取得
 */
function getJstDateString(date: Date): string {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // yyyy/MM/dd -> yyyy.MM.dd
  return formatter.format(date).replace(/\//g, ".");
}

/**
 * 当日チケットリマインド通知処理 (15分おきCron)
 *
 * @param isForce テスト実行用（時間判定をスキップして当日チケットへ強制送信）
 */
export async function runDayOfTicketReminders(isForce = false): Promise<{
  success: boolean;
  today: string;
  matchedTickets: number;
  sentCount: number;
  errors: string[];
}> {
  const now = new Date();
  const todayStr = getJstDateString(now);
  const errors: string[] = [];
  let sentCount = 0;

  try {
    // 1. リマインド未送信のチケットを取得
    const ticketsSnap = await adminDb
      .collection("tickets")
      .where("isReminderSent", "==", false)
      .get();

    if (ticketsSnap.empty) {
      return {
        success: true,
        today: todayStr,
        matchedTickets: 0,
        sentCount: 0,
        errors: [],
      };
    }

    const tickets = ticketsSnap.docs;

    for (const doc of tickets) {
      const ticketId = doc.id;
      const ticket = doc.data();
      const isInvite = ticket.resType === "invite";

      try {
        if (!ticket.liveId) continue;

        // 2. ライブ情報の取得
        const liveDoc = await adminDb.collection("lives").doc(ticket.liveId).get();
        if (!liveDoc.exists) continue;
        const live = liveDoc.data()!;

        // 公演日が本日でない場合はスキップ
        if (!isForce && live.date !== todayStr) {
          continue;
        }

        // 3. 送信タイミングの判定 (開場の4時間前〜直前)
        if (!isForce) {
          const normalizedDate = (live.date || todayStr).replace(/\./g, "-");
          const openTime = live.open || "00:00";
          const openDateTime = new Date(`${normalizedDate}T${openTime}:00+09:00`);

          const diffMs = openDateTime.getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          // 開場まで4時間以内、かつ開場時間を過ぎていない場合のみ
          if (diffHours > 4 || diffHours <= 0) {
            continue;
          }
        }

        // 4. LINE UID の取得
        const lineUid = await getLineUidByUid(ticket.uid);
        if (!lineUid) {
          console.warn(`[Reminder] UID: ${ticket.uid} の LINE UID が未登録のためスキップします。`);
          continue;
        }

        // 5. メッセージの組み立て
        const actionText = isInvite
          ? "ご招待する各グループにチケットURLを共有して、受付にてご提示いただくようご案内してください。"
          : "以下のチケットURLを当日会場受付にてご提示ください。お待ちしております！";

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

        const reminderMessage =
          `【本日開催！】\n` +
          `ライブ当日となりました🎷\n\n` +
          `${actionText}\n\n` +
          `━━━━━━━━━━━━━━\n` +
          `公演: ${live.title || ""}\n` +
          `会場: ${live.venue || ""}\n` +
          `開場: ${live.open || "--:--"} / 開演: ${live.start || "--:--"}\n` +
          (live.venueUrl ? `${live.venueUrl}\n` : "") +
          `━━━━━━━━━━━━━━\n\n` +
          `予約種別: ${isInvite ? "ご招待" : "一般"}\n` +
          `${isInvite ? "予約担当" : "代表者"}: ${ticket.representativeName} 様\n` +
          listText +
          `合計人数: ${ticket.totalCount} 名様\n\n` +
          `チケットの確認・詳細表示: \n` +
          `https://ssjo.vercel.app/ticket-detail/${ticketId}`;

        // 6. 送信実行
        const isSuccess = await sendLinePushConnect(lineUid, reminderMessage);
        if (isSuccess) {
          await doc.ref.update({ isReminderSent: true });
          sentCount++;
        } else {
          errors.push(`Failed to send LINE message to ticket: ${ticketId}`);
        }
      } catch (innerErr: any) {
        console.error(`[Reminder] Ticket ID: ${ticketId} 処理エラー:`, innerErr);
        errors.push(`Ticket ${ticketId}: ${innerErr?.message}`);
      }
    }

    return {
      success: true,
      today: todayStr,
      matchedTickets: tickets.length,
      sentCount,
      errors,
    };
  } catch (err: any) {
    console.error("[Reminder] 一括リマインド処理エラー:", err);
    return {
      success: false,
      today: todayStr,
      matchedTickets: 0,
      sentCount,
      errors: [err?.message || "Internal server error"],
    };
  }
}

