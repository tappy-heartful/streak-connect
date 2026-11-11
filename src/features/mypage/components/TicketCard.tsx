"use client";

import Link from "next/link";
import styles from "../views/mypage.module.css";
import { TicketData } from "@/src/features/ticket/types/ticket";
import { formatDateToYMDDot, deleteTicket } from "@/src/lib/functions";
import { useAuth } from "@/src/contexts/AuthContext";

interface TicketCardProps {
  ticket: TicketData;
  onRefresh: () => void;
  onCopy: (id: string, idx?: number) => void;
}

export function TicketCard({ ticket, onRefresh, onCopy }: TicketCardProps) {
  const live = ticket.liveData;
  if (!live) return null;
  const { user } = useAuth();

  const today = formatDateToYMDDot(new Date());
  const isPast = live.date < today;
  const isPastOrToday = live.date <= today;
  const canModify = !isPast && live.isAcceptReserve;

  return (
    <div className={styles.ticketCardDetailMode}>
      <div className={styles.cardStatusArea}>
        {!canModify && (
          <span className={styles.statusBadge}>
            {isPast ? "終了" : "受付期間外"}
          </span>
        )}
        <div className={styles.resNoMini}>
          {ticket.resType === "invite"
            ? "INVITATION"
            : `NO. ${ticket.reservationNo || "----"}`}
        </div>
      </div>

      <div className={styles.ticketInfo}>
        <span className={styles.resTypeLabel}>
          {ticket.resType === "invite" ? "招待予約" : "一般予約"}
        </span>
        <div className={styles.tDate}>
          <i className="fa-solid fa-calendar-days"></i> {live.date}
        </div>
        <Link href={`/live-detail/${ticket.liveId}`} className={styles.tTitleLink}>
          <h3 className={styles.tTitle}>{live.title}</h3>
        </Link>

        <div className={styles.tDetails}>
          <p>
            <i className="fa-solid fa-location-dot"></i> 会場: {live.venue}
          </p>
          <p>
            <i className="fa-solid fa-user-check"></i>{" "}
            {ticket.resType === "invite" ? "予約担当" : "代表者"}:{" "}
            {ticket.representativeName} 様
          </p>

          {ticket.resType === "invite" ? (
            <div className={styles.mypageGroupsList}>
              <p className={styles.groupsLabel}>
                <i className="fa-solid fa-users"></i> 招待グループ一覧:
              </p>
              {ticket.groups?.map((g, idx) => (
                <div key={idx} className={styles.mypageGroupItem}>
                  <span className={styles.gName}>
                    ・{g.groupName} のみなさま (
                    {g.companions.filter((c) => c !== "").length}名)
                  </span>
                  <button
                    type="button"
                    className={styles.btnCopyMini}
                    onClick={() => onCopy(ticket.id!, idx)}
                  >
                    <i className="fa-solid fa-link"></i> COPY
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p>
              <i className="fa-solid fa-users"></i> 同伴者:{" "}
              {ticket.companions?.filter((c) => c !== "").join(" 様、") || "なし"}
              {ticket.companions &&
                ticket.companions.filter((c) => c !== "").length > 0 &&
                " 様"}
            </p>
          )}
        </div>

        <div className={styles.ticketActions}>
          {ticket.resType !== "invite" && (
            <button
              type="button"
              className={styles.btnView}
              onClick={() => onCopy(ticket.id!)}
            >
              <i className="fa-solid fa-share-nodes"></i> URLコピー
            </button>
          )}
          <Link href={`/ticket-detail/${ticket.id}`} className={styles.btnTicket}>
            <i className="fa-solid fa-qrcode"></i>{" "}
            {ticket.resType === "invite" ? "すべてのチケットを表示" : "チケット表示"}
          </Link>
        </div>

        {canModify && (
          <div className={styles.ticketActions}>
            <Link
              href={`/ticket-reserve/${ticket.liveId}`}
              className={styles.btnEdit}
            >
              <i className="fa-solid fa-pen-to-square"></i> 内容変更
            </Link>
            <button
              type="button"
              className={styles.btnDelete}
              onClick={async () => {
                if (await deleteTicket(ticket.liveId, user?.uid)) onRefresh();
              }}
            >
              <i className="fa-solid fa-trash-can"></i> 予約取消
            </button>
          </div>
        )}

        {isPastOrToday && (
          <div className={styles.ticketActions}>
            <Link
              href={`/enquete-answer/${ticket.liveId}`}
              className={styles.btnEnquete}
            >
              <i className="fa-solid fa-clipboard-question"></i> アンケートに回答
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

