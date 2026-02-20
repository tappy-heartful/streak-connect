"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { db } from "@/src/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { 
  showSpinner, hideSpinner, showDialog, 
  deleteTicket, formatDateToYMDDot , globalGetLineLoginUrl,
} from "@/src/lib/functions";
import Link from "next/link";
import "./live-detail.css";

export default function LiveDetailPage() {
  const { id } = useParams(); 
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [live, setLive] = useState<any>(null);
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
      const liveRef = doc(db, "lives", id as string);
      const liveSnap = await getDoc(liveRef);

      if (!liveSnap.exists()) {
        await showDialog("ライブ情報が見つかりませんでした。", true);
        router.push("/");
        return;
      }
      setLive(liveSnap.data());

      if (user) {
        const ticketRef = doc(db, "tickets", `${id}_${user.uid}`);
        const ticketSnap = await getDoc(ticketRef);
        setIsReserved(ticketSnap.exists());
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setFetching(false);
      hideSpinner();
    }
  };

  const handleCancel = async () => {
    if (await deleteTicket(id as string, user?.uid)) {
      await loadData();
    }
  };

  const handleReserveClick = async () => {
    if (!user) {
      const ok = await showDialog("予約またはチケット確認にはログインが必要です。\nログイン画面へ移動しますか？");
      if (!ok) return;

      try {
        showSpinner();
        const currentUrl = window.location.origin + '/ticket-reserve/' + id;
        const fetchUrl = `${globalGetLineLoginUrl}&redirectAfterLogin=${encodeURIComponent(currentUrl)}`;
        const res = await fetch(fetchUrl);
        const { loginUrl } = await res.json();
        if (loginUrl) {
          window.location.href = loginUrl;
        } else {
          throw new Error("ログインURLの取得に失敗しました");
        }
      } catch (e: any) {
        console.error(e);
        alert("ログイン処理中にエラーが発生しました。");
      } finally {
        hideSpinner();
      }
      return;
    }
    router.push(`/ticket-reserve/${id}`);
  };

  if (authLoading || fetching) return <div className="loading-text">Loading...</div>;
  if (!live) return null;

  // --- ロジック判定 ---
  const todayStr = formatDateToYMDDot(new Date());
  
  // 期間判定
  const isAccepting = live.isAcceptReserve === true;
  const isPast = live.date < todayStr;
  const isPastOrToday = live.date <= todayStr;
  const isBefore = live.acceptStartDate && todayStr < live.acceptStartDate;
  const isAfter = live.acceptEndDate && todayStr > live.acceptEndDate;
  const isInPeriod = isAccepting && !isBefore && !isAfter; // 受付期間中か

  // 在庫判定
  const max = live.ticketStock || 0;
  const current = live.totalReserved || 0;
  const isSoldOut = max > 0 && current >= max;
  const isLowStock = !isSoldOut && max > 0 && (max - current) <= (max * 0.2);

  return (
    <main>
      <section className="hero" style={{ "--hero-bg": 'url("https://tappy-heartful.github.io/streak-images/connect/background/live-detail.jpg")' } as any}>
        <div className="hero-content">
          <h1 className="page-title">LIVE INFO</h1>
          <p className="tagline">Join our special performance</p>
        </div>
      </section>

      <section className="content-section">
        <div className="inner">
          <nav className="breadcrumb">
            <Link href="/">Home</Link>
            <span className="separator">&gt;</span>
            <span className="current">Live Detail</span>
          </nav>

          <div id="live-content-area">
            {/* フライヤー画像エリア */}
            <div className="flyer-wrapper" style={{ position: "relative" }}>
              {live.flyerUrl && <img src={live.flyerUrl} alt="Flyer" />}
              
              {/* バッジ表示 */}
              {isSoldOut ? (
                <div className="sold-out-badge-detail">SOLD OUT</div>
              ) : (isInPeriod && isLowStock) ? (
                <div className="low-stock-badge-detail">あとわずか</div>
              ) : null}
            </div>

            {/* ライブ基本情報カード */}
            <div className="live-info-card">
              <div className="l-date">
                {live.date}
                {isReserved && <span className="reserved-label">予約済み</span>}
              </div>
              <h2 className="l-title">{live.title}</h2>
              
              <div className="info-list">
                <div className="info-item">
                  <i className="fa-solid fa-location-dot"></i>
                  <div>
                    <div className="label">会場</div>
                    <div className="val">
                      {live.venue}<br />
                      {live.venueUrl && <a href={live.venueUrl} target="_blank" rel="noopener noreferrer">公式サイト</a>}
                      {live.venueUrl && live.venueGoogleMap && " / "}
                      {live.venueGoogleMap && <a href={live.venueGoogleMap} target="_blank" rel="noopener noreferrer">地図を見る</a>}
                    </div>
                  </div>
                </div>

                <div className="info-item">
                  <i className="fa-solid fa-clock"></i>
                  <div>
                    <div className="label">時間</div>
                    <div className="val">Open {live.open} / Start {live.start}</div>
                  </div>
                </div>

                <div className="info-item">
                  <i className="fa-solid fa-ticket"></i>
                  <div>
                    <div className="label">料金</div>
                    <div className="val">前売: {live.advance}</div>
                    <div className="val">当日: {live.door}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 注意事項・備考エリア */}
            <h3 className="sub-title">注意事項 / NOTES</h3>
            <div className="t-details">
              <div className="info-item" style={{marginBottom: "10px"}}>
                <i className="fa-solid fa-users"></i>
                <div className="val">お一人様 {live.maxCompanions}名様まで同伴可能</div>
              </div>
              
              {!isSoldOut && (
                <div className="info-item" style={{marginBottom: "20px"}}>
                  <i className="fa-solid fa-circle-info"></i>
                  <div className="val">チケット残数: あと {Math.max(0, max - current)} 枚</div>
                </div>
              )}
              
              {live.notes && (
                <div className="live-notes-area">
                  <p className="live-notes-text">{live.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* アクションボタンエリア */}
          <div className="live-actions" style={{ marginTop: "40px" }}>
            {isPast ? (
              <>
                <button className="btn-action disabled" style={{ width: "100%", padding: "15px", borderRadius: "50px" }} disabled>
                  このライブは終了しました
                </button>
                <div className="reserved-actions">
                  <Link href={`/enquete-answer/${id}`} className="btn-action btn-enquete-soft">
                    <i className="fa-solid fa-pen-to-square"></i> アンケートに回答
                  </Link>
                </div>
              </>
            ) : (!isInPeriod) ? (
              <div className="action-box" style={{ textAlign: "center" }}>
                {isReserved && (
                  <Link href={`/ticket-detail/${id}_${user?.uid}`} className="btn-action btn-view-white" style={{display: "block", marginBottom: "15px"}}>
                    <i className="fa-solid fa-ticket"></i> チケットを表示
                  </Link>
                )}
                <button className="btn-action disabled" style={{width: "100%", padding: "15px", borderRadius: "50px"}} disabled>
                  {isBefore ? "予約受付前" : isAfter ? "予約受付終了" : "予約受付停止中"}
                </button>
                {live.acceptStartDate && (
                  <p className="accept-period">受付期間: {live.acceptStartDate} ～ {live.acceptEndDate}</p>
                )}
                {isPastOrToday && (
                  <Link href={`/enquete-answer/${id}`} className="btn-action btn-enquete-soft">
                    <i className="fa-solid fa-pen-to-square"></i> アンケートに回答
                  </Link>
                )}
              </div>
            ) : (
              <div className="action-box">
                {isReserved ? (
                  // --- 予約済みの場合 ---
                  <div className="reserved-actions">
                    <Link href={`/ticket-detail/${id}_${user?.uid}`} className="btn-action btn-view-white">
                      <i className="fa-solid fa-ticket"></i> チケットを表示
                    </Link>
                    {/* 完売していても変更は可能 */}
                    <button onClick={handleReserveClick} className="btn-action btn-reserve-red">
                      <i className="fa-solid fa-pen-to-square"></i> 予約内容を変更
                    </button>
                    <button className="btn-action btn-delete-outline" onClick={handleCancel}>
                      <i className="fa-solid fa-trash-can"></i> この予約を取り消す
                    </button>
                    {isPastOrToday && (
                      <Link href={`/enquete-answer/${id}`} className="btn-action btn-enquete-soft">
                        <i className="fa-solid fa-pen-to-square"></i> アンケートに回答
                      </Link>
                    )}
                  </div>
                ) : (
                  // --- 未予約の場合 ---
                  <div className="reserved-actions">
                    {!user ? (
                      // 未ログイン
                      <button onClick={handleReserveClick} className={`btn-action btn-reserve-red`}>
                        <i className={`fa-solid ${isSoldOut ? "fa-user-check" : "fa-paper-plane"}`}></i>
                        {isSoldOut ? "予約済みの方はこちら" : "このライブを予約する / RESERVE"}
                      </button>
                    ) : (
                      // ログイン済み かつ 未予約
                      !isSoldOut && (
                        <button onClick={handleReserveClick} className="btn-action btn-reserve-red">
                          <i className="fa-solid fa-paper-plane"></i> このライブを予約する / RESERVE
                        </button>
                      )
                    )}

                    {!isSoldOut && live.acceptEndDate && (
                      <p className="accept-period">受付終了: {live.acceptEndDate}</p>
                    )}
                    
                    {isPastOrToday && (
                      <Link href={`/enquete-answer/${id}`} className="btn-action btn-enquete-soft">
                        <i className="fa-solid fa-pen-to-square"></i> アンケートに回答
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="page-actions">
        <Link href="/" className="btn-back-home"> ← Homeに戻る </Link>
      </div>
    </main>
  );
}