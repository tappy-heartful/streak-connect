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
  redirectToLineLogin,
  showImagePreview,
} from "@/src/lib/functions";
import { useAuth } from "@/src/contexts/AuthContext";
import { useRouter } from "next/navigation";
import styles from "./home.module.css";
import { LiveCard } from "../components/LiveCard";
import { Live, Media } from "@/src/lib/firestore/types";

declare global {
  interface Window {
    instgrm?: any;
  }
}

export default function HomeClient() {
  const { user } = useAuth();
  const router = useRouter();

  const [upcomingLives, setUpcomingLives] = useState<Live[]>([]);
  const [pastLives, setPastLives] = useState<Live[]>([]);
  const [medias, setMedias] = useState<Media[]>([]);
  const [loadingLives, setLoadingLives] = useState(true);
  const [loadingMedias, setLoadingMedias] = useState(true);

  const [userTickets, setUserTickets] = useState<{ [liveId: string]: string }>({});

  const members = [
    { name: "Shoei Matsushita", role: "Guitar / Band Master", origin: "Ehime" },
    { name: "Miku Nozoe", role: "Trumpet / Lead Trumpet", origin: "Ehime" },
    { name: "Takumi Fujimoto", role: "Saxophone / Lead Alto Sax", origin: "Hiroshima" },
    { name: "Kana Asahiro", role: "Trombone", origin: "Nara" },
    { name: "Hiroto Murakami", role: "Trombone / Section Leader", origin: "Ehime" },
    { name: "Shunta Yabu", role: "Saxophone / Section Leader", origin: "Hiroshima" },
    { name: "Akito Kimura", role: "Drums", origin: "Okayama" },
    { name: "Yojiro Nakagawa", role: "Bass", origin: "Hiroshima" },
  ];

  const goodsItems = ["item1.jpg", "item2.jpg", "item3.jpg", "item4.jpg"];

  const imageMap: { [key: number]: number } = {
    1: 2,
    2: 4,
    3: 3,
    4: 5,
    5: 4,
    6: 2,
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

        const allLives = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Live)
        );

        // 未来または今日のライブ
        const upcoming = allLives
          .filter((live) => live.date >= todayStr)
          .reverse();
        setUpcomingLives(upcoming);

        // 過去のライブ (最新3件)
        const past = allLives.filter((live) => live.date < todayStr).slice(0, 3);
        setPastLives(past);
      } catch (e: any) {
        console.error("Lives fetch error:", e);
      } finally {
        setLoadingLives(false);
      }
    }

    async function fetchMedias() {
      try {
        const q = query(
          collection(db, "medias"),
          orderBy("date", "desc"),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const mediaData = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Media)
        );
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

  useEffect(() => {
    if (!user?.uid) {
      setUserTickets({});
      return;
    }

    async function fetchUserTickets() {
      try {
        const q = query(collection(db, "tickets"), where("uid", "==", user!.uid));
        const snapshot = await getDocs(q);
        const ticketMap: { [liveId: string]: string } = {};

        snapshot.docs.forEach((doc) => {
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
  }, [user]);

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
      const ok = await showDialog(
        "予約またはチケット確認にはログインが必要です。\nログイン画面へ移動しますか？"
      );
      if (!ok) return;

      const currentUrl = window.location.origin + "/ticket-reserve/" + liveId;
      await redirectToLineLogin(currentUrl);
      return;
    }
    router.push(`/ticket-reserve/${liveId}`);
  };

  return (
    <main>
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

      {/* --- UPCOMING LIVES --- */}
      <section className="content-section">
        <div className="inner">
          <h2 className="section-title">
            <i className="fa-solid fa-calendar-check" style={{ marginRight: "10px", color: "#e7211a" }}></i>
            UPCOMING LIVES
          </h2>
          <div className={styles.ticketGrid}>
            {loadingLives ? (
              <p className="loading-text">Checking for upcoming lives...</p>
            ) : upcomingLives.length === 0 ? (
              <p className="no-data">No information available.</p>
            ) : (
              upcomingLives.map((live) => (
                <LiveCard
                  key={live.id}
                  live={live}
                  userTickets={userTickets}
                  isLoggedIn={!!user}
                  onReserveClick={handleReserveClick}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* --- PAST LIVES --- */}
      {!loadingLives && pastLives.length > 0 && (
        <section className="content-section" style={{ paddingTop: 0 }}>
          <div className="inner">
            <h2
              className="section-title"
              style={{ fontSize: "1.2rem", opacity: 0.7 }}
            >
              <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: "10px" }}></i>
              PAST LIVES
            </h2>
            <div className={styles.ticketGrid}>
              {pastLives.map((live) => (
                <LiveCard
                  key={live.id}
                  live={live}
                  userTickets={userTickets}
                  isLoggedIn={!!user}
                  onReserveClick={handleReserveClick}
                />
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <p style={{ fontSize: "14px", color: "#888" }}>
                過去のライブ詳細はアーカイブからご確認いただけます。
              </p>
            </div>
          </div>
        </section>
      )}

      {/* --- CONCEPT --- */}
      <section className="content-section" id="concept">
        <div className="inner">
          <h2 className="section-title">
            <i className="fa-solid fa-music" style={{ marginRight: "10px", color: "#e7211a" }}></i>
            Concept
          </h2>
          <div className={styles.conceptBody}>
            <div className={styles.conceptText}>
              <p>
                愛媛大学のジャズ研究会「Sound Solution Orchestra」のOBOGを中心に、主に20代の若手メンバーで構成するビッグバンドです。
              </p>
              <p>
                世代を超えて愛されてきたスタンダードナンバーを中心に、ビッグバンドならではの迫力ある演奏で、ジャズが初めての方でも親しみやすいステージをお届けしています！
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- CORE MEMBERS --- */}
      <section className="content-section">
        <div className="inner">
          <h2 className="section-title">
            <i className="fa-solid fa-users" style={{ marginRight: "10px", color: "#e7211a" }}></i>
            CORE MEMBERS
          </h2>
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
                    {m.name.split(" ").map((p, i) => (
                      <span key={i}>
                        {p}
                        <br />
                      </span>
                    ))}
                  </div>
                  <div className={styles.memberOrigin}>from {m.origin}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOLLOW US --- */}
      <section className="content-section">
        <div className="inner">
          <h2 className="section-title">
            <i className="fa-solid fa-heart" style={{ marginRight: "10px", color: "#e7211a" }}></i>
            Follow Us
          </h2>
          <div className={styles.snsContainer}>
            <div className={styles.snsLinks}>
              <a
                href="https://lin.ee/suVPLxR"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.snsBtn} ${styles.lineBtn}`}
              >
                <i className="fa-brands fa-line" style={{ marginRight: "8px" }}></i>
                LINE公式アカウント
              </a>
              <a
                href="https://www.instagram.com/swstjazz"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.snsBtn} ${styles.instaBtn}`}
              >
                <i className="fa-brands fa-instagram" style={{ marginRight: "8px" }}></i>
                Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* --- OFFICIAL STORE --- */}
      <section className="content-section">
        <div className="inner">
          <h2 className="section-title">
            <i className="fa-solid fa-store" style={{ marginRight: "10px", color: "#e7211a" }}></i>
            Official Store
          </h2>
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
              <a
                href="https://ssjo.booth.pm/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnLink}
              >
                <i className="fa-solid fa-cart-shopping"></i> Visit BOOTH Store
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* --- HISTORY --- */}
      <section className={`content-section ${styles.bgDarker}`}>
        <div className="inner">
          <h2 className="section-title">
            <i className="fa-solid fa-camera-retro" style={{ marginRight: "10px", color: "#e7211a" }}></i>
            HISTORY
          </h2>
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
                        __html: buildInstagramHtml(m.instagramUrl || ""),
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* --- PHOTOS --- */}
      <section className="content-section">
        <div className="inner">
          <h2 className="section-title">
            <i className="fa-solid fa-images" style={{ marginRight: "10px", color: "#e7211a" }}></i>
            PHOTOS
          </h2>
          <div className={styles.photoGrid}>
            {activityPhotos.map((fileName) => {
              const url = `https://tappy-heartful.github.io/streak-images/connect/photos/${fileName}`;
              return (
                <div
                  key={fileName}
                  className={styles.photoItem}
                  onClick={() => showImagePreview(url)}
                  style={{ cursor: "zoom-in" }}
                >
                  <img
                    src={url}
                    alt="Activity"
                    className={styles.activityPhoto}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

