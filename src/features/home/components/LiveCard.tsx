"use client";

import Link from "next/link";
import styles from "../views/home.module.css";
import { Live } from "@/src/lib/firestore/types";
import { formatDateToYMDDot } from "@/src/lib/functions";

interface LiveCardProps {
  live: Live;
  userTickets: { [liveId: string]: string };
  isLoggedIn: boolean;
  onReserveClick: (liveId: string) => void;
}

export function LiveCard({
  live,
  userTickets,
  isLoggedIn,
  onReserveClick,
}: LiveCardProps) {
  const max = live.ticketStock || 0;
  const current = live.totalReserved || 0;
  const isSoldOut = max > 0 && current >= max;
  const isLowStock = !isSoldOut && max > 0 && max - current <= max * 0.2;

  const todayStr = formatDateToYMDDot(new Date());
  const isPast = live.date < todayStr;

  const isAccepting = (() => {
    if (!live.isAcceptReserve) return false;
    const start = live.acceptStartDate || "";
    const end = live.acceptEndDate || "";
    return todayStr >= start && todayStr <= end;
  })();

  const userTicketId = userTickets[live.id];

  return (
    <div className={styles.ticketCard}>
      <Link href={`/live-detail/${live.id}`} className={styles.ticketImgLink}>
        <div className={styles.ticketImgWrapper}>
          <img
            src={
              live.flyerUrl ||
              "https://tappy-heartful.github.io/streak-images/connect/favicon.png"
            }
            className={styles.ticketImg}
            alt="flyer"
          />
          {isSoldOut && !isPast && (
            <div className={styles.soldOutBadge}>SOLD OUT</div>
          )}
          {isPast && (
            <div
              className={styles.pastBadge}
              style={{
                backgroundColor: "#666",
                color: "#fff",
                position: "absolute",
                top: "10px",
                left: "10px",
                padding: "4px 12px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "bold",
                zIndex: 2,
              }}
            >
              ARCHIVE
            </div>
          )}
          {isAccepting && isLowStock && !isPast && (
            <div className={styles.lowStockBadge}>あとわずか</div>
          )}
          <div className={styles.imgOverlay}>VIEW INFO</div>
        </div>
      </Link>

      <div className={styles.ticketInfo}>
        <div className={styles.tDate}>{live.date}</div>
        <h3 className={styles.tTitle}>{live.title}</h3>
        <div className={styles.tDetails}>
          <div>
            <i className="fa-solid fa-location-dot"></i> {live.venue}
          </div>
          <div>
            <i className="fa-solid fa-clock"></i> Open {live.open || "--:--"} / Start{" "}
            {live.start || "--:--"}
          </div>
        </div>

        <div className={styles.liveActions}>
          <Link href={`/live-detail/${live.id}`} className={styles.btnDetail}>
            詳細 / VIEW INFO
          </Link>

          {!isPast &&
            (userTicketId ? (
              <>
                <Link
                  href={`/ticket-detail/${userTicketId}`}
                  className={styles.btnTicketDetail}
                >
                  チケットを表示 / VIEW TICKET
                </Link>
                {isAccepting && (
                  <button
                    type="button"
                    onClick={() => onReserveClick(live.id)}
                    className={styles.btnReserve}
                  >
                    予約を変更 / EDIT RESERVATION
                  </button>
                )}
              </>
            ) : (
              isAccepting && (
                <button
                  type="button"
                  onClick={() => onReserveClick(live.id)}
                  className={styles.btnReserve}
                >
                  {!isLoggedIn && isSoldOut
                    ? "予約済みの方はこちら"
                    : "予約 / RESERVE TICKET"}
                </button>
              )
            ))}
        </div>
      </div>
    </div>
  );
}

