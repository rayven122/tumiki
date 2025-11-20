# Tumiki Desktop App 設計書

## 1. プロジェクト概要

### 1.1 プロジェクト名

**Tumiki Desktop App** (`apps/desktop`)

### 1.2 目的

Tumiki の MCP サーバー管理機能をデスクトップアプリケーションとして提供し、以下を実現する：

- **ローカルファースト**: 基本的な設定・データはローカルに保存し、オフラインでも動作
- **ハイブリッドアーキテクチャ**: ローカルとクラウド（SaaS）のベストバランス
  - ローカル: MCP サーバー管理、即座の操作、プライバシー保護
  - クラウド: ログ集積、権限管理、チーム共有
- **シームレスな統合**: Claude Desktop、Cline、Windsurf、Cursor などの AI ツールとワンクリック連携
- **チーム対応**: クラウド同期による設定共有と権限管理
- **プライバシー重視**: 機密情報（API キー等）はローカル暗号化保存、クラウド送信なし
- **クロスプラットフォーム**: Windows、macOS、Linux で動作

### 1.3 背景

現在の Tumiki は Web ベースの SaaS として提供されていますが、以下のニーズに応えるためにデスクトップアプリケーションが必要：

**デスクトップアプリの必要性**:

- ローカル開発環境での MCP サーバー管理
- プライバシーを重視するユーザー向けのオフライン利用
- AI ツールとの直接統合による開発体験の向上
- 企業内ネットワークでの利用

**ハイブリッドアーキテクチャの必要性**:

- **ローカルの強み**: 即座の操作、プライバシー保護、オフライン動作
- **クラウドの強み**: ログ集積・分析、チーム共有、権限管理、長期保存
- **ベストバランス**: ローカルとクラウドの利点を組み合わせた最適な UX
- **段階的移行**: 既存の SaaS 基盤を活用し、スムーズなデスクトップ対応

### 1.4 参考プロジェクト

- [mcp-router](https://github.com/mcp-router/mcp-router): アーキテクチャと MCP 統合パターン
- 既存の Tumiki プロジェクト: API 設計、データモデル、UI/UX パターン

### 1.5 既存プロジェクトとの統合

このデスクトップアプリは既存の Tumiki モノレポ（`tumiki-main`）の `apps/desktop` として追加されます：

- **既存パッケージの活用**: `@tumiki/db`、`@tumiki/auth`、`@tumiki/utils` などの共有パッケージを再利用
- **コーディング規約の継承**: 既存の TypeScript、ESLint、Prettier 設定を使用
- **ビルドシステムの統合**: Turbo によるモノレポビルドシステムに統合
- **品質基準の維持**: 既存の CI/CD パイプラインと品質チェックを適用

---

## 2. アーキテクチャ

### 2.1 全体構成（ハイブリッドアーキテクチャ）

```
┌─────────────────────────────────────────────────────────────────┐
│                    Tumiki Desktop App                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐         ┌─────────────────────┐          │
│  │  Renderer       │  IPC    │  Main Process       │          │
│  │  (React + TS)   │◄───────►│  (Electron)         │          │
│  └─────────────────┘         └─────────────────────┘          │
│         │                            │                          │
│         │                            │                          │
│         ▼                            ▼                          │
│  ┌─────────────────┐         ┌─────────────────────┐          │
│  │  UI Components  │         │  MCP Manager        │          │
│  │  (Radix UI)     │         │  (SDK)              │          │
│  └─────────────────┘         └─────────────────────┘          │
│                                      │                          │
│                   ┌──────────────────┼──────────────────┐      │
│                   ▼                  ▼                  ▼      │
│            ┌─────────────┐   ┌─────────────┐   ┌─────────────┐│
│            │Local Storage│   │Sync Manager │   │Log Collector││
│            │  (SQLite)   │   │             │   │             ││
│            └─────────────┘   └─────────────┘   └─────────────┘│
└─────────────────────────────────────┬───────────────────────────┘
         │                            │                  │
         │                            │                  │
         ▼                            ▼                  ▼
┌─────────────────┐      ┌───────────────────────────────────────┐
│  AI Tools       │      │  Tumiki SaaS (Cloud)                  │
│  (Claude, etc)  │      │  ┌─────────────┐   ┌───────────────┐ │
└─────────────────┘      │  │Log Storage  │   │Permission Mgmt│ │
         │               │  │(PostgreSQL) │   │(Auth & Roles) │ │
         │               │  └─────────────┘   └───────────────┘ │
         ▼               │  ┌─────────────┐   ┌───────────────┐ │
┌─────────────────────┐ │  │Team Settings│   │Sync Service   │ │
│  Local/Remote       │ │  │(Shared)     │   │(API)          │ │
│  MCP Servers        │ │  └─────────────┘   └───────────────┘ │
└─────────────────────┘ └───────────────────────────────────────┘
```

### 2.2 プロセス分離

#### メインプロセス (Main Process)

- Electron のメインスレッド
- MCP サーバーのライフサイクル管理
- ファイルシステムアクセス
- ネイティブ機能（通知、トレイアイコン等）
- SQLite データベース操作

#### レンダラープロセス (Renderer Process)

- React ベースの UI
- ユーザーインタラクション
- IPC 経由でメインプロセスと通信

#### プリロードスクリプト (Preload Script)

- メインとレンダラー間の安全な通信ブリッジ
- Context Isolation 有効化
- 必要最小限の API のみ公開

---

## 3. 技術スタック

### 3.1 コア技術

| レイヤー                       | 技術            | 用途                                     |
| ------------------------------ | --------------- | ---------------------------------------- |
| **デスクトップフレームワーク** | Electron 33+    | クロスプラットフォームデスクトップアプリ |
| **ビルドツール**               | Vite 6          | 高速開発・ビルド                         |
| **UI フレームワーク**          | React 19        | ユーザーインターフェース                 |
| **言語**                       | TypeScript 5.7+ | 型安全性                                 |
| **状態管理**                   | Jotai           | グローバル状態管理                       |
| **UI コンポーネント**          | Radix UI        | アクセシブルなプリミティブ               |
| **スタイリング**               | Tailwind CSS    | ユーティリティファーストCSS              |

### 3.2 MCP 統合

| 技術                        | 用途                     |
| --------------------------- | ------------------------ |
| `@modelcontextprotocol/sdk` | MCP プロトコル実装       |
| Node.js Child Process       | MCP サーバープロセス管理 |
| stdio / SSE transport       | MCP 通信プロトコル       |

### 3.3 クラウド連携（SaaS）

| 技術          | 用途                                  |
| ------------- | ------------------------------------- |
| tRPC Client   | 型安全な API 通信（既存の SaaS 連携） |
| WebSocket     | リアルタイム同期通知                  |
| Axios / Fetch | HTTP API 通信                         |
| Auth0 SDK     | 認証・認可（SaaS と共通）             |

### 3.4 データ永続化

| 技術                    | 用途                           |
| ----------------------- | ------------------------------ |
| SQLite (better-sqlite3) | ローカルデータベース           |
| Electron Store          | アプリケーション設定           |
| Keytar / safeStorage    | 機密情報（API キー等）の暗号化 |

### 3.5 開発・ビルド

| 技術              | 用途                     |
| ----------------- | ------------------------ |
| pnpm              | パッケージマネージャー   |
| Turbo             | モノレポビルドシステム   |
| Vitest            | テストフレームワーク     |
| ESLint + Prettier | コード品質・フォーマット |
| Electron Builder  | パッケージング・配布     |

### 3.6 CI/CD

| 技術           | 用途                                  |
| -------------- | ------------------------------------- |
| GitHub Actions | 自動ビルド・テスト                    |
| CodeSigning    | アプリケーション署名（Windows/macOS） |
| Auto-update    | 自動更新機能 (electron-updater)       |

---

## 4. 主要機能

### 4.1 MCP サーバー管理

#### 4.1.1 サーバー登録

- **手動登録**: サーバー名、コマンド、引数、環境変数を入力
- **自動検出**: `mcp-get install` コマンドとの互換性
- **テンプレート**: よく使われる MCP サーバーのプリセット
- **インポート**: JSON/YAML 形式の設定ファイルからインポート

#### 4.1.2 サーバー制御

- **起動/停止**: ワンクリックでサーバーを制御
- **再起動**: 設定変更後の自動再起動
- **自動起動**: アプリ起動時の自動開始設定
- **ヘルスチェック**: サーバーの稼働状況監視

#### 4.1.3 ログ・デバッグ（ハイブリッド）

**ローカルログ記録**:

- **リアルタイムログ**: stdout/stderr のストリーミング表示
- **ログレベルフィルタ**: info/warn/error の選択表示
- **ローカル保存**: SQLite にログを記録（パフォーマンス最適化）
- **ログローテーション**: 古いログの自動削除

**クラウドログ集積（SaaS 連携）**:

- **自動アップロード**: バックグラウンドでクラウドにログを送信
- **集約分析**: チーム全体のログを SaaS で一元管理
- **長期保存**: ローカルより長期間のログ保持
- **高度な検索**: クラウドでの全文検索・フィルタリング
- **メトリクス**: リクエスト数、エラー率、レスポンスタイムの可視化
- **アラート**: 異常検知時の通知機能

### 4.2 AI ツール統合

#### 4.2.1 ワンクリック統合

- **Claude Desktop**: 設定ファイルの自動生成・更新
- **Cline**: VS Code 拡張の設定自動化
- **Windsurf**: IDE 統合サポート
- **Cursor**: エディタ設定の自動適用

#### 4.2.2 統合 URL 管理

- すべての MCP サーバーを単一エンドポイントで公開
- ツール選択的公開（特定ツールのみを AI ツールに提供）
- アクセス制御とレート制限

### 4.3 設定管理

#### 4.3.1 プロファイル

- **複数プロファイル**: 開発/本番環境の切り替え
- **プロファイルエクスポート**: チーム内での設定共有
- **プロファイルインポート**: 既存設定の再利用

#### 4.3.2 環境変数管理

- **セキュアストレージ**: API キーの暗号化保存
- **環境変数グループ**: 複数サーバーで共有する変数
- **マスキング表示**: UI 上での機密情報の保護

### 4.4 クラウド同期（SaaS 連携）

#### 4.4.1 同期戦略

**定期同期**:

- **自動同期**: デフォルトで 5 分ごとに同期
- **手動同期**: ユーザーが任意のタイミングで同期実行
- **差分同期**: 変更があった部分のみを送信（効率化）

**同期対象**:

- **設定情報**: MCP サーバー設定、プロファイル（API キーは除外）
- **権限設定**: チームメンバーごとのアクセス権限
- **ログデータ**: ローカルで記録したログの定期アップロード

**競合解決**:

- **タイムスタンプベース**: 最後の更新時刻で判定
- **手動マージ**: 競合時はユーザーに選択を促す
- **バックアップ**: 同期前の状態を自動保存

#### 4.4.2 オフライン対応

- **オフライン動作**: インターネット接続なしでも全機能が利用可能
- **キューイング**: オフライン時の変更をキューに保存
- **再接続時同期**: ネットワーク復帰時に自動同期

### 4.5 チーム管理（SaaS 機能）

#### 4.5.1 権限管理

**ロールベースアクセス制御（RBAC）**:

- **Owner**: 全権限（削除を含む）
- **Admin**: サーバー管理、メンバー招待
- **Member**: サーバー参照、起動/停止
- **Viewer**: 参照のみ

**きめ細かい権限設定**:

- サーバーごとの個別権限設定
- ツールごとのアクセス制限
- API キーの表示権限制御

#### 4.5.2 チーム設定共有

**共有設定**:

- **サーバーテンプレート**: チーム共通の MCP サーバー設定
- **環境変数グループ**: チームで共有する環境変数（暗号化）
- **プロファイル**: チームメンバー間でのプロファイル共有

**プライベート設定**:

- **ローカルオーバーライド**: 個人用の設定で上書き可能
- **機密情報**: API キーは個人のローカルのみに保存

#### 4.5.3 チームダッシュボード（SaaS Web UI）

- **メンバー管理**: 招待、権限変更、削除
- **使用状況分析**: チーム全体のログ・メトリクス
- **監査ログ**: 誰がいつ何を変更したかの履歴
- **請求管理**: チームプランの管理

### 4.6 UI/UX

#### 4.6.1 ダッシュボード

- サーバー一覧とステータス表示
- クイックアクション（起動/停止/再起動）
- リソース使用状況（CPU/メモリ）
- 同期ステータス表示

#### 4.6.2 詳細ビュー

- サーバー設定編集
- ログビューア（ローカル/クラウド切り替え）
- メトリクスグラフ
- チームメンバー表示

#### 4.6.3 システムトレイ

- バックグラウンド実行
- トレイアイコンからのクイックアクセス
- 通知機能（エラー、同期完了等）

---

## 5. ディレクトリ構造

既存の Tumiki モノレポに `apps/desktop` を追加する形で構成します：

```text
tumiki/                            # 既存のルートディレクトリ
├── apps/
│   ├── manager/                  # 既存: Web アプリ
│   ├── proxyServer/              # 既存: MCP プロキシサーバー
│   └── desktop/                  # 新規: Electron デスクトップアプリ
│       ├── src/
│       │   ├── main/            # メインプロセス
│       │   │   ├── index.ts    # エントリーポイント
│       │   │   ├── window.ts   # ウィンドウ管理
│       │   │   ├── ipc/        # IPC ハンドラー
│       │   │   ├── mcp/        # MCP マネージャー
│       │   │   │   ├── manager.ts
│       │   │   │   ├── server.ts
│       │   │   │   └── transport.ts
│       │   │   ├── db/         # データベース（SQLite）
│       │   │   │   ├── index.ts
│       │   │   │   ├── schema.ts
│       │   │   │   └── migrations/
│       │   │   └── utils/      # ユーティリティ
│       │   │
│       │   ├── preload/         # プリロードスクリプト
│       │   │   └── index.ts
│       │   │
│       │   └── renderer/        # レンダラープロセス
│       │       ├── src/
│       │       │   ├── App.tsx # ルートコンポーネント
│       │       │   ├── main.tsx # エントリーポイント
│       │       │   ├── _components/ # UI コンポーネント
│       │       │   │   ├── Dashboard/
│       │       │   │   ├── ServerList/
│       │       │   │   ├── ServerDetail/
│       │       │   │   ├── LogViewer/
│       │       │   │   └── Settings/
│       │       │   ├── hooks/  # カスタムフック
│       │       │   ├── stores/ # Jotai atoms
│       │       │   ├── types/  # 型定義
│       │       │   └── utils/  # ユーティリティ
│       │       ├── index.html
│       │       └── vite.config.ts
│       │
│       ├── resources/           # アプリケーションリソース
│       │   ├── icons/          # アイコン（各プラットフォーム）
│       │   └── templates/      # MCP サーバーテンプレート
│       │
│       ├── electron-builder.yml # パッケージング設定
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── packages/                    # 既存の共有パッケージ（活用）
│   ├── db/                     # Prisma スキーマ（必要に応じて参照）
│   ├── auth/                   # 認証パッケージ（オプション）
│   ├── utils/                  # 共通ユーティリティ
│   ├── desktop-shared/         # 新規: デスクトップアプリ専用の共有コード
│   │   ├── src/
│   │   │   ├── types/         # 共通型定義
│   │   │   ├── schemas/       # Zod スキーマ
│   │   │   └── constants/     # 定数
│   │   └── package.json
│   │
│   └── mcp-sdk/                # 新規: MCP SDK ラッパー
│       ├── src/
│       │   ├── client.ts
│       │   ├── server.ts
│       │   └── types.ts
│       └── package.json
│
├── tooling/                     # 既存の開発ツール設定（再利用）
│   ├── eslint/
│   ├── prettier/
│   ├── tailwind/
│   ├── typescript/
│   └── vitest/
│
├── docs/                        # 既存のドキュメント
│   ├── tumiki-app-design.md   # このファイル
│   └── ...
│
├── scripts/                     # 既存のスクリプト
│   ├── build-desktop.sh        # 新規: デスクトップアプリビルド
│   ├── release-desktop.sh      # 新規: デスクトップアプリリリース
│   ├── notarize.js            # 新規: macOS 公証
│   └── ...
│
├── .github/                     # 既存の CI/CD
│   └── workflows/
│       ├── desktop-build.yml   # 新規: デスクトップアプリビルド
│       ├── desktop-release.yml # 新規: リリース自動化
│       └── ...
│
├── CLAUDE.md                    # 既存: Claude Code ガイド（更新）
├── README.md                    # 既存: プロジェクト説明（更新）
├── pnpm-workspace.yaml          # 既存: ワークスペース設定
├── turbo.json                   # 既存: ビルド設定（更新）
├── package.json                 # 既存: ルートパッケージ（更新）
└── tsconfig.json                # 既存: TypeScript 設定
```

---

## 6. データモデル

### 6.1 データベーススキーマ (SQLite)

#### 6.1.1 MCPServer テーブル

```sql
CREATE TABLE mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  command TEXT NOT NULL,
  args TEXT,                    -- JSON array
  env_vars TEXT,                -- JSON object (encrypted)
  transport_type TEXT NOT NULL, -- 'stdio' | 'sse' | 'http'
  auto_start BOOLEAN DEFAULT 0,
  status TEXT DEFAULT 'stopped', -- 'running' | 'stopped' | 'error'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 6.1.2 ServerLog テーブル

```sql
CREATE TABLE server_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT NOT NULL,
  level TEXT NOT NULL,          -- 'info' | 'warn' | 'error'
  message TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
);
```

#### 6.1.3 ServerMetrics テーブル

```sql
CREATE TABLE server_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_response_time REAL DEFAULT 0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
);
```

#### 6.1.4 AIToolIntegration テーブル

```sql
CREATE TABLE ai_tool_integrations (
  id TEXT PRIMARY KEY,
  tool_name TEXT NOT NULL,      -- 'claude' | 'cline' | 'cursor' | 'windsurf'
  config_path TEXT NOT NULL,
  enabled BOOLEAN DEFAULT 1,
  server_ids TEXT,              -- JSON array of server IDs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 6.1.5 Profile テーブル

```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 0,
  config TEXT NOT NULL,         -- JSON object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 6.1.6 SyncQueue テーブル（クラウド同期用）

```sql
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,    -- 'server' | 'log' | 'profile' | 'permission'
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,      -- 'create' | 'update' | 'delete'
  payload TEXT NOT NULL,        -- JSON object
  sync_status TEXT DEFAULT 'pending', -- 'pending' | 'syncing' | 'synced' | 'failed'
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  synced_at DATETIME
);
```

#### 6.1.7 CloudSyncStatus テーブル

```sql
CREATE TABLE cloud_sync_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  last_sync_at DATETIME,
  next_sync_at DATETIME,
  sync_enabled BOOLEAN DEFAULT 1,
  team_id TEXT,                 -- SaaS のチーム ID
  user_id TEXT,                 -- SaaS のユーザー ID
  access_token TEXT,            -- 暗号化されたアクセストークン
  refresh_token TEXT,           -- 暗号化されたリフレッシュトークン
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 6.1.8 TeamPermission テーブル（ローカルキャッシュ）

```sql
CREATE TABLE team_permissions (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,           -- 'owner' | 'admin' | 'member' | 'viewer'
  permissions TEXT,             -- JSON array of permissions
  synced_from_cloud BOOLEAN DEFAULT 1,
  last_synced_at DATETIME,
  FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
);
```

### 6.2 Electron Store 設定

```typescript
interface AppSettings {
  theme: "light" | "dark" | "system";
  language: "en" | "ja";
  startMinimized: boolean;
  closeToTray: boolean;
  checkUpdatesOnStartup: boolean;
  logRetentionDays: number;
}
```

---

## 7. セキュリティとプライバシー

### 7.1 データ保護

#### 7.1.1 機密情報の暗号化

- **API キー**: Electron の `safeStorage` API で暗号化
- **環境変数**: プラットフォームのキーチェーンに保存（keytar）
- **データベース**: SQLite の encryption extension 利用

#### 7.1.2 サンドボックス化

- レンダラープロセスのサンドボックス有効化
- Context Isolation 有効化
- Node Integration 無効化

### 7.2 通信セキュリティ

#### 7.2.1 IPC 通信

- ホワイトリスト方式の IPC チャンネル
- パラメータバリデーション
- エラーハンドリング

#### 7.2.2 外部通信（SaaS API）

- **HTTPS のみ**: すべての通信を TLS 1.3 で暗号化
- **証明書検証**: SSL/TLS 証明書の厳格な検証
- **タイムアウト設定**: ネットワークタイムアウトの適切な設定
- **認証トークン**: Auth0 による OAuth 2.0 認証
- **トークン暗号化**: アクセストークン・リフレッシュトークンをローカル暗号化保存

#### 7.2.3 クラウド同期のセキュリティ

**データ分離**:

- **機密情報の除外**: API キー、パスワードはクラウド送信しない
- **選択的同期**: ユーザーが同期対象を選択可能
- **暗号化設定**: 共有環境変数は E2E 暗号化

**アクセス制御**:

- **RBAC**: ロールベースのアクセス制御
- **監査ログ**: すべてのアクセスを記録
- **セッション管理**: 不正アクセス検知と自動ログアウト

**データ保護**:

- **転送時暗号化**: HTTPS/TLS 1.3
- **保存時暗号化**: SaaS 側で AES-256 暗号化
- **データ削除**: ユーザー要求時の完全削除保証

### 7.3 コードセキュリティ

- Content Security Policy (CSP) 設定
- 定期的な依存関係の脆弱性スキャン
- コード署名（Windows/macOS）
- 公証（macOS Notarization）
- セキュリティヘッダーの適切な設定

---

## 8. 開発フロー

### 8.1 開発環境セットアップ

既存の Tumiki プロジェクトで開発を開始：

```bash
# リポジトリが既にクローン済みの場合
cd tumiki-main

# 依存関係インストール（デスクトップアプリ含む）
pnpm install

# デスクトップアプリ開発サーバー起動
pnpm --filter @tumiki/desktop dev

# 全アプリケーションの開発サーバー起動
pnpm dev

# 型チェック
pnpm typecheck

# デスクトップアプリのみの型チェック
pnpm --filter @tumiki/desktop typecheck

# リンター実行
pnpm lint

# テスト実行
pnpm test
```

### 8.2 ビルド

```bash
# 全アプリケーションのビルド
pnpm build

# デスクトップアプリのみビルド
pnpm --filter @tumiki/desktop build

# 特定プラットフォーム向けビルド
pnpm --filter @tumiki/desktop build:mac
pnpm --filter @tumiki/desktop build:win
pnpm --filter @tumiki/desktop build:linux

# すべてのプラットフォーム向けビルド
pnpm --filter @tumiki/desktop build:all
```

### 8.3 リリース

```bash
# デスクトップアプリのバージョンアップ
cd apps/desktop
pnpm version patch
pnpm version minor
pnpm version major

# リリースビルド
pnpm --filter @tumiki/desktop release

# または scripts/ ディレクトリのスクリプトを使用
bash scripts/release-desktop.sh
```

### 8.4 コーディング規約

#### 8.4.1 TypeScript

- 全ての関数はアロー関数で定義
- `type` のみ使用（`interface` 使用禁止）
- strict モード有効化

#### 8.4.2 React

- 関数コンポーネントのみ
- Props の型定義必須
- カスタムフックの活用

#### 8.4.3 スタイリング

- Tailwind CSS 使用
- 条件分岐付き className は `clsx` 使用
- カスタムスタイルは最小限

#### 8.4.4 テスト

- Vitest 使用
- `test` 関数で記述（`it` 使用禁止）
- 日本語でテスト名を記載
- 関数ごとに `describe` ブロック
- カバレッジ 100% 目標

---

## 9. デプロイメント

### 9.1 配布方法

#### 9.1.1 macOS

- `.dmg` ファイル
- Apple Developer ID で署名
- 公証（Notarization）
- 自動更新対応

#### 9.1.2 Windows

- `.exe` インストーラー
- Code Signing 証明書で署名
- Windows Defender SmartScreen 対応
- 自動更新対応

#### 9.1.3 Linux

- `.AppImage` / `.deb` / `.rpm`
- 各ディストリビューションのリポジトリ登録

### 9.2 自動更新

- electron-updater 使用
- GitHub Releases を更新サーバーとして利用
- バックグラウンドダウンロード
- 更新通知とユーザー承認

### 9.3 CI/CD パイプライン

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  release:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm build
      - run: pnpm release
      - uses: actions/upload-artifact@v4
```

---

## 10. 拡張性と将来の機能

### 10.1 プラグインシステム

- サードパーティ製 MCP サーバーのマーケットプレイス
- カスタム UI テーマ
- 拡張機能 API

### 10.2 クラウド同期（オプション）

- 設定の暗号化同期
- チーム内での設定共有
- エンドツーエンド暗号化

### 10.3 高度な機能

- MCP サーバー間の連携設定
- ワークフロー自動化
- カスタムダッシュボード
- AI アシスタント統合

---

## 11. 技術的課題と解決策

### 11.1 パフォーマンス

#### 課題

- 多数の MCP サーバーを同時起動した場合のリソース消費

#### 解決策

- ワーカースレッドでの分離実行
- メモリ使用量の監視とアラート
- サーバーのオンデマンド起動

### 11.2 クロスプラットフォーム対応

#### 課題

- プラットフォーム固有のファイルパスや設定の違い

#### 解決策

- プラットフォーム抽象化レイヤー
- 統一された設定インターフェース
- 自動検出とフォールバック

### 11.3 セキュリティ

#### 課題

- ローカルに保存される機密情報の保護

#### 解決策

- OS ネイティブの暗号化機能利用
- メモリ内でのみ復号化
- セキュアな削除処理

---

## 12. 開発スケジュール（参考）

### Phase 1: MVP (4-6週間)

- [x] プロジェクトセットアップ
- [ ] 基本的な Electron アプリケーション
- [ ] MCP サーバー起動/停止機能
- [ ] シンプルな UI（サーバーリスト）
- [ ] SQLite データベース統合

### Phase 2: コア機能 (4-6週間)

- [ ] ログビューア
- [ ] AI ツール統合（Claude Desktop）
- [ ] システムトレイ機能
- [ ] 設定管理

### Phase 3: 高度な機能 (4-6週間)

- [ ] メトリクス収集・表示
- [ ] プロファイル管理
- [ ] 複数 AI ツール統合
- [ ] 自動更新機能

### Phase 4: リリース準備 (2-4週間)

- [ ] コード署名・公証
- [ ] ドキュメント整備
- [ ] ベータテスト
- [ ] 本番リリース

---

## 13. 参考資料

### 13.1 ドキュメント

- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [MCP Specification](https://github.com/modelcontextprotocol/specification)
- [Vite Electron Guide](https://vitejs.dev/guide/)

### 13.2 関連プロジェクト

- [mcp-router](https://github.com/mcp-router/mcp-router)
- [electron-vite](https://github.com/alex8088/electron-vite)
- [electron-builder](https://www.electron.build/)

### 13.3 コミュニティ

- Tumiki Discord サーバー
- MCP Developers コミュニティ
- Electron Discord

---

## 14. ライセンス

**MIT License** または **Sustainable Use License**（検討中）

---

## 付録

### A. 用語集

| 用語  | 説明                                                        |
| ----- | ----------------------------------------------------------- |
| MCP   | Model Context Protocol - AI とツールを接続するプロトコル    |
| SSE   | Server-Sent Events - サーバーからクライアントへの一方向通信 |
| IPC   | Inter-Process Communication - プロセス間通信                |
| stdio | Standard Input/Output - 標準入出力                          |
| CSP   | Content Security Policy - コンテンツセキュリティポリシー    |

### B. FAQ

**Q: Web 版 Tumiki との違いは？**
A: デスクトップ版はすべてのデータをローカルに保存し、インターネット接続なしでも動作します。プライバシーとオフライン利用を重視しています。

**Q: Web 版と設定を共有できますか？**
A: 将来的にはオプション機能として暗号化された設定同期を提供予定です。

**Q: どのプラットフォームをサポートしますか？**
A: Windows 10+、macOS 11+、主要な Linux ディストリビューションをサポート予定です。

---

**最終更新**: 2025-10-24
**バージョン**: 1.0.0
**作成者**: Tumiki Development Team
