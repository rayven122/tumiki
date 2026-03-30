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

| 分類               | 保存先                  | 説明                                |
| ------------------ | ----------------------- | ----------------------------------- |
| **仮想サーバー**   | SQLite (McpServer)      | 統合サーバーの定義                  |
| **接続設定**       | SQLite (McpConnection)  | 外部MCP接続情報・認証設定（平文）   |
| **ツール権限**     | SQLite (McpTool)        | ツール許可/禁止・名前カスタマイズ   |
| **監査ログ**       | SQLite (AuditLog)       | ツール呼び出し履歴（7日自動削除）   |
| **カタログ**       | SQLite (McpCatalog)     | プリセットMCPサーバーのテンプレート |
| **アプリ設定**     | Electron Store          | ウィンドウサイズ等のアプリ設定      |

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
  startProxyServer()
} else {
  // 通常のElectronアプリ起動
  createWindow()
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

### 5.1 テーブル一覧

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

┌──────────────┐
│  AuthToken   │  ※クラウド連携用（MVPでは不使用）
└──────────────┘
```

- **McpServer**: Tumikiが公開する仮想MCPサーバーの定義（複数のMcpConnectionを束ねる）
- **McpConnection**: 外部MCPサーバーへの接続設定（認証情報・ツール権限等）
- **McpTool**: 接続が提供するツールの定義・権限管理・名前カスタマイズ
- **McpCatalog**: プリセットMCPサーバーのテンプレート（接続作成時にコピー）
- **AuditLog**: ツール呼び出しの監査ログ（7日自動削除）
- **AuthToken**: クラウド連携用の認証トークン（MVPでは不使用）

### 5.2 McpServer（仮想・統合サーバー）

1つ以上のMcpConnectionを束ねて、1つのMCPサーバーとしてAIツールに公開する。

| カラム       | 型           | 説明                     |
| ------------ | ------------ | ------------------------ |
| id           | Int (auto)   | 主キー                   |
| name         | String       | サーバー表示名           |
| slug         | String (unique) | URL識別子             |
| description  | String       | サーバー説明             |
| serverStatus | ServerStatus | RUNNING / STOPPED / ERROR / PENDING |
| isEnabled    | Boolean      | 有効/無効トグル          |
| displayOrder | Int          | 一覧画面での表示順序     |

### 5.3 McpConnection（接続設定）

個別のMCPサーバーへの接続設定。カタログからコピーして作成するか、手動で設定する。

| カラム        | 型            | 説明                                                      |
| ------------- | ------------- | --------------------------------------------------------- |
| id            | Int (auto)    | 主キー                                                    |
| name          | String        | 接続表示名                                                |
| slug          | String        | URL識別子（serverId内でユニーク）                         |
| transportType | TransportType | STDIO / SSE / STREAMABLE_HTTP                             |
| command       | String?       | STDIO用コマンド（例: `"npx"`, `"uvx"`）                   |
| args          | String (JSON) | STDIO用引数                                               |
| url           | String?       | SSE/Streamable HTTP用URL                                  |
| credentials   | String (JSON) | 接続設定値（STDIO: 環境変数 / SSE・HTTP: HTTPヘッダー）   |
| authType      | AuthType      | NONE / BEARER / API_KEY / OAUTH                           |
| isEnabled     | Boolean       | 有効/無効トグル                                           |
| displayOrder  | Int           | 統合サーバー内での表示順序                                |
| serverId      | Int (FK)      | 所属するMcpServer                                         |
| catalogId     | Int? (FK)     | カタログ参照（カタログから登録した場合）                   |

### 5.4 McpTool（ツール権限管理）

接続が提供するツールの定義・権限管理。ツール名や説明のカスタマイズにも対応。

| カラム            | 型           | 説明                                     |
| ----------------- | ------------ | ---------------------------------------- |
| id                | Int (auto)   | 主キー                                   |
| name              | String       | ツール名（大元のMCPから取得、ルーティング用） |
| description       | String       | ツール説明（大元のMCPから取得）           |
| inputSchema       | String (JSON)| 入力スキーマ（JSON Schema）              |
| customName        | String?      | カスタム表示名（nullなら元のnameを使用）  |
| customDescription | String?      | カスタム説明（nullなら元のdescriptionを使用） |
| isAllowed         | Boolean      | ツールの使用を許可するか                 |
| connectionId      | Int (FK)     | 対象MCP接続                              |

### 5.5 McpCatalog（プリセットテンプレート）

MCPサーバーのプリセット情報。接続作成時にカタログからフィールドをコピーする。

| カラム         | 型            | 説明                                                       |
| -------------- | ------------- | ---------------------------------------------------------- |
| id             | Int (auto)    | 主キー                                                     |
| name           | String (unique) | カタログ表示名                                           |
| description    | String        | カタログ説明                                               |
| iconPath       | String?       | アイコンパス                                               |
| transportType  | TransportType | STDIO / SSE / STREAMABLE_HTTP                              |
| command        | String?       | STDIO用コマンド                                            |
| args           | String (JSON) | STDIO用引数                                                |
| url            | String?       | SSE/Streamable HTTP用URL                                   |
| credentialKeys | String (JSON) | 必要な設定キー名（STDIO: 環境変数キー / HTTP: ヘッダー名）|
| authType       | AuthType      | NONE / BEARER / API_KEY / OAUTH                            |
| isOfficial     | Boolean       | 公式カタログフラグ                                         |

### 5.6 AuditLog（監査ログ）

MCPツール呼び出しの記録。7日以上のレコードは自動削除対象。

| カラム         | 型            | 説明                             |
| -------------- | ------------- | -------------------------------- |
| id             | Int (auto)    | 主キー                           |
| toolName       | String        | 実行ツール名                     |
| method         | String        | MCPメソッド（`"tools/call"` 等） |
| transportType  | TransportType | リクエスト時のトランスポートタイプ |
| durationMs     | Int           | 実行時間（ms）                   |
| inputBytes     | Int           | 入力データサイズ（バイト）       |
| outputBytes    | Int           | 出力データサイズ（バイト）       |
| isSuccess      | Boolean       | 成功/失敗フラグ                  |
| errorCode      | Int?          | MCPエラーコード（エラー時）      |
| errorSummary   | String?       | エラーメッセージ要約             |
| serverId       | Int (FK)      | 対象MCPサーバー                  |
| connectionName | String?       | 対象MCP接続名（ログ追跡用）      |

### 5.7 Enum定義

| Enum名        | 値                                 |
| ------------- | ---------------------------------- |
| TransportType | STDIO / SSE / STREAMABLE_HTTP     |
| AuthType      | NONE / BEARER / API_KEY / OAUTH   |
| ServerStatus  | RUNNING / STOPPED / ERROR / PENDING |

---

## 6. 画面設計

UI設計は [サンプルLP](./docs/lp-design-reference.jpg) を参考に行う。詳細なワイヤーフレームはUIモック（DEV-1459）で作成する。

**LPセクションとDesktop画面の対応:**

| LPセクション                           | 対応するDesktop画面            |
| -------------------------------------- | ------------------------------ |
| 「通信の管理・監視」                   | ダッシュボード（将来フェーズ） |
| 「ツールを自在にコントロール」         | MCP一覧画面                    |
| 「接続先ツール」                       | MCPカタログ一覧                |
| 「AIツールの利用を、一画面で把握する」 | MCP詳細 / 監査ログ             |

---

## 7. IPC通信設計

### 7.1 チャネル一覧

| チャネル                   | 方向            | 説明                     |
| -------------------------- | --------------- | ------------------------ |
| **MCPサーバー管理**        |                 |                          |
| `mcp:list-servers`         | Renderer → Main | サーバー一覧取得         |
| `mcp:create`               | Renderer → Main | サーバー登録             |
| `mcp:update`               | Renderer → Main | サーバー更新             |
| `mcp:delete`               | Renderer → Main | サーバー削除             |
| `mcp:start`                | Renderer → Main | サーバー起動             |
| `mcp:stop`                 | Renderer → Main | サーバー停止             |
| `mcp:status`               | Main → Renderer | 状態変更通知             |
| **MCP接続管理**            |                 |                          |
| `connection:list`          | Renderer → Main | 接続一覧取得             |
| `connection:create`        | Renderer → Main | 接続追加                 |
| `connection:update`        | Renderer → Main | 接続更新                 |
| `connection:delete`        | Renderer → Main | 接続削除                 |
| `connection:toggle`        | Renderer → Main | 有効/無効切り替え        |
| **ツール権限管理**         |                 |                          |
| `tool:list`                | Renderer → Main | ツール一覧取得           |
| `tool:update-permission`   | Renderer → Main | ツール許可/禁止変更      |
| `tool:update-custom`       | Renderer → Main | ツール名/説明カスタマイズ |
| **カタログ**               |                 |                          |
| `catalog:list`             | Renderer → Main | カタログ一覧取得         |
| `catalog:create`           | Renderer → Main | カタログ追加             |
| `catalog:update`           | Renderer → Main | カタログ更新             |
| `catalog:delete`           | Renderer → Main | カタログ削除             |
| **監査ログ**               |                 |                          |
| `audit:list-by-server`     | Renderer → Main | サーバー別ログ取得       |
| `audit:stats`              | Renderer → Main | ログ統計取得             |

---

## 8. ディレクトリ構造

```
apps/desktop/
├── src/
│   ├── main/                  # Electronメインプロセス
│   │   ├── index.ts           # エントリーポイント（--mcp-proxy分岐）
│   │   ├── window.ts          # ウィンドウ管理
│   │   ├── db/                # ローカルDB（Prisma SQLite）
│   │   ├── ipc/               # IPCハンドラー
│   │   │   ├── mcp.ts         # MCP管理IPC
│   │   │   ├── catalog.ts     # カタログIPC
│   │   │   └── audit.ts       # 監査ログIPC
│   │   ├── mcp/               # MCP Proxy Manager
│   │   │   ├── proxy-server.ts    # Inbound: stdio MCPサーバー
│   │   │   ├── upstream-client.ts # Outbound: MCPサーバー接続
│   │   │   ├── upstream-pool.ts   # Clientライフサイクル管理
│   │   │   ├── tool-aggregator.ts # ツール集約・ルーティング
│   │   │   ├── audit-recorder.ts  # 監査ログ記録
│   │   │   └── types.ts          # MCP Proxy関連型定義
│   │   └── utils/             # ロガー等
│   ├── preload/               # Preloadスクリプト
│   │   └── index.ts           # ContextBridge設定
│   ├── renderer/              # Reactレンダラー
│   │   ├── App.tsx            # ルート + ルーティング
│   │   ├── pages/
│   │   │   ├── McpServers.tsx # MCP一覧（ホーム）
│   │   │   └── Settings.tsx   # 設定
│   │   ├── _components/       # UIコンポーネント
│   │   ├── store/             # Jotai atoms
│   │   ├── styles/            # Tailwind CSS
│   │   └── utils/             # ユーティリティ
│   ├── shared/                # メイン・レンダラー共通型
│   └── types/                 # プロセス横断型定義
├── prisma/
│   └── schema.prisma          # SQLiteスキーマ
├── electron-builder.yml       # パッケージング設定
├── electron.vite.config.ts    # ビルド設定
└── package.json
```
