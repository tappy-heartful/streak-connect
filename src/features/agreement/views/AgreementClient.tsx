"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { db } from "@/src/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  showSpinner,
  hideSpinner,
  showDialog,
  getSession,
  removeSession,
  writeLog,
} from "@/src/lib/functions";
import styles from "./agreement.module.css";

export default function AgreementClient() {
  const [agreed, setAgreed] = useState(false);
  const { user, loading, refreshUserData } = useAuth();
  const router = useRouter();

  const handleAgree = async () => {
    if (loading || !user) return;

    showSpinner();
    try {
      const userRef = doc(db, "connectUsers", user.uid);
      await updateDoc(userRef, {
        agreedAt: serverTimestamp(),
        status: "active",
      });

      await refreshUserData();

      const target = getSession("redirectAfterLogin") || "/home";
      removeSession("redirectAfterLogin");

      router.push(target);
    } catch (e: any) {
      console.error("Agreement error:", e);
      await writeLog({
        dataId: user.uid,
        action: "規約同意",
        status: "error",
        errorDetail: { message: e.message },
      });
      await showDialog("登録処理中にエラーが発生しました。", true);
    } finally {
      hideSpinner();
    }
  };

  if (loading) {
    return (
      <div className={styles.agreementPage}>
        <div className="loading-text">認証情報を確認中...</div>
      </div>
    );
  }

  return (
    <main className={styles.agreementPage}>
      <section className={styles.heroMini}>
        <div className="hero-content">
          <h1 className="page-title">TERMS OF SERVICE</h1>
          <p className="tagline">利用規約および個人情報の取り扱い</p>
        </div>
      </section>

      <div className="inner">
        <div className={styles.agreementWrapper}>
          <div className={styles.agreementHeader}>
            <h3>
              <i className="fa-solid fa-shield-halved" style={{ marginRight: "8px", color: "#e7211a" }}></i>
              Streak Connect 利用規約
            </h3>
            <p>本サービスをご利用いただくために、以下の内容をご確認ください。</p>
          </div>

          <div className={styles.agreementBox}>
            <div className={styles.agreementContent}>
              <h4>第1条（目的）</h4>
              <p>
                本規約は、SSJO（以下「当団体」）が提供するシステム「Streak Connect」（以下「本サービス」）の利用条件を定めるものです。
              </p>

              <h4>第2条（LINE連携による情報取得）</h4>
              <p>
                本サービスはLINE株式会社の提供するLINEログインを利用しています。ユーザーが同意した場合に限り、以下の情報を取得し、本人確認および予約管理の目的で使用します。
              </p>
              <ul>
                <li>表示名</li>
                <li>プロフィール画像URL</li>
                <li>ユーザー識別子（内部管理用のID）</li>
              </ul>

              <h4>第3条（データの保管とセキュリティ）</h4>
              <p>
                取得したデータおよび予約情報は、Google Cloud Platform（Firebase）の暗号化されたデータベースに安全に保管されます。
              </p>
              <ul>
                <li>
                  <strong>データの暗号化:</strong> 全てのデータは、Googleの高度なセキュリティ基準に従い、保管時および通信時に暗号化されます。
                </li>
                <li>
                  <strong>ハッシュ化の利用:</strong> 認証に関わる重要な識別子等は、ハッシュ化技術を用いて保護され、当団体の管理者であっても元の情報を直接閲覧できない形で管理されます。
                </li>
              </ul>

              <h4>第4条（予約の管理）</h4>
              <p>
                ユーザーは、本サービスを通じて当団体が主催するイベントのチケット予約、変更、および取消を行うことができます。各イベントの定員に達した場合、新規予約の受付を終了することがあります。
              </p>

              <h4>第5条（免責事項）</h4>
              <p>
                通信障害や天災等、やむを得ない事情により本サービスの利用が困難となった場合、当団体はその責任を負わないものとします。
              </p>

              <div className={styles.agreementFooter}>
                Swing Streak Jazz Orchestra
              </div>
            </div>
          </div>

          <label className={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>上記規約およびプライバシーポリシーに同意する</span>
          </label>

          <button
            type="button"
            className={`${styles.btnAgree} ${agreed ? styles.active : ""}`}
            disabled={!agreed}
            onClick={handleAgree}
          >
            同意して利用を開始する
          </button>
        </div>
      </div>
    </main>
  );
}

