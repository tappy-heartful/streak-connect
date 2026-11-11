import { db } from "@/src/lib/firebase";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";
import { TicketData, ReserveGroup } from "../types/ticket";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { writeLog } from "@/src/lib/functions";

/**
 * チケットの取得
 */
export async function getTicketById(ticketId: string): Promise<TicketData | null> {
  const ticketRef = doc(db, "tickets", ticketId);
  const snap = await getDoc(ticketRef);
  if (!snap.exists()) return null;
  return toPlainObject<TicketData>({ id: snap.id, ...snap.data() });
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

    // 予約番号発番ロジック (一般予約: 4桁 / 招待予約: グループ別発番)
    let reservationNo = existingTicket?.reservationNo;
    let finalInviteGroups = [...inviteGroups];

    if (resType === "general") {
      if (!reservationNo) {
        const lastNo = liveData.lastReservationNo || 0;
        const nextNo = lastNo + 1;
        reservationNo = String(nextNo).padStart(4, "0");
        t.update(liveRef, { lastReservationNo: nextNo });
      }
    } else {
      let currentLastNo = liveData.lastReservationNo || 0;
      let hasNewGroup = false;

      finalInviteGroups = inviteGroups.map((g, idx) => {
        if (!g.reservationNo) {
          hasNewGroup = true;
          currentLastNo += 1;
          const parentNo = String(currentLastNo).padStart(4, "0");
          return { ...g, reservationNo: `${parentNo}-${idx + 1}` };
        }
        return g;
      });

      if (hasNewGroup) {
        t.update(liveRef, { lastReservationNo: currentLastNo });
      }
    }

    // 在庫更新
    t.update(liveRef, { totalReserved: currentReserved + diffCount });

    // チケット保存データ
    const validGeneralCompanions = generalCompanions.filter(
      (c) => c.trim() !== ""
    );
    const validInviteGroups = finalInviteGroups.map((g) => ({
      ...g,
      companions: g.companions.filter((c) => c.trim() !== ""),
    }));

    const ticketData: any = {
      liveId,
      uid,
      resType,
      representativeName,
      totalCount: newTotalCount,
      updatedAt: serverTimestamp(),
      createdAt: existingTicket ? existingTicket.createdAt : serverTimestamp(),
    };

    if (resType === "invite") {
      ticketData.groups = validInviteGroups;
      ticketData.reservationNo = deleteField();
      ticketData.companions = deleteField();
    } else {
      ticketData.reservationNo = reservationNo;
      ticketData.companions = validGeneralCompanions;
      ticketData.groups = deleteField();
    }

    t.set(ticketRef, ticketData, { merge: true });
  });

  await writeLog({
    dataId: ticketId,
    action: existingTicket ? "Ticket予約変更" : "Ticket新規予約",
    status: "success",
  });
}

