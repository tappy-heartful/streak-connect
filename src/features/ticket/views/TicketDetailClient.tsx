"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  showSpinner,
  hideSpinner,
  showDialog,
  deleteTicket,
  formatDateToYMDDot,
} from "@/src/lib/functions";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import styles from "./ticket-detail.module.css";
import YoutubeSetlistPlayer from "@/src/components/YoutubeSetlistPlayer";
import { getTicketById, getLiveForTicket } from "../api/ticket-client-service";
import { TicketData } from "../types/ticket";
import { Live } from "@/src/lib/firestore/types";

interface TicketDetailClientProps {
  id: string; // ticketId
}

export default function TicketDetailClient({ id }: TicketDetailClientProps) {
  const searchParams = useSearchParams();
  const groupIndexParam = searchParams.get("g");
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [fetching, setFetching] = useState(true);

  const isGuestView = !!groupIndexParam;

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    showSpinner();
    setFetching(true);
    try {
      const ticketData = await getTicketById(id);
      if (!ticketData) {
        await showDialog("チケット情報が見つかりませんでした。", true);
        router.push("/home");
        return;
      }
      setTicket(ticketData);

      const liveData = await getLiveForTicket(ticketData.liveId);
      if (liveData) {
        setLive(liveData as Live);
      }
    } catch (e: any) {
      console.error(e);
      await showDialog("データ読み込み中にエラーが発生しました。", true);
    } finally {
      setFetching(false);
      hideSpinner();
    }
  };

  const copyToClipboard = async (url: string, isGroup = false) => {
    await navigator.clipboard.writeText(url);
    const msg = isGroup
      ? "グループ専用の招待URLをコピーしました！\nこのグループのお客様に共有してください。"
      : "チケットURLをコピーしました！\n同伴者様に共有してください。";
    await showDialog(msg, true);
  };

  const handleCopyUrl = async () => {
    await copyToClipboard(window.location.href);
  };

  const handleDelete = async () => {
    if (!ticket) return;
    if (await deleteTicket(ticket.liveId, user?.uid)) {
      router.push("/mypage");
    }
  };

  if (authLoading || fetching) {
    return <div className="loading-text">Loading...</div>;
  }
  if (!ticket || !live) return null;

  const isOwner = user?.uid === ticket.uid;
  const todayStr = formatDateToYMDDot(new Date());
  const isPast = live.date < todayStr;
  const isTodayOrPast = live.date <= todayStr;
  const canModify = !isPast && live.isAcceptReserve;

  // ライブ情報ボックス
  const LiveInfoBox = () => (
    <div className={styles.ticketCardDetailMode}>
      <div className={styles.tDate}>
        <i className="fa-solid fa-calendar-days"></i> {live.date}
      </div>
      <Link href={`/live-detail/${ticket.liveId}`}>
        <h3 className={styles.tTitle}>{live.title}</h3>
      </Link>
      <div className={styles.tDetails}>
        <p>
          <i className="fa-solid fa-location-dot"></i> 会場: {live.venue}
        </p>
        <p>
          <i className="fa-solid fa-clock"></i> Open {live.open || "--:--"} / Start{" "}
          {live.start || "--:--"}
        </p>
        <p>
          <i className="fa-solid fa-money-bill"></i> チケット代金: ¥
          {live.advance?.toLocaleString() || "0"} / 1名
        </p>
      </div>
    </div>
  );

  return (
    <main>
      <section
        className="hero"
        style={
          {
            "--hero-bg":
              'url("https://tappy-heartful.github.io/streak-images/connect/background/ticket-detail.jpg")',
          } as any
        }
      >
        <div className="hero-content">
          <h1 className="page-title">TICKET</h1>
          <p className="tagline">Digital Admission Ticket</p>
        </div>
      </section>

      <section className="content-section">
        <div className="inner">
          <nav className="breadcrumb">
            <Link href="/home">Home</Link>
            <span className="separator">&gt;</span>
            {isOwner && (
              <>
                <Link href="/mypage">My Page</Link>
                <span className="separator">&gt;</span>
              </>
            )}
            <span className="current">Ticket</span>
          </nav>

          <LiveInfoBox />

          {/* 一般予約の場合 */}
          {ticket.resType !== "invite" && (
            <div className={styles.ticketCardDetailMode}>
              <div className={styles.resNoWrapper}>
                <span className={styles.resNoLabel}>RESERVATION NUMBER</span>
                <span className={styles.resNoValue}>
                  NO. {ticket.reservationNo || "----"}
                </span>
                <button
                  type="button"
                  className={styles.btnCopyNo}
                  onClick={() =>
                    copyToClipboard(ticket.reservationNo || "", false)
                  }
                  title="予約番号をコピー"
                >
                  <i className="fa-solid fa-copy"></i>
                  <span>COPY</span>
                </button>
              </div>

              <div className={styles.qrContainer}>
                <QRCodeSVG
                  value={`${window.location.origin}/ticket-detail/${id}`}
                  size={200}
                  level="M"
                />
                <p className={styles.qrHint}>
                  入場受付時にこちらのQRコードをご提示ください
                </p>
              </div>

              <div className={styles.tDetails}>
                <p>
                  <i className="fa-solid fa-user-check"></i> 代表者:{" "}
                  <strong>{ticket.representativeName} 様</strong>
                </p>
                {ticket.companions && ticket.companions.length > 0 && (
                  <p>
                    <i className="fa-solid fa-users"></i> 同伴者:{" "}
                    {ticket.companions.filter((c) => c !== "").join(" 様、 ")}{" "}
                    様
                  </p>
                )}
                <p>
                  <i className="fa-solid fa-ticket"></i> 合計枚数:{" "}
                  {ticket.totalCount} 枚
                </p>
              </div>

              <div className={styles.btnActionGroup}>
                <button
                  type="button"
                  className={`${styles.btnAction} ${styles.btnSecondary}`}
                  onClick={handleCopyUrl}
                >
                  <i className="fa-solid fa-share-nodes"></i> URLを共有する
                </button>
                {isOwner && canModify && (
                  <>
                    <Link
                      href={`/ticket-reserve/${ticket.liveId}`}
                      className={`${styles.btnAction} ${styles.btnPrimary}`}
                    >
                      <i className="fa-solid fa-pen-to-square"></i> 予約内容の変更
                    </Link>
                    <button
                      type="button"
                      className={`${styles.btnAction} ${styles.btnDanger}`}
                      onClick={handleDelete}
                    >
                      <i className="fa-solid fa-trash-can"></i> 予約の取消
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 招待予約（グループ管理）の場合 */}
          {ticket.resType === "invite" && (
            <div>
              <h2 className={styles.subTitle}>
                <i className="fa-solid fa-users-rectangle" style={{ marginRight: "10px" }}></i>
                INVITATION TICKETS
              </h2>

              {ticket.groups?.map((group, idx) => {
                const groupIdx = idx + 1;
                // ゲストビューで特定グループのみ表示する場合のフィルタ
                if (isGuestView && groupIndexParam !== String(groupIdx)) {
                  return null;
                }

                const groupUrl = `${window.location.origin}/ticket-detail/${id}?g=${groupIdx}`;

                return (
                  <div key={idx} className={styles.groupItemCard}>
                    <div className={styles.groupHeader}>
                      <span className={styles.groupName}>
                        <span className={styles.groupBadge}>
                          グループ #{groupIdx}
                        </span>{" "}
                        {group.groupName} のみなさま
                      </span>
                    </div>

                    <div className={styles.resNoWrapper}>
                      <span className={styles.resNoLabel}>GROUP NO.</span>
                      <span className={styles.resNoValue}>
                        {group.reservationNo || "----"}
                      </span>
                      <button
                        type="button"
                        className={styles.btnCopyNo}
                        onClick={() =>
                          copyToClipboard(group.reservationNo || "", false)
                        }
                        title="グループ番号をコピー"
                      >
                        <i className="fa-solid fa-copy"></i>
                        <span>COPY</span>
                      </button>
                    </div>

                    <div className={styles.qrContainer}>
                      <QRCodeSVG value={groupUrl} size={180} level="M" />
                      <p className={styles.qrHint}>
                        グループ受付時にこちらのQRコードをご提示ください
                      </p>
                    </div>

                    <div className={styles.tDetails}>
                      <p>
                        <i className="fa-solid fa-users"></i> ご来場者様:
                      </p>
                      <ul className={styles.companionList}>
                        {group.companions
                          .filter((c) => c !== "")
                          .map((name, cIdx) => (
                            <li key={cIdx} className={styles.companionItem}>
                              ・ {name} 様
                            </li>
                          ))}
                      </ul>
                      <p>
                        <i className="fa-solid fa-ticket"></i> グループ人数:{" "}
                        {group.companions.filter((c) => c !== "").length} 名
                      </p>
                    </div>

                    <div className={styles.btnActionGroup}>
                      <button
                        type="button"
                        className={`${styles.btnAction} ${styles.btnSecondary}`}
                        onClick={() => copyToClipboard(groupUrl, true)}
                      >
                        <i className="fa-solid fa-link"></i> このグループの招待URLをコピー
                      </button>
                    </div>
                  </div>
                );
              })}

              {isOwner && canModify && (
                <div className={styles.btnActionGroup} style={{ marginTop: "20px" }}>
                  <Link
                    href={`/ticket-reserve/${ticket.liveId}`}
                    className={`${styles.btnAction} ${styles.btnPrimary}`}
                  >
                    <i className="fa-solid fa-pen-to-square"></i> 招待内容を変更する
                  </Link>
                  <button
                    type="button"
                    className={`${styles.btnAction} ${styles.btnDanger}`}
                    onClick={handleDelete}
                  >
                    <i className="fa-solid fa-trash-can"></i> 予約をすべて取り消す
                  </button>
                </div>
              )}
            </div>
          )}

          {/* YouTube セットリストプレイヤー */}
          {live.setlist && (
            <div style={{ marginTop: "30px" }}>
              <YoutubeSetlistPlayer
                setlist={live.setlist}
                title="セットリスト 参考音源"
              />
            </div>
          )}

          {/* アンケートボタン */}
          {isTodayOrPast && (
            <div style={{ textAlign: "center", marginTop: "40px" }}>
              <Link
                href={`/enquete-answer/${ticket.liveId}`}
                className="btn-enquete"
              >
                <i className="fa-solid fa-clipboard-question"></i> 来場者アンケートに回答する
              </Link>
            </div>
          )}
        </div>
      </section>

      <div
        className="page-actions"
        style={{ textAlign: "center", paddingBottom: "60px" }}
      >
        <Link href={isOwner ? "/mypage" : "/home"} className="btn-back-home">
          ← {isOwner ? "My Pageに戻る" : "Homeに戻る"}
        </Link>
      </div>
    </main>
  );
}

