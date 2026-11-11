# STREAK CONNECT (Swing Streak Jazz Orchestra) システム仕様書・設計書

---

## 1. システム全体概要

### 1.1. システム目的

「**Streak Connect**（開発コードネーム: CANDY CONNECT）」は、社会人ビッグバンド（Swing Streak Jazz Orchestra）のファン・来場者・ゲストに向けて、ライブ公演の最新情報、デジタルチケットのオンライン予約・即時発券、電子アンケート回答、バンド公式メディア（Instagram/YouTube）の集約、および公式ストアへのアクセスを一元提供する公式Webポータルアプリケーションである。

LINEログインを活用したパスワードレスでストレスのない認証フロー、スマートフォンに最適化されたスタイリッシュなダークテーマUI/UX、Cloud Firestoreのトランザクションを活用した厳密な在庫管理、そして動的なQRコード入場発券機構を兼ね備えている。

### 1.2. 主要技術スタック

| カテゴリ | 採用技術 | バージョン/詳細 |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router, Turbopack) | `16.1.6` |
| **UI Library** | React / React DOM | `19.2.3` |
| **Language** | TypeScript | `^5` (Strict モード運用) |
| **BaaS / Database** | Cloud Firestore / Firebase Authentication | `^12.8.0` |
| **外部連携 (LINE)** | LINE Login API v2.1 (OAuth 2.0 / Custom Token認証) | 中間認証サーバー経由でのトークン交換・プロファイル同期 |
| **QRコード発券** | `qrcode.react` (`QRCodeSVG`) | `^4.2.0` (デジタルチケットQRコード動的生成) |
| **Styling** | CSS Modules + Tailwind CSS v4 | 各画面固有の `*.module.css` 必須運用、styled-jsx全廃 |
| **Icons / Assets** | Font Awesome 6 (Solid / Brands) | 全タイトル（`h1`含む）・アクションのアイコン統一 |

### 1.3. ブランディング & テーマカラー

- **ベース背景色**: `#000000`（漆黒） / `#111111`（カード背景） / `#1a1a1a`（情報ブロック）
- **プライマリ・アクセントカラー**: `#e7211a`（ジャズの熱気・エナジーを象徴する深紅）
- **テキストカラー**: `#ffffff`（メイン見出し・強調） / `#cccccc`（本文） / `#888888`（注釈・サブ情報）
- **タイポグラフィ**: 見出し・英数字にインパクトのある `Impact`, `Charcoal`, `sans-serif` を採用、予約番号には等幅フォント `Courier New` を使用。
- **UI哲学**:
  - モバイルファーストでタップしやすいタッチターゲット（44px以上確保）。
  - バッジや入力行の見切れや不自然な縦折れを排除するレスポンシブ設計。
  - すべての画面で Font Awesome アイコン付きタイトル（`h1`）および同階層の `*.module.css` による美しいスタイリング。

---

## 2. 認証・認可アーキテクチャ (Auth & LINE Login)

### 2.1. LINE ログイン & セッション管理フロー

1. **ログイン開始**:
   - ヘッダー右上の「Login」リンク、またはライブ詳細・予約画面からのアクション時に、`globalGetLineLoginUrl` へリクエストを送信。
   - 現在のアクセスURL（`window.location.href`）を `redirectAfterLogin` に付与。
2. **中間認証サーバー連携**:
   - LINE側のOAuth認可を経て、`/callback` 画面に `code` と `state` が返却される。
   - `/callback` が中間認証サーバー（`globalLineLoginUrl`）へPOSTリクエストを送信し、トークン検証および Firebase Custom Token を取得。
3. **Firebase サインイン**:
   - `signInWithCustomToken(auth, customToken)` をクライアントで実行。
   - 認証状態の変化は `AuthContext` の `onAuthStateChanged` が監視し、アプリ全体へ伝播。
4. **ユーザープロファイル同期 (`connectUsers`)**:
   - サインイン成功後、Firestoreの `connectUsers/{uid}` ドキュメントに `displayName`, `pictureUrl`, `lastLoginAt` を `merge: true` で保存。
   - 初回作成時には `createdAt: serverTimestamp()` を記録。
5. **利用規約判定 (`/agreement`)**:
   - `connectUsers` ドキュメントの `agreedAt` が未設定の場合、自動的に `/agreement`（利用規約同意画面）へリダイレクト。
   - 同意完了後、`redirectAfterLogin` で保持されていた元の目的ページへスムーズに復帰。

---

## 3. 画面別仕様・機能詳細

### 3.1. ホーム画面 (`/home` / `/`)

- **アクセス制御**: 全ユーザー閲覧可能（パブリック）。
- **ヒーローセクション (`homeHero`)**:
  - SSJOのキービジュアル背景（ブラー・グラデーション処理）。
  - バンドロゴ「Swing Streak Jazz Orchestra（Jは赤文字アクセント）」、拠点情報「BASED IN MATSUYAMA, EHIME」を表示。
- **UPCOMING LIVES (今後の公演予定)**:
  - Firestore `lives` コレクションより、公演日（`date >= 今日`）のデータを昇順で取得・一覧表示。
  - 公演フライヤー画像、日時、会場名、開場/開演時間をカード形式で提示。
  - チケット在庫状況（完売: `SOLD OUT` / 残り20%以下: `あとわずか`）をバッジ表示。
  - ユーザーが既に予約済みの場合は「チケットを表示 / VIEW TICKET」および「予約を変更 / EDIT RESERVATION」ボタンを表示。
- **PAST LIVES (過去の公演アーカイブ)**:
  - 公演日（`date < 今日`）の最新3件を `ARCHIVE` バッジ付きで表示。
- **Concept セクション**:
  - 楽団の成り立ち（愛媛大学ジャズ研究会OBOG中心の若手ビッグバンド）とコンセプトを紹介。
- **CORE MEMBERS セクション**:
  - 主要メンバー8名のアバター写真、担当楽器・役職、出身地をグリッドカード形式で表示。
- **Follow Us セクション**:
  - LINE公式アカウント友だち追加ボタン、公式Instagramリンクを配置。
- **Official Store セクション**:
  - バンド公式オリジナルグッズ（Tシャツ、ステッカー等）の横スクロールギャラリー。
  - 公式BOOTHショップ（`https://ssjo.booth.pm/`）への外部リンクボタンを設置。
- **HISTORY セクション**:
  - Firestore `medias` コレクションの最新5件を取得し、Instagram埋め込みスクリプト（`instgrm.Embeds.process()`）により公式Instagram投稿をカード表示。
- **PHOTOS セクション**:
  - 楽団の活動スナップ写真をグリッド表示。
  - 写真タップで `ImagePreviewModal` が起動し、全画面での写真拡大閲覧が可能。

### 3.2. ライブ詳細画面 (`/live-detail/[id]`)

- **アクセス制御**: 全ユーザー閲覧可能（パブリック）。
- **フライヤー・ヘッダー表示**:
  - 公演フライヤー画像、在庫ステータス（SOLD OUT / 残りわずか）。
  - 日程、会場（VENUE）、開場/開演時間（TIME）、前売/当日チケット料金（TICKET）のハイライト表示。
  - ログイン済みユーザーが予約済みの場合は「予約済み」バッジを付与。
- **YouTube セットリストプレイヤー (`YoutubeSetlistPlayer`)**:
  - 当該公演の `setlist` に含まれる `songIds` を `scores` コレクションと照合し、参考音源のYouTube動画を自動結合。
  - IFrameでの連続再生、曲送り/曲戻しコントローラー、全曲再生リストへのリンクを完備。
- **注意事項 (`caution`) & 備考 (`note`)**:
  - 会場規定や撮影可否等の注意事項を改行保持（`white-space: pre-wrap`）で明瞭に提示。
- **予約アクション**:
  - 受付期間外、終了公演、完売時の適切なステータス表示。
  - 未ログイン時はダイアログを介してLINEログインへ誘導し、ログイン後に元の公演詳細へ自動復帰。
  - 予約済みの場合は「チケットを表示」「予約変更」「予約取消」のアクションボタンを展開。
- **アンケート導線**:
  - 公演当日または公演終了後、予約済みユーザーに対して「アンケートに回答する」ボタンを表示。

### 3.3. チケット予約・変更画面 (`/ticket-reserve/[id]`)

- **アクセス制御**: ログイン必須（未ログイン時はLINEログイン誘導）。
- **在庫排他チェック (`runTransaction`)**:
  - 予約送信時、Firestoreトランザクション内で `lives/{id}` の最新 `totalReserved` と `ticketStock` を照合。
  - 残席を超える人数が指定された場合はエラーメッセージを表示し、予約処理を中断。
- **一般予約モード (`resType === "general"`)**:
  - 代表者氏名（必須）および同伴者氏名（複数人追加可能）。
  - 4桁のランダム数字文字列（`1000`〜`9999`）による予約番号を自動発番。
- **招待予約モード (`resType === "invite"`)**:
  - 楽団メンバー（Firestore `users/{uid}` 存在者）のみ選択可能な特別モード。
  - 複数の招待グループ（例:「家族」「大学ジャズ研」）を1回の操作でまとめて管理。
  - 4桁親番号をベースにグループごとに予約番号（`5821-1`, `5821-2`...）を枝番発番。
- **リアルタイムサマリー**:
  - 単価、合計枚数、合計金額（当日精算額）をフォーム下部にリアルタイム計算表示。

### 3.4. デジタルチケット画面 (`/ticket-detail/[id]`)

- **アクセス制御**: チケット所有者本人または招待URL保持者（ゲスト）。
- **QRコード入場受付 (`QRCodeSVG`)**:
  - 会場受付で読み取るための高解像度QRコードを動的生成。
  - 一般予約の場合はチケットURL、招待予約の場合はグループ専用URL（`?g=1`）をエンコード。
- **予約番号表示 & ワンタップコピー**:
  - `Courier New` による大文字表記の予約番号。
  - 「COPY」ボタンにより、クリップボードへの瞬時コピーと完了トースト通知。
- **招待グループ別チケット表示**:
  - 招待グループごとに独立したカード、QRコード、招待URLコピー機能を展開。
  - URL共有により、同伴者が自身のスマートフォンで個別にデジタルチケットを表示・入場可能。
- **各種アクション**:
  - URL共有、予約内容の変更、予約の取消（所有者本人のみ操作可能）。

### 3.5. 来場者アンケート回答画面 (`/enquete-answer/[id]`)

- **アクセス制御**: 公演当日または終了後に回答可能。
- **動的設問生成 (`configs/enqueteQuestions`)**:
  - Firestoreの設問マスタに基づき、設問（評価レート、テキスト、長文、真偽値等）を動的にレンダリング。
- **入力進捗バー**:
  - 必須設問の回答状況に応じた進捗率（0%〜100%）をリアルタイムにアニメーション表示。
- **既存回答の自動復元**:
  - ログインユーザーが過去に回答済みの場合は前回の回答内容を自動ロードし、再編集・更新を可能にする。

### 3.6. マイページ (`/mypage`)

- **アクセス制御**: ログイン必須。
- **プロフィール表示**:
  - LINEアバター画像、表示名（`displayName`）の表示。
- **予約済みチケット一覧 (`MY TICKETS`)**:
  - ユーザーが予約した全チケットを更新日時降順でカード一覧表示。
  - 各カードからチケット表示、URLコピー、予約変更、予約取消、アンケート回答へクイックアクセス。
- **アカウント操作**:
  - **ログアウト**: セッションを完全破棄してホームへリダイレクト。
  - **退会（アカウント削除）**:
    - 予約中チケットの全取消（在庫返却トランザクション）。
    - ユーザーデータを `archives` コレクションへ退避コピー後、`connectUsers` から削除。

### 3.7. サイト情報画面 (`/about`) & 利用規約画面 (`/agreement`)

- **サイト情報画面 (`/about`)**:
  - タブ切り替え形式による「当サイトについて」「予約について」「免責事項」「データとプライバシー」の明瞭な解説。
- **利用規約同意画面 (`/agreement`)**:
  - 初回ログイン時に強制表示される利用規約・プライバシーポリシー。
  - 条項スクロール確認と同意チェックボックス、同意完了時の `agreedAt` Firestore記録。

---

## 4. Firestore データモデル詳細 (Collections)

### 4.1. `connectUsers` (ファン・来場者ユーザー)
```typescript
interface ConnectUser {
  displayName: string;       // LINE表示名
  pictureUrl: string;        // LINEアバターURL
  agreedAt?: Timestamp;      // 利用規約同意日時
  status?: string;           // "active" 等
  lastLoginAt: Timestamp;    // 最終ログイン日時
  createdAt: Timestamp;      // 初回登録日時
}
```

### 4.2. `lives` (ライブ公演情報)
```typescript
interface Live {
  id: string;                // ドキュメントID
  title: string;             // 公演タイトル
  date: string;              // 公演日 (yyyy.MM.dd)
  venue: string;             // 会場名
  open?: string;             // 開場時間 (HH:mm)
  start?: string;            // 開演時間 (HH:mm)
  advance?: number;          // 前売チケット料金
  door?: number;             // 当日チケット料金
  flyerUrl?: string;         // フライヤー画像URL
  ticketStock?: number;      // チケット総在庫枚数
  totalReserved?: number;    // 現在の予約済み枚数
  isAcceptReserve?: boolean; // 予約受付フラグ
  acceptStartDate?: string;  // 受付開始日 (yyyy.MM.dd)
  acceptEndDate?: string;    // 受付終了日 (yyyy.MM.dd)
  maxCompanions?: number;    // 同伴者最大人数
  caution?: string;          // 注意事項 (改行含む)
  note?: string;             // 備考 (改行含む)
  setlist?: {
    setName?: string;
    songIds?: string[];
  }[];
}
```

### 4.3. `tickets` (チケット予約データ)
```typescript
interface Ticket {
  id: string;                // `${liveId}_${uid}`
  liveId: string;            // 公演ID
  uid: string;               // 予約者UID
  resType: "general" | "invite"; // 一般予約 / 招待予約
  reservationNo?: string;    // 予約番号 (4桁ランダム数字文字列、例: "5821")
  representativeName: string;// 代表者氏名
  companions?: string[];     // 一般予約の同伴者一覧
  totalCount: number;        // 合計人数
  groups?: {                 // 招待予約のグループ一覧
    groupName: string;
    reservationNo: string;   // グループ予約番号 ("5821-1")
    companions: string[];    // 来場者一覧
  }[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4.4. `configs/enqueteQuestions` & `enqueteAnswers` (アンケート)
```typescript
interface EnqueteQuestion {
  id: string;
  title: string;
  type: "rating" | "boolean" | "text" | "textarea";
  required?: boolean;
}

interface EnqueteAnswer {
  liveId: string;
  uid?: string;
  common: Record<string, any>; // { [questionId]: value }
  submittedAt: Timestamp;
}
```

---

## 5. 品質保証 & コーディング規約 (Rules & Guidelines)

1. **Feature-based Architecture**: すべての機能コードは `src/features/<feature_name>/` 配下にカプセル化し、`src/app/` の `page.tsx` は薄いサーバーコンポーネントとして保つ。
2. **CSS Modules の徹底**: `styled-jsx` や過剰なインラインスタイルの使用を禁止し、コンポーネントと同階層の `*.module.css` にスタイルを分離する。
3. **App Router Promise仕様の厳守**: `params` および `searchParams` は非同期Promiseとして扱い、必ず `await` してクライアントコンポーネントに渡す。
4. **アイコン統一**: すべての画面タイトル（`h1`）には、機能を象徴する Font Awesome アイコンを必ず付与する。
5. **安全なエラーハンドリング**: `alert()` の同期呼び出しを禁止し、プロミスベースの共通ダイアログ（`showDialog`）で統一する。
6. **自動ビルド検証**: コード変更後は必ず `npm run build` を実行し、Turbopack環境で0エラーであることを保証する。

