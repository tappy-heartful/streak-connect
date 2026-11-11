import { db } from "@/src/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";
import { TicketData, ReserveGroup } from "../types/ticket";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { writeLog } from "@/src/lib/functions";
import { sendTicketReservationNoticeAction } from "./ticket-server-actions";

/**
 * チケットの取得（連番等の不正な予約番号があれば4桁ランダムに自動修復）
 */
export async function getTicketById(ticketId: string): Promise<TicketData | null> {
  const ticketRef = doc(db, "tickets", ticketId);
  const snap = await getDoc(ticketRef);
  if (!snap.exists()) return null;
  const data = snap.data();

  let needsUpdate = false;
  const updates: any = {};

  if (data.resType === "invite") {
    // 招待予約の場合：グループごとの親番号の一致および4桁ランダム形式チェック
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
    // 一般予約の場合
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
      await updateDoc(ticketRef, updates);
    } catch (e) {
      console.warn("予約番号の自動修復に失敗しました:", e);
    }
  }

  return toPlainObject<TicketData>({ id: snap.id, ...data });
}

/**
 * ライブ情報の取得
 */
export async function getLiveForTicket(liveId: string) {
  const liveRef = doc(db, "lives", liveId);
  const snap = await getDoc(liveRef);
  if (!snap.exists()) return null;
  return toPlainObject({ id: snap.id, ...snap.data() });
}

/**
 * メンバー権限チェック
 */
export async function checkIsBandMember(uid: string): Promise<boolean> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists();
}

/**
 * チケット予約実行（トランザクション）
 */
export async function saveTicketReservation({
  liveId,
  uid,
  resType,
  representativeName,
  generalCompanions,
  inviteGroups,
  existingTicket,
}: {
  liveId: string;
  uid: string;
  resType: "invite" | "general";
  representativeName: string;
  generalCompanions: string[];
  inviteGroups: ReserveGroup[];
  existingTicket: any;
}) {
  const ticketId = `${liveId}_${uid}`;
  const liveRef = doc(db, "lives", liveId);
  const ticketRef = doc(db, "tickets", ticketId);

  // 人数計算
  let newTotalCount = 0;
  if (resType === "invite") {
    newTotalCount = inviteGroups.reduce(
      (sum, g) => sum + g.companions.filter((c) => c.trim() !== "").length,
      0
    );
  } else {
    newTotalCount =
      1 + generalCompanions.filter((c) => c.trim() !== "").length;
  }

  const oldCount = existingTicket?.totalCount || 0;
  const diffCount = newTotalCount - oldCount;

  await runTransaction(db, async (t) => {
    const liveSnap = await t.get(liveRef);
    if (!liveSnap.exists()) throw new Error("ライブ情報が存在しません。");

    const liveData = liveSnap.data();
    const currentReserved = liveData.totalReserved || 0;
    const ticketStock = liveData.ticketStock || 0;

    // 在庫チェック（増加分がある場合のみ）
    if (diffCount > 0 && currentReserved + diffCount > ticketStock) {
      throw new Error(
        `申し訳ございません。残席数（${Math.max(
          0,
          ticketStock - currentReserved
        )}席）を超えるため予約できません。`
      );
    }

    // 予約番号発番ロジック (4桁ランダム数字文字列 / 招待予約は baseNo-枝番)
    let baseNo = existingTicket?.reservationNo?.split("-")[0];
    if (
      !baseNo ||
      baseNo.startsWith("000") ||
      baseNo.length !== 4 ||
      isNaN(Number(baseNo))
    ) {
      baseNo = Math.floor(1000 + Math.random() * 9000).toString();
    }

    // 在庫更新
    t.update(liveRef, { totalReserved: currentReserved + diffCount });

    // チケット保存データ
    const validGeneralCompanions = generalCompanions.filter(
      (c) => c.trim() !== ""
    );
    const validInviteGroups = inviteGroups
      .filter(
        (g) =>
          g.groupName.trim() !== "" ||
          g.companions.some((c) => c.trim() !== "")
      )
      .map((g, idx) => ({
        groupName: g.groupName.trim() || "名称未設定グループ",
        companions: g.companions.filter((c) => c.trim() !== ""),
        reservationNo: `${baseNo}-${idx + 1}`,
      }));

    const ticketData: any = {
      liveId,
      uid,
      resType,
      totalCount: newTotalCount,
      reservationNo: baseNo,
      isReminderSent: existingTicket?.isReminderSent ?? false,
      updatedAt: serverTimestamp(),
    };

    if (resType === "general") {
      ticketData.representativeName = representativeName;
      ticketData.companions = validGeneralCompanions;
      ticketData.companionCount = validGeneralCompanions.length;
      if (existingTicket) {
        ticketData.groups = deleteField();
      }
    } else {
      ticketData.representativeName = representativeName || "メンバー";
      ticketData.groups = validInviteGroups;
      if (existingTicket) {
        ticketData.companions = deleteField();
        ticketData.companionCount = deleteField();
      }
    }

    if (!existingTicket) {
      ticketData.createdAt = serverTimestamp();
    }

    t.set(ticketRef, ticketData, { merge: true });
  });

  // 予約ログの記録
  await writeLog({
    dataId: ticketId,
    action: existingTicket ? "Ticket予約変更" : "Ticket新規予約",
    status: "success",
  });

  // 予約完了LINE通知（Vercelサーバーから即時送信、失敗しても画面の予約完了は阻害しない）
  try {
    await sendTicketReservationNoticeAction(ticketId, !!existingTicket);
  } catch (noticeErr) {
    console.error("予約通知送信エラー:", noticeErr);
  }
}

