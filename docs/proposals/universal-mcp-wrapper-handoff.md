# Universal MCP Wrapper 引き継ぎ資料

**作成日**: 2026-03-06
**対象リポジトリ**: `tumiki`（本体 monorepo）
**関連設計書**: `universal-mcp-wrapper-design.md`

---

## 1. 概要

### 1.1 目的

単一インスタンスで100+ MCPサーバーを動的に起動・管理し、コストを最小化しながらMCPサポート数を最大化する。

### 1.2 決定事項

| 項目           | 決定内容            | 理由                                                   |
| -------------- | ------------------- | ------------------------------------------------------ |
| ホスティング先 | **Sakura Cloud VM** | Cloud Run（約23,000円/月）より低コスト（約6,000円/月） |
| VMスペック     | 2コア / 4GB メモリ  | 20プロセス同時起動に十分                               |
| VM名           | `tumiki-mcp`        | 192.168.0.20 (内部IP)                                  |
| プロセス管理   | PM2                 | Node.js プロセスの管理に最適                           |

### 1.3 アーキテクチャ方針

**重要**: `tumiki-mcp-http-adapter` はOSSとして汎用性を維持するため、tumiki専用のカタログAPI依存機能は追加しない。

```
【分離アーキテクチャ】

tumiki-mcp-http-adapter (OSS・汎用)
    └── --stdio モードのみ（変更なし）
    └── 任意のMCPサーバーをHTTPエンドポイント化
    └── 他プロジェクトでも利用可能

tumiki 本体 (monorepo)
    └── apps/mcp-wrapper/           ← 新規追加
        └── Universal MCP Wrapper 実装
        └── 動的MCP管理
        └── カタログAPI連携
        └── ProcessPool
```

---

## 2. インフラ構成

### 2.1 Sakura Cloud ネットワーク構成

```
                         インターネット
                               │
                               ▼
                    ┌──────────────────┐
                    │  Cloudflared     │  (トンネル)
                    │  Tunnel          │
                    └────────┬─────────┘
                             │
         ════════════════════╪════════════════════════════
                             │ Sakura Cloud VPC
                             │ (192.168.0.0/24)
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐        ┌─────────┐        ┌─────────┐
    │tumiki-  │        │tumiki-  │        │tumiki-  │
    │sakura-  │        │sakura-  │        │  mcp    │ ← 新規VM
    │  prod   │        │  db     │        │         │
    │.0.10    │        │.0.30    │        │.0.20    │
    └────┬────┘        └─────────┘        └────┬────┘
         │                                      │
         │  ┌─────────────────┐                 │
         │  │  tumiki-proxy   │                 │
         └──│  (mcp-proxy)    │─────────────────┘
            │  内部通信       │    HTTP (VPC内)
            └─────────────────┘    POST /mcp/{serverName}
                    │
                    ▼
            ┌─────────────────┐
            │ Universal MCP   │
            │ Wrapper (PM2)   │
            │ on tumiki-mcp   │
            └─────────────────┘
```

**ポイント**:

- tumiki-proxy は tumiki-sakura-prod (192.168.0.10) 上で稼働
- tumiki-mcp (192.168.0.20) へは VPC 内部通信（HTTP）
- 外部からの通信は Cloudflared トンネル経由

### 2.2 SSH接続設定

ローカルマシンの `~/.ssh/config` に追加済み：

```
Host tumiki-sakura-mcp
    HostName 192.168.0.20
    User ubuntu
    ProxyJump tumiki-sakura-prod
    ForwardAgent yes
```

接続コマンド：

```bash
ssh tumiki-sakura-mcp
```

---

## 3. 動的MCP切り替えの仕組み

### 3.1 基本コンセプト

Universal MCP Wrapper は**単一のHTTPエンドポイント**で複数のMCPサーバーを動的に管理する。

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Universal MCP Wrapper                            │
│                    (tumiki本体で実装)                                │
│                                                                     │
│   【単一エンドポイント】                                             │
│   POST /mcp/{serverName}                                            │
│        │                                                            │
│        ├── /mcp/deepl      → deepl プロセス起動/再利用              │
│        ├── /mcp/github     → github プロセス起動/再利用             │
│        ├── /mcp/brave      → brave-search プロセス起動/再利用       │
│        └── /mcp/notion     → notion プロセス起動/再利用             │
│                                                                     │
│   【プロセスプール】（最大20プロセス）                               │
│   ┌────────┐ ┌────────┐ ┌────────┐                                 │
│   │ deepl  │ │ github │ │ brave  │ ... (オンデマンド起動)          │
│   │ proc   │ │ proc   │ │ proc   │                                 │
│   └────────┘ └────────┘ └────────┘                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 リクエストフロー（初回）

プロセスが存在しない場合、カタログAPIから設定を取得してプロセスを起動する。

```
User → tumiki-proxy → Universal Wrapper
                           │
                           ▼
                    ┌──────────────┐
                    │ /mcp/deepl   │
                    │ リクエスト受信│
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ ProcessPool  │
                    │ "deepl"検索  │──→ なし
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Catalog API  │
                    │ GET /catalog/│
                    │     deepl    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────────────────────────┐
                    │ 設定取得:                         │
                    │ {                                │
                    │   command: "npx",                │
                    │   args: ["-y", "deepl-mcp"],     │
                    │   headerEnvMappings: [{          │
                    │     header: "X-DeepL-API-Key",   │
                    │     env: "DEEPL_API_KEY"         │
                    │   }]                             │
                    │ }                                │
                    └──────┬───────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ プロセス起動  │
                    │ npx -y       │
                    │ deepl-mcp    │
                    │ (stdio)      │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ JSON-RPC     │
                    │ stdin/stdout │
                    │ 通信         │
                    └──────────────┘
```

### 3.3 リクエストフロー（2回目以降）

既存プロセスを再利用するため、高速にレスポンスを返せる。

```
User → tumiki-proxy → Universal Wrapper
                           │
                           ▼
                    ┌──────────────┐
                    │ /mcp/deepl   │
                    │ リクエスト受信│
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ ProcessPool  │
                    │ "deepl"検索  │──→ あり ✓
                    └──────┬───────┘
                           │
                           │ (カタログAPI呼び出し不要)
                           │ (プロセス起動不要)
                           ▼
                    ┌──────────────┐
                    │ 既存プロセス  │
                    │ に転送       │
                    └──────────────┘
                           │
                           ▼
                      レスポンス返却（高速）
```

### 3.4 環境変数の受け渡し

APIキーはHTTPヘッダーで渡し、Universal Wrapperが環境変数に変換する。

```
【tumiki-proxy からのリクエスト】
┌─────────────────────────────────────────┐
│ POST /mcp/deepl                         │
│ Headers:                                │
│   X-DeepL-API-Key: user-api-key-xxx     │
│   Content-Type: application/json        │
│ Body:                                   │
│   {"jsonrpc": "2.0", "method": "..."}   │
└─────────────────────────────────────────┘
                    │
                    ▼
【カタログ設定によるマッピング】
┌─────────────────────────────────────────┐
│ headerEnvMappings: [                    │
│   {                                     │
│     "header": "X-DeepL-API-Key",        │
│     "env": "DEEPL_API_KEY"              │
│   }                                     │
│ ]                                       │
└─────────────────────────────────────────┘
                    │
                    ▼
【プロセス起動時の環境変数】
┌─────────────────────────────────────────┐
│ DEEPL_API_KEY=user-api-key-xxx          │
│ npx -y deepl-mcp                        │
└─────────────────────────────────────────┘
```

### 3.5 プロセス管理（LRU Eviction）

最大20プロセスの制限を管理。プール満杯時は最も古い未使用プロセスを停止。

```
時刻 10:00  deepl 起動 (1/20)
時刻 10:05  github 起動 (2/20)
時刻 10:10  brave 起動 (3/20)
  ...
時刻 11:00  20個目のプロセス起動 (20/20)

時刻 11:05  notion リクエスト到着
            → プール満杯!
            → 最も古い未使用プロセス (deepl) を停止
            → notion 起動 (20/20)

【アイドルタイムアウト（5分）】
5分間リクエストがないプロセスは自動停止
→ メモリ節約
→ 次回リクエスト時に再起動
```

---

## 4. 実装タスク

### 4.1 tumiki 本体（monorepo）の構成

```
tumiki/
├── apps/
│   ├── mcp-proxy/              # 既存（tumiki-proxy）
│   └── mcp-wrapper/            # 新規追加 ← Universal MCP Wrapper
│       ├── src/
│       │   ├── index.ts        # エントリーポイント
│       │   ├── server.ts       # HTTPサーバー
│       │   ├── process-pool.ts # プロセスプール管理
│       │   ├── catalog.ts      # カタログAPI連携
│       │   └── mcp-process.ts  # MCPプロセス管理
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── db/
│       └── prisma/schema/
│           └── mcp-catalog.prisma  # McpCatalogEntry
```

### 4.2 apps/mcp-wrapper の主要コンポーネント

| ファイル           | 役割                                           |
| ------------------ | ---------------------------------------------- |
| `server.ts`        | HTTPサーバー、`/mcp/{serverName}` ルーティング |
| `process-pool.ts`  | プロセスプール管理（LRU、アイドルタイムアウト）|
| `catalog.ts`       | カタログAPIクライアント（キャッシュ付き）      |
| `mcp-process.ts`   | 永続MCPプロセス管理（stdio通信）               |

### 4.3 デプロイ設定

デプロイ設定も同じmonorepo内で管理：

```
tumiki/
└── apps/
    └── mcp-wrapper/
        ├── src/                    # アプリケーションコード
        └── deploy/                 # デプロイ設定
            ├── README.md           # セットアップ手順
            ├── setup.sh            # 初期セットアップスクリプト
            ├── ecosystem.config.js # PM2設定
            └── .env.example        # 環境変数テンプレート
```

---

## 5. カタログAPI

**詳細は `catalog-api-design.md` を参照。**

### 5.1 概要

| 機能 | 実装場所 | 方式 |
|------|---------|------|
| カタログCRUD | Manager | tRPC |
| カタログ参照API | Manager | REST API (`/api/catalog`) |
| 管理者UI | Manager | React Server Components |

### 5.2 mcp-wrapper からの利用

```typescript
// apps/mcp-wrapper/src/catalog.ts

const getCatalogEntry = async (name: string) => {
  const res = await fetch(`${MANAGER_URL}/api/catalog/${name}`, {
    headers: {
      Authorization: `Bearer ${CATALOG_API_TOKEN}`,
    },
  });
  return res.json();
};
```

---

## 6. 実装フェーズ

### Phase 1: カタログ機能（1週間）

- [ ] McpCatalogEntry Prismaスキーマ追加
- [ ] Manager: REST API実装 (`/api/catalog`)
- [ ] Manager: tRPC Router + 管理者UI
- [ ] 初期カタログデータ投入（20エントリ）

### Phase 2: mcp-wrapper 実装（2週間）

- [ ] `apps/mcp-wrapper` ディレクトリ作成
- [ ] HTTPサーバー（Hono）実装
- [ ] ProcessPool 実装（起動・停止・LRU eviction）
- [ ] MCPプロセス管理（child_process）
- [ ] カタログAPIクライアント実装
- [ ] ヘッダー→環境変数マッピング
- [ ] ユニットテスト

### Phase 3: Sakura Cloud VMデプロイ（1週間）

- [ ] `apps/mcp-wrapper/deploy/setup.sh` 作成・実行
- [ ] PM2設定・起動
- [ ] tumiki-proxyルーティング統合
- [ ] E2Eテスト

### Phase 4: 大量MCPサーバー登録（2週間）

- [ ] MCPサーバー一覧収集（npm, GitHub）
- [ ] 100エントリ追加・動作確認
- [ ] ドキュメント作成

---

## 7. コスト比較

| 方式                               | 月額コスト       | 備考                       |
| ---------------------------------- | ---------------- | -------------------------- |
| 個別Cloud Run（100サービス）       | ¥75,000〜150,000 | 各サービス ¥750〜1,500     |
| Universal Wrapper（Cloud Run）     | ¥23,000          | 2vCPU/4GB, min_instances:1 |
| **Universal Wrapper（Sakura VM）** | **¥6,000**       | 2コア/4GB VM               |

**削減効果**: 90%以上のコスト削減

---

## 8. 参照ドキュメント

| ドキュメント            | 場所                                                 |
| ----------------------- | ---------------------------------------------------- |
| カタログAPI設計書       | `docs/proposals/catalog-api-design.md`               |
| 詳細設計書              | `docs/proposals/universal-mcp-wrapper-design.md`     |
| インフラ設計書          | `docs/proposals/tumiki-mcp-infrastructure-design.md` |
| MCPスケーラビリティ設計 | `docs/proposals/mcp-server-scalability-design.md`    |

---

## 9. 次のアクション

1. `packages/db/prisma/schema/mcpCatalog.prisma` 作成
2. `apps/manager/app/api/catalog/` REST API 実装
3. `apps/manager/app/(authenticated)/mcp-catalog/` 管理者UI 実装
4. `apps/mcp-wrapper` ディレクトリ作成
5. HTTPサーバー + ProcessPool の基本実装
6. Sakura VMセットアップ & デプロイ
