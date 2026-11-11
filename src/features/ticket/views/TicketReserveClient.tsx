"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  showSpinner,
  hideSpinner,
  showDialog,
  writeLog,
} from "@/src/lib/functions";
import Link from "next/link";
import styles from "./ticket-reserve.module.css";
import {
  getTicketById,
  getLiveForTicket,
  checkIsBandMember,
  saveTicketReservation,
} from "../api/ticket-client-service";
import { ReserveGroup, TicketData } from "../types/ticket";
import { Live } from "@/src/lib/firestore/types";

interface TicketReserveClientProps {
  id: string; // liveId
}

export default function TicketReserveClient({ id }: TicketReserveClientProps) {
  const { user, loading: authLoading, userData } = useAuth();
  const router = useRouter();

  const [live, setLive] = useState<Live | null>(null);
  const [resType, setResType] = useState<"invite" | "general">("general");

  // 一般予約用
  const [representativeName, setRepresentativeName] = useState("");
  const [generalCompanions, setGeneralCompanions] = useState<string[]>([]);

  // 招待予約用 (グループ管理)
  const [inviteGroups, setInviteGroups] = useState<ReserveGroup[]>([]);

  const [isMember, setIsMember] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [existingTicket, setExistingTicket] = useState<TicketData | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/home");
      return;
    }
    loadData();
  }, [id, user, authLoading]);

  const loadData = async () => {
    showSpinner();
    setFetching(true);
    try {
      const liveData = await getLiveForTicket(id);
      if (!liveData) {
        await showDialog("ライブ情報が見つかりません。", true);
        router.push("/home");
        return;
      }
      setLive(liveData as Live);

      // 既存予約の取得と在庫チェック
      const ticketId = `${id}_${user!.uid}`;
      const tData = await getTicketById(ticketId);

      // 新規予約かつ在庫なしの判定
      if (
        !tData &&
        (liveData.totalReserved || 0) >= (liveData.ticketStock || 0)
      ) {
        hideSpinner();
        await showDialog(
          "大変申し訳ございません。予定枚数に達したため、新規予約を終了いたしました。",
          true
        );
        router.push(`/live-detail/${id}`);
        return;
      }

      const maxComp = liveData.maxCompanions || 0;

      // メンバーチェック
      const memberStatus = await checkIsBandMember(user!.uid);
      setIsMember(memberStatus);

      // 空配列を準備
      const emptyCompanions = Array(maxComp).fill("");

      if (tData) {
        setExistingTicket(tData);
        setResType(tData.resType || (memberStatus ? "invite" : "general"));

        // 一般予約データの復元と補完
        setRepresentativeName(tData.representativeName || "");
        const restoredGeneral = [...emptyCompanions];
        (tData.companions || []).forEach((name: string, i: number) => {
          if (i < maxComp) restoredGeneral[i] = name;
        });
        setGeneralCompanions(restoredGeneral);

        // 招待予約データの復元
        if (tData.groups && tData.groups.length > 0) {
          setInviteGroups(
            tData.groups.map((g) => ({
              ...g,
              companions:
                g.companions.length > 0
                  ? g.companions
                  : [...emptyCompanions],
            }))
          );
        } else {
          setInviteGroups([
            { groupName: "", companions: [...emptyCompanions] },
          ]);
        }
      } else {
        // 新規予約の初期化
        setResType(memberStatus ? "invite" : "general");
        setRepresentativeName(userData?.displayName || "");
        setGeneralCompanions([...emptyCompanions]);
        setInviteGroups([
          { groupName: "", companions: [...emptyCompanions] },
        ]);
      }
    } catch (e: any) {
      console.error(e);
      await showDialog("データ読み込み中にエラーが発生しました。", true);
    } finally {
      setFetching(false);
      hideSpinner();
    }
  };

  const handleGeneralCompanionChange = (index: number, val: string) => {
    const updated = [...generalCompanions];
    updated[index] = val;
    setGeneralCompanions(updated);
  };

  const handleAddGeneralCompanion = () => {
    setGeneralCompanions([...generalCompanions, ""]);
  };

  const handleRemoveGeneralCompanion = (index: number) => {
    const updated = [...generalCompanions];
    updated.splice(index, 1);
    setGeneralCompanions(updated);
  };

  const handleAddInviteGroup = () => {
    const maxComp = live?.maxCompanions || 0;
    setInviteGroups([
      ...inviteGroups,
      { groupName: "", companions: Array(maxComp).fill("") },
    ]);
  };

  const handleRemoveInviteGroup = (groupIndex: number) => {
    if (inviteGroups.length <= 1) {
      showDialog("最低1つのグループが必要です。", true);
      return;
    }
    const updated = [...inviteGroups];
    updated.splice(groupIndex, 1);
    setInviteGroups(updated);
  };

  const handleInviteGroupNameChange = (groupIndex: number, val: string) => {
    const updated = [...inviteGroups];
    updated[groupIndex].groupName = val;
    setInviteGroups(updated);
  };

  const handleInviteCompanionChange = (
    groupIndex: number,
    compIndex: number,
    val: string
  ) => {
    const updated = [...inviteGroups];
    updated[groupIndex].companions[compIndex] = val;
    setInviteGroups(updated);
  };

  const handleAddInviteCompanion = (groupIndex: number) => {
    const updated = [...inviteGroups];
    updated[groupIndex].companions.push("");
    setInviteGroups(updated);
  };

  const handleRemoveInviteCompanion = (
    groupIndex: number,
    compIndex: number
  ) => {
    const updated = [...inviteGroups];
    updated[groupIndex].companions.splice(compIndex, 1);
    setInviteGroups(updated);
  };

  // 予約枚数計算
  const getTotals = () => {
    let count = 0;
    if (resType === "invite") {
      count = inviteGroups.reduce((acc, g) => {
        return (
          acc + g.companions.filter((c) => c && c.trim() !== "").length
        );
      }, 0);
    } else {
      const companionsCount = generalCompanions.filter(
        (c) => c && c.trim() !== ""
      ).length;
      count = representativeName.trim() !== "" ? 1 + companionsCount : 0;
    }
    const price = live?.advance || 0;
    return { count, totalPrice: count * price };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resType === "general") {
      if (!representativeName.trim()) {
        await showDialog("代表者名を入力してください。", true);
        return;
      }
    } else {
      for (let i = 0; i < inviteGroups.length; i++) {
        const g = inviteGroups[i];
        if (!g.groupName.trim()) {
          await showDialog(`グループ #${i + 1} のグループ名を入力してください。`, true);
          return;
        }
        const validComps = g.companions.filter((c) => c && c.trim() !== "");
        if (validComps.length === 0) {
          await showDialog(
            `グループ「${g.groupName}」の来場者を最低1名入力してください。`,
            true
          );
          return;
        }
      }
    }

    const { count, totalPrice } = getTotals();
    if (count === 0) {
      await showDialog("予約人数が0人です。", true);
      return;
    }

    const confirmMsg = existingTicket
      ? `予約内容を変更しますか？\n合計人数: ${count}名\n合計金額: ¥${totalPrice.toLocaleString()}`
      : `予約を確定しますか？\n合計人数: ${count}名\n合計金額: ¥${totalPrice.toLocaleString()}`;

    const ok = await showDialog(confirmMsg);
    if (!ok) return;

    showSpinner();
    try {
      await saveTicketReservation({
        liveId: id,
        uid: user!.uid,
        resType,
        representativeName,
        generalCompanions,
        inviteGroups,
        existingTicket,
      });

      hideSpinner();
      await showDialog("予約が完了しました！\nチケット画面へ移動します。", true);
      router.push(`/ticket-detail/${id}_${user!.uid}`);
    } catch (e: any) {
      console.error(e);
      await writeLog({
        dataId: `${id}_${user?.uid}`,
        action: existingTicket ? "Ticket予約変更" : "Ticket新規予約",
        status: "error",
        errorDetail: { message: e.message },
      });
      hideSpinner();
      await showDialog(e.message || "エラーが発生しました。", true);
    }
  };

  if (authLoading || fetching) {
    return <div className="loading-text">Loading...</div>;
  }
  if (!live) return null;

  const { count: currentTotalCount, totalPrice: currentTotalPrice } = getTotals();

  return (
    <main>
      <section
        className="hero"
        style={
          {
            "--hero-bg":
              'url("https://tappy-heartful.github.io/streak-images/connect/background/ticket-reserve.jpg")',
          } as any
        }
      >
        <div className="hero-content">
          <h1 className="page-title">
            <i className="fa-solid fa-ticket" style={{ marginRight: "12px", color: "#e7211a" }}></i>
            RESERVATION
          </h1>
          <p className="tagline">Ticket Reserve Form</p>
        </div>
      </section>

      <section className="content-section">
        <div className="inner">
          <nav className="breadcrumb">
            <Link href="/home">Home</Link>
            <span className="separator">&gt;</span>
            <Link href={`/live-detail/${id}`}>Live Info</Link>
            <span className="separator">&gt;</span>
            <span className="current">Reserve</span>
          </nav>

          <div className={styles.ticketCardDetailMode}>
            <div className={styles.tDate}>
              <i className="fa-solid fa-calendar-days"></i> {live.date}
            </div>
            <h2 className={styles.tTitle}>{live.title}</h2>
            <div className={styles.tDetails}>
              <p>
                <i className="fa-solid fa-location-dot"></i> 会場: {live.venue}
              </p>
              <p>
                <i className="fa-solid fa-clock"></i> Open {live.open || "--:--"} / Start{" "}
                {live.start || "--:--"}
              </p>
              <p>
                <i className="fa-solid fa-money-bill"></i> 前売チケット代金: ¥
                {live.advance?.toLocaleString() || "0"} / 1名
              </p>
            </div>
          </div>

          <div className={styles.formWrapper}>
            <h2 className={styles.sectionTitle}>
              <i className="fa-solid fa-pen-nib" style={{ marginRight: "10px", color: "#e7211a" }}></i>
              RESERVATION FORM
            </h2>

            {isMember && (
              <div className={styles.typeSelector}>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${
                    resType === "invite" ? styles.active : ""
                  }`}
                  onClick={() => setResType("invite")}
                >
                  <i className="fa-solid fa-envelope-open-text"></i> 招待予約
                </button>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${
                    resType === "general" ? styles.active : ""
                  }`}
                  onClick={() => setResType("general")}
                >
                  <i className="fa-solid fa-user"></i> 一般予約
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* 一般予約フォーム */}
              {resType === "general" && (
                <div>
                  <h3 className={styles.subTitle}>REPRESENTATIVE</h3>
                  <div className={styles.formGroup}>
                    <label>代表者氏名</label>
                    <input
                      type="text"
                      value={representativeName}
                      onChange={(e) => setRepresentativeName(e.target.value)}
                      placeholder="例: 吹奏 太郎"
                      required
                    />
                  </div>

                  <h3 className={styles.subTitle}>COMPANIONS</h3>
                  <p className={styles.formNote}>
                    ※同伴者様がいる場合は、お名前を入力してください。
                  </p>
                  {generalCompanions.map((comp, idx) => (
                    <div key={idx} className={styles.formGroup}>
                      <label>同伴者 {idx + 1}</label>
                      <div className={styles.inputRow}>
                        <input
                          type="text"
                          value={comp}
                          onChange={(e) =>
                            handleGeneralCompanionChange(idx, e.target.value)
                          }
                          placeholder={`同伴者 ${idx + 1} のお名前`}
                        />
                        <button
                          type="button"
                          className={styles.btnDelRow}
                          onClick={() => handleRemoveGeneralCompanion(idx)}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={styles.btnAddRow}
                    onClick={handleAddGeneralCompanion}
                  >
                    + 同伴者を追加する
                  </button>
                </div>
              )}

              {/* 招待予約フォーム */}
              {resType === "invite" && (
                <div>
                  <h3 className={styles.subTitle}>RESERVATION MANAGER</h3>
                  <div className={styles.formGroup}>
                    <label>予約担当（あなた）</label>
                    <input
                      type="text"
                      value={userData?.displayName || "Member"}
                      readOnly
                      className={styles.readOnlyInput}
                    />
                  </div>

                  <h3 className={styles.subTitle}>INVITATION GROUPS</h3>
                  <p className={styles.formNote}>
                    ※招待するグループごと（例: 家族、職場、友人）にまとめて登録できます。
                  </p>

                  {inviteGroups.map((group, gIdx) => (
                    <div key={gIdx} className={styles.groupCard}>
                      <div className={styles.groupCardHeader}>
                        <span className={styles.groupTitle}>
                          グループ #{gIdx + 1}
                        </span>
                        <button
                          type="button"
                          className={styles.btnDelGroup}
                          onClick={() => handleRemoveInviteGroup(gIdx)}
                        >
                          <i className="fa-solid fa-trash-can"></i> 削除
                        </button>
                      </div>

                      <div className={styles.formGroup}>
                        <label>グループ名・団体名</label>
                        <input
                          type="text"
                          value={group.groupName}
                          onChange={(e) =>
                            handleInviteGroupNameChange(gIdx, e.target.value)
                          }
                          placeholder="例: ○○大学ジャズ研、ご家族 など"
                          required
                        />
                      </div>

                      {group.companions.map((comp, cIdx) => (
                        <div key={cIdx} className={styles.formGroup}>
                          <label>来場者 {cIdx + 1}</label>
                          <div className={styles.inputRow}>
                            <input
                              type="text"
                              value={comp}
                              onChange={(e) =>
                                handleInviteCompanionChange(
                                  gIdx,
                                  cIdx,
                                  e.target.value
                                )
                              }
                              placeholder={`来場者 ${cIdx + 1} のお名前`}
                            />
                            <button
                              type="button"
                              className={styles.btnDelRow}
                              onClick={() =>
                                handleRemoveInviteCompanion(gIdx, cIdx)
                              }
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        className={styles.btnAddRow}
                        onClick={() => handleAddInviteCompanion(gIdx)}
                      >
                        + このグループに来場者を追加
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className={styles.btnAddRow}
                    style={{
                      marginTop: "15px",
                      borderStyle: "solid",
                      borderColor: "#e7211a",
                      color: "#e7211a",
                    }}
                    onClick={handleAddInviteGroup}
                  >
                    + 新しいグループを追加する
                  </button>
                </div>
              )}

              {/* サマリーカード */}
              <div className={styles.summaryCard}>
                <div className={styles.summaryRow}>
                  <span>単価 (前売):</span>
                  <span>¥{live.advance?.toLocaleString() || "0"}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>合計予約枚数:</span>
                  <span>{currentTotalCount} 枚</span>
                </div>
                <div className={`${styles.summaryRow} ${styles.total}`}>
                  <span>合計金額 (当日精算):</span>
                  <span>¥{currentTotalPrice.toLocaleString()}</span>
                </div>
              </div>

              <button type="submit" className={styles.btnSubmit}>
                {existingTicket ? "予約内容を変更する" : "予約を確定する"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <div
        className="page-actions"
        style={{ textAlign: "center", paddingBottom: "60px" }}
      >
        <Link href={`/live-detail/${id}`} className="btn-back-home">
          ← ライブ詳細に戻る
        </Link>
      </div>
    </main>
  );
}

