"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./about.module.css";

type TabId = "about" | "reserve" | "disclaimer" | "privacy";

export default function AboutClient() {
  const [activeTab, setActiveTab] = useState<TabId>("about");

  return (
    <main className={styles.aboutPage}>
      <h1 className="page-title">サイト情報 | Streak Connect</h1>

      <div className={styles.tabs}>
        <div
          className={`${styles.tab} ${activeTab === "about" ? styles.active : ""}`}
          onClick={() => setActiveTab("about")}
        >
          当サイトについて
        </div>
        <div
          className={`${styles.tab} ${activeTab === "reserve" ? styles.active : ""}`}
          onClick={() => setActiveTab("reserve")}
        >
          予約について
        </div>
        <div
          className={`${styles.tab} ${activeTab === "disclaimer" ? styles.active : ""}`}
          onClick={() => setActiveTab("disclaimer")}
        >
          免責事項
        </div>
        <div
          className={`${styles.tab} ${activeTab === "privacy" ? styles.active : ""}`}
          onClick={() => setActiveTab("privacy")}
        >
          データとプライバシー
        </div>
      </div>

      <div className={styles.tabContainer}>
        {/* 当サイトについて */}
        <section
          className={`${styles.tabContent} ${activeTab === "about" ? styles.active : ""}`}
        >
          <h2>サイトの目的</h2>
          <p>
            <strong>Streak Connect</strong> は、Swing Streak Jazz Orchestra（SSJO）の活動を支援し、ファンの皆様と楽団をダイレクトにつなぐための専用プラットフォームです。
          </p>
          <p>
            最新のライブ情報の提供、デジタルチケットによるスムーズな予約管理、およびメンバー向けコンテンツの集約を目的として運営されています。LINE連携を活用することで、煩雑なメールやり取りを介さず、クイックな体験を提供します。
          </p>
        </section>

        {/* 予約について */}
        <section
          className={`${styles.tabContent} ${activeTab === "reserve" ? styles.active : ""}`}
        >
          <h2>チケット予約の注意事項</h2>
          <p>
            本サイトでのチケット予約は、円滑なイベント運営のため以下のルールを設けております。
          </p>
          <ul>
            <li>
              <strong>予約の成立:</strong>
              予約送信後、マイページ内にチケット（QRコード等）が表示された時点で確定となります。
            </li>
            <li>
              <strong>当日受付:</strong>
              会場受付にてマイページのデジタルチケットをご提示ください。紙のチケット発券は不要です。
            </li>
            <li>
              <strong>キャンセル規定:</strong>
              ライブ当日の開演直前までマイページよりキャンセル・変更が可能です。空席待ちの方のため、ご都合が悪くなった際は早めの処理をお願いいたします。
            </li>
            <li>
              <strong>定員制限:</strong>
              各公演には定員があります。満席時はシステム上予約ができなくなりますのでご了承ください。
            </li>
          </ul>
        </section>

        {/* 免責事項 */}
        <section
          className={`${styles.tabContent} ${activeTab === "disclaimer" ? styles.active : ""}`}
        >
          <h2>免責事項</h2>
          <p>
            当サイトに掲載する情報の正確性には万全を期しておりますが、急な天候不良や出演者の体調等により、ライブ情報が直前に変更・中止となる場合があります。
          </p>
          <p>
            通信環境の不具合、サーバー障害、またはメンテナンス等により本サービスが一時的に停止した場合に生じた損害（予約が完了できなかった等）について、当楽団は一切の責任を負いません。
          </p>
          <p>
            予約確定後の会場でのトラブルや紛失物等については、各会場の規定に従い、当サイトおよび当楽団では対応いたしかねます。
          </p>
        </section>

        {/* データとプライバシー */}
        <section
          className={`${styles.tabContent} ${activeTab === "privacy" ? styles.active : ""}`}
        >
          <h2>データの保存と取扱い</h2>
          <p>
            <strong>取得する情報:</strong>
            LINEログインを通じて、ユーザー識別子（UID）、プロフィール名、および予約時にご自身で入力された「同伴者名・枚数」のみを取得します。
          </p>
          <p>
            <strong>安全な管理:</strong>
            取得した個人情報はGoogle Cloud（Firebase）の暗号化された安全なデータベースに保存され、本イベントの運営以外の目的で第三者に提供されることは一切ありません。
          </p>
          <p>
            <strong>利用終了後:</strong>
            マイページよりいつでもアカウントの削除（退会処理）が可能です。
          </p>
        </section>
      </div>

      <div className={styles.pageFooter}>
        <Link href="/home" className={styles.backLink}>
          ← Homeに戻る
        </Link>
      </div>
    </main>
  );
}

