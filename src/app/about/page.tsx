"use client";

import { useState } from "react";
import Link from "next/link";
import "./about.css";

type TabId = "about" | "reserve" | "disclaimer" | "privacy";

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState<TabId>("about");

  return (
    <main className="about-page">
      <h1 className="page-title">サイト情報 | Streak Connect</h1>

      <div className="tabs">
        <div
          className={`tab ${activeTab === "about" ? "active" : ""}`}
          onClick={() => setActiveTab("about")}
        >
          当サイトについて
        </div>
        <div
          className={`tab ${activeTab === "reserve" ? "active" : ""}`}
          onClick={() => setActiveTab("reserve")}
        >
          予約について
        </div>
        <div
          className={`tab ${activeTab === "disclaimer" ? "active" : ""}`}
          onClick={() => setActiveTab("disclaimer")}
        >
          免責事項
        </div>
        <div
          className={`tab ${activeTab === "privacy" ? "active" : ""}`}
          onClick={() => setActiveTab("privacy")}
        >
          データとプライバシー
        </div>
      </div>

      <div className="tab-container">
        {/* 当サイトについて */}
        <section className={`tab-content ${activeTab === "about" ? "active" : ""}`}>
          <h2>サイトの目的</h2>
          <p>
            <strong>Streak Connect</strong> は、Swing Streak Jazz Orchestra（SSJO）の活動を支援し、ファンの皆様と楽団をダイレクトにつなぐための専用プラットフォームです。
          </p>
          <p>
            最新のライブ情報の提供、デジタルチケットによるスムーズな予約管理、およびメンバー向けコンテンツの集約を目的として運営されています。LINE連携を活用することで、煩雑なメールやり取りを介さず、クイックな体験を提供します。
          </p>
        </section>

        {/* 予約について */}
        <section className={`tab-content ${activeTab === "reserve" ? "active" : ""}`}>
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
        <section className={`tab-content ${activeTab === "disclaimer" ? "active" : ""}`}>
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
        <section className={`tab-content ${activeTab === "privacy" ? "active" : ""}`}>
          <h2>データの保存と取扱い</h2>
          <p>
            <strong>取得する情報:</strong>
            LINEログインを通じて、ユーザー識別子（UID）、プロフィール名、および予約時にご自身で入力された「同伴者名・枚数」のみを取得します。
          </p>
          
          <p>
            <strong>Firestoreによる管理:</strong>
            取得したデータは、Google Cloud Platformが提供する「Firebase Firestore」というクラウド型データベースに保存されます。業界標準の暗号化通信（SSL/TLS）およびセキュリティルールによって保護されており、権限のない第三者がアクセスすることはできません。
          </p>

          <p>
            <strong>保存の目的:</strong>
            データはチケットの照合、マイページへの表示、および受付名簿の作成にのみ使用されます。蓄積されたデータはイベント終了後、一定期間を経て適切に削除または匿名化されます。
          </p>

          <p>
            <strong>第三者提供:</strong>
            法令に基づき開示を求められた場合を除き、取得した個人情報を外部の企業や団体へ提供・販売することはありません。
          </p>
        </section>
      </div>

      <div className="page-footer">
        <Link href="/" className="back-link">
          ← ホームに戻る
        </Link>
      </div>
    </main>
  );
}