"use server";

import { adminDb } from "@/src/lib/firebase-admin";
import { TicketData } from "@/src/features/ticket/types/ticket";
import { toPlainObject } from "@/src/lib/firestore/utils";

/**
 * ユーザーのチケット一覧を取得（ライブ詳細データもサーバーサイドで並行結合）
 */
export async function getMyTicketsServer(uid: string): Promise<TicketData[]> {
  const snap = await adminDb
    .collection("tickets")
    .where("uid", "==", uid)
    .orderBy("updatedAt", "desc")
    .get();

  const ticketList: TicketData[] = [];
  const liveIdSet = new Set<string>();

  snap.docs.forEach((d) => {
    const data = d.data() as TicketData;
    if (data.liveId) liveIdSet.add(data.liveId);
  });

  // 全ライブを一括取得
  const liveMap: Record<string, any> = {};
  await Promise.all(
    Array.from(liveIdSet).map(async (lid) => {
      const lSnap = await adminDb.collection("lives").doc(lid).get();
      if (lSnap.exists) {
        liveMap[lid] = toPlainObject(lSnap.data());
      }
    })
  );

  snap.docs.forEach((d) => {
    const data = d.data() as TicketData;
    ticketList.push({
      ...toPlainObject(data),
      id: d.id,
      liveData: liveMap[data.liveId] || null,
    });
  });

  return ticketList;
}
