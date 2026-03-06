"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { db } from "@/src/lib/firebase";
import {
  doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, serverTimestamp
} from "firebase/firestore";
import {
  showSpinner, hideSpinner, showDialog
} from "@/src/lib/functions";
import Link from "next/link";
import styles from "./enquete-answer.module.css";

// --- ユーティリティ関数 ---
const extractYouTubeId = (input: string) => {
  if (!input) return "";
  try {
    const url = new URL(input);
    return url.searchParams.get('v') || url.pathname.split('/').pop() || input;
  } catch {
    return input;
  }
};

export default function EnqueteAnswerPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [live, setLive] = useState<any>(null);
  const [setlistVideoIds, setSetlistVideoIds] = useState<string[]>([]);
  // 現在表示中の動画インデックス
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [id, user]);

  const loadData = async () => {
    showSpinner();
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

      if (liveData.setlist && Array.isArray(liveData.setlist)) {
        const allSongIds = liveData.setlist.flatMap((item: any) => item.songIds || []);

        if (allSongIds.length > 0) {
          const uniqueSongIds = Array.from(new Set(allSongIds)) as string[];
          const scoresRef = collection(db, "scores");
          const q = query(scoresRef, where("__name__", "in", uniqueSongIds.slice(0, 30)));
          const scoresSnap = await getDocs(q);

          const videoIdMap: Record<string, string> = {};
          scoresSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.referenceTrack) {
              const vid = extractYouTubeId(data.referenceTrack);
              if (vid && vid.length === 11) {
                videoIdMap[doc.id] = vid;
              }
            }
          });

          const vids = allSongIds
            .map(sid => videoIdMap[sid as string])
            .filter(Boolean);

          setSetlistVideoIds(vids);
        }
      }

      const qRef = doc(db, "configs", "enqueteQuestions");
      const qSnap = await getDoc(qRef);
      if (qSnap.exists()) {
        const qData = qSnap.data().questions || [];
        setQuestions(qData);

        let existingAnswers: Record<string, any> = {};
        if (user) {
          const ansRef = collection(db, "enqueteAnswers");
          const q = query(ansRef, where("liveId", "==", id), where("uid", "==", user.uid));
          const ansSnap = await getDocs(q);
          if (!ansSnap.empty) {
            existingAnswers = ansSnap.docs[0].data().common || {};
          }
        }

        const initialAnswers: Record<string, any> = {};
        qData.forEach((q: any) => {
          if (existingAnswers[q.id] !== undefined) {
            initialAnswers[q.id] = existingAnswers[q.id];
          } else {
            if (q.type === "rating") initialAnswers[q.id] = 0;
            else if (q.type === "boolean") initialAnswers[q.id] = false;
            else initialAnswers[q.id] = "";
          }
        });
        setAnswers(initialAnswers);
      }
    } catch (e) {
      console.error("Data load error:", e);
    } finally {
      setFetching(false);
      hideSpinner();
    }
  };

  // --- YouTube プレイヤー操作 ---
  const handlePrevVideo = () => {
    setCurrentVideoIndex((prev) => (prev > 0 ? prev - 1 : setlistVideoIds.length - 1));
  };

  const handleNextVideo = () => {
    setCurrentVideoIndex((prev) => (prev < setlistVideoIds.length - 1 ? prev + 1 : 0));
  };

  const embedUrl = useMemo(() => {
    if (setlistVideoIds.length === 0) return "";
    const currentId = setlistVideoIds[currentVideoIndex];
    // playlistパラメータに全IDを渡すことで、YouTube側のUIでもリストとして扱えるようにする
    const playlist = setlistVideoIds.join(",");
    return `https://www.youtube.com/embed/${currentId}?playlist=${playlist}&loop=1`;
  }, [setlistVideoIds, currentVideoIndex]);

  const playlistLink = useMemo(() => {
    if (setlistVideoIds.length === 0) return "";
    return `https://www.youtube.com/watch_videos?video_ids=${setlistVideoIds.join(',')}`;
  }, [setlistVideoIds]);

  const getProgress = () => {
    const requiredQuestions = questions.filter(q => q.required);
    if (requiredQuestions.length === 0) return 100;
    const answeredRequiredCount = requiredQuestions.filter(q => {
      const val = answers[q.id];
      if (q.type === "rating") return val > 0;
      if (q.type === "boolean") return val === true;
      return val !== "" && val !== undefined;
    }).length;
    return Math.floor((answeredRequiredCount / requiredQuestions.length) * 100);
  };

  const progress = getProgress();
  const isComplete = progress === 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const missing = questions.find(q => q.required && !answers[q.id]);
    if (missing) {
      await showDialog(`「${missing.label}」にお答えください`, true);
      return;
    }

    if (!(await showDialog("アンケートを送信しますか？"))) return;

    setSubmitting(true);
    showSpinner();
    try {
      const data = {
        liveId: id,
        liveTitle: live.title,
        uid: user?.uid || null,
        common: answers,
        updatedAt: serverTimestamp(),
      };

      if (user) {
        const docId = `${id}_${user.uid}`;
        await setDoc(doc(db, "enqueteAnswers", docId), {
          ...data,
          createdAt: serverTimestamp(),
        }, { merge: true });
      } else {
        await addDoc(collection(db, "enqueteAnswers"), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }

      await showDialog("ご協力ありがとうございました！", true);
      router.push(`/live-detail/${id}`);
    } catch (e: any) {
      console.error(e);
      showDialog("送信に失敗しました。");
      setSubmitting(false);
    } finally {
      hideSpinner();
    }
  };

  if (fetching) return <div className="inner">Loading...</div>;

  return (
    <main>
      <section className="hero" style={{ "--hero-bg": 'url("https://tappy-heartful.github.io/streak-images/connect/background/enquete-answer.jpg")' } as any}>
        <div className="hero-content">
          <h1 className="page-title">ENQUETE</h1>
          <p className="tagline">Feedback Form</p>
        </div>
      </section>

      <section className="content-section">
        <div className="inner">
          <div className={styles.progressContainer}>
            <div className={styles.progressStats}>
              <span className={styles.progressLabel}>
                {isComplete ? "READY TO SUBMIT" : "REQUIRED ITEMS"}
              </span>
              <span className={styles.progressPercent}>{progress}%</span>
            </div>
            <div className={styles.progressBarBg}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className={styles.liveBrief}>
            <p className={styles.liveDate}>{live?.date}</p>
            <h2 className={styles.liveTitleText}>{live?.title}</h2>
          </div>

          {setlistVideoIds.length > 0 && (
            <div className={styles.playlistSection} style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                  <i className="fa-solid fa-list-ol" style={{ marginRight: '8px', color: '#f00' }}></i>
                  本日のセットリスト
                </h3>
                <a href={playlistLink} target="_blank" rel="noreferrer" className={styles.playlistButton} style={{
                  backgroundColor: '#f00', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(255,0,0,0.3)'
                }}>
                  <i className="fa-brands fa-youtube"></i> YouTube
                </a>
              </div>

              <div className={styles.videoContainer}>
                {/* プレイヤー本体 */}
                <div className={styles.videoWrapper} style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#000' }}>
                  <iframe
                    src={embedUrl}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  ></iframe>
                </div>

                {/* コントロールパネル */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '12px',
                  padding: '0 5px'
                }}>
                  <button
                    type="button"
                    onClick={handlePrevVideo}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '10px',
                      cursor: 'pointer',
                      color: '#fff',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    <i className="fa-solid fa-chevron-left" style={{ fontSize: '1.2rem' }}></i>
                    <span style={{ fontSize: '0.6rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>Prev</span>
                  </button>

                  <div style={{
                    flex: 1.5,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: '800', fontFamily: 'monospace' }}>
                      {String(currentVideoIndex + 1).padStart(2, '0')}
                      <span style={{ color: '#555', margin: '0 8px', fontWeight: '300' }}>/</span>
                      {String(setlistVideoIds.length).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: '#888', marginTop: '2px', fontWeight: 'bold' }}>TRACK NUMBER</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextVideo}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '10px',
                      cursor: 'pointer',
                      color: '#fff',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: '1.2rem' }}></i>
                    <span style={{ fontSize: '0.6rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>Next</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.formWrapper}>
            <form onSubmit={handleSubmit}>
              {questions.map((q, i) => (
                <div key={q.id} className={styles.formGroup}>
                  <label className={styles.fieldLabel}>
                    <span style={{ marginRight: '8px', color: '#888', fontSize: '0.9rem' }}>
                      {i + 1}/{questions.length}
                    </span>
                    {q.label}
                    {q.required && <span className={styles.requiredBadge}>必須</span>}
                  </label>

                  {q.type === "rating" && (
                    <div className={styles.ratingGroup}>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          className={`${styles.ratingBtn} ${answers[q.id] >= num ? styles.ratingBtnActive : ""}`}
                          onClick={() => setAnswers({...answers, [q.id]: num})}
                        >★</button>
                      ))}
                    </div>
                  )}

                  {q.type === "radio" && (
                    <div className={styles.radioList}>
                      {q.options.map((opt: string) => (
                        <label key={opt} className={styles.selectionLabel}>
                          <input
                            type="radio"
                            name={q.id}
                            checked={answers[q.id] === opt}
                            onChange={() => setAnswers({...answers, [q.id]: opt})}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "textarea" && (
                    <textarea
                      className={styles.textarea}
                      placeholder="ご自由にご記入ください"
                      value={answers[q.id]}
                      onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                    />
                  )}

                  {q.type === "text" && (
                    <input
                      type="text"
                      className={styles.inputText}
                      value={answers[q.id]}
                      onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                    />
                  )}

                  {q.type === "boolean" && (
                    <label className={styles.selectionLabel}>
                      <input
                        type="checkbox"
                        checked={answers[q.id]}
                        onChange={(e) => setAnswers({...answers, [q.id]: e.target.checked})}
                      />
                      <span>はい、承諾します</span>
                    </label>
                  )}
                </div>
              ))}

              <div className="live-actions">
                <button
                  type="submit"
                  className="btn-action btn-reserve-red"
                  style={{ width: '100%' }}
                  disabled={submitting}
                >
                  {submitting ? "送信中..." : user ? "回答を更新する" : "アンケートを送信する"}
                </button>
              </div>
            </form>
          </div>

          <div className="page-actions">
            <Link href={`/live-detail/${id}`} className="btn-back-home"> ← ライブ詳細に戻る </Link>
          </div>
        </div>
      </section>
    </main>
  );
}