"use client";

import { useState, useEffect } from "react";
import { db } from "@/src/lib/firebase";
import { collection, query, orderBy, getDocs, limit, where } from "firebase/firestore";
import { 
  buildInstagramHtml, 
  formatDateToYMDDot, 
  showSpinner, 
  hideSpinner, 
  showDialog, 
  globalGetLineLoginUrl ,
  showImagePreview
} from "@/src/lib/functions";
import { useAuth } from "@/src/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./home.module.css";

declare global {
  interface Window {
    instgrm?: any;
  }
}

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [lives, setLives] = useState<any[]>([]);
  const [medias, setMedias] = useState<any[]>([]);
  const [loadingLives, setLoadingLives] = useState(true);
  const [loadingMedias, setLoadingMedias] = useState(true);
  
  // 💡 ユーザーが予約しているチケット情報を保持する（キーは liveId）
  const [userTickets, setUserTickets] = useState<{ [liveId: string]: string }>({});

  const members = [
    { name: 'Shoei Matsushita', role: 'Guitar / Band Master', origin: 'Ehime' },
    { name: 'Miku Nozoe', role: 'Trumpet / Lead Trumpet', origin: 'Ehime' },
    { name: 'Takumi Fujimoto', role: 'Saxophone / Lead Alto Sax', origin: 'Hiroshima' },
    { name: 'Kana Asahiro', role: 'Trombone / Lead Trombone', origin: 'Nara' },
    { name: 'Hiroto Murakami', role: 'Trombone / Section Leader', origin: 'Ehime' },
    { name: 'Shunta Yabu', role: 'Saxophone / Section Leader', origin: 'Hiroshima' },
    { name: 'Akito Kimura', role: 'Drums', origin: 'Okayama' },
    { name: 'Yojiro Nakagawa', role: 'Bass', origin: 'Hiroshima' },
  ];

  const goodsItems = ['item1.jpg', 'item2.jpg', 'item3.jpg', 'item4.jpg'];

  const imageMap: { [key: number]: number } = {
    1: 2, 2: 4, 3: 3, 4: 5, 5: 4, 6: 2,
  };

  const activityPhotos = Object.entries(imageMap).flatMap(([n, maxM]) => {
    const photos = [];
    for (let m = 1; m <= maxM; m++) {
      photos.push(`${n}_${m}.jpg`);
    }
    return photos;
  });

  useEffect(() => {
    async function fetchLives() {
      try {
        const q = query(collection(db, "lives"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        const todayStr = formatDateToYMDDot(new Date());

        const livesData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(live => live.date >= todayStr);
        setLives(livesData);
      } catch (e: any) {
        console.error("Lives fetch error:", e);
      } finally {
        setLoadingLives(false);
      }
    }

    async function fetchMedias() {
      try {
        const q = query(collection(db, "medias"), orderBy("date", "desc"), limit(5));
        const snapshot = await getDocs(q);
        const mediaData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        setMedias(mediaData);
      } catch (e: any) {
        console.error("Medias fetch error:", e);
      } finally {
        setLoadingMedias(false);
      }
    }

    fetchLives();
    fetchMedias();
  }, []);

// 💡 ログインしている場合、ユーザーの予約状況を取得する
  useEffect(() => {
    // user が null または undefined の場合は処理を中断する
    if (!user?.uid) {
      setUserTickets({});
      return;
    }

    async function fetchUserTickets() {
      try {
        // ここで user.uid は確実に存在することが保証される
        const q = query(collection(db, "tickets"), where("uid", "==", user!.uid));
        const snapshot = await getDocs(q);
        const ticketMap: { [liveId: string]: string } = {};
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.liveId) {
            ticketMap[data.liveId] = doc.id; 
          }
        });
        setUserTickets(ticketMap);
      } catch (e) {
        console.error("Tickets fetch error:", e);
      }
    }
    
    fetchUserTickets();
  }, [user]); // userが変わるたびに実行

  useEffect(() => {
    if (medias.length > 0) {
      const timer = setTimeout(() => {
        if (window.instgrm) {
          window.instgrm.Embeds.process();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [medias]);

  const handleReserveClick = async (liveId: string) => {
    if (!user) {
      const ok = await showDialog("予約にはログインが必要です。\nログイン画面へ移動しますか？");
      if (!ok) return;

      try {
        showSpinner();
        const currentUrl = window.location.origin + '/ticket-reserve/' + liveId;
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
    router.push(`/ticket-reserve/${liveId}`);
  };

  const canShowReserveBtn = (live: any) => {
    if (!live.isAcceptReserve) return false;
    const today = formatDateToYMDDot(new Date());
    const start = live.acceptStartDate;
    const end = live.acceptEndDate;
    return today >= start && today <= end;
  };

  return (
    <main>
      {/* HERO */}
      <section className={styles.homeHero}>
        <div className={styles.homeHeroContent}>
          <h1 className={styles.bandName}>
            Swing Streak<br />
            <span className={styles.subName}>
              <span className={styles.accentJ}>J</span>azz Orchestra
            </span>
          </h1>
          <p className={styles.tagline}>BASED IN MATSUYAMA, EHIME</p>
        </div>
      </section>

      {/* UPCOMING LIVES */}
      <section className="content-section">
        <div className="inner">
          <h2 className="section-title">UPCOMING LIVES</h2>
          <div className={styles.ticketGrid}>
            {loadingLives ? (
              <p className="loading-text">Checking for upcoming lives...</p>
            ) : lives.length === 0 ? (
              <p className="no-data">No information available.</p>
            ) : (
              lives.map((live) => (
                <div key={live.id} className={styles.ticketCard}>
                  <Link href={`/live-detail/${live.id}`} className={styles.ticketImgLink}>
                    <div className={styles.ticketImgWrapper}>
                      <img 
                        src={live.flyerUrl || 'https://tappy-heartful.github.io/streak-images/connect/favicon.png'} 
                        className={styles.ticketImg} 
                        alt="flyer" 
                      />
                      <div className={styles.imgOverlay}>VIEW INFO</div>
                    </div>
                  </Link>
                  
                  <div className={styles.ticketInfo}>
                    <div className={styles.tDate}>{live.date}</div>
                    <h3 className={styles.tTitle}>{live.title}</h3>
                    <div className={styles.tDetails}>
                      <div><i className="fa-solid fa-location-dot"></i> {live.venue}</div>
                      <div><i className="fa-solid fa-clock"></i> Open {live.open} / Start {live.start}</div>
                      <div><i className="fa-solid fa-ticket"></i> 前売：{live.advance}</div>
                      <div><i className="fa-solid fa-ticket"></i> 当日：{live.door}</div>
                    </div>
                    
                    <div className={styles.liveActions}>
                      <Link href={`/live-detail/${live.id}`} className={styles.btnDetail}>
                        詳細 / VIEW INFO
                      </Link>

                      {/* 💡 ボタン表示ロジックの修正 */}
                      {userTickets[live.id] ? (
                        // 予約済みの場合
                        <>
                          <Link
                            href={`/ticket-detail/${userTickets[live.id]}`}
                            className={styles.btnTicketDetail}
                          >
                            チケットを表示 / VIEW TICKET
                          </Link>
                          
                          {/* 💡 予約済み、かつ「まだ予約受付期間内」なら変更ボタンを出す */}
                          {canShowReserveBtn(live) && (
                            <button
                              onClick={() => handleReserveClick(live.id)}
                              className={styles.btnReserve}
                            >
                              予約を変更 / EDIT RESERVATION
                            </button>
                          )}
                        </>
                      ) : (
                        // 未予約かつ受付中の場合
                        canShowReserveBtn(live) && (
                          <button 
                            onClick={() => handleReserveClick(live.id)} 
                            className={styles.btnReserve}
                          >
                            予約 / RESERVE TICKET
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CONCEPT */}
      <section className="content-section" id="concept">
        <div className="inner">
          <h2 className="section-title">Concept</h2>
          <div className={styles.conceptBody}>
            <div className={styles.conceptText}>
              <p>愛媛大学のジャズ研究会「Sound Solution Orchestra」のOBOGを中心に、主に20代の若手メンバーで構成するビッグバンドです。</p>
              <p>世代を超えて愛されてきたスタンダードナンバーを中心に、ビッグバンドならではの迫力ある演奏で、ジャズが初めての方でも親しみやすいステージをお届けしています！</p>
            </div>
          </div>
        </div>
      </section>

      {/* MEMBERS */}
      <section className="content-section">
        <div className="inner">
          <h2 className="section-title">CORE MEMBERS</h2>
          <div className={styles.memberGrid}>
            {members.map((m) => (
              <div key={m.name} className={styles.memberCard}>
                <div className={styles.memberImgWrapper}>
                  <img 
                    src={`https://tappy-heartful.github.io/streak-images/connect/members/${m.name}.jpg`} 
                    alt={m.name} 
                    className={styles.memberImg} 
                  />
                </div>
                <div className={styles.memberInfoContent}>
                  <div className={styles.memberRole}>{m.role}</div>
                  <div className={styles.memberName}>
                    {m.name.split(' ').map((p, i) => <span key={i}>{p}<br/></span>)}
                  </div>
                  <div className={styles.memberOrigin}>from {m.origin}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SNS */}
      <section className="content-section">
        <div className="inner">
          <h2 className="section-title">Follow Us</h2>
          <div className={styles.snsContainer}>
            <div className={styles.snsLinks}>
              <a href="https://lin.ee/suVPLxR" target="_blank" rel="noopener noreferrer" className={`${styles.snsBtn} ${styles.lineBtn}`}>
                LINE公式アカウント
              </a>
              <a href="https://www.instagram.com/swstjazz" target="_blank" rel="noopener noreferrer" className={`${styles.snsBtn} ${styles.instaBtn}`}>
                Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* STORE */}
      <section className="content-section">
        <div className="inner">
          <h2 className="section-title">Official Store</h2>
          <div className={styles.goodsContainer}>
            <div className={styles.horizontalScroll}>
              {goodsItems.map((item, i) => (
                <img 
                  key={i} 
                  src={`https://tappy-heartful.github.io/streak-images/connect/goods/${item}`} 
                  alt="Goods" 
                  className={styles.squareImg} 
                />
              ))}
            </div>
            <div className={styles.btnArea}>
              <a href="https://ssjo.booth.pm/" target="_blank" rel="noopener noreferrer" className={styles.btnLink}>
                <i className="fa-solid fa-cart-shopping"></i> Visit BOOTH Store
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* HISTORY */}
      <section className={`content-section ${styles.bgDarker}`}>
        <div className="inner">
          <h2 className="section-title">HISTORY</h2>
          <div className={styles.mediaGrid}>
            {loadingMedias ? (
              <p>Loading archives...</p>
            ) : (
              medias.map((m) => (
                <div key={m.id} className={styles.mediaCard}>
                  <div className={styles.mediaInfo}>
                    <span className={styles.mediaDate}>{m.date}</span>
                    <h3 className={styles.mediaTitle}>{m.title}</h3>
                  </div>
                  <div className={styles.mediaBody}>
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: buildInstagramHtml(m.instagramUrl) 
                      }} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* PHOTOS */}
      <section className="content-section">
        <div className="inner">
          <h2 className="section-title">PHOTOS</h2>
          <div className={styles.photoGrid}>
          {activityPhotos.map((fileName) => {
            const url = `https://tappy-heartful.github.io/streak-images/connect/photos/${fileName}`;
            return (
              <div 
                key={fileName} 
                className={styles.photoItem}
                onClick={() => showImagePreview(url)}
                style={{ cursor: 'zoom-in' }}
              >
                <img src={url} alt="Activity" className={styles.activityPhoto} />
              </div>
            );
          })}
          </div>
        </div>
      </section>
    </main>
  );
}