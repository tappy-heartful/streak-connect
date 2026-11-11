"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  showSpinner,
  hideSpinner,
  showDialog,
  deleteTicket,
  formatDateToYMDDot,
  globalGetLineLoginUrl,
} from "@/src/lib/functions";
import Link from "next/link";
import YoutubeSetlistPlayer from "@/src/components/YoutubeSetlistPlayer";
import styles from "./live-detail.module.css";
import { getLiveById, checkUserTicket } from "../api/live-client-service";
import { Live } from "@/src/lib/firestore/types";

interface LiveDetailClientProps {
  id: string;
}

export default function LiveDetailClient({ id }: LiveDetailClientProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [live, setLive] = useState<Live | null>(null);
  const [isReserved, setIsReserved] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id, user]);

  const loadData = async () => {
    showSpinner();
    setFetching(true);
    try {
      const liveData = await getLiveById(id);
      if (!liveData) {
        await showDialog("ライブ情報が見つかりませんでした。", true);
        router.push("/home");
        return;
      }
      setLive(liveData);

      if (user) {
        const reserved = await checkUserTicket(id, user.uid);
        setIsReserved(reserved);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setFetching(false);
      hideSpinner();
    }
  };

  const handleCancel = async () => {
    if (await deleteTicket(id, user?.uid)) {
      await loadData();
    }
  };

  const handleReserveClick = async () => {
    if (!user) {
      const ok = await showDialog(
        "予約またはチケット確認にはログインが必要です。\nログイン画面へ移動しますか？"
      );
      if (!ok) return;

      try {
        showSpinner();
        const currentUrl = window.location.origin + "/ticket-reserve/" + id;
        const fetchUrl = `${globalGetLineLoginUrl}&redirectAfterLogin=${encodeURIComponent(
          currentUrl
        )}`;
        const res = await fetch(fetchUrl);
        const { loginUrl } = await res.json();
        if (loginUrl) {
          window.location.href = loginUrl;
        } else {
          throw new Error("ログインURLの取得に失敗しました");
        }
      } catch (e: any) {
        console.error(e);
        await showDialog("ログイン処理中にエラーが発生しました。", true);
      } finally {
        hideSpinner();
      }
      return;
    }
    router.push(`/ticket-reserve/${id}`);
  };

  if (authLoading || fetching) {
    return <div className={styles.loadingText}>Loading...</div>;
  }
  if (!live) return null;

  const todayStr = formatDateToYMDDot(new Date());

  const isAccepting = live.isAcceptReserve === true;
  const isPast = live.date < todayStr;
  const isPastOrToday = live.date <= todayStr;
  const isBefore = live.acceptStartDate && todayStr < live.acceptStartDate;
  const isAfter = live.acceptEndDate && todayStr > live.acceptEndDate;

  const max = live.ticketStock || 0;
  const current = live.totalReserved || 0;
  const isSoldOut = max > 0 && current >= max;
  const isLowStock = !isSoldOut && max > 0 && max - current <= max * 0.2;

  return (
    <main>
      <section
        className="hero"
        style={
          {
            "--hero-bg":
              'url("https://tappy-heartful.github.io/streak-images/connect/background/live-detail.jpg")',
          } as any
        }
      >
        <div className="hero-content">
          <h1 className="page-title">
            <i className="fa-solid fa-compact-disc" style={{ marginRight: "12px", color: "#e7211a" }}></i>
            LIVE INFO
          </h1>
          <p className="tagline">Event Details & Tickets</p>
        </div>
      </section>

      <section className="content-section">
        <div className="inner">
          <nav className="breadcrumb">
            <Link href="/home">Home</Link>
            <span className="separator">&gt;</span>
            <span className="current">Live Info</span>
          </nav>

          <div className={styles.flyerWrapper}>
            {isSoldOut && !isPast && (
              <div className={styles.soldOutBadgeDetail}>SOLD OUT</div>
            )}
            {isLowStock && !isSoldOut && !isPast && (
              <div className={styles.lowStockBadgeDetail}>残りわずか</div>
            )}
            <img
              src={
                live.flyerUrl ||
                "https://tappy-heartful.github.io/streak-images/connect/favicon.png"
              }
              alt="フライヤー"
            />
          </div>

          <div className={styles.liveInfoCard}>
            <div className={styles.lDate}>
              <i className="fa-solid fa-calendar-days"></i> {live.date}
              {isReserved && (
                <span className={styles.reservedLabel}>予約済み</span>
              )}
            </div>
            <h2 className={styles.lTitle}>{live.title}</h2>

            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <i className="fa-solid fa-location-dot"></i>
                <span className={styles.label}>VENUE</span>
                <span className={styles.val}>{live.venue}</span>
              </div>
              <div className={styles.infoItem}>
                <i className="fa-solid fa-clock"></i>
                <span className={styles.label}>TIME</span>
                <span className={styles.val}>
                  Open {live.open || "--:--"} / Start {live.start || "--:--"}
                </span>
              </div>
              <div className={styles.infoItem}>
                <i className="fa-solid fa-ticket"></i>
                <span className={styles.label}>TICKET</span>
                <span className={styles.val}>
                  前売: ¥{live.advance?.toLocaleString() || "0"} / 当日: ¥
                  {live.door?.toLocaleString() || "0"}
                </span>
              </div>
            </div>
          </div>

          {/* YouTube セットリストプレイヤー */}
          {live.setlist && (
            <YoutubeSetlistPlayer
              setlist={live.setlist}
              title="セットリスト 参考音源"
            />
          )}

          {/* 注意事項 */}
          {live.caution && (
            <div className="caution-box">
              <h3>
                <i className="fa-solid fa-triangle-exclamation"></i> 注意事項
              </h3>
              <p className={styles.liveNotesArea}>{live.caution}</p>
            </div>
          )}

          {/* 備考 */}
          {live.note && (
            <div className="caution-box">
              <h3>
                <i className="fa-solid fa-circle-info"></i> 備考
              </h3>
              <p className={styles.liveNotesArea}>{live.note}</p>
            </div>
          )}

          {/* 予約・アンケートアクション */}
          <div className="action-area" style={{ marginTop: "40px" }}>
            {isPast ? (
              <span className="btn-disabled">この公演は終了しました</span>
            ) : isReserved ? (
              <div className="btn-group">
                <Link
                  href={`/ticket-detail/${id}_${user?.uid}`}
                  className="btn-primary"
                >
                  <i className="fa-solid fa-qrcode"></i> チケットを表示
                </Link>
                {isAccepting && (
                  <>
                    <button
                      type="button"
                      onClick={handleReserveClick}
                      className="btn-secondary"
                    >
                      <i className="fa-solid fa-pen-to-square"></i> 予約変更
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="btn-danger"
                    >
                      <i className="fa-solid fa-trash-can"></i> 予約取消
                    </button>
                  </>
                )}
              </div>
            ) : !isAccepting ? (
              <span className="btn-disabled">
                {isBefore
                  ? "予約受付開始前です"
                  : isAfter
                  ? "予約受付は終了しました"
                  : "予約受付期間外です"}
              </span>
            ) : isSoldOut ? (
              <div className="btn-group">
                <span className="btn-disabled">
                  予定枚数に達したため受付を終了しました
                </span>
                {!user && (
                  <button
                    type="button"
                    onClick={handleReserveClick}
                    className="btn-secondary"
                    style={{ marginTop: "10px" }}
                  >
                    すでに予約済みの方はこちら（ログイン）
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleReserveClick}
                className="btn-primary pulse"
              >
                <i className="fa-solid fa-ticket"></i> チケットを予約する
              </button>
            )}

            {isAccepting && live.acceptStartDate && live.acceptEndDate && (
              <div className={styles.acceptPeriod}>
                受付期間: {live.acceptStartDate} 〜 {live.acceptEndDate}
              </div>
            )}
          </div>

          {/* アンケートボタン */}
          {isPastOrToday && isReserved && (
            <div style={{ textAlign: "center", marginTop: "40px" }}>
              <Link href={`/enquete-answer/${id}`} className="btn-enquete">
                <i className="fa-solid fa-clipboard-question"></i> アンケートに回答する
              </Link>
            </div>
          )}
        </div>
      </section>

      <div
        className="page-actions"
        style={{ textAlign: "center", paddingBottom: "60px" }}
      >
        <Link href="/home" className="btn-back-home">
          ← Homeに戻る
        </Link>
      </div>
    </main>
  );
}

