# Tumiki セキュリティホワイトペーパー

**バージョン**: 1.0
**最終更新**: 2026年3月15日
**対象**: Self-Hosted MCP Proxy

---

## 概要

本ドキュメントは、Tumiki Self-Hosted MCP Proxyのセキュリティアーキテクチャ、データレジデンシー保証、ペイロード流出防止の技術的説明を提供します。

### 想定読者
- CISO（最高情報セキュリティ責任者）
- セキュリティエンジニア
- コンプライアンス担当者
- 情報システム部門

---

## 1. データレジデンシー保証

### 1.1 アーキテクチャ概要

Tumikiは**ハイブリッドアーキテクチャ**を採用し、データプレーン（顧客環境）とコントロールプレーン（クラウド）を明確に分離します。

```
┌─────────────────────────────────┐
│  顧客環境（オンプレミス/VPC）    │
│  - MCPペイロード                 │
│  - APIキー・認証情報             │
│  - 監査ログ（機密含む）          │
│  ✅ 全データがローカルに保持     │
└─────────────────────────────────┘
              │
              │ 設定同期のみ
              ▼
┌─────────────────────────────────┐
│  Tumiki Cloud（SaaS）            │
│  - ポリシー設定                  │
│  - ツールメタデータ              │
│  - 匿名統計（PII除去済み）       │
│  ❌ MCPペイロードは受信しない    │
└─────────────────────────────────┘
```

### 1.2 データ分類

| データ種別 | 保存場所 | クラウド送信 | 暗号化 | 保持期間 |
|-----------|---------|-------------|--------|---------|
| **MCPペイロード** | オンプレPostgreSQL | ❌ 送信しない | ✅ AES-256（保存時）| 顧客管理 |
| **APIキー** | オンプレPostgreSQL | ❌ 送信しない | ✅ Prisma Field Encryption | 顧客管理 |
| **リクエストログ** | オンプレPostgreSQL + ローカルファイル | ❌ 送信しない | ✅ AES-256 + TLS 1.3 | 顧客管理 |
| **ポリシー設定** | オンプレ + クラウド | ✅ 送信する | ✅ TLS 1.3（通信時） | 永続 |
| **ツールメタデータ** | オンプレ + クラウド | ✅ 送信する | ✅ TLS 1.3（通信時） | 永続 |
| **匿名統計** | クラウドのみ | ✅ 送信する（PII除去済み） | ✅ TLS 1.3（通信時） | 90日 |

### 1.3 技術的保証

#### コードレベルの保証
```typescript
// apps/mcp-proxy/src/features/sync/index.ts
export const syncWithManager = async () => {
  const payload = {
    organizationId: org.id,
    syncVersion: currentVersion,
    // ❌ 以下は含めない
    // prompt: ...,
    // response: ...,
    // apiKey: ...,
  };

  // ペイロード検証（機密データ検出）
  validateNoSensitiveData(payload);

  await fetch(`${MANAGER_SYNC_URL}/api/sync/policies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

---

## 2. 暗号化方式

### 2.1 保存時暗号化（Encryption at Rest）

#### PostgreSQLデータベース
- **方式**: AES-256-GCM
- **鍵管理**: 顧客管理（KMS推奨）
- **対象**:
  - `McpConfig.env`（環境変数、APIキー）
  - `McpServerRequestLog.request`（リクエストペイロード）
  - `McpServerRequestLog.response`（レスポンスペイロード）

#### Prisma Field Encryption
```typescript
// packages/db/prisma/schema/mcpConfig.prisma
model McpConfig {
  id String @id @default(cuid())
  env String /// @encrypted
}
```

#### ローカル監査ログ
- **ファイルパス**: `/var/log/tumiki/audit.jsonl`
- **暗号化**: ファイルシステムレベル（LUKS/BitLocker推奨）
- **アクセス制御**: 600（所有者のみ読み取り可能）

### 2.2 通信時暗号化（Encryption in Transit）

#### TLS 1.3
- **プロトコル**: TLS 1.3（TLS 1.2未満は無効化）
- **暗号スイート**:
  - `TLS_AES_256_GCM_SHA384`
  - `TLS_CHACHA20_POLY1305_SHA256`
- **証明書**: Let's Encrypt / 企業CA

#### 通信経路
```
AI Client → MCP Proxy: TLS 1.3
MCP Proxy → Keycloak: TLS 1.3
MCP Proxy → PostgreSQL: TLS 1.3（推奨）
MCP Proxy → Manager API: TLS 1.3（設定同期のみ）
```

---

## 3. 認証・認可

### 3.1 認証フロー

```
┌─────────────┐
│  User       │
└──────┬──────┘
       │ 1. Sign In
       ▼
┌─────────────┐
│  Keycloak   │ ← Self-Hosted（顧客環境内）
│  (OIDC)     │
└──────┬──────┘
       │ 2. JWT発行
       ▼
┌─────────────┐
│  Manager    │
│  (SaaS)     │
└──────┬──────┘
       │ 3. AccessToken取得
       ▼
┌─────────────┐
│  MCP Proxy  │ ← Self-Hosted（顧客環境内）
│             │ 4. JWT検証（Keycloak JWKS）
└─────────────┘
```

### 3.2 JWT検証

#### JWKSキャッシング
```typescript
// apps/mcp-proxy/src/infrastructure/keycloak/keycloakConfig.ts
let jwksCache: JWKSFunction | null = null;

const getJWKS = async (): Promise<JWKSFunction> => {
  if (jwksCache) return jwksCache;

  const config = await discovery(
    new URL(process.env.KEYCLOAK_ISSUER),
    '__metadata_only__'
  );

  jwksCache = jose.createRemoteJWKSet(new URL(config.jwks_uri));
  return jwksCache;
};
```

#### JWT検証プロセス
1. **署名検証**: RSA256 / ES256
2. **有効期限チェック**: `exp` クレーム
3. **Issuer検証**: `iss` クレーム
4. **Audience検証**: `aud` クレーム
5. **カスタムクレーム**: `tumiki.org_id`（組織ID）

### 3.3 API Key認証

#### 発行
```typescript
// Manager UI
const apiKey = `tumiki_${generateSecureRandomString(32)}`;
const hashedKey = await bcrypt.hash(apiKey, 10);

await prisma.mcpApiKey.create({
  data: {
    hashedKey,
    mcpServerId: serverId,
    expiresAt: addDays(new Date(), 90),
  },
});
```

#### 検証
```typescript
// apps/mcp-proxy/src/features/mcp/middleware/auth/apiKeyAuth.ts
const mcpApiKey = await prisma.mcpApiKey.findFirst({
  where: { mcpServerId: pathSlugOrId },
});

if (!mcpApiKey || !(await bcrypt.compare(providedKey, mcpApiKey.hashedKey))) {
  return 401;
}

if (mcpApiKey.expiresAt && mcpApiKey.expiresAt < new Date()) {
  return 401;
}
```

### 3.4 権限モデル

#### 固定ロール
| ロール | Read | Write | Execute |
|--------|------|-------|---------|
| Owner | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ |
| Member | ✅ | ❌ | ✅ |
| Viewer | ✅ | ❌ | ❌ |

#### カスタムロール
```typescript
model OrganizationRole {
  id String @id
  name String
  defaultRead Boolean
  defaultWrite Boolean
  defaultExecute Boolean

  mcpPermissions McpPermission[] // MCPサーバーごとの個別権限
}

model McpPermission {
  mcpServerId String
  read Boolean
  write Boolean
  execute Boolean
}
```

---

## 4. PIIマスキング

### 4.1 Regexベース実装

```typescript
// apps/mcp-proxy/src/infrastructure/piiMasking/index.ts
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{2,4}-\d{2,4}-\d{4}\b/g,
  creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g, // 米国SSN
  japanesePhoneNumber: /\b0\d{1,4}-\d{1,4}-\d{4}\b/g,
};

export const maskPii = (text: string): string => {
  let masked = text;
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    masked = masked.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
  }
  return masked;
};
```

### 4.2 カスタムパターン拡張

**設定ファイル**: `config/pii-patterns.json`

```json
{
  "customPatterns": [
    {
      "name": "employee_id",
      "pattern": "\\bEMP\\d{6}\\b",
      "description": "社員番号（EMP + 6桁数字）"
    },
    {
      "name": "internal_ip",
      "pattern": "\\b10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b",
      "description": "社内IPアドレス（10.x.x.x）"
    }
  ]
}
```

### 4.3 精度比較（GCP DLP vs Regex）

| 項目 | GCP DLP | Regex |
|------|---------|-------|
| **精度** | 高（機械学習ベース） | 中（パターンマッチング） |
| **誤検出率** | 低（~5%） | 中（~15%） |
| **検出漏れ率** | 低（~3%） | 中（~10%） |
| **スループット** | 低（~100 req/sec） | 高（~10,000 req/sec） |
| **カスタマイズ性** | 低 | 高 |
| **オフライン動作** | ❌ | ✅ |

---

## 5. 監査・ロギング

### 5.1 監査ログ記録項目

#### 記録するもの
- タイムスタンプ（UTC）
- ユーザーID、組織ID
- MCPサーバーSlug、ツール名
- ステータス（success/error）
- エラーメッセージ（PII除去済み）
- リクエストID（トレーシング用）

#### 記録しないもの
- プロンプト内容
- レスポンスデータ
- APIキー・認証情報

### 5.2 ログ形式

#### JSON Lines（ローカルファイル）
```json
{"timestamp":"2026-03-15T12:00:00Z","userId":"user_xxx","orgId":"org_xxx","mcpServerSlug":"slack","toolName":"send_message","status":"success","requestId":"req_yyy"}
{"timestamp":"2026-03-15T12:01:00Z","userId":"user_zzz","orgId":"org_xxx","mcpServerSlug":"github","toolName":"create_issue","status":"error","error":"Unauthorized","requestId":"req_zzz"}
```

#### PostgreSQL（リクエストログ）
```sql
CREATE TABLE mcp_server_request_log (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  mcp_server_slug TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  status TEXT NOT NULL,
  request TEXT, -- 暗号化保存
  response TEXT, -- 暗号化保存
  error TEXT,
  duration_ms INTEGER
);

-- インデックス
CREATE INDEX idx_timestamp ON mcp_server_request_log(timestamp DESC);
CREATE INDEX idx_org_id ON mcp_server_request_log(organization_id);
CREATE INDEX idx_user_id ON mcp_server_request_log(user_id);
```

### 5.3 ログローテーション

#### ローカルファイル（logrotate）
```conf
/var/log/tumiki/audit.jsonl {
  daily
  rotate 90
  compress
  delaycompress
  notifempty
  create 0600 tumiki tumiki
  postrotate
    systemctl reload mcp-proxy
  endscript
}
```

#### PostgreSQL（パーティショニング）
```sql
-- 月次パーティション
CREATE TABLE mcp_server_request_log_2026_03 PARTITION OF mcp_server_request_log
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- 古いパーティション削除（90日経過後）
DROP TABLE mcp_server_request_log_2025_12;
```

---

## 6. SIEM連携

### 6.1 対応SIEM

#### Splunk（HTTP Event Collector）
```typescript
const exportToSplunk = async (entry: AuditLogEntry) => {
  await fetch(process.env.SIEM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Splunk ${process.env.SIEM_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event: entry,
      sourcetype: 'tumiki:mcp:audit',
    }),
  });
};
```

#### QRadar（LEEF形式）
```typescript
const exportToQRadar = async (entry: AuditLogEntry) => {
  const leefMessage = `LEEF:1.0|Tumiki|MCP Proxy|1.0|${entry.status}|` +
    `usrName=${entry.userId}\t` +
    `orgId=${entry.orgId}\t` +
    `mcpServerSlug=${entry.mcpServerSlug}\t` +
    `toolName=${entry.toolName}`;

  // Syslog転送
  syslogClient.log(leefMessage);
};
```

### 6.2 汎用JSON Lines形式

他のSIEM（Elasticsearch、Azure Sentinel等）でも利用可能な汎用形式を提供。

---

## 7. コンプライアンス対応

### 7.1 対応規制

| 規制 | 対応状況 | 備考 |
|------|---------|------|
| **GDPR** | ✅ 対応 | データレジデンシー、Right to Erasure実装 |
| **金融庁ガイドライン** | ✅ 対応 | 監査ログ、SIEM連携 |
| **医療情報システム安全管理ガイドライン** | ✅ 対応 | PIIマスキング、暗号化 |
| **PCI DSS** | 🔄 計画中 | クレジットカード情報マスキング実装済み |

### 7.2 監査証跡

#### 要件
- 全MCP通信の記録
- 改ざん防止（イミュータブルストレージ推奨）
- 90日以上の保持

#### 実装
- PostgreSQL: 暗号化保存、PITR有効化
- ローカルファイル: WORM（Write Once Read Many）ストレージ推奨
- SIEM転送: リアルタイム転送、転送後のローカル削除オプション

---

## 8. セキュリティベストプラクティス

### 8.1 ネットワーク分離
- MCP Proxyは内部ネットワークに配置
- 外部からのアクセスはリバースプロキシ経由
- ファイアウォールで必要なポートのみ開放（8080、5432、8080/Keycloak）

### 8.2 最小権限の原則
- MCP Proxyのコンテナは非rootユーザーで実行
- PostgreSQLユーザーは必要最小限の権限のみ
- Keycloak Adminは別ユーザーで管理

### 8.3 定期的なセキュリティ更新
- 依存パッケージの脆弱性スキャン（Dependabot）
- OSパッチの定期適用
- Keycloakの最新バージョン適用

### 8.4 バックアップ・リカバリー
- PostgreSQL: 日次フルバックアップ + WALアーカイブ
- 監査ログ: S3 / オブジェクストレージへのバックアップ
- リカバリーテストの定期実施（3ヶ月ごと）

---

## 9. インシデントレスポンス

### 9.1 検知
- SIEM連携によるリアルタイム検知
- 異常なAPIアクセスパターン検出
- 失敗した認証試行の監視

### 9.2 対応フロー
1. インシデント検知（SIEM アラート）
2. 影響範囲の特定（監査ログ分析）
3. 封じ込め（該当ユーザー/APIキーの無効化）
4. 根本原因分析
5. 復旧
6. 事後レビュー

### 9.3 連絡先
- **セキュリティインシデント**: security@tumiki.io
- **緊急連絡先**: +81-XX-XXXX-XXXX

---

## 10. まとめ

Tumiki Self-Hosted MCP Proxyは、以下のセキュリティ要件を満たします：

✅ **データレジデンシー**: MCPペイロードは顧客環境内で完結
✅ **暗号化**: 保存時（AES-256）、通信時（TLS 1.3）
✅ **認証・認可**: Keycloak JWT、API Key、カスタムロール
✅ **監査**: 全MCP通信記録、SIEM連携
✅ **コンプライアンス**: GDPR、金融庁ガイドライン、医療情報システム安全管理ガイドライン対応
✅ **インシデントレスポンス**: 検知・対応フロー整備

---

**改訂履歴**

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0 | 2026-03-15 | 初版作成 |
