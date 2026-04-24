# Tumiki Registry — Control Plane 設計書

## 概要

エンタープライズ向けMCPツール管理プラットフォームの設計書。
**2つのペルソナ**に最適化した体験を提供する。

**重要原則**: MCPペイロード（プロンプト、レスポンス、APIキー、PII）は一切受信・保存しない。

---

## 1. ペルソナ定義

### 情シス担当者（IT Admin）

| 項目 | 内容                                                                       |
| ---- | -------------------------------------------------------------------------- |
| 役割 | 情報システム部の管理者。MCPツールの導入・運用を統括                        |
| 目標 | セキュリティを保ちながら、社内のAIツール利用を促進したい                   |
| 課題 | ツール導入の承認フローが煩雑、全社配布の手間、利用状況が見えない           |
| 操作 | ツールカタログの整備、ロール・権限設定、デプロイメント管理、利用統計の監視 |

**情シス担当者が求める体験**:

- セットアップウィザードで迷わず初期構築できる
- ツールカタログから「承認済みツール」をワンクリックで全社配布
- 権限マトリクスで「誰が何を使えるか」を一覧で把握・設定
- ダッシュボードで利用状況を一目で確認

### 一般社員（End User）

| 項目 | 内容                                                         |
| ---- | ------------------------------------------------------------ |
| 役割 | 営業、企画、開発など各部門の社員。AIツールを業務で活用したい |
| 目標 | 承認済みのMCPツールを手軽に使い始めたい                      |
| 課題 | どのツールが使えるか分からない、設定が難しい、申請が面倒     |
| 操作 | ツールカタログの閲覧、ワンクリック追加、接続設定のコピー     |

**一般社員が求める体験**:

- 社内で使えるツール一覧が「アプリストア」のように並んでいる
- 「追加」ボタンを押すだけで自分の環境に追加される
- 接続情報（MCP Proxy URL等）をコピペするだけで使い始められる
- 自分が使っているツールの管理が簡単

---

## 2. 画面設計

### 2.1 ページ構成（ロール別）

```
/                                # ランディングページ（未認証）
/signin                          # サインイン

/[orgSlug]/                      # 組織トップ（ロール判定でリダイレクト）
│
├── 【一般社員向け】
│   /[orgSlug]/catalog            # ツールカタログ（アプリストア風）
│   /[orgSlug]/catalog/[id]       # ツール詳細・セットアップガイド
│   /[orgSlug]/my-tools           # 自分が利用中のツール一覧
│   /[orgSlug]/my-tools/setup     # 接続設定ガイド（MCP Proxy URL等）
│
├── 【情シス担当者向け（Admin）】
│   /[orgSlug]/admin              # 管理ダッシュボード（統計概要）
│   /[orgSlug]/admin/setup        # セットアップウィザード（初回のみ）
│   │
│   ├── ツール管理
│   │   /[orgSlug]/admin/templates            # テンプレート一覧
│   │   /[orgSlug]/admin/templates/new        # テンプレート作成
│   │   /[orgSlug]/admin/templates/[id]       # テンプレート詳細・編集
│   │   /[orgSlug]/admin/templates/[id]/tools # ツール一覧・同期
│   │
│   ├── 配布管理
│   │   /[orgSlug]/admin/distribution         # 配布設定（どのロールに何を配布するか）
│   │
│   ├── アクセス制御
│   │   /[orgSlug]/admin/roles                # ロール管理
│   │   /[orgSlug]/admin/roles/[slug]         # ロール詳細・権限編集
│   │   /[orgSlug]/admin/permissions          # 権限マトリクス（一覧ビュー）
│   │
│   ├── インフラ管理
│   │   /[orgSlug]/admin/deployments          # デプロイメント一覧
│   │   /[orgSlug]/admin/deployments/new      # デプロイメント登録
│   │   /[orgSlug]/admin/deployments/[id]     # デプロイメント詳細・API Key管理
│   │
│   └── モニタリング
│       /[orgSlug]/admin/stats                # 利用統計ダッシュボード
│
└── 【組織設定（Admin）】
    /[orgSlug]/settings           # 組織設定
    /[orgSlug]/settings/members   # メンバー管理
```

### 2.2 主要画面のUX設計

#### ツールカタログ（一般社員向け）— `/[orgSlug]/catalog`

アプリストア風のカード一覧UI。情シスが承認したツールのみ表示される。

```
┌─────────────────────────────────────────────────────────┐
│ ツールカタログ                        [検索バー]  [フィルタ] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ [Slackアイコン] │  │ [GitHubアイコン]│  │ [Notionアイコン]│   │
│  │  Slack        │  │  GitHub      │  │  Notion      │   │
│  │  メッセージ送信 │  │  Issue管理    │  │  ページ検索   │   │
│  │  ツール数: 5   │  │  ツール数: 8  │  │  ツール数: 3  │   │
│  │              │  │              │  │              │   │
│  │  [承認済み ✓]  │  │  [承認済み ✓]  │  │  [申請する]   │   │
│  │  [追加する]   │  │  [利用中 ✓]   │  │  [詳細を見る] │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                           │
│  カテゴリ: [すべて] [コミュニケーション] [開発] [ドキュメント]   │
└─────────────────────────────────────────────────────────┘
```

**状態遷移**:

- `承認済み` → 「追加する」で自分の環境に即時追加
- `利用中` → 追加済み。クリックで接続情報を表示
- `申請する` → 情シスへの利用申請フロー（Phase 2）

#### ツール詳細・セットアップガイド — `/[orgSlug]/catalog/[id]`

```
┌─────────────────────────────────────────────────────────┐
│ ← カタログに戻る                                         │
├─────────────────────────────────────────────────────────┤
│  [Slackアイコン]  Slack MCP Server                        │
│  メッセージ送信、チャンネル管理、検索など                      │
│                                                           │
│  ┌─ 利用できるツール ─────────────────────────────────┐   │
│  │ send_message    メッセージを送信              [実行可] │   │
│  │ search_messages メッセージを検索              [読取可] │   │
│  │ list_channels   チャンネル一覧を取得           [読取可] │   │
│  │ create_channel  チャンネルを作成              [権限なし]│   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ セットアップ ─────────────────────────────────────┐   │
│  │ 1. 下記の接続情報をコピーしてください                    │   │
│  │                                                       │   │
│  │  MCP Proxy URL:                                       │   │
│  │  ┌─────────────────────────────────┐ [コピー]         │   │
│  │  │ https://proxy.example.com/sse   │                  │   │
│  │  └─────────────────────────────────┘                  │   │
│  │                                                       │   │
│  │ 2. お使いのAIクライアントの設定に追加してください         │   │
│  │    [Claude Desktop用] [Cursor用] [VS Code用]          │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### 管理ダッシュボード（情シス向け）— `/[orgSlug]/admin`

```
┌─────────────────────────────────────────────────────────┐
│ 管理ダッシュボード                     [組織名] [プロフィール]│
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──── 概要カード ────────────────────────────────────┐   │
│  │ 登録ツール数   利用ユーザー数   今月のリクエスト   エラー率 │   │
│  │    12            48            12,340          0.3% │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──── クイックアクション ────────────────────────────┐   │
│  │ [+ テンプレート追加]  [権限設定]  [デプロイメント管理]    │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──── デプロイメント状況 ────────────────────────────┐   │
│  │ 本番環境    proxy.example.com     [同期済み ✓] 5分前  │   │
│  │ 開発環境    dev-proxy.example.com [同期失敗 !] 2時間前│   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──── リクエスト推移（7日間） ───────────────────────┐   │
│  │  ████                                               │   │
│  │  ████ ███                                           │   │
│  │  ████ ███ ██████ ...                                │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### セットアップウィザード（情シス初回）— `/[orgSlug]/admin/setup`

初回アクセス時に3ステップで基本設定を完了させる。

```
ステップ1: デプロイメント登録
  → MCP Proxy URLを入力、Sync API Keyを自動発行

ステップ2: テンプレート追加
  → 公式テンプレートから利用するツールを選択
  → または組織独自テンプレートを作成

ステップ3: 権限設定
  → デフォルトロール（Member）の権限を設定
  → 追加ロールの作成（オプション）

完了 → 管理ダッシュボードへリダイレクト
```

#### 権限マトリクス — `/[orgSlug]/admin/permissions`

```
┌─────────────────────────────────────────────────────────┐
│ 権限マトリクス                         [ロール追加] [保存]  │
├─────────────────────────────────────────────────────────┤
│                │  Owner  │  Admin  │ Developer│  Viewer │
│ ───────────────┼─────────┼─────────┼──────────┼─────────│
│ Slack          │ R W X   │ R W X   │ R _ X    │ R _ _   │
│ GitHub         │ R W X   │ R W X   │ R W X    │ R _ _   │
│ Notion         │ R W X   │ R _ X   │ R _ _    │ _ _ _   │
│ 社内DB検索      │ R W X   │ R W X   │ R _ X    │ R _ _   │
│ ───────────────┼─────────┼─────────┼──────────┼─────────│
│ デフォルト       │ R W X   │ R W _   │ R _ _    │ R _ _   │
│                │         │         │          │         │
│ R=読取  W=書込  X=実行                                    │
└─────────────────────────────────────────────────────────┘
```

#### 配布管理 — `/[orgSlug]/admin/distribution`

```
┌─────────────────────────────────────────────────────────┐
│ ツール配布設定                                [変更を配信]  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  配布方法を選択:                                          │
│  ○ 自動配布: ロールに基づいて自動的にツールを利用可能にする   │
│  ○ 申請制: ユーザーが申請し、管理者が承認する              │
│                                                           │
│  ┌──── 自動配布ルール ───────────────────────────────┐   │
│  │                                                       │   │
│  │ ルール 1:                                             │   │
│  │   対象ロール: [Developer ▼]                            │   │
│  │   配布ツール: [Slack ✓] [GitHub ✓] [Notion] [社内DB ✓] │   │
│  │                                                       │   │
│  │ ルール 2:                                             │   │
│  │   対象ロール: [Viewer ▼]                               │   │
│  │   配布ツール: [Slack ✓] [社内DB ✓]                     │   │
│  │                                                       │   │
│  │ [+ ルール追加]                                         │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. アーキテクチャ

### 3.1 ディレクトリ構成

```
apps/registry/src/
├── app/                               # Next.js App Router
│   ├── (public)/                      # 未認証ページ
│   │   ├── page.tsx                   # ランディングページ
│   │   └── signin/page.tsx
│   ├── [orgSlug]/                     # 組織スコープ（認証必須）
│   │   ├── layout.tsx                 # サイドバー + ヘッダー
│   │   ├── page.tsx                   # ロール判定 → リダイレクト
│   │   ├── catalog/                   # 一般社員: ツールカタログ
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── my-tools/                  # 一般社員: マイツール
│   │   │   ├── page.tsx
│   │   │   └── setup/page.tsx
│   │   ├── admin/                     # 情シス: 管理画面
│   │   │   ├── page.tsx              # ダッシュボード
│   │   │   ├── setup/page.tsx        # セットアップウィザード
│   │   │   ├── templates/
│   │   │   ├── distribution/
│   │   │   ├── roles/
│   │   │   ├── permissions/
│   │   │   ├── deployments/
│   │   │   └── stats/
│   │   └── settings/                  # 組織設定
│   ├── api/
│   │   ├── auth/[...nextauth]/        # NextAuth（既存）
│   │   ├── trpc/[trpc]/               # tRPC（既存）
│   │   └── sync/                      # 設定同期API（REST）
│   └── layout.tsx
├── features/                          # Feature-Based Architecture
│   ├── organization/                  # 組織管理
│   ├── catalog/                       # ツールカタログ（一般社員向け）
│   ├── my-tools/                      # マイツール管理（一般社員向け）
│   ├── template/                      # テンプレート管理（情シス向け）
│   ├── distribution/                  # 配布管理（情シス向け）
│   ├── policy/                        # ロール・権限管理（情シス向け）
│   ├── deployment/                    # デプロイメント管理（情シス向け）
│   ├── stats/                         # 利用統計（情シス向け）
│   ├── setup-wizard/                  # セットアップウィザード（情シス向け）
│   └── sync/                          # 設定同期API
├── server/api/                        # tRPC（既存）
├── lib/                               # 共通ユーティリティ
└── trpc/                              # tRPCクライアント（既存）
```

### 3.2 managerアプリとのURL構造比較

| manager（既存）            | registry（新規）                | 備考                     |
| -------------------------- | ------------------------------- | ------------------------ |
| `/[orgSlug]/dashboard`     | `/[orgSlug]/admin`              | 情シス向けダッシュボード |
| `/[orgSlug]/mcps`          | `/[orgSlug]/catalog`            | 一般社員向けカタログ     |
| `/[orgSlug]/org-structure` | `/[orgSlug]/admin/roles`        | ロール管理               |
| `/[orgSlug]/settings`      | `/[orgSlug]/settings`           | 組織設定（同一パターン） |
| （なし）                   | `/[orgSlug]/my-tools`           | 一般社員のマイツール     |
| （なし）                   | `/[orgSlug]/admin/deployments`  | デプロイメント管理       |
| （なし）                   | `/[orgSlug]/admin/distribution` | 配布管理                 |

---

## 4. Feature設計

### 4.1 catalog — ツールカタログ（一般社員向け）

社員がアプリストア感覚で承認済みツールを閲覧・追加するUI。

```
features/catalog/
├── api/
│   ├── __tests__/
│   ├── router.ts
│   ├── schemas.ts
│   ├── listAvailable.ts       # 自分が利用可能なテンプレート一覧
│   ├── getDetail.ts           # テンプレート詳細（ツール+権限情報付き）
│   └── addToMyTools.ts        # マイツールに追加
├── _components/
│   ├── CatalogGrid.tsx        # カード一覧グリッド
│   ├── CatalogCard.tsx        # 個別カード（アイコン+名前+状態）
│   ├── CatalogSearch.tsx      # 検索+カテゴリフィルタ
│   ├── ToolDetail.tsx         # ツール詳細パネル
│   └── SetupGuide.tsx         # クライアント別セットアップ手順
└── index.ts
```

| プロシージャ            | 種別     | 説明                                             |
| ----------------------- | -------- | ------------------------------------------------ |
| `catalog.listAvailable` | query    | ユーザーのロールに基づく利用可能テンプレート一覧 |
| `catalog.getDetail`     | query    | テンプレート詳細（ツール一覧+自分の権限）        |
| `catalog.addToMyTools`  | mutation | テンプレートを自分のツールに追加                 |

---

### 4.2 my-tools — マイツール管理（一般社員向け）

自分が利用中のツールの管理と接続情報の表示。

```
features/my-tools/
├── api/
│   ├── __tests__/
│   ├── router.ts
│   ├── schemas.ts
│   ├── list.ts                # 利用中ツール一覧
│   ├── remove.ts              # ツールを利用停止
│   └── getConnectionInfo.ts   # 接続情報取得
├── _components/
│   ├── MyToolsList.tsx        # 利用中ツール一覧
│   ├── ConnectionInfo.tsx     # MCP Proxy URL等の接続情報
│   └── ClientConfigSnippet.tsx # クライアント設定JSONスニペット
└── index.ts
```

| プロシージャ                | 種別     | 説明                             |
| --------------------------- | -------- | -------------------------------- |
| `myTools.list`              | query    | 自分が利用中のツール一覧         |
| `myTools.remove`            | mutation | ツールを利用停止                 |
| `myTools.getConnectionInfo` | query    | MCP Proxy接続情報+設定スニペット |

**接続情報の例（Claude Desktop用）**:

```json
{
  "mcpServers": {
    "tumiki-proxy": {
      "url": "https://proxy.example.com/sse",
      "headers": {
        "Authorization": "Bearer <your-token>"
      }
    }
  }
}
```

---

### 4.3 template — テンプレート管理（情シス向け）

MCPサーバーテンプレートとツールメタデータの管理。

```
features/template/
├── api/
│   ├── __tests__/
│   ├── router.ts
│   ├── schemas.ts
│   ├── list.ts
│   ├── getById.ts
│   ├── create.ts
│   ├── update.ts
│   ├── delete.ts
│   ├── listTools.ts
│   ├── syncTools.ts           # MCPサーバーからツール情報を再取得
│   └── helpers/
│       └── normalizeTemplateName.ts
├── _components/
│   ├── TemplateList.tsx
│   ├── TemplateForm.tsx
│   └── ToolList.tsx
└── index.ts
```

| プロシージャ         | 種別     | 説明                              |
| -------------------- | -------- | --------------------------------- |
| `template.list`      | query    | 組織内テンプレート一覧            |
| `template.getById`   | query    | テンプレート詳細（ツール含む）    |
| `template.create`    | mutation | テンプレート作成                  |
| `template.update`    | mutation | テンプレート更新                  |
| `template.delete`    | mutation | テンプレート削除                  |
| `template.listTools` | query    | テンプレートのツール一覧          |
| `template.syncTools` | mutation | MCPサーバーからツール情報を再取得 |

---

### 4.4 distribution — 配布管理（情シス向け）

どのロールにどのツールを配布するかのルール管理。

```
features/distribution/
├── api/
│   ├── __tests__/
│   ├── router.ts
│   ├── schemas.ts
│   ├── listRules.ts           # 配布ルール一覧
│   ├── upsertRule.ts          # 配布ルール作成/更新
│   ├── deleteRule.ts          # 配布ルール削除
│   └── publish.ts             # 変更をデプロイメントに配信
├── _components/
│   ├── DistributionRuleList.tsx
│   ├── DistributionRuleForm.tsx
│   └── PublishButton.tsx
└── index.ts
```

| プロシージャ              | 種別     | 説明                       |
| ------------------------- | -------- | -------------------------- |
| `distribution.listRules`  | query    | 配布ルール一覧             |
| `distribution.upsertRule` | mutation | 配布ルール作成/更新        |
| `distribution.deleteRule` | mutation | 配布ルール削除             |
| `distribution.publish`    | mutation | 変更をデプロイメントに配信 |

---

### 4.5 policy — ロール・権限管理（情シス向け）

```
features/policy/
├── api/
│   ├── __tests__/
│   ├── router.ts
│   ├── schemas.ts
│   ├── listRoles.ts
│   ├── createRole.ts
│   ├── updateRole.ts
│   ├── deleteRole.ts
│   ├── getPermissionMatrix.ts # 全ロール×全サーバーの権限マトリクス
│   ├── upsertPermission.ts
│   └── deletePermission.ts
├── _components/
│   ├── RoleList.tsx
│   ├── RoleForm.tsx
│   └── PermissionMatrix.tsx   # インタラクティブなマトリクスUI
└── index.ts
```

| プロシージャ                 | 種別     | 説明                                  |
| ---------------------------- | -------- | ------------------------------------- |
| `policy.listRoles`           | query    | ロール一覧                            |
| `policy.createRole`          | mutation | ロール作成                            |
| `policy.updateRole`          | mutation | ロール更新                            |
| `policy.deleteRole`          | mutation | ロール削除                            |
| `policy.getPermissionMatrix` | query    | 権限マトリクス（全ロール×全サーバー） |
| `policy.upsertPermission`    | mutation | 特定サーバーへの権限設定              |
| `policy.deletePermission`    | mutation | 特定サーバーへの権限削除              |

---

### 4.6 deployment — デプロイメント管理（情シス向け）

```
features/deployment/
├── api/
│   ├── __tests__/
│   ├── router.ts
│   ├── schemas.ts
│   ├── list.ts
│   ├── register.ts
│   ├── update.ts
│   ├── delete.ts
│   ├── generateSyncApiKey.ts
│   ├── revokeSyncApiKey.ts
│   └── healthCheck.ts         # Proxyへのヘルスチェック
├── _components/
│   ├── DeploymentList.tsx
│   ├── DeploymentForm.tsx
│   ├── SyncApiKeyDisplay.tsx  # API Key表示（一度だけ表示）
│   └── SyncStatusBadge.tsx    # 同期状況バッジ
└── index.ts
```

| プロシージャ                    | 種別     | 説明                    |
| ------------------------------- | -------- | ----------------------- |
| `deployment.list`               | query    | デプロイメント一覧      |
| `deployment.register`           | mutation | 新規デプロイメント登録  |
| `deployment.update`             | mutation | デプロイメント情報更新  |
| `deployment.delete`             | mutation | デプロイメント削除      |
| `deployment.generateSyncApiKey` | mutation | Sync API Key発行        |
| `deployment.revokeSyncApiKey`   | mutation | Sync API Key無効化      |
| `deployment.healthCheck`        | query    | Proxyへのヘルスチェック |

---

### 4.7 stats — 利用統計（情シス向け）

```
features/stats/
├── api/
│   ├── __tests__/
│   ├── router.ts
│   ├── schemas.ts
│   ├── getSummary.ts
│   └── getTimeSeries.ts
├── _components/
│   ├── StatsDashboard.tsx
│   ├── RequestCountChart.tsx
│   ├── ErrorRateChart.tsx
│   └── ToolUsageRanking.tsx   # ツール別利用ランキング
└── index.ts
```

---

### 4.8 setup-wizard — セットアップウィザード（情シス初回）

```
features/setup-wizard/
├── api/
│   ├── router.ts
│   ├── schemas.ts
│   ├── getSetupStatus.ts      # セットアップ完了状況
│   └── completeSetup.ts       # セットアップ完了マーク
├── _components/
│   ├── SetupWizard.tsx        # ウィザードコンテナ
│   ├── StepDeployment.tsx     # Step 1: デプロイメント登録
│   ├── StepTemplates.tsx      # Step 2: テンプレート選択
│   └── StepPermissions.tsx    # Step 3: 権限設定
└── index.ts
```

---

### 4.9 sync — 設定同期API

tRPCではなくREST APIとして実装（外部サービスからの呼び出し）。

```
features/sync/
├── api/
│   ├── __tests__/
│   │   ├── policies.test.ts
│   │   ├── toolMetadata.test.ts
│   │   └── reportStats.test.ts
│   ├── policies.ts
│   ├── toolMetadata.ts
│   ├── reportStats.ts
│   └── schemas.ts
├── middleware/
│   └── syncAuth.ts            # Sync API Key認証
├── utils/
│   └── validateNoSensitiveData.ts
└── index.ts
```

| エンドポイント            | メソッド | 認証         | 説明                   |
| ------------------------- | -------- | ------------ | ---------------------- |
| `/api/sync/policies`      | POST     | Sync API Key | ポリシー設定を返却     |
| `/api/sync/tool-metadata` | POST     | Sync API Key | ツールメタデータを返却 |
| `/api/sync/report-stats`  | POST     | Sync API Key | 匿名化統計を受信       |

---

### 4.10 organization — 組織管理

```
features/organization/
├── api/
│   ├── __tests__/
│   ├── router.ts
│   ├── schemas.ts
│   ├── getBySlug.ts
│   ├── getUserOrganizations.ts
│   ├── create.ts
│   ├── update.ts
│   └── delete.ts
├── _components/
│   ├── OrganizationSwitcher.tsx
│   └── OrganizationSettings.tsx
└── index.ts
```

---

## 5. tRPCルーター構成

```typescript
// server/api/root.ts
export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ status: "ok" })),

  // 組織管理
  organization: organizationRouter,

  // 一般社員向け
  catalog: catalogRouter,
  myTools: myToolsRouter,

  // 情シス向け
  template: templateRouter,
  distribution: distributionRouter,
  policy: policyRouter,
  deployment: deploymentRouter,
  stats: statsRouter,
  setupWizard: setupWizardRouter,
});
```

---

## 6. DBスキーマ設計

### 6.1 既存テーブル（packages/db から共有）

| テーブル                     | 用途                                 |
| ---------------------------- | ------------------------------------ |
| `Organization`               | 組織メタデータ                       |
| `OrganizationMember`         | 組織メンバー                         |
| `OrganizationRole`           | ロール定義（権限のデフォルト値含む） |
| `McpPermission`              | MCPサーバー個別権限（R/W/X）         |
| `McpServerTemplate`          | テンプレート定義                     |
| `McpTool`                    | ツール定義                           |
| `User`, `Account`, `Session` | 認証関連                             |

### 6.2 新規テーブル

```prisma
/// Control Plane: デプロイメント（Self-Hosted MCP Proxyインスタンス）
/// @namespace Registry
model Deployment {
  id               String       @id @default(cuid())
  /// デプロイメント名（表示用、例: "本番環境", "開発環境"）
  name             String
  /// 組織
  organizationId   String
  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  /// MCP ProxyのベースURL（ヘルスチェック用）
  proxyUrl         String?
  /// Sync API Key（SHA-256ハッシュ化して保存）
  syncApiKeyHash   String?      @unique
  /// Sync API Keyのプレフィックス（表示用、例: "tsk_abc..."）
  syncApiKeyPrefix String?
  /// 最終同期日時
  lastSyncAt       DateTime?
  /// 同期ステータス
  syncStatus       SyncStatus   @default(PENDING)
  /// メモ
  description      String?

  /// 匿名統計
  anonymousStats AnonymousStat[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, name])
}

/// 同期ステータス
/// @namespace Registry
enum SyncStatus {
  PENDING
  SYNCED
  FAILED
}

/// Control Plane: 匿名化統計データ（1時間単位で集計）
/// @namespace Registry
model AnonymousStat {
  id             String     @id @default(cuid())
  deploymentId   String
  deployment     Deployment @relation(fields: [deploymentId], references: [id], onDelete: Cascade)
  periodStart    DateTime
  periodEnd      DateTime
  requestCount   Int        @default(0)
  errorCount     Int        @default(0)
  errorRate      Float      @default(0)
  /// ツール別統計（JSON: { "tool_name": { requestCount, errorCount } }）
  toolStats      Json?
  metadata       Json?

  createdAt DateTime @default(now())

  @@unique([deploymentId, periodStart])
  @@index([periodStart])
}

/// Control Plane: ユーザーのマイツール（カタログから追加したもの）
/// @namespace Registry
model UserTool {
  id                  String            @id @default(cuid())
  userId              String
  user                User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  organizationId      String
  organization        Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  mcpServerTemplateId String
  mcpServerTemplate   McpServerTemplate @relation(fields: [mcpServerTemplateId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([userId, organizationId, mcpServerTemplateId])
}

/// Control Plane: 配布ルール（ロール→テンプレートの自動配布設定）
/// @namespace Registry
model DistributionRule {
  id                  String            @id @default(cuid())
  /// 対象ロール
  organizationSlug    String
  roleSlug            String
  role                OrganizationRole  @relation(fields: [organizationSlug, roleSlug], references: [organizationSlug, slug], onDelete: Cascade)
  /// 配布対象テンプレート
  mcpServerTemplateId String
  mcpServerTemplate   McpServerTemplate @relation(fields: [mcpServerTemplateId], references: [id], onDelete: Cascade)
  /// 有効フラグ
  isEnabled           Boolean           @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationSlug, roleSlug, mcpServerTemplateId])
}

/// Control Plane: 組織のセットアップ状態
/// @namespace Registry
model OrganizationSetup {
  id                    String       @id @default(cuid())
  organizationId        String       @unique
  organization          Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  /// セットアップ完了フラグ
  isCompleted           Boolean      @default(false)
  /// 各ステップの完了状態
  deploymentCompleted   Boolean      @default(false)
  templatesCompleted    Boolean      @default(false)
  permissionsCompleted  Boolean      @default(false)

  completedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

---

## 7. 設定同期API 詳細設計

### 7.1 認証フロー

```
MCP Proxy                           Registry (Control Plane)
    │                                       │
    │  POST /api/sync/policies              │
    │  Authorization: Bearer <sync-api-key> │
    │ ─────────────────────────────────────→ │
    │                                       │ 1. API Keyハッシュ化（SHA-256）
    │                                       │ 2. Deployment検索（syncApiKeyHash）
    │                                       │ 3. 組織情報取得
    │                                       │ 4. ポリシーデータ返却
    │  200 OK { policies, syncVersion }     │
    │ ←───────────────────────────────────── │
```

### 7.2 リクエスト/レスポンス スキーマ

#### POST /api/sync/policies

```typescript
type SyncPoliciesRequest = {
  syncVersion?: string;
};

type SyncPoliciesResponse = {
  syncVersion: string;
  policies: {
    roleSlug: string;
    roleName: string;
    defaultRead: boolean;
    defaultWrite: boolean;
    defaultExecute: boolean;
    mcpPermissions: {
      mcpServerId: string;
      read: boolean;
      write: boolean;
      execute: boolean;
    }[];
  }[];
};
```

#### POST /api/sync/tool-metadata

```typescript
type SyncToolMetadataRequest = {
  syncVersion?: string;
};

type SyncToolMetadataResponse = {
  syncVersion: string;
  templates: {
    id: string;
    name: string;
    transportType: "STDIO" | "SSE" | "STREAMABLE_HTTPS";
    command?: string;
    args?: string[];
    url?: string;
    envVarKeys: string[];
    authType: "NONE" | "API_KEY" | "OAUTH";
    tools: {
      id: string;
      name: string;
      description: string;
      inputSchema: unknown;
    }[];
  }[];
};
```

#### POST /api/sync/report-stats

```typescript
type ReportStatsRequest = {
  periodStart: string; // ISO 8601
  periodEnd: string;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  toolStats?: Record<string, { requestCount: number; errorCount: number }>;
};

type ReportStatsResponse = {
  received: true;
};
```

### 7.3 機密データ混入防止

```typescript
const FORBIDDEN_KEYS = [
  "prompt", "response", "apiKey", "apiKeyHash",
  "envVars", "accessToken", "refreshToken",
  "password", "secret",
] as const;

// 全Syncレスポンスに対して実行（本番環境含む）
export const validateNoSensitiveData = (data: unknown): void => { ... };
```

---

## 8. セキュリティ要件

| 項目               | 対策                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| Sync API Key       | SHA-256ハッシュ化して保存。プレフィックスのみ表示。発行時に一度だけ表示 |
| 機密データ混入防止 | `validateNoSensitiveData`で全Syncレスポンスを検証                       |
| 認証               | Keycloak JWT（tRPC）/ Sync API Key（REST）                              |
| 認可               | ロールベース。Admin以上のみ管理画面にアクセス可能                       |
| 通信               | TLS 1.3必須                                                             |
| 入力バリデーション | Zodスキーマで全入力を検証                                               |
| レート制限         | Sync APIにレート制限を適用                                              |

---

## 9. 実装優先順位

### Phase 1: 基盤 + 情シス最小ワークフロー

| 順序 | Feature      | 内容                                   |
| ---- | ------------ | -------------------------------------- |
| 1    | organization | 組織CRUD（既存テーブル活用）           |
| 2    | deployment   | デプロイメント登録、Sync API Key発行   |
| 3    | sync         | 設定同期API（ポリシー+メタデータ配信） |
| 4    | policy       | ロール・権限CRUD + 権限マトリクス      |
| 5    | template     | テンプレート・ツールCRUD               |
| 6    | setup-wizard | 初回セットアップウィザード             |

### Phase 2: 一般社員向け + 配布

| 順序 | Feature      | 内容                             |
| ---- | ------------ | -------------------------------- |
| 7    | catalog      | ツールカタログ（アプリストア風） |
| 8    | my-tools     | マイツール管理 + 接続情報表示    |
| 9    | distribution | 配布ルール管理                   |

### Phase 3: モニタリング + 改善

| 順序 | Feature | 内容                           |
| ---- | ------- | ------------------------------ |
| 10   | stats   | 匿名統計の受信・ダッシュボード |
| 11   | sync    | 統計受信の追加                 |
| 12   | —       | 管理ダッシュボード改善         |

---

## 10. 技術的制約・注意事項

- **packages/dbの共有**: 新規テーブル（`Deployment`, `AnonymousStat`, `UserTool`, `DistributionRule`, `OrganizationSetup`）は`packages/db`に追加。既存テーブルのrelation追加も必要
- **tRPCパターン踏襲**: managerアプリと同一のFeature-Based Architecture。`protectedProcedure`の認証ミドルウェアも同一パターン
- **Sync APIはREST**: 外部サービス（MCP Proxy）からの呼び出しのため、Next.js Route Handlersで実装
- **ETag対応**: ツールメタデータ配信はETag/If-None-Matchで差分検出
- **UIコンポーネント**: `@tumiki/ui`（Radix UI + Tailwind CSS）を使用。lucide-reactでアイコン
