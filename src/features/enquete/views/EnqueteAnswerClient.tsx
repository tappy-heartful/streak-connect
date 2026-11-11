"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { showSpinner, hideSpinner, showDialog } from "@/src/lib/functions";
import Link from "next/link";
import YoutubeSetlistPlayer from "@/src/components/YoutubeSetlistPlayer";
import styles from "./enquete-answer.module.css";
import {
  getEnqueteQuestions,
  getExistingEnqueteAnswer,
  saveEnqueteAnswer,
} from "../api/enquete-client-service";
import { getLiveById } from "@/src/features/live/api/live-client-service";
import { Live, EnqueteQuestion } from "@/src/lib/firestore/types";

interface EnqueteAnswerClientProps {
  id: string; // liveId
}

export default function EnqueteAnswerClient({ id }: EnqueteAnswerClientProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [live, setLive] = useState<Live | null>(null);
  const [questions, setQuestions] = useState<EnqueteQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingDocId, setExistingDocId] = useState<string | undefined>();

  useEffect(() => {
    loadData();
  }, [id, user]);

  const loadData = async () => {
    showSpinner();
    try {
      const liveData = await getLiveById(id);
      if (!liveData) {
        await showDialog("ライブ情報が見つかりません。", true);
        router.push("/home");
        return;
      }
      setLive(liveData);

      const qData = await getEnqueteQuestions();
      setQuestions(qData);

      let existingAnswers: Record<string, any> = {};
      if (user) {
        const existingDoc = await getExistingEnqueteAnswer(id, user.uid);
        if (existingDoc) {
          setExistingDocId(existingDoc.id);
          existingAnswers = existingDoc.common || {};
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
    } catch (e) {
      console.error("Data load error:", e);
      await showDialog("データ読み込み中にエラーが発生しました。", true);
    } finally {
      setFetching(false);
      hideSpinner();
    }
  };

  const getProgress = () => {
    const requiredQuestions = questions.filter((q) => q.required);
    if (requiredQuestions.length === 0) return 100;
    const answeredRequiredCount = requiredQuestions.filter((q) => {
      const val = answers[q.id];
      if (q.type === "rating") return val > 0;
      if (q.type === "boolean") return val === true;
      return val !== "" && val !== undefined;
    }).length;
    return Math.floor(
      (answeredRequiredCount / requiredQuestions.length) * 100
    );
  };

  const progress = getProgress();
  const isComplete = progress === 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!isComplete) {
      await showDialog("必須項目がすべて入力されていません。", true);
      return;
    }

    const ok = await showDialog("アンケートを送信しますか？");
    if (!ok) return;

    setSubmitting(true);
    showSpinner();
    try {
      await saveEnqueteAnswer({
        liveId: id,
        uid: user?.uid,
        answers,
        existingDocId,
      });

      hideSpinner();
      await showDialog("アンケートにご回答いただきありがとうございました！", true);
      router.push(`/live-detail/${id}`);
    } catch (e: any) {
      console.error(e);
      hideSpinner();
      await showDialog("送信中にエラーが発生しました。", true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRatingChange = (qId: string, rating: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: rating }));
  };

  const handleTextChange = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleBooleanChange = (qId: string, val: boolean) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  if (fetching) {
    return <div className="loading-text">Loading questionnaire...</div>;
  }
  if (!live) return null;

  return (
    <main>
      <section
        className="hero"
        style={
          {
            "--hero-bg":
              'url("https://tappy-heartful.github.io/streak-images/connect/background/enquete.jpg")',
          } as any
        }
      >
        <div className="hero-content">
          <h1 className="page-title">
            <i className="fa-solid fa-clipboard-question" style={{ marginRight: "12px", color: "#e7211a" }}></i>
            QUESTIONNAIRE
          </h1>
          <p className="tagline">Audience Survey</p>
        </div>
      </section>

      <section className="content-section">
        <div className="inner">
          <nav className="breadcrumb">
            <Link href="/home">Home</Link>
            <span className="separator">&gt;</span>
            <Link href={`/live-detail/${id}`}>Live Info</Link>
            <span className="separator">&gt;</span>
            <span className="current">Questionnaire</span>
          </nav>

          <div className={styles.liveBrief}>
            <div className={styles.liveDate}>
              <i className="fa-solid fa-calendar-days"></i> {live.date}
            </div>
            <h2 className={styles.liveTitleText}>{live.title}</h2>
          </div>

          {/* YouTube セットリストプレイヤー */}
          {live.setlist && (
            <div style={{ marginBottom: "30px" }}>
              <YoutubeSetlistPlayer
                setlist={live.setlist}
                title="当日のセットリスト 音源"
              />
            </div>
          )}

          <div className={styles.formWrapper}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>
                入力進捗率: {progress}%
              </span>
              <div className={styles.progressBarWrapper}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {questions.map((q, idx) => (
                <div key={q.id} className={styles.formGroup}>
                  <label className={styles.fieldLabel}>
                    <span className={styles.qIndex}>Q{idx + 1}.</span> {q.title}
                    {q.required ? (
                      <span className={styles.requiredBadge}>必須</span>
                    ) : (
                      <span className={styles.optionalBadge}>任意</span>
                    )}
                  </label>

                  {/* 星評価 */}
                  {q.type === "rating" && (
                    <div className={styles.ratingGroup}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={`${styles.ratingBtn} ${
                            (answers[q.id] || 0) >= star
                              ? styles.ratingBtnActive
                              : ""
                          }`}
                          onClick={() => handleRatingChange(q.id, star)}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 1行テキスト */}
                  {q.type === "text" && (
                    <input
                      type="text"
                      className={styles.inputText}
                      value={answers[q.id] || ""}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      placeholder="ご記入ください"
                      required={q.required}
                    />
                  )}

                  {/* 複数行テキスト */}
                  {q.type === "textarea" && (
                    <textarea
                      className={styles.textarea}
                      value={answers[q.id] || ""}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      placeholder="ご自由にご記入ください"
                      required={q.required}
                    />
                  )}

                  {/* はい/いいえ */}
                  {q.type === "boolean" && (
                    <div className={styles.booleanGroup}>
                      <button
                        type="button"
                        className={`${styles.boolBtn} ${
                          answers[q.id] === true ? styles.boolBtnActive : ""
                        }`}
                        onClick={() => handleBooleanChange(q.id, true)}
                      >
                        はい
                      </button>
                      <button
                        type="button"
                        className={`${styles.boolBtn} ${
                          answers[q.id] === false ? styles.boolBtnActive : ""
                        }`}
                        onClick={() => handleBooleanChange(q.id, false)}
                      >
                        いいえ
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting}
              >
                {submitting ? "送信中..." : "アンケートを送信する"}
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

