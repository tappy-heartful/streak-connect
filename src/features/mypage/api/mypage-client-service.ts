import { db } from "@/src/lib/firebase";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { TicketData } from "@/src/features/ticket/types/ticket";
import { toPlainObject } from "@/src/lib/firestore/utils";

/**
 * ユーザーのチケット一覧を取得（ライブ詳細データも結合）
 */
export async function getMyTickets(uid: string): Promise<TicketData[]> {
  const q = query(
    collection(db, "tickets"),
    where("uid", "==", uid),
    orderBy("updatedAt", "desc")
  );
  const snap = await getDocs(q);

  const ticketList: TicketData[] = [];
  for (const d of snap.docs) {
    const data = d.data() as TicketData;
    const liveSnap = await getDoc(doc(db, "lives", data.liveId));
    ticketList.push({
      ...data,
      id: d.id,
      liveData: liveSnap.exists() ? toPlainObject(liveSnap.data()) : null,
    });
  }
  return ticketList;
}

