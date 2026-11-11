"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { auth } from "@/src/lib/firebase";
import {
  showSpinner,
  hideSpinner,
  showDialog,
  deleteTicket,
  archiveAndDeleteDoc,
  clearAllAppSession,
  globalGetLineLoginUrl,
} from "@/src/lib/functions";
import Link from "next/link";
import styles from "./mypage.module.css";
import { TicketCard } from "../components/TicketCard";
import { getMyTickets } from "../api/mypage-client-service";
import { TicketData } from "@/src/features/ticket/types/ticket";

export default function MyPageClient() {
  const { user, loading, userData } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (loading || isLoggingOut) return;

    if (!user) {
      handleInitialLogin();
      return;
    }

    loadMyTickets();
  }, [user, loading, isLoggingOut]);

  const handleInitialLogin = async () => {
    const confirmed = await showDialog(
      "マイページ表示にはログインが必要です。\nLINEログインしますか？"
    );
    if (!confirmed) {
      router.push("/home");
      return;
    }

    try {
      showSpinner();
      const currentUrl = window.location.href;
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
      await showDialog(
        "ログイン処理中にエラーが発生しました。トップページに戻ります。",
        true
      );
      router.push("/home");
    } finally {
      hideSpinner();
    }
  };

  const loadMyTickets = async () => {
    if (!user) return;
    showSpinner();
    setFetching(true);
    try {
      const ticketList = await getMyTickets(user.uid);
      setTickets(ticketList);
    } catch (e: any) {
      console.error(e);
      await showDialog("チケット読み込み中にエラーが発生しました。", true);
    } finally {
      setFetching(false);
      hideSpinner();
    }
  };

  const handleLogout = async () => {
    if (!(await showDialog("ログアウトしますか？"))) return;

    setIsLoggingOut(true);
    showSpinner();

    try {
      await auth.signOut();
      clearAllAppSession();
      router.push("/home");
    } catch (e) {
      console.error(e);
      setIsLoggingOut(false);
    } finally {
      hideSpinner();
    }
  };

  const handleWithdrawal = async () => {
    const confirmMsg =
      "【退会確認】\n退会すると予約済みのチケットもすべて無効になります。本当によろしいですか？";
    if (!(await showDialog(confirmMsg))) return;
    if (
      !(await showDialog("本当に退会しますか？この操作は取り消せません。"))
    )
      return;

    setIsLoggingOut(true);
    showSpinner();
    try {
      for (const t of tickets) {
        await deleteTicket(t.liveId, user?.uid, false);
      }
      await archiveAndDeleteDoc("connectUsers", user!.uid);
      await auth.signOut();
      clearAllAppSession();
      await showDialog("退会処理が完了しました。", true);
      router.push("/home");
    } catch (e: any) {
      console.error(e);
      await showDialog("退会処理中にエラーが発生しました。", true);
      setIsLoggingOut(false);
    } finally {
      hideSpinner();
    }
  };

  const handleCopyUrl = async (ticketId: string, groupIndex?: number) => {
    let url = `${window.location.origin}/ticket-detail/${ticketId}`;
    if (groupIndex !== undefined) {
      url += `?g=${groupIndex + 1}`;
    }

    await navigator.clipboard.writeText(url);
    const msg =
      groupIndex !== undefined
        ? "グループ専用のチケットURLをコピーしました！"
        : "チケットURLをコピーしました！";
    await showDialog(msg, true);
  };

  if (loading || (user && fetching)) {
    return <div className="inner">Loading...</div>;
  }
  if (!user || isLoggingOut) return null;

  return (
    <main>
      <section
        className="hero"
        style={
          {
            "--hero-bg":
              'url("https://tappy-heartful.github.io/streak-images/connect/background/mypage.jpg")',
          } as any
        }
      >
        <div className="hero-content">
          <h1 className="page-title">MY PAGE</h1>
          <p className="tagline">User Profile & Tickets</p>
        </div>
      </section>

      <section className="content-section">
        <div className="inner">
          <nav className="breadcrumb">
            <Link href="/home">Home</Link>
            <span className="separator">&gt;</span>
            <span className="current">My Page</span>
          </nav>

          <div className={styles.profileCard}>
            <div className={styles.profileIconWrapper}>
              <img
                src={
                  userData?.pictureUrl ||
                  "https://tappy-heartful.github.io/streak-images/connect/line-profile-unset.png"
                }
                alt="icon"
              />
            </div>
            <div className={styles.profileInfo}>
              <p className={styles.profileLabel}>ようこそ,</p>
              <h2 className={styles.profileName}>
                {userData?.displayName || "Guest"} 様
              </h2>
              <div className={styles.profileActions}>
                <button
                  type="button"
                  className={styles.btnLogout}
                  onClick={handleLogout}
                >
                  <i className="fa-solid fa-arrow-right-from-bracket"></i> ログアウト
                </button>
                <button
                  type="button"
                  className={styles.btnDeleteAccount}
                  onClick={handleWithdrawal}
                >
                  <i className="fa-solid fa-user-xmark"></i> 退会
                </button>
              </div>
            </div>
          </div>

          <h2 className="section-title">
            <i className="fa-solid fa-ticket-simple" style={{ marginRight: "10px", color: "#e7211a" }}></i>
            MY TICKETS
          </h2>
          <div>
            {tickets.length === 0 ? (
              <p className="no-data">予約済みのチケットはありません。</p>
            ) : (
              tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onRefresh={loadMyTickets}
                  onCopy={handleCopyUrl}
                />
              ))
            )}
          </div>
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

