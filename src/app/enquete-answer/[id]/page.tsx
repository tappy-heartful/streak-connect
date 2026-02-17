"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { db } from "@/src/lib/firebase";
import { 
  doc, getDoc, addDoc, collection, serverTimestamp 
} from "firebase/firestore";
import { 
  showSpinner, hideSpinner, showDialog, writeLog 
} from "@/src/lib/functions";
import Link from "next/link";
import styles from "./enquete-answer.module.css";

export default function EnqueteAnswerPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [live, setLive] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

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
      setLive(liveSnap.data());

      const qRef = doc(db, "configs", "enqueteQuestions");
      const qSnap = await getDoc(qRef);
      if (qSnap.exists()) {
        const qData = qSnap.data().questions || [];
        setQuestions(qData);
        
        const initialAnswers: Record<string, any> = {};
        qData.forEach((q: any) => {
          if (q.type === "rating") initialAnswers[q.id] = 0;
          else if (q.type === "boolean") initialAnswers[q.id] = false;
          else initialAnswers[q.id] = "";
        });
        setAnswers(initialAnswers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
      hideSpinner();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = questions.find(q => q.required && !answers[q.id]);
    if (missing) {
      await showDialog(`「${missing.label}」は必須項目です。`, true);
      return;
    }

    if (!(await showDialog("アンケートを送信しますか？"))) return;

    showSpinner();
    try {
      await addDoc(collection(db, "enqueteAnswers"), {
        liveId: id,
        liveTitle: live.title,
        uid: user?.uid || null,
        common: answers,
        createdAt: serverTimestamp(),
      });
      await showDialog("ご協力ありがとうございました！", true);
      router.push(`/live-detail/${id}`);
    } catch (e: any) {
      showDialog("送信に失敗しました。");
    } finally {
      hideSpinner();
    }
  };

  if (fetching) return <div className="inner">Loading...</div>;

  return (
    <main>
      {/* 共通CSSの .hero を使用 */}
      <section className="hero" style={{ "--hero-bg": 'url("https://tappy-heartful.github.io/streak-images/connect/background/enquete-answer.jpg")' } as any}>
        <div className="hero-content">
          <h1 className="page-title">ENQUETE</h1>
          <p className="tagline">Feedback Form</p>
        </div>
      </section>

      {/* 共通CSSの .content-section / .inner を使用 */}
      <section className="content-section">
        <div className="inner">
          <div className={styles.liveBrief}>
            <p className={styles.liveDate}>{live.date}</p>
            <h2 className={styles.liveTitleText}>{live.title}</h2>
          </div>

          <div className={styles.formWrapper}>
            <form onSubmit={handleSubmit}>
              {questions.map((q) => (
                <div key={q.id} className={styles.formGroup}>
                  <label className={styles.fieldLabel}>
                    {q.label} {q.required && <span className={styles.requiredBadge}>必須</span>}
                  </label>

                  {q.type === "rating" && (
                    <div className={styles.ratingGroup}>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          className={`${styles.ratingBtn} ${answers[q.id] >= num ? styles.ratingBtnActive : ""}`}
                          onClick={() => setAnswers({...answers, [q.id]: num})}
                        >
                          ★
                        </button>
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
                <button type="submit" className="btn-action btn-reserve-red" style={{width: '100%'}}>
                  アンケートを送信する
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