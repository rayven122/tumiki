# Tumiki Desktop 設計書（MVP）

> **注**: 本ドキュメントはDesktop単体で完結するMVP版の設計です。
> LPに記載のクラウド連携・チーム管理・権限制御等は将来フェーズで対応します。

## 1. プロダクト概要

### 1.1 ビジョン

**ローカルで完結するMCPサーバー管理ツール**

Tumiki Desktopは、個人開発者がMCP（Model Context Protocol）サーバーを**登録・起動・監視**するためのデスクトップアプリケーション。クラウド接続不要で、すべてのデータをローカルに保持する。

### 1.2 MVPで実現すること

| 機能         | 説明                                                  |
| ------------ | ----------------------------------------------------- |
| **MCP管理**  | MCPサーバーの登録・起動・停止・削除をGUIで操作        |
| **カタログ** | プリセットからワンクリックでMCPサーバーを追加         |
| **監査ログ** | ツール呼び出しの記録・閲覧（ローカルSQLite）          |
| **Proxy**    | AIツール（Claude Desktop等）からのMCP通信を中継・記録 |

### 1.3 MVPスコープ外（将来フェーズ）

- クラウド同期・チーム共有
- Keycloak OAuth認証
- 権限管理（RBAC）
- ログのクラウド集積・長期保存
- リアルタイムダッシュボード（グラフ・メトリクス）

---

## 2. アーキテクチャ

### 2.1 全体構成（ローカル完結）

```
┌─────────────────────────────────────────────────────────┐
│                  Tumiki Desktop App                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────┐         ┌───────────────────────┐  │
│  │  Renderer        │  IPC    │  Main Process         │  │
│  │  (React 19 + TS) │◄───────►│  (Electron 40)        │  │
│  └─────────────────┘         └───────────────────────┘  │
│         │                            │                    │
│         ▼                            ▼                    │
│  ┌─────────────────┐         ┌───────────────────────┐  │
│  │  UI Components   │         │  MCP Proxy Manager    │  │
│  │  (Tailwind CSS)  │         │  (本設計書 §3)        │  │
│  └─────────────────┘         └───────────────────────┘  │
│                                      │                    │
│                               ┌──────┴──────┐            │
│                               ▼             ▼            │
│                        ┌───────────┐ ┌───────────┐       │
│                        │  SQLite   │ │  Log      │       │
│                        │  (Prisma) │ │  Collector│       │
│                        └───────────┘ └───────────┘       │
└──────────────────────────────┬──────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Claude Desktop  │  │  Cursor / Cline │  │  Windsurf       │
│  (AIツール)      │  │  (AIツール)      │  │  (AIツール)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 2.2 プロセス分離

| プロセス             | 責務                                             |
| -------------------- | ------------------------------------------------ |
| **Main Process**     | MCP Proxyライフサイクル管理、SQLite操作、IPC通信 |
| **Renderer Process** | React UI、ユーザーインタラクション、状態表示     |
| **Preload Script**   | Context Bridge、安全なIPC通信ブリッジ            |

### 2.3 データ方針

すべてのデータはローカルに保持する。クラウドへの送信は行わない。
機密情報（APIキー・トークン等）は **平文** でSQLiteに保存する（Claude Desktop等と同等の方式）。
DBファイルのパーミッションを `0600`（ユーザーのみ読み書き）に設定し、OS標準のディスク暗号化（FileVault / BitLocker）に委ねる。

| 分類             | 保存先                 | 説明                                |
| ---------------- | ---------------------- | ----------------------------------- |
| **仮想サーバー** | SQLite (McpServer)     | 統合サーバーの定義                  |
| **接続設定**     | SQLite (McpConnection) | 外部MCP接続情報・認証設定（平文）   |
| **ツール権限**   | SQLite (McpTool)       | ツール許可/禁止・名前カスタマイズ   |
| **監査ログ**     | SQLite (AuditLog)      | ツール呼び出し履歴（7日自動削除）   |
| **カタログ**     | SQLite (McpCatalog)    | プリセットMCPサーバーのテンプレート |
| **アプリ設定**   | Electron Store         | ウィンドウサイズ等のアプリ設定      |

---

## 3. MCP Proxy Manager 設計

### 3.1 コンセプト

Tumiki Desktopは **MCPゲートウェイ** として動作する。
AIツールとMCPサーバーの間に立ち、通信の中継・集約・記録を行う。

```
                        ┌─────────────────────────────────┐
                        │      Tumiki Desktop              │
                        │      (MCP Proxy Manager)         │
                        │                                  │
  ┌───────────┐  stdio  │  ┌──────────┐    ┌───────────┐  │  stdio    ┌─────────────┐
  │ Claude    │────────►│  │          │    │ Upstream   │──│─────────►│ Serena MCP  │
  │ Desktop   │◄────────│  │  Proxy   │    │ Client    │  │          │ (子プロセス) │
  └───────────┘         │  │  Server  │───►│ Pool      │  │          └─────────────┘
                        │  │          │    │           │  │
  ┌───────────┐  stdio  │  │ (stdio   │    │           │  │  sse      ┌─────────────┐
  │ Cursor    │────────►│  │  MCP     │    │           │──│─────────►│ Remote MCP  │
  │           │◄────────│  │  Server) │    │           │  │          │ (SSEサーバー)│
  └───────────┘         │  │          │    │           │  │          └─────────────┘
                        │  └──────────┘    └───────────┘  │
  ┌───────────┐  stdio  │        │               │        │  http     ┌─────────────┐
  │ Windsurf  │────────►│        ▼               │        │─────────►│ Remote MCP  │
  │           │◄────────│  ┌──────────┐          │        │          │ (HTTPサーバー)│
  └───────────┘         │  │ Audit    │          │        │          └─────────────┘
                        │  │ Logger   │          │        │
                        │  └──────────┘          │        │
                        └────────────────────────┘────────┘

  ◄─── Inbound (stdio) ───►  ◄── Outbound (stdio/sse/http) ──►
```

### 3.2 Inbound: AIツール → Tumiki Desktop

AIツール（Claude Desktop, Cursor等）は **stdio** でTumiki Desktopに接続する。

**AIツール側の設定例（claude_desktop_config.json）:**

```json
{
  "mcpServers": {
    "tumiki": {
      "command": "/path/to/tumiki-desktop",
      "args": ["--mcp-proxy"]
    }
  }
}
```

**動作:**

1. AIツールがTumiki Desktopのバイナリをstdioで起動
2. Tumiki DesktopのProxy Serverがstdin/stdoutでJSON-RPCを受け取る
3. 登録済みの全MCPサーバーのツールを集約して`tools/list`で返す
4. `tools/call`で指定されたツールを対応するUpstream MCPサーバーに転送

**ツール名の集約:**

複数のMCPサーバーが同名ツールを持つ場合、プレフィックスで区別する。

```
tools/list レスポンス:
  - serena__read_file      (Serena MCP)
  - serena__write_file     (Serena MCP)
  - github__list_repos     (GitHub MCP)
  - github__create_issue   (GitHub MCP)
  - postgres__query        (PostgreSQL MCP)
```

### 3.3 Outbound: Tumiki Desktop → MCPサーバー

Tumiki Desktopは **Upstream Client** として各MCPサーバーに接続する。
トランスポートはMCPサーバーの設定に応じて切り替える。

| トランスポート      | 接続先              | 実装方式                               |
| ------------------- | ------------------- | -------------------------------------- |
| **stdio**           | ローカルMCPサーバー | 子プロセス起動 (`child_process.spawn`) |
| **SSE**             | リモートMCPサーバー | `SSEClientTransport`                   |
| **Streamable HTTP** | リモートMCPサーバー | `StreamableHTTPClientTransport`        |

### 3.4 コンポーネント構成

```
src/main/mcp/
├── proxy-server.ts        # Inbound: stdio MCPサーバー（AIツールからの受け口）
├── upstream-client.ts      # Outbound: 個別MCPサーバーへの接続クライアント
├── upstream-pool.ts        # Upstream Clientのライフサイクル管理
├── tool-aggregator.ts      # 複数MCPサーバーのツールを集約・ルーティング
├── audit-recorder.ts       # ツール呼び出しの監査ログ記録
└── types.ts                # MCP Proxy関連の型定義
```

### 3.5 proxy-server.ts — Inbound stdio MCPサーバー

AIツールからの接続を受け付けるstdio MCPサーバー。

**責務:**

- stdin/stdoutでJSON-RPC 2.0メッセージを送受信
- `initialize` → 対応プロトコルバージョンを返す
- `tools/list` → UpstreamPoolから集約したツール一覧を返す
- `tools/call` → ToolAggregatorで対象サーバーを特定し転送

**起動方法:**

Tumiki Desktopが `--mcp-proxy` 引数で起動された場合、GUIなしでProxy Serverのみ起動する。

```typescript
// エントリーポイントでの分岐
if (process.argv.includes("--mcp-proxy")) {
  // GUIなし。stdio Proxy Serverのみ起動
  startProxyServer();
} else {
  // 通常のElectronアプリ起動
  createWindow();
}
```

### 3.6 upstream-client.ts — Outbound MCPクライアント

個別のMCPサーバーに接続するクライアント。

**責務:**

- トランスポートに応じた接続確立
- `tools/list` でツール一覧を取得・キャッシュ
- `tools/call` でツール実行を転送
- 接続切断・エラーハンドリング

**トランスポート切り替え:**

```
McpConnection.transportType に応じて:
  STDIO            → StdioClientTransport(command, args, credentials as env)
  SSE              → SSEClientTransport(url, credentials as headers)
  STREAMABLE_HTTP  → StreamableHTTPClientTransport(url, credentials as headers)
```

### 3.7 upstream-pool.ts — クライアントプール

Upstream Clientのライフサイクルを管理する。

**責務:**

- McpServer + McpConnection（isEnabled=true）を読み込み、Upstream Clientを生成
- サーバーの起動/停止/再起動
- 接続状態の管理（serverStatus の更新）
- アプリ起動時の自動接続

**状態遷移:**

```
stopped ──► pending ──► running ◄──► error
   ▲                       │
   └───── stopped ◄────────┘
```

### 3.8 tool-aggregator.ts — ツール集約・ルーティング

**責務:**

- 全Upstream Clientからツール一覧を収集
- ツール名にプレフィックスを付与して一意化（`{serverName}__{toolName}`）
- `tools/call` 時にプレフィックスから対象Upstream Clientを特定
- プレフィックスを除去して元のツール名でUpstreamに転送

**ルーティングフロー:**

```
AIツール: tools/call { name: "serena__read_file", arguments: {...} }
                │
                ▼
ToolAggregator: プレフィックス "serena" → Serena MCP Client を特定
                ツール名を "read_file" に復元
                │
                ▼
Upstream Client: tools/call { name: "read_file", arguments: {...} }
                │
                ▼
Serena MCP Server: 実行結果を返却
```

### 3.9 audit-recorder.ts — 監査ログ記録

**責務:**

- `tools/call` の前後でAuditLogテーブルに記録
- 実行時間（durationMs）を計測
- 入出力サイズ（inputBytes/outputBytes）を計算
- 成功/失敗フラグとエラー情報を保存

**記録タイミング:**

```
tools/call リクエスト受信
  │
  ├─ startTime = Date.now()
  │
  ├─ Upstream Client に転送・実行
  │
  ├─ durationMs = Date.now() - startTime
  │
  └─ AuditLog に INSERT
```

### 3.10 Proxy Serverのライフサイクル

```
┌────────────────────────────────────────────────────────┐
│ アプリ起動                                              │
│   │                                                     │
│   ├─ SQLite から McpServer + McpConnection を読み込み  │
│   │                                                     │
│   ├─ 各 McpConnection の Upstream Client を生成・接続   │
│   │   ├─ STDIO: 子プロセス起動                          │
│   │   ├─ SSE: SSE接続確立                               │
│   │   └─ STREAMABLE_HTTP: HTTPクライアント初期化        │
│   │                                                     │
│   ├─ 各 Upstream Client から tools/list を取得          │
│   │                                                     │
│   └─ ToolAggregator でツール一覧を集約                  │
│                                                         │
│ AIツールが --mcp-proxy で起動                           │
│   │                                                     │
│   ├─ stdin から JSON-RPC リクエストを読み取り           │
│   │                                                     │
│   ├─ tools/list → 集約済みツール一覧を返却              │
│   │                                                     │
│   ├─ tools/call → ルーティング → 転送 → ログ記録       │
│   │                                                     │
│   └─ stdout に JSON-RPC レスポンスを書き込み            │
│                                                         │
│ アプリ終了                                              │
│   │                                                     │
│   ├─ 全 Upstream Client を切断                          │
│   │   ├─ stdio: 子プロセスを終了                        │
│   │   ├─ sse: SSE接続を閉じる                           │
│   │   └─ http: （接続なし）                              │
│   │                                                     │
│   └─ SQLite 接続を閉じる                                │
└────────────────────────────────────────────────────────┘
```

### 3.11 GUIからのMCP操作

Renderer（GUI）からはIPC経由でUpstream Poolを操作する。

```
┌────────────────┐  IPC   ┌──────────────┐       ┌──────────────┐
│ Renderer (GUI) │───────►│ IPC Handler  │──────►│ Upstream Pool│
│                │◄───────│ (mcp:*)      │◄──────│              │
└────────────────┘        └──────────────┘       └──────────────┘
```

| IPC チャネル       | 操作                                         |
| ------------------ | -------------------------------------------- |
| `mcp:list-servers` | DBから一覧取得 + PoolからRuntime状態をマージ |
| `mcp:create`       | DBに登録 + Poolに追加・起動                  |
| `mcp:update`       | DB更新 + Poolで再接続                        |
| `mcp:delete`       | Poolから切断 + DBから削除                    |
| `mcp:start`        | Poolで接続開始                               |
| `mcp:stop`         | Poolで切断                                   |
| `mcp:status`       | Main→Renderer: 状態変更を通知                |

### 3.12 --mcp-proxy モードの考慮事項

| 項目                 | 説明                                                           |
| -------------------- | -------------------------------------------------------------- |
| **GUI併用**          | GUIアプリが起動中でも `--mcp-proxy` で別プロセスとして起動可能 |
| **DB共有**           | SQLiteは読み取り専用で参照（GUIプロセスが書き込み担当）        |
| **プロセス独立**     | AIツールごとに独立したProxy Serverプロセスが起動される         |
| **ツール一覧の更新** | GUIでMCPサーバーを追加/削除した場合、Proxy再起動で反映         |
| **ログ出力**         | stdout はMCPプロトコル専用。デバッグログは stderr に出力       |

---

## 4. 技術スタック

| レイヤー                   | 技術                      | バージョン |
| -------------------------- | ------------------------- | ---------- |
| デスクトップフレームワーク | Electron                  | v40.x      |
| ビルドツール               | electron-vite             | v4.x       |
| UIフレームワーク           | React                     | v19        |
| 言語                       | TypeScript                | v5.x       |
| 状態管理                   | Jotai                     | v2.x       |
| スタイリング               | Tailwind CSS              | v4.x       |
| ルーティング               | react-router-dom          | v7.x       |
| ローカルDB                 | Prisma + SQLite           | v6.x       |
| MCP SDK                    | @modelcontextprotocol/sdk | ^1.26.0    |
| パッケージング             | electron-builder          | v26.x      |

---

## 5. データモデル（SQLite）

ER図・カラム定義の詳細は [prisma/README.md](../prisma/README.md)（prisma-markdownで自動生成）を参照。

### 5.1 テーブル概要

| テーブル          | 説明                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------- |
| **McpServer**     | Tumikiが公開する仮想MCPサーバーの定義。複数のMcpConnectionを束ねて1つのサーバーとして公開する |
| **McpConnection** | 外部MCPサーバーへの接続設定。認証情報（credentials）やツール権限を管理する                    |
| **McpTool**       | 接続が提供するツールの定義・権限管理。ツール名や説明のカスタマイズにも対応                    |
| **McpCatalog**    | プリセットMCPサーバーのテンプレート。接続作成時にフィールドをコピーして使用                   |
| **AuditLog**      | ツール呼び出しの監査ログ。7日以上のレコードは自動削除対象                                     |
| **AuthToken**     | クラウド連携用の認証トークン（MVPでは不使用）                                                 |

### 5.2 リレーション

```
                                ┌──────────────┐
                                │  McpCatalog  │
                                │ (テンプレート)│
                                └──────┬───────┘
                                       │ 0..1
┌──────────────┐  1:N  ┌──────────────┐│     ┌──────────────┐
│  McpServer   │──────►│McpConnection │◄┘ 1:N│  McpTool     │
│ (仮想サーバー)│       │ (接続設定)   │──────►│ (ツール権限) │
└──────┬───────┘       └──────────────┘      └──────────────┘
       │ 1:N
┌──────┴───────┐
│  AuditLog    │
│ (監査ログ)   │
└──────────────┘
```

---

## 6. 画面設計

### 6.1 画面一覧

| カテゴリ | パス                      | 画面               | 説明                                 |
| -------- | ------------------------- | ------------------ | ------------------------------------ |
| **一般** | `/`                       | ダッシュボード     | ツール統計・コネクタ分析・稼働状況   |
|          | `/tools`                  | マイツール         | 承認済みツール一覧                   |
|          | `/tools/catalog`          | ツールカタログ     | 承認済み・未承認ツール一覧           |
|          | `/tools/:toolId`          | ツール詳細         | 権限・オペレーション・接続方法       |
|          | `/tools/connector/auto`   | AI自動作成         | チャット形式でコネクタ作成           |
|          | `/tools/connector/manual` | マニュアル作成     | フォーム形式でコネクタ作成           |
|          | `/history`                | 操作履歴一覧       | 検索・フィルタ・統計                 |
|          | `/history/:historyId`     | 操作履歴詳細       | 実行内容・ログ・結果                 |
|          | `/requests`               | 権限申請一覧       | タブ切替（全て・審査中・承認・却下） |
|          | `/requests/new`           | 権限申請フォーム   | ツール選択・理由記入                 |
|          | `/requests/:requestId`    | 申請詳細           | 審査状況・承認者コメント             |
|          | `/settings`               | 設定               | 通知設定・プロフィール               |
|          | `/notifications`          | 通知センター       | 承認・申請・ツール・メンテ・エラー   |
|          | `/login`                  | ログイン           | Entra ID・SSO                        |
| **管理** | `/admin`                  | 管理ダッシュボード | サービス統計・アクティブクライアント |
|          | `/admin/history`          | 全操作履歴         | 全ユーザーの操作履歴                 |
|          | `/admin/users`            | ユーザー管理       | ロール別フィルタ・ステータス変更     |
|          | `/admin/roles`            | ロール管理         | 権限設定                             |
|          | `/admin/tools`            | ツール管理         | ツール承認・拒否                     |
|          | `/admin/approvals`        | 承認管理           | 権限申請の承認・却下                 |

### 6.2 レイアウト構成

```
┌──────────────────┬─────────────────────────────────────────┐
│ RAYVEN Logo      │ メインコンテンツ                         │
├──────────────────┤                                         │
│ [ホーム]          │                                         │
│ [コネクト]        │  ページ内容（Outlet）                   │
│ [操作履歴]        │                                         │
│ [権限申請]        │                                         │
│ [通知] (2)       │                                         │
│ ─────────────    │                                         │
│ [カスタムコネクタ] │                                         │
│  - AI自動作成     │                                         │
│  - マニュアル作成  │                                         │
│ ─────────────    │                                         │
│ [管理]（*）       │                                         │
│ ─────────────    │                                         │
│ [設定]            │                                         │
│ [テーマ切替]🌙    │                                         │
└──────────────────┴─────────────────────────────────────────┘
※ 管理セクションは Admin/Manager ロールのみ表示
```

---

## 7. 通信設計

### 7.1 IPC（Renderer ↔ Main）

| カテゴリ        | チャネル                                               | 説明                          |
| --------------- | ------------------------------------------------------ | ----------------------------- |
| **認証**        | `auth:getToken` / `auth:saveToken` / `auth:clearToken` | トークン管理（暗号化保存）    |
| **MCPサーバー** | `mcp:list-servers` 等                                  | サーバーCRUD・起動/停止       |
| **MCP接続**     | `connection:list` 等                                   | 接続CRUD・有効/無効切替       |
| **ツール権限**  | `tool:list` 等                                         | ツール許可/禁止・カスタマイズ |
| **カタログ**    | `catalog:list` 等                                      | カタログCRUD                  |
| **監査ログ**    | `audit:list-by-server` 等                              | ログ取得・統計                |

### 7.2 tRPC（Renderer ↔ Manager API）

Managerバックエンドとの通信にtRPCを使用。React Queryでキャッシュ・リトライを管理。

| 設定               | 値                               |
| ------------------ | -------------------------------- |
| エンドポイント     | `http://localhost:3000/api/trpc` |
| 認証               | Bearer token（IPC経由で取得）    |
| タイムアウト       | 30秒                             |
| ネットワークモード | offlineFirst                     |

---

## 8. ディレクトリ構造

```
apps/desktop/
├── src/
│   ├── main/                      # Electronメインプロセス
│   │   ├── index.ts               # エントリーポイント（--mcp-proxy分岐）
│   │   ├── window.ts              # BrowserWindow管理
│   │   ├── db/                    # ローカルDB（Prisma SQLite）
│   │   ├── ipc/                   # IPCハンドラー
│   │   │   └── auth.ts            # 認証トークン管理
│   │   ├── mcp/                   # MCP Proxy Manager（§3参照）
│   │   └── utils/                 # ロガー・暗号化
│   ├── preload/                   # Preloadスクリプト（ContextBridge）
│   ├── renderer/                  # Reactレンダラー
│   │   ├── App.tsx                # ルーター定義
│   │   ├── _components/           # 共有コンポーネント（Layout, Sidebar等）
│   │   ├── pages/                 # ページコンポーネント
│   │   │   └── admin/             # 管理画面
│   │   ├── store/                 # Jotai atoms
│   │   ├── constants/             # MCPカタログデータ等
│   │   ├── data/                  # モックデータ
│   │   ├── utils/                 # tRPC・エラーハンドリング
│   │   └── styles/                # CSS変数（ダーク/ライトモード）
│   ├── shared/                    # メイン・レンダラー共通型
│   └── types/                     # 認証・ログ同期型定義
├── prisma/
│   ├── schema.prisma              # SQLiteスキーマ
│   └── README.md                  # ER図（prisma-markdown自動生成）
├── docs/
│   └── DESIGN.md                  # 本設計書
└── package.json
```
