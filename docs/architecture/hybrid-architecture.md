# Tumiki ハイブリッドアーキテクチャ設計書

## 概要

Tumikiは、日本のエンタープライズ顧客（金融・製造・医療）のセキュリティ要件に対応するため、「**データプレーンはオンプレミス、コントロールプレーンはクラウド**」というハイブリッドアーキテクチャを採用します。

### 設計原則

1. **データレジデンシー**: MCPペイロード（プロンプト、APIキー、レスポンス）は顧客環境内で完結
2. **設定の一元管理**: ポリシー・ツールメタデータはクラウドで一元管理
3. **ゼロトラストセキュリティ**: すべての通信を認証・暗号化
4. **コンプライアンス対応**: 金融庁ガイドライン、GDPR、医療情報システム安全管理ガイドライン準拠

---

## アーキテクチャ全体像

```
┌─────────────────────────────────────────────────────────────────┐
│                  顧客環境（オンプレミス/VPC）                     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Self-Hosted MCP Proxy (Data Plane)                         │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │  MCPゲートウェイ                                       │  │ │
│  │  │  - MCP SDK Server (JSON-RPC 2.0)                      │  │ │
│  │  │  - SSE/STREAMABLE_HTTPS Transport                     │  │ │
│  │  │  - 全MCP通信の監視・ログ取得                          │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │  認証・認可                                            │  │ │
│  │  │  - Keycloak JWT検証                                   │  │ │
│  │  │  - API Key認証                                        │  │ │
│  │  │  - カスタムロール・権限管理                           │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │  セキュリティ機能                                      │  │ │
│  │  │  - PIIマスキング（Regexベース）                       │  │ │
│  │  │  - レート制限                                         │  │ │
│  │  │  - プロンプト検査                                     │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │  監査・ロギング                                        │  │ │
│  │  │  - PostgreSQL（全リクエスト記録）                     │  │ │
│  │  │  - ローカルファイル（JSON Lines）                     │  │ │
│  │  │  - SIEM連携（Splunk/QRadar）                          │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  └──────────────┬──────────────────────────────────────────────┘ │
│                 │ MCP通信（社外に出ない）                        │
│  ┌──────────────▼──────────────────────────────────────────────┐ │
│  │  MCPサーバー群（顧客管理）                                  │ │
│  │  - STDIO: mcp-wrapper経由で動的起動                        │ │
│  │  - SSE: リモートMCPサーバー                                │ │
│  │  - STREAMABLE_HTTPS: HTTP MCPサーバー                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL（機密データ保持）                               │ │
│  │  - McpServer, McpConfig（暗号化保存）                      │ │
│  │  - McpServerRequestLog（全MCP通信履歴）                    │ │
│  │  - PITR対応、自動バックアップ                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Self-Hosted Keycloak（認証基盤）                           │ │
│  │  - 組織・ユーザー管理                                       │ │
│  │  - JWT発行・検証                                            │ │
│  │  - OAuth 2.1 / OIDC                                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────────────────┘
                        │
                        │ 設定同期のみ（HTTPS/Pull型、30分ごと）
                        │
                        │ ✅ 送信するもの:
                        │    - ポリシー設定（OrganizationRole, McpPermission）
                        │    - ツールメタデータ（McpServerTemplate, McpTool）
                        │    - 匿名化統計（リクエスト数、エラー率のみ）
                        │
                        │ ❌ 送信しないもの:
                        │    - MCPペイロード（プロンプト、レスポンス）
                        │    - APIキー・認証情報
                        │    - 個人情報（PII）
                        │
┌───────────────────────▼─────────────────────────────────────────────┐
│              Tumiki Manager (Control Plane / SaaS)                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  管理UI                                                      │   │
│  │  - ポリシー設定（Next.js + tRPC）                           │   │
│  │  - ツールメタデータ管理                                      │   │
│  │  - 利用統計ダッシュボード（匿名化済みのみ）                  │   │
│  │  - アラート設定・通知                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  設定同期API                                                 │   │
│  │  - POST /api/sync/policies（ポリシー配信）                  │   │
│  │  - POST /api/sync/toolMetadata（メタデータ配信）            │   │
│  │  - POST /api/sync/reportStats（匿名統計受信）               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Cloud PostgreSQL                                            │   │
│  │  - Organization, User（メタデータのみ）                     │   │
│  │  - McpServerTemplate, McpTool（テンプレート）               │   │
│  │  - OrganizationRole, McpPermission（ポリシー）              │   │
│  │  - AnonymousStat（匿名化統計のみ）                          │   │
│  │  - ❌ McpServerRequestLog は保存しない                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## コンポーネント詳細

### 1. Self-Hosted MCP Proxy（データプレーン）

#### 役割
- MCPゲートウェイとして全MCP通信を処理
- 認証・認可・監査・ログ取得を実施
- ペイロードは顧客環境内で完結（外部送信なし）

#### 技術スタック
- **フレームワーク**: Hono（軽量HTTPフレームワーク）
- **MCP SDK**: @modelcontextprotocol/sdk
- **認証**: Keycloak JWT、API Key
- **データベース**: PostgreSQL（統計・メタデータのみ）
- **ログ**: JSON Lines（ローカルファイル、全ペイロード）+ PostgreSQL（統計のみ）+ SIEM連携

#### 主要機能

##### MCPプロトコル処理
- `initialize`: MCPサーバー初期化
- `listTools`: ツール一覧取得
- `callTool`: ツール実行

##### セキュリティ機能
- **PIIマスキング**: Regexベース（Email、電話番号、クレジットカード等）
- **レート制限**: ユーザー・組織単位
- **プロンプト検査**: 禁止ワード・パターン検出

##### 監査・ロギング
- **PostgreSQL**: 全リクエストを記録（`McpServerRequestLog`）
- **ローカルファイル**: JSON Lines形式（`/var/log/tumiki/audit.jsonl`）
- **SIEM連携**: Splunk HEC、QRadar LEEF形式

#### Google Cloud依存の柔軟化

| 項目 | 従来（Cloud Run版） | Self-Hosted版 |
|------|-------------------|---------------|
| **ロギング** | Google Cloud Pub/Sub → BigQuery | ローカルファイル（デフォルト）/ Pub/Sub（オプション）/ 両方 |
| **PIIマスキング** | GCP DLP | Regexベース（デフォルト）/ GCP DLP（オプション） |
| **認証** | Cloud Run IAM | オプション化（環境変数で無効化） |
| **依存パッケージ** | `@google-cloud/dlp`, `@google-cloud/pubsub` | optionalDependencies化（必要に応じてインストール） |

**環境変数による選択**:
```bash
# オンプレ環境（GCP不使用）
LOGGING_BACKEND=file
ENABLE_GCP_DLP=false
USE_CLOUD_RUN_AUTH=false

# GCP環境（既存資産活用）
LOGGING_BACKEND=pubsub
ENABLE_GCP_DLP=true
USE_CLOUD_RUN_AUTH=true

# ハイブリッド環境
LOGGING_BACKEND=both
ENABLE_GCP_DLP=false
USE_CLOUD_RUN_AUTH=false
```

### 2. Tumiki Manager（コントロールプレーン）

#### 役割
- ポリシー設定・ツールメタデータの一元管理
- 利用統計ダッシュボード（匿名化済みのみ）
- **重要**: MCPペイロードは一切受信しない

#### 技術スタック
- **フレームワーク**: Next.js 15（App Router、RSC）
- **API**: tRPC
- **データベース**: PostgreSQL（Vercel Postgres）
- **認証**: Keycloak（OAuth 2.1 / OIDC）

#### 設定同期API

##### エンドポイント
1. **POST /api/sync/policies**
   - 組織のポリシー設定を返却
   - `OrganizationRole`, `McpPermission`
   - 認証: 組織専用API Key

2. **POST /api/sync/toolMetadata**
   - ツールメタデータを返却
   - `McpServerTemplate`, `McpTool`
   - バージョン管理: ETag/Last-Modified

3. **POST /api/sync/reportStats**
   - 匿名化統計を受信
   - リクエスト数、エラー率のみ
   - **PII完全除去済み**

##### データフロー制限
```typescript
// ✅ 送信して良いデータ
type SyncableData = {
  policies: OrganizationRole[];
  permissions: McpPermission[];
  templates: McpServerTemplate[];
  tools: McpTool[];
  anonymousStats: {
    requestCount: number;
    errorRate: number;
    // PII除去済み
  };
};

// ❌ 送信してはいけないデータ
type ForbiddenData = {
  mcpPayload: never; // プロンプト、レスポンス
  apiKeys: never;
  pii: never; // 個人情報
  requestLogs: never; // 詳細ログ
};
```

### 3. Self-Hosted Keycloak（認証基盤）

#### 役割
- 組織・ユーザー管理
- JWT発行・検証
- OAuth 2.1 / OIDC準拠

#### Terraform管理
- Realm、クライアント、ロール設定をIaC化
- `terraform/keycloak/` で管理

---

## セキュリティ設計

### 1. ペイロード流出防止の技術的保証

#### 実装レベルの保証
```typescript
// apps/mcp-proxy/src/features/sync/index.ts
export const syncWithManager = async () => {
  // ✅ 送信データの検証
  const payload = {
    organizationId: org.id,
    syncVersion: currentVersion,
    // ❌ MCPペイロードは含めない
  };

  // ペイロード検証ユーティリティ
  validateNoSensitiveData(payload);

  await fetch(`${MANAGER_SYNC_URL}/api/sync/policies`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};
```

#### テストレベルの保証
```typescript
// apps/mcp-proxy/src/__tests__/security/noCloudLeak.test.ts
test('Manager APIへの通信にMCPペイロードが含まれないこと', async () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  await syncWithManager();

  const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

  // アサーション: 機密データが含まれないこと
  expect(requestBody).not.toHaveProperty('prompt');
  expect(requestBody).not.toHaveProperty('response');
  expect(requestBody).not.toHaveProperty('apiKey');
});
```

### 2. データ分類

| データ種別 | 保存場所 | クラウド送信 | 暗号化 |
|-----------|---------|-------------|--------|
| **MCPペイロード** | オンプレPostgreSQL | ❌ 送信しない | ✅ 保存時暗号化 |
| **APIキー** | オンプレPostgreSQL | ❌ 送信しない | ✅ Prisma Field Encryption |
| **リクエストログ** | オンプレPostgreSQL + ローカルファイル | ❌ 送信しない | ✅ 保存時暗号化 |
| **ポリシー設定** | オンプレ + クラウド | ✅ 送信する | ✅ TLS 1.3 |
| **ツールメタデータ** | オンプレ + クラウド | ✅ 送信する | ✅ TLS 1.3 |
| **匿名統計** | クラウドのみ | ✅ 送信する（PII除去済み） | ✅ TLS 1.3 |

### 3. 認証・認可

#### 認証フロー
```
User (Browser)
  ↓ 1. Sign In
Keycloak (Self-Hosted)
  ↓ 2. JWT発行
Manager (SaaS)
  ↓ 3. AccessToken取得
  ↓ 4. HTTP POST + Authorization: Bearer {token}
MCP Proxy (Self-Hosted)
  ↓ 5. JWT検証（Keycloak JWKS）
  ↓ 6. 権限チェック
MCP Server
```

#### 権限モデル
- **固定ロール**: Owner, Admin, Member, Viewer
- **カスタムロール**: デフォルト権限 + MCPサーバーごと個別権限
- **権限種別**: read, write, execute

---

## 設定同期メカニズム

### Pull型同期（30分ごと + 手動トリガー）

#### フロー
```
┌─────────────────┐
│  MCP Proxy      │
│  (Self-Hosted)  │
└────────┬────────┘
         │ 1. 定期: 30分ごと
         │    手動: 管理者トリガー
         │
         ▼
┌────────────────────────────────────┐
│  同期クライアント                   │
│  - ポリシー取得                     │
│  - ツールメタデータ取得             │
│  - バージョン差分検出               │
└────────┬───────────────────────────┘
         │ 2. HTTPS POST
         │    + API Key認証
         ▼
┌─────────────────┐
│  Manager API    │
│  /api/sync/*    │
└────────┬────────┘
         │ 3. ポリシー返却
         │    + ETag
         ▼
┌────────────────────────────────────┐
│  ローカルキャッシュ（PostgreSQL）   │
│  - PolicySyncLog                   │
│  - MetadataSyncLog                 │
│  - 同期失敗時はキャッシュ継続使用   │
└────────────────────────────────────┘
```

#### 同期対象データ

##### ポリシー設定
```json
{
  "syncVersion": "v1.2.3",
  "policies": [
    {
      "roleId": "role_xxx",
      "roleName": "Developer",
      "defaultRead": true,
      "defaultWrite": false,
      "defaultExecute": true,
      "mcpPermissions": [
        {
          "mcpServerId": "server_xxx",
          "read": true,
          "write": false,
          "execute": true
        }
      ]
    }
  ]
}
```

##### ツールメタデータ
```json
{
  "syncVersion": "v1.2.3",
  "templates": [
    {
      "id": "template_xxx",
      "name": "Slack",
      "url": "https://mcp.slack.com",
      "transportType": "SSE",
      "tools": [
        {
          "name": "send_message",
          "description": "Send a message to a Slack channel",
          "inputSchema": { ... }
        }
      ]
    }
  ]
}
```

---

## デプロイメント

### docker-compose構成

```yaml
version: '3.8'

services:
  mcp-proxy:
    image: tumiki/mcp-proxy:latest
    ports:
      - "8080:8080"
    environment:
      - DEPLOYMENT_MODE=self-hosted
      - DATABASE_URL=postgresql://tumiki:password@db:5432/tumiki
      - KEYCLOAK_ISSUER=http://keycloak:8080/realms/tumiki
      - MANAGER_SYNC_URL=https://manager.tumiki.io/api/sync
      - MANAGER_SYNC_API_KEY=${MANAGER_SYNC_API_KEY}
    volumes:
      - audit-logs:/var/log/tumiki
    depends_on:
      - db
      - keycloak

  db:
    image: postgres:alpine3.18
    environment:
      - POSTGRES_USER=tumiki
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=tumiki
    volumes:
      - db-data:/var/lib/postgresql/data

  keycloak:
    image: quay.io/keycloak/keycloak:26.4
    environment:
      - KC_DB=postgres
      - KC_DB_URL=jdbc:postgresql://db:5432/keycloak
      - KC_DB_USERNAME=tumiki
      - KC_DB_PASSWORD=password
    depends_on:
      - db

volumes:
  db-data:
  audit-logs:
```

### セットアップ手順

```bash
# 1. リポジトリクローン
git clone https://github.com/rayven122/tumiki.git
cd tumiki

# 2. 環境変数設定
cp docker/self-hosted/.env.template .env
# .envファイルを編集

# 3. Docker Compose起動
cd docker/self-hosted
docker compose up -d

# 4. Keycloak初期設定
cd ../../terraform/keycloak
terraform init
terraform apply

# 5. ヘルスチェック
curl http://localhost:8080/health
```

---

## 監査・コンプライアンス

### 監査ログ

#### 記録項目
- タイムスタンプ
- ユーザーID、組織ID
- MCPサーバーSlug、ツール名
- ステータス（success/error）
- エラーメッセージ（PII除去済み）
- **除外**: プロンプト内容、レスポンスデータ

#### 形式
JSON Lines（`/var/log/tumiki/audit.jsonl`）

```json
{"timestamp":"2026-03-15T12:00:00Z","userId":"user_xxx","orgId":"org_xxx","mcpServerSlug":"slack","toolName":"send_message","status":"success"}
{"timestamp":"2026-03-15T12:01:00Z","userId":"user_yyy","orgId":"org_xxx","mcpServerSlug":"github","toolName":"create_issue","status":"error","error":"Unauthorized"}
```

### SIEM連携

#### 対応SIEM
- **Splunk**: HTTP Event Collector (HEC)
- **QRadar**: LEEF形式

#### 環境変数
```bash
SIEM_TYPE=splunk
SIEM_ENDPOINT=https://splunk.example.com:8088/services/collector
SIEM_TOKEN=xxx
```

---

## 参考アーキテクチャ

| 製品 | アーキテクチャ | Tumikiへの適用 |
|------|--------------|---------------|
| **Kong Gateway** | Control Plane（クラウド）+ Data Plane（オンプレ） | 設定同期メカニズムの参考 |
| **Golf (YC X25)** | Firewallオンプレ、設定・可視化SaaS | ハイブリッドモデルの参考 |
| **GitHub Copilot Enterprise** | アローリスト管理クラウド、通信社内 | データレジデンシーの考え方 |
| **Palantir AIPF** | DE現地常駐、通信データ社外持ち出し禁止 | コンプライアンス要件の参考 |

---

## まとめ

Tumikiのハイブリッドアーキテクチャは、以下の要件を満たします：

✅ **セキュリティ**: MCPペイロードは顧客環境内で完結、外部送信なし
✅ **コンプライアンス**: 金融庁ガイドライン、GDPR、医療情報システム安全管理ガイドライン準拠
✅ **運用性**: docker-compose一発起動、簡単なセットアップ
✅ **拡張性**: SIEM連携、カスタムロール、ポリシー管理
✅ **監査**: 全MCP通信の記録、ローカル保存 + SIEM連携
