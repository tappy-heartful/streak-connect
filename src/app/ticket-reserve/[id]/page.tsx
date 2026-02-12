"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { db } from "@/src/lib/firebase";
import { 
  doc, getDoc, runTransaction, serverTimestamp 
} from "firebase/firestore";
import { 
  showSpinner, hideSpinner, showDialog, 
  writeLog
} from "@/src/lib/functions";
import Link from "next/link";
import "./ticket-reserve.css";

// 型定義
interface ReserveGroup {
  groupName: string;
  companions: string[];
  reservationNo?: string; // 4桁-連番
}

export default function TicketReservePage() {
  const { id } = useParams(); // liveId
  const { user, loading: authLoading, userData } = useAuth();
  const router = useRouter();

  const [live, setLive] = useState<any>(null);
  const [resType, setResType] = useState<"invite" | "general">("general");
  
  // 一般予約用
  const [representativeName, setRepresentativeName] = useState("");
  const [generalCompanions, setGeneralCompanions] = useState<string[]>([]);
  
  // 招待予約用 (グループ管理)
  const [inviteGroups, setInviteGroups] = useState<ReserveGroup[]>([]);

  const [isMember, setIsMember] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [existingTicket, setExistingTicket] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/");
      return;
    }
    loadData();
  }, [id, user, authLoading]);

  const loadData = async () => {
    showSpinner();
    setFetching(true);
    try {
      const liveRef = doc(db, "lives", id as string);
      const liveSnap = await getDoc(liveRef);
      if (!liveSnap.exists()) {
        await showDialog("ライブ情報が見つかりません。", true);
        router.push("/");
        return;
      }
      const liveData = liveSnap.data();
      setLive(liveData);

      const maxComp = liveData.maxCompanions || 0;

      // メンバーチェック
      const userRef = doc(db, "users", user!.uid);
      const userSnap = await getDoc(userRef);
      const memberStatus = userSnap.exists();
      setIsMember(memberStatus);
      
      // デフォルトの予約種別設定
      const initialResType = memberStatus ? "invite" : "general";
      setResType(initialResType);

      // 既存予約の取得
      const ticketId = `${id}_${user!.uid}`;
      const ticketRef = doc(db, "tickets", ticketId);
      const ticketSnap = await getDoc(ticketRef);

      if (ticketSnap.exists()) {
        const tData = ticketSnap.data();
        setExistingTicket(tData);
        setResType(tData.resType || initialResType);

        if (tData.resType === "invite") {
          // 招待予約の復元
          if (tData.groups && tData.groups.length > 0) {
            setInviteGroups(tData.groups);
          } else {
            // 旧データからの移行対応
            setInviteGroups([{
              groupName: "ご招待客",
              companions: tData.companions || Array(maxComp).fill(""),
              reservationNo: tData.reservationNo + "-1"
            }]);
          }
        } else {
          // 一般予約の復元
          setRepresentativeName(tData.representativeName || "");
          const newComps = Array(maxComp).fill("");
          (tData.companions || []).forEach((name: string, i: number) => {
            if (i < maxComp) newComps[i] = name;
          });
          setGeneralCompanions(newComps);
        }
      } else {
        // 新規予約時の初期化
        setGeneralCompanions(Array(maxComp).fill(""));
        setInviteGroups([{
          groupName: "",
          companions: Array(maxComp).fill("")
        }]);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
      hideSpinner();
    }
  };

  // グループ追加
  const addGroup = () => {
    const maxComp = live.maxCompanions || 0;
    setInviteGroups([...inviteGroups, { groupName: "", companions: Array(maxComp).fill("") }]);
  };

  // グループ削除
  const removeGroup = (index: number) => {
    if (inviteGroups.length <= 1) return;
    const newGroups = [...inviteGroups];
    newGroups.splice(index, 1);
    setInviteGroups(newGroups);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let totalCount = 0;
    const cleanedGroups: ReserveGroup[] = [];
    let cleanedGeneralCompanions: string[] = [];

    if (resType === "general") {
      cleanedGeneralCompanions = generalCompanions.filter(n => n.trim() !== "");
      totalCount = cleanedGeneralCompanions.length + 1;
    } else {
      // 招待予約の集計
      inviteGroups.forEach(g => {
        const c = g.companions.filter(n => n.trim() !== "");
        if (g.groupName.trim() !== "" || c.length > 0) {
          cleanedGroups.push({
            groupName: g.groupName || "名称未設定グループ",
            companions: c,
            reservationNo: g.reservationNo // 既存があれば維持
          });
          totalCount += c.length;
        }
      });
    }

    if (totalCount === 0) {
      await showDialog(`予約人数が0名です。内容を入力してください。`, true);
      return;
    }

    if (!(await showDialog("この内容で予約を確定しますか？"))) return;

    showSpinner();
    const ticketId = `${id}_${user!.uid}`;

    try {
      await runTransaction(db, async (transaction) => {
        const liveRef = doc(db, "lives", id as string);
        const resRef = doc(db, "tickets", ticketId);

        const lSnap = await transaction.get(liveRef);
        if (!lSnap.exists()) throw new Error("ライブ情報が存在しません。");
        const lData = lSnap.data();

        const oldResCount = existingTicket ? existingTicket.totalCount || 0 : 0;
        const diff = totalCount - oldResCount;
        if ((lData.totalReserved || 0) + diff > (lData.ticketStock || 0)) {
          throw new Error("完売または残席不足です。");
        }

        // 予約番号の発行ロジック
        const baseNo = existingTicket?.reservationNo?.split('-')[0] || 
                       Math.floor(1000 + Math.random() * 9000).toString();

        const ticketData: any = {
          liveId: id,
          uid: user!.uid,
          resType: resType,
          totalCount: totalCount,
          isLineNotified: false,
          updatedAt: serverTimestamp(),
        };

        if (resType === "general") {
          ticketData.representativeName = representativeName;
          ticketData.companions = cleanedGeneralCompanions;
          ticketData.companionCount = cleanedGeneralCompanions.length;
          ticketData.reservationNo = baseNo;
        } else {
          ticketData.representativeName = userData?.displayName || "メンバー";
          // グループごとに枝番を振る
          ticketData.groups = cleanedGroups.map((g, i) => ({
            ...g,
            reservationNo: g.reservationNo || `${baseNo}-${i + 1}`
          }));
          ticketData.reservationNo = baseNo; // 親番号としても保持
        }

        if (!existingTicket) {
          ticketData.createdAt = serverTimestamp();
          transaction.set(resRef, ticketData);
        } else {
          transaction.update(resRef, ticketData);
        }

        transaction.update(liveRef, { totalReserved: (lData.totalReserved || 0) + diff });
      });

      hideSpinner();
      await writeLog({ dataId: ticketId, action: 'Ticket予約確定' });
      await showDialog("予約を確定しました！", true);
      router.push(`/ticket-detail/${ticketId}`);
    } catch (e: any) {
      hideSpinner();
      await writeLog({
        dataId: ticketId,
        action: 'Ticket予約確定',
        status: 'error',
        errorDetail: { message: e.message },
      });
      await showDialog(e.message || "エラーが発生しました", true);
    }
  };

  if (authLoading || fetching) return <div className="inner">Loading...</div>;

  return (
    <main>
      <section className="hero" style={{ "--hero-bg": 'url("https://tappy-heartful.github.io/streak-images/connect/background/ticket-reserve.jpg")' } as any}>
        <div className="hero-content">
          <h1 className="page-title">RESERVE</h1>
          <p className="tagline">Ticket Reservation</p>
        </div>
      </section>

      <section className="content-section">
        <div className="inner">
          <nav className="breadcrumb">
            <Link href="/">Home</Link>
            <span className="separator">&gt;</span>
            <Link href={`/live-detail/${id}`}>Live Detail</Link>
            <span className="separator">&gt;</span>
            <span className="current">Reserve</span>
          </nav>

          {/* ライブ詳細カード（既存維持） */}
          <div className="ticket-card detail-mode">
            <div className="ticket-info">
              <div className="t-date">{live.date}</div>
              <Link href={`/live-detail/${id}`} className="t-title-link">
                <h3 className="t-title">{live.title}</h3>
              </Link>
              <div className="t-details">
                <p><i className="fa-solid fa-location-dot"></i> {live.venue}</p>
                <p><i className="fa-solid fa-clock"></i> Open {live.open} / Start {live.start}</p>
                <p><i className="fa-solid fa-ticket"></i> 前売料金: {live.advance}</p>
              </div>
            </div>
          </div>

          <div className="form-wrapper">
            <h2 className="section-title">チケット予約</h2>

            <form onSubmit={handleSubmit}>
              {isMember && (
                <div className="form-group">
                  <label>予約種別 <span className="required">必須</span></label>
                  <div className="radio-group">
                    <div className="radio-item">
                      <label className="radio-label">
                        <input type="radio" value="invite" checked={resType === "invite"} onChange={() => setResType("invite")} />
                        <span>招待予約</span>
                      </label>
                      <small className="radio-description">ライブに出演し、家族や知人の方をご招待します</small>
                    </div>
                    <div className="radio-item">
                      <label className="radio-label">
                        <input type="radio" value="general" checked={resType === "general"} onChange={() => setResType("general")} />
                        <span>一般予約</span>
                      </label>
                      <small className="radio-description">お客さんとしてライブを見にいきます</small>
                    </div>
                  </div>
                </div>
              )}

              {resType === "general" && (
                <>
                  <div className="form-group">
                    <label>代表者名 <span className="required">必須</span></label>
                    <p className="form-note">※個人情報保護のため、なるべくニックネームで入力してください</p>
                    <div className="input-row">
                      <input 
                        type="text" 
                        value={representativeName} 
                        onChange={(e) => setRepresentativeName(e.target.value)} 
                        required={resType === "general"}
                        placeholder="例：ステレオ 太郎"
                      />
                      <span className="honorific">様</span>
                    </div>
                  </div>

                  <h3 className="sub-title">同伴者様</h3>
                  <p className="form-note">※「友達」、「親戚」などニックネームや間柄でご入力ください</p>

                  {generalCompanions.map((name, index) => (
                    <div className="form-group" key={index}>
                      <label>ゲスト {index + 1}</label>
                      <div className="input-row">
                        <input 
                          type="text" 
                          value={name} 
                          onChange={(e) => {
                            const newComps = [...generalCompanions];
                            newComps[index] = e.target.value;
                            setGeneralCompanions(newComps);
                          }} 
                          placeholder="例：友達、親戚"
                        />
                        <span className="honorific">様</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* --- 招待予約フォーム (グループ対応版) --- */}
              {resType === "invite" && (
                <>
                  <div className="form-group">
                    <label>予約担当（出演メンバー）</label>
                    <input type="text" value={userData?.displayName || ""} readOnly className="read-only-input" />
                  </div>

                  <h3 className="sub-title">招待グループ設定</h3>
                  <p className="form-note">招待するグループごとに名前を分けて登録できます（例：地元の友達、家族など）。URLやQRコードはグループごとに発行されます。</p>

                  {inviteGroups.map((group, gIndex) => (
                    <div className="group-container" key={gIndex}>
                      <div className="group-header">
                        <span className="group-title">グループ {gIndex + 1}</span>
                        {inviteGroups.length > 1 && (
                          <button type="button" className="btn-remove-group" onClick={() => removeGroup(gIndex)}>削除</button>
                        )}
                      </div>

                      <div className="form-group group-name-row">
                        <label>グループ名</label>
                        <div className="input-row">
                          <input 
                            type="text" 
                            value={group.groupName}
                            onChange={(e) => {
                              const newGroups = [...inviteGroups];
                              newGroups[gIndex].groupName = e.target.value;
                              setInviteGroups(newGroups);
                            }}
                            placeholder="例：地元の友達"
                          />
                          <span className="honorific">のみなさま</span>
                        </div>
                      </div>

                      {group.companions.map((name, cIndex) => (
                        <div className="form-group" key={cIndex} style={{marginLeft: '20px'}}>
                          <label>ゲスト {cIndex + 1}</label>
                          <div className="input-row">
                            <input 
                              type="text" 
                              value={name} 
                              onChange={(e) => {
                                const newGroups = [...inviteGroups];
                                newGroups[gIndex].companions[cIndex] = e.target.value;
                                setInviteGroups(newGroups);
                              }} 
                              placeholder="例：ニックネーム"
                            />
                            <span className="honorific">様</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  <div className="add-group-wrapper">
                    <button type="button" className="btn-add-group" onClick={addGroup}>
                      + 新しい招待グループを追加
                    </button>
                  </div>
                </>
              )}

              {/* ライブ側からの注意事項（既存維持） */}
              {live.notes && (
                <div className="live-notes-area">
                  <p className="live-notes-text">{live.notes}</p>
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn-reserve">
                  {existingTicket ? "予約内容を更新する / UPDATE" : "予約を確定する / CONFIRM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <div className="page-actions" style={{ textAlign: "center", paddingBottom: "60px" }}>
        <Link href={`/live-detail/${id}`} className="btn-back-home"> ← Live情報に戻る </Link>
      </div>
    </main>
  );
}