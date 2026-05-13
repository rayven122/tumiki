# Dynamic Tool Search — 設計ドキュメント

> 作成日: 2026-05-13  
> ステータス: 設計中（未実装）

---

## 1. 概要

Tumiki Desktop の個人プロファイルに **Tumiki Cloud Keycloak 認証（全員必須）** を追加し、
認証済みユーザーへ **Tumiki Cloud API（Vercel AI Gateway）** 経由の動的ツール検索を提供する。

組織プロファイルは従来通りだが、Keycloak のホスティング先を **Tumiki Cloud（クラウド）か
セルフホスト** から選択できるよう拡張する。

### 解決する課題

| 課題 | 現状 | 本機能後 |
|---|---|---|
| ツール数爆発 | 全ツールを `tools/list` で返す（コンテキスト圧迫） | メタツールだけ返し、クエリで絞り込む |
| クライアント依存 | MCP Sampling は Claude Desktop のみ確実 | Cloud API で全クライアント対応 |
| 個人プロファイルの機能不足 | ローカル完結でクラウド機能なし | Keycloak 認証必須化でクラウド機能を提供 |

---

## 2. アーキテクチャ全体図

```
┌─────────────────────────────────────────────────────────────────┐
│  AI Client (Claude Desktop / Codex / Cursor / etc.)             │
│                                                                 │
│  tools/list → [tumiki__search_tools, tumiki__call_tool]         │
│  tools/call  tumiki__search_tools(query="ファイルを読みたい")    │
└────────────────────────┬────────────────────────────────────────┘
                         │ stdio (MCP)
┌────────────────────────▼────────────────────────────────────────┐
│  apps/desktop (Electron Main Process)                           │
│                                                                 │
│  stdio-inbound.ts                                               │
│  ├─ search_tools ハンドラ                                        │
│  │   └─ TumikiCloudClient.searchTools(query, allTools)          │
│  └─ call_tool ハンドラ  → ToolAggregator → UpstreamPool         │
│                                                                 │
│  TumikiCloudClient                                              │
│  ├─ Bearer Token（Tumiki Cloud Keycloak から取得）               │
│  ├─ キャッシュ層（query hash + tool set hash）                   │
│  └─ Cloud API 失敗時 → キーワードマッチにフォールバック          │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS + Bearer Token
┌────────────────────────▼────────────────────────────────────────┐
│  Tumiki Cloud API  (Vercel — Next.js API Routes)                │
│                                                                 │
│  POST /api/v1/tool-search                                       │
│  ├─ Keycloak JWT 検証                                           │
│  ├─ Vercel AI Gateway（LLM 推論）                               │
│  │   └─ claude-haiku / gpt-4o-mini（安価モデルで十分）           │
│  └─ レスポンスキャッシュ（Vercel KV）                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. プロファイル別 認証設計

### 3.1 プロファイル構造の変更方針

```typescript
// 現状（shared/types.ts）
type DesktopProfile = "personal" | "organization"

// personal    → ローカル完結（クラウド機能なし）         ← 変更
// organization → Manager の Keycloak で認証済み          ← 拡張
```

| プロファイル | 変更前 | 変更後 |
|---|---|---|
| `personal` | ローカル完結・認証なし | **Tumiki Cloud Keycloak で認証必須** |
| `organization` | Manager 指定の Keycloak のみ | **Tumiki Cloud or セルフホスト Keycloak を選択** |

### 3.2 個人プロファイルの Keycloak 設定

Tumiki Cloud Keycloak は既にホスティング済み。Desktop 側の設定値は固定値として組み込む。

| 項目 | 値 |
|---|---|
| Issuer | `https://auth.tumiki.app/realms/tumiki-cloud`（固定） |
| Client ID | `tumiki-desktop-personal`（固定） |
| Grant Type | Authorization Code + PKCE |
| Redirect URI | `tumiki://cloud-auth/callback` |
| Scope | `openid profile email offline_access` |
| Token 有効期限 | 15 分（access）/ 30 日（refresh） |

### 3.3 個人プロファイルの認証フロー

個人プロファイルを選択した時点で認証フローを開始する（スキップ不可）。

```mermaid
sequenceDiagram
    actor User
    participant Desktop as Desktop App<br/>(Electron Main)
    participant Browser as 外部ブラウザ
    participant Keycloak as Tumiki Cloud Keycloak<br/>(ホスティング済み)
    participant DB as ローカル DB<br/>(SQLite)

    User->>Desktop: 「個人で使う」を選択
    Desktop->>Desktop: PKCE 生成<br/>codeVerifier / codeChallenge / state
    Desktop->>Browser: shell.openExternal(authUrl)
    Browser->>Keycloak: GET /auth?code_challenge=...&state=...
    Keycloak-->>Browser: ログイン画面表示
    User->>Browser: メールアドレス・パスワード入力
    Browser->>Keycloak: ログイン送信
    Keycloak-->>Desktop: tumiki://cloud-auth/callback?code=xxx&state=yyy
    Desktop->>Desktop: state 検証（CSRF チェック）
    Desktop->>Keycloak: POST /token（code + codeVerifier）
    Keycloak-->>Desktop: access_token / refresh_token / id_token
    Desktop->>Desktop: encryptToken()
    Desktop->>DB: authToken.create({ profileType: "personal-cloud" })
    Desktop->>Desktop: startAutoRefresh()
    Desktop-->>User: 認証完了・動的ツール検索 ON
```

### 3.4 組織プロファイルの Keycloak 選択フロー

```mermaid
sequenceDiagram
    actor User
    participant Desktop as Desktop App
    participant Browser as 外部ブラウザ
    participant KC_Cloud as Tumiki Cloud Keycloak
    participant KC_Self as セルフホスト Keycloak<br/>(Manager 管理)

    User->>Desktop: 「組織で使う」を選択
    Desktop-->>User: Keycloak ホスティング選択画面

    alt Tumiki Cloud を使う
        User->>Desktop: 「Tumiki Cloud Keycloak」を選択
        Desktop->>Browser: shell.openExternal(authUrl)
        Browser->>KC_Cloud: 認証フロー（個人プロファイルと同様）
        KC_Cloud-->>Desktop: トークン発行
    else セルフホストを使う
        User->>Desktop: 「セルフホスト」を選択
        Desktop-->>User: Manager URL 入力画面
        User->>Desktop: Manager URL を入力
        Desktop->>Browser: shell.openExternal(authUrl)
        Browser->>KC_Self: 認証フロー
        KC_Self-->>Desktop: トークン発行
    end

    Desktop-->>User: 認証完了・セットアップ完了
```

### 3.5 Personal Cloud Profile の状態管理

```typescript
// 追加する型（shared/types.ts）
type PersonalCloudProfile = {
  connectedAt: string
  email: string        // id_token から取得
  displayName: string  // id_token から取得
}

// ProfileState に追加
type ProfileState = {
  activeProfile: DesktopProfile | null
  organizationProfile: OrganizationProfile | null
  personalCloudProfile: PersonalCloudProfile | null  // ← 追加（personal 選択時は必ず設定）
  hasCompletedInitialProfileSetup: boolean
}
```

### 3.6 トークンストレージ

既存の `db.authToken` テーブルをそのまま活用する。  
組織プロファイルのトークンと衝突しないよう `profileType` カラムを追加する。

```prisma
// packages/db/prisma/schema.prisma に追加
model AuthToken {
  id           String   @id @default(cuid())
  profileType  String   @default("organization")  // "organization" | "personal-cloud"
  accessToken  String
  refreshToken String?
  idToken      String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())
}
```

---

## 4. Tumiki Cloud API 設計

### 4.1 エンドポイント

```
POST https://cloud.tumiki.app/api/v1/tool-search
Authorization: Bearer <access_token>
Content-Type: application/json
```

**リクエスト**:
```json
{
  "query": "ファイルを読みたい",
  "tools": [
    {
      "name": "filesystem__read_file",
      "description": "ファイルを読み込む",
      "serverName": "filesystem"
    }
  ],
  "maxResults": 10
}
```

**レスポンス**:
```json
{
  "tools": [
    {
      "name": "filesystem__read_file",
      "description": "ファイルを読み込む",
      "relevanceScore": 0.95
    }
  ],
  "cached": false,
  "durationMs": 380
}
```

### 4.2 Vercel AI Gateway の活用

```typescript
// Cloud API 内部（Vercel Next.js）
import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

const { object } = await generateObject({
  model: anthropic("claude-haiku-4-5"),  // 安価・高速モデル
  schema: z.object({
    selectedTools: z.array(z.string()),
  }),
  prompt: buildToolSelectionPrompt(query, tools),
})
```

**選定理由**:
- claude-haiku / gpt-4o-mini レベルで十分（構造化出力タスク）
- Vercel AI SDK の `generateObject` で型安全なレスポンス
- Vercel KV でキャッシュ（同一クエリ・同一ツールセットは再利用）

### 4.3 キャッシュ戦略

```mermaid
flowchart LR
    Q["リクエスト\nquery + tools[]"]
    K["キャッシュキー\nSHA256(query + sorted tool_names)"]
    HIT{"Vercel KV\nキャッシュヒット?"}
    LLM["Vercel AI Gateway\nLLM 推論"]
    STORE["Vercel KV に保存\nTTL: 24h"]
    RES["レスポンス返却"]

    Q --> K --> HIT
    HIT -->|"Yes"| RES
    HIT -->|"No"| LLM --> STORE --> RES
```

---

## 5. Desktop 側の実装設計

### 5.1 TumikiCloudClient（新規）

**配置**: `apps/desktop/src/main/cloud/tumiki-cloud-client.ts`

```typescript
type TumikiCloudClient = {
  searchTools: (query: string, tools: McpToolInfo[]) => Promise<McpToolInfo[]>
  isAuthenticated: () => Promise<boolean>
}

const createTumikiCloudClient = (cloudApiBaseUrl: string): TumikiCloudClient => {
  // 1. db から personal-cloud トークンを取得
  // 2. POST /api/v1/tool-search
  // 3. Cloud API 失敗(401 / タイムアウト等) → キーワードマッチにフォールバック
}
```

### 5.2 stdio-inbound.ts の変更

**動的検索モード** が有効な場合のみ `tools/list` の返却内容を変更する。

```typescript
// ListTools: 動的検索モード時はメタツールのみ返す
server.setRequestHandler(ListToolsRequestSchema, async () => {
  if (isDynamicSearchEnabled) {
    return {
      tools: [
        {
          name: "tumiki__search_tools",
          description: "クエリでツールを検索して候補一覧を返す",
          inputSchema: { ... }
        },
        {
          name: "tumiki__call_tool",
          description: "指定したツールを実行する",
          inputSchema: { ... }
        },
      ]
    }
  }
  // 既存動作（全ツール返却）
  const tools = await core.listTools()
  return { tools }
})

// tumiki__search_tools の実装
// tumiki__call_tool の実装（core.callTool に委譲）
```

### 5.3 フォールバック戦略

個人プロファイルは認証必須のため「未認証」ルートは存在しない。
Cloud API の一時的な障害に備えてキーワードマッチにフォールバックする。

```mermaid
flowchart TD
    CALL["tumiki__search_tools(query) 呼び出し"]
    API["Cloud API 呼び出し\n（Bearer Token 付き）"]
    OK{"レスポンス\n正常?"}
    LLM_RES["LLM フィルタ済みツールを返す"]
    KW["キーワードマッチ\n(tool.name + description\nに部分一致検索)"]

    CALL --> API --> OK
    OK -->|"200 OK"| LLM_RES
    OK -->|"401 / 5xx\nタイムアウト"| KW
```

---

## 6. UI フロー

```mermaid
flowchart TD
    START["初回セットアップ画面"]
    SEL{"プロファイル選択"}

    subgraph PERSONAL_FLOW["個人プロファイル"]
        P1["Tumiki Cloud Keycloak\n認証フロー開始（必須）"]
        P2["認証完了\n動的ツール検索 ON"]
    end

    subgraph ORG_FLOW["組織プロファイル"]
        O1{"Keycloak\nホスティング選択"}
        O2["Tumiki Cloud Keycloak\n認証フロー"]
        O3["セルフホスト\nManager URL 入力"]
        O4["セルフホスト Keycloak\n認証フロー"]
        O5["認証完了\nセットアップ完了"]
    end

    START --> SEL
    SEL -->|"個人で使う"| P1 --> P2
    SEL -->|"組織で使う"| O1
    O1 -->|"Tumiki Cloud"| O2 --> O5
    O1 -->|"セルフホスト"| O3 --> O4 --> O5
```

---

## 7. セキュリティ考慮点

| 項目 | 対策 |
|---|---|
| トークン保護 | 既存の `encryptToken` / `decryptToken` をそのまま利用 |
| ツール定義の送信 | tool.name + tool.description のみ送信（inputSchema は送らない） |
| PKCE 必須 | 既存の `generateCodeVerifier` / `generateCodeChallenge` を流用 |
| state 検証 | CSRF 対策は既存ロジックと同一パターン |
| Cloud API の JWT 検証 | Keycloak の公開鍵で署名検証（JWKS endpoint 利用） |

---

## 8. 実装フェーズ

### Phase 1 — 認証基盤

- [ ] `personalCloudProfile` 型追加（`shared/types.ts`）
- [ ] `AuthToken` テーブルに `profileType` カラム追加（DB マイグレーション）
- [ ] `profile-store.ts` に `connectPersonalCloud` / `disconnectPersonalCloud` 追加
- [ ] `cloud-oauth-manager.ts` 作成（既存 `oauth-manager.ts` をベースに Tumiki Cloud 向け固定設定）
- [ ] 組織プロファイルに Keycloak ホスティング選択 UI 追加
- [ ] IPC ハンドラ追加（`ipc/cloud-auth.ts`）
- [ ] UI: 個人プロファイル選択時に Keycloak 認証を自動開始

### Phase 2 — Cloud API 構築（Vercel）

- [ ] `POST /api/v1/tool-search` 実装
- [ ] Keycloak JWT 検証ミドルウェア
- [ ] Vercel AI Gateway + generateObject 実装
- [ ] Vercel KV キャッシュ実装

### Phase 3 — 動的ツール検索統合

- [ ] `TumikiCloudClient` 作成（`apps/desktop/src/main/cloud/`）
- [ ] `stdio-inbound.ts` に `tumiki__search_tools` / `tumiki__call_tool` 追加
- [ ] `ProxyHooks` にクラウドクライアント注入
- [ ] フォールバック（キーワードマッチ）実装

### Phase 4 — 改善・モニタリング

- [ ] 検索精度の計測（どのクエリでどのツールが選ばれたか）
- [ ] キャッシュヒット率モニタリング
- [ ] ローカル埋め込み検索の検討（エンタープライズ向けプライバシー対応）

---

## 9. 未決事項

| 項目 | 検討内容 |
|---|---|
| ツール定義の送信範囲 | description のみか inputSchema まで含めるか（精度 vs プライバシー） |
| `tumiki__call_tool` の必要性 | AI Client が直接 prefixed tool を呼べる場合は不要 |
| エンタープライズ向けプライベートモード | ツール定義をクラウドに送らずローカル埋め込みで検索 |
| 個人ユーザーの課金モデル | 将来的な Pro プランへの誘導設計 |
