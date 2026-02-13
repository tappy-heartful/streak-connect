"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { db, auth } from "@/src/lib/firebase";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { 
  showSpinner, hideSpinner, showDialog, 
  deleteTicket, archiveAndDeleteDoc, clearAllAppSession,
  formatDateToYMDDot 
} from "@/src/lib/functions";
import Link from "next/link";
import "./mypage.css";

// 型定義の更新
interface TicketGroup {
  groupName: string;
  reservationNo: string;
  companions: string[];
}

interface Ticket {
  id: string;
  liveId: string;
  resType: string;
  reservationNo: string;
  representativeName: string;
  companions: string[];
  totalCount?: number;
  groups?: TicketGroup[]; // 招待用グループ
  liveData?: any;
}

export default function MyPage() {
  const { user, loading, userData } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/");
      return;
    }
    loadMyTickets();
  }, [user, loading]);

  const loadMyTickets = async () => {
    showSpinner();
    if (!user) return;
    setFetching(true);
    try {
      const q = query(
        collection(db, "tickets"),
        where("uid", "==", user.uid),
        orderBy("updatedAt", "desc")
      );
      const snap = await getDocs(q);
      
      const ticketList: Ticket[] = [];
      for (const d of snap.docs) {
        const data = d.data() as Ticket;
        const liveSnap = await getDoc(doc(db, "lives", data.liveId));
        ticketList.push({
          ...data,
          id: d.id,
          liveData: liveSnap.exists() ? liveSnap.data() : null
        });
      }
      setTickets(ticketList);
    } catch (e: any) {
      console.error(e);
    } finally {
      setFetching(false);
      hideSpinner();
    }
  };

  const handleLogout = async () => {
    if (!(await showDialog("ログアウトしますか？"))) return;
    showSpinner();
    await auth.signOut();
    clearAllAppSession();
    hideSpinner();
    router.push("/");
  };

  const handleWithdrawal = async () => {
    const confirmMsg = "【退会確認】\n退会すると予約済みのチケットもすべて無効になります。本当によろしいですか？";
    if (!(await showDialog(confirmMsg))) return;
    if (!(await showDialog("本当に退会しますか？この操作は取り消せません。"))) return;

    showSpinner();
    try {
      for (const t of tickets) {
        await deleteTicket(t.liveId, user?.uid, false);
      }
      await archiveAndDeleteDoc("connectUsers", user!.uid);
      await auth.signOut();
      clearAllAppSession();
      await showDialog("退会処理が完了しました。", true);
      router.push("/");
    } catch (e: any) {
      alert("エラーが発生しました");
    } finally {
      hideSpinner();
    }
  };

  // URLコピー関数の拡張（グループ個別コピーにも対応）
  const handleCopyUrl = async (ticketId: string, groupIndex?: number) => {
    let url = `${window.location.origin}/ticket-detail/${ticketId}`;
    if (groupIndex !== undefined) {
      url += `?g=${groupIndex + 1}`;
    }
    
    await navigator.clipboard.writeText(url);
    const msg = groupIndex !== undefined
      ? "グループ専用のチケットURLをコピーしました！"
      : "チケットURLをコピーしました！";
    await showDialog(msg, true);
  };

  if (loading || fetching) return <div className="inner">Loading...</div>;

  return (
    <main>
      <section className="hero" style={{ "--hero-bg": 'url("https://tappy-heartful.github.io/streak-images/connect/background/mypage.jpg")' } as any}>
        <div className="hero-content">
          <h1 className="page-title">MY PAGE</h1>
          <p className="tagline">User Profile & Tickets</p>
        </div>
      </section>

      <section className="content-section">
        <div className="inner">
          <nav className="breadcrumb">
            <Link href="/">Home</Link>
            <span className="separator">&gt;</span>
            <span className="current">My Page</span>
          </nav>

          <div className="profile-card">
            <div className="profile-icon-wrapper">
              <img src={userData?.pictureUrl || "/line-unset.png"} alt="icon" />
            </div>
            <div className="profile-info">
              <p className="profile-label">ようこそ,</p>
              <h2 className="profile-name">{userData?.displayName || "Guest"} 様</h2>
              <div className="profile-actions" style={{ display: "flex", gap: "10px" }}>
                <button className="btn-logout" onClick={handleLogout}>ログアウト</button>
                <button className="btn-delete-account" onClick={handleWithdrawal}>退会</button>
              </div>
            </div>
          </div>

          <h2 className="section-title">MY TICKETS</h2>
          <div id="my-tickets-container">
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

      <div className="page-actions" style={{ textAlign: "center", paddingBottom: "60px" }}>
        <Link href="/" className="btn-back-home">
          ← Homeに戻る
        </Link>
      </div>
    </main>
  );
}

function TicketCard({ ticket, onRefresh, onCopy }: { ticket: Ticket, onRefresh: () => void, onCopy: (id: string, idx?: number) => void }) {
  const live = ticket.liveData;
  if (!live) return null;
  const { user } = useAuth();

  const today = formatDateToYMDDot(new Date());
  const isPast = live.date < today;
  const canModify = !isPast && live.isAcceptReserve;

  return (
    <div className="ticket-card detail-mode">
      <div className="card-status-area">
        <div className="res-no-mini">
            {ticket.resType === 'invite' ? 'INVITATION' : `NO. ${ticket.reservationNo || "----"}`}
        </div>
      </div>
      
      <div className="ticket-info">
        <span className="res-type-label">{ticket.resType === 'invite' ? '招待予約' : '一般予約'}</span>
        <div className="t-date">{live.date}</div>
        <Link href={`/live-detail/${ticket.liveId}`} className="t-title-link">
          <h3 className="t-title">{live.title}</h3>
        </Link>
        
        <div className="t-details">
          <p><i className="fa-solid fa-location-dot"></i> 会場: {live.venue}</p>
          <p><i className="fa-solid fa-user-check"></i> {ticket.resType === 'invite' ? '予約担当' : '代表者'}: {ticket.representativeName} 様</p>
          
          {ticket.resType === 'invite' ? (
            // 招待予約の場合：グループリストを表示
            <div className="mypage-groups-list">
              <p className="groups-label"><i className="fa-solid fa-users"></i> 招待グループ一覧:</p>
              {ticket.groups?.map((g, idx) => (
                <div key={idx} className="mypage-group-item">
                  <span className="g-name">
                    ・{g.groupName} のみなさま ({g.companions.filter(c => c !== "").length}名)
                  </span>
                  <button className="btn-copy-mini" onClick={() => onCopy(ticket.id, idx)}>
                    <i className="fa-solid fa-link"></i> COPY
                  </button>
                </div>
              ))}
            </div>
          ) : (
            // 一般予約の場合
            <p><i className="fa-solid fa-users"></i> 同伴者: {ticket.companions?.filter(c => c !== "").join(" 様、") || "なし"}{ticket.companions?.filter(c => c !== "").length > 0 && " 様"}</p>
          ) }
        </div>
        
        <div className="ticket-actions">
          {ticket.resType !== 'invite' && (
            <button className="btn-view" onClick={() => onCopy(ticket.id)}>URLコピー</button>
          )}
          <Link href={`/ticket-detail/${ticket.id}`} className="btn-ticket">
            {ticket.resType === 'invite' ? 'すべてのチケットを表示' : 'チケット表示'}
          </Link>
        </div>

        {canModify ? (
          <div className="ticket-actions">
            <Link href={`/ticket-reserve/${ticket.liveId}`} className="btn-edit">内容変更</Link>
            <button className="btn-delete" onClick={async () => {
                if (await deleteTicket(ticket.liveId, user?.uid)) onRefresh();
            }}>予約取消</button>
          </div>
        ) : (
          <div className="ticket-actions">
            <span className="status-badge">{isPast ? '終了' : '受付期間外'}</span>
          </div>
        )}
      </div>
    </div>
  );
}