# ハイブリッドアーキテクチャ実装計画

## 概要

本ドキュメントは、Tumikiのハイブリッドアーキテクチャ実装の詳細計画を記載します。

### 実装方針
- **スコープ**: フル実装（設定同期、SIEM連携、監査ログ、セキュリティ検証）
- **期間**: 約7週間（6フェーズ + バッファ1週間）
- **優先要件**: ペイロード流出防止、簡単なセットアップ、監査・コンプライアンス対応

---

## 実装フェーズ

### Phase 1: Google Cloud依存削除とローカル化（2週間）

**目的**: mcp-proxyをオンプレ環境で動作可能にする

#### タスク

##### 1.1 Pub/Sub削除、PostgreSQL直接保存への切り替え
- **ファイル**: `apps/mcp-proxy/src/infrastructure/pubsub/mcpLogger.ts`
- **変更内容**:
  ```typescript
  // Before: Pub/Sub経由でBigQueryに送信
  await pubsub.topic(TOPIC_NAME).publishMessage({ data: Buffer.from(JSON.stringify(log)) });

  // After: PostgreSQL直接保存
  await prisma.mcpServerRequestLog.create({ data: log });
  ```
- **環境変数**: `ENABLE_BIGQUERY_LOGGING=false` で制御

##### 1.2 GCP DLP削除、Regexベース実装への置換
- **ファイル**: `apps/mcp-proxy/src/infrastructure/piiMasking/index.ts`
- **実装内容**:
  ```typescript
  // Regexパターン定義
  const PII_PATTERNS = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b\d{2,4}-\d{2,4}-\d{4}\b/g,
    creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  };

  export const maskPiiWithRegex = (text: string): string => {
    let masked = text;
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      masked = masked.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
    }
    return masked;
  };
  ```
- **設定ファイル**: `config/pii-patterns.json` で拡張可能

##### 1.3 Cloud Run Auth削除
- **ファイル**: `apps/mcp-proxy/src/infrastructure/mcp/cloudRunAuth.ts`
- **変更**: 完全削除または条件分岐で無効化
- **影響範囲**: `authHeaderInjector.ts` の Cloud Run IAM 分岐削除

##### 1.4 package.json依存関係整理
- **ファイル**: `apps/mcp-proxy/package.json`
- **削除**:
  ```json
  {
    "dependencies": {
      "@google-cloud/dlp": "削除",
      "@google-cloud/pubsub": "削除"
    },
    "optionalDependencies": {
      "google-auth-library": "移動（将来のハイブリッドモード用）"
    }
  }
  ```

##### 1.5 環境変数による動作モード制御
- **ファイル**: `apps/mcp-proxy/src/shared/constants/config.ts`
- **追加**:
  ```typescript
  export const DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || 'self-hosted'; // 'self-hosted' | 'cloud'

  export const FEATURES = {
    BIGQUERY_LOGGING: DEPLOYMENT_MODE === 'cloud',
    GCP_DLP: DEPLOYMENT_MODE === 'cloud',
    CLOUD_RUN_AUTH: DEPLOYMENT_MODE === 'cloud',
    SYNC_WITH_MANAGER: DEPLOYMENT_MODE === 'self-hosted',
    LOCAL_AUDIT_LOG: DEPLOYMENT_MODE === 'self-hosted',
  };
  ```

#### 検証
- [ ] Pub/Sub削除後もログがPostgreSQLに保存されることを確認
- [ ] Regex PIIマスキングの精度テスト（Email、電話番号、クレジットカード）
- [ ] Cloud Run Auth削除後も認証が正常動作することを確認

---

### Phase 2: 設定同期API実装（2週間）

**目的**: クラウドmanagerとの設定同期（ペイロード流出なし）

#### タスク

##### 2.1 Manager側: 設定同期APIルーター作成
- **ファイル**: `apps/manager/src/features/mcps/api/sync/router.ts`（新規）
- **実装**:
  ```typescript
  import { router, protectedProcedure } from "@/server/api/trpc";
  import { z } from "zod";

  export const syncRouter = router({
    policies: protectedProcedure
      .input(z.object({ organizationId: z.string(), syncVersion: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        // ポリシー設定返却
      }),

    toolMetadata: protectedProcedure
      .input(z.object({ syncVersion: z.string().optional() }))
      .mutation(async ({ input }) => {
        // ツールメタデータ返却
      }),

    reportStats: protectedProcedure
      .input(z.object({ organizationId: z.string(), stats: z.object({ ... }) }))
      .mutation(async ({ input }) => {
        // 匿名統計受信（PII完全除去済み）
      }),
  });
  ```

##### 2.2 Manager側: ポリシー同期実装
- **ファイル**: `apps/manager/src/features/mcps/api/sync/syncPolicies.ts`（新規）
- **実装**:
  ```typescript
  export const syncPolicies = async (organizationId: string) => {
    const roles = await prisma.organizationRole.findMany({
      where: { organizationId },
      include: { mcpPermissions: true },
    });

    return {
      syncVersion: generateVersion(),
      policies: roles.map(role => ({
        roleId: role.id,
        roleName: role.name,
        defaultRead: role.defaultRead,
        defaultWrite: role.defaultWrite,
        defaultExecute: role.defaultExecute,
        mcpPermissions: role.mcpPermissions,
      })),
    };
  };
  ```

##### 2.3 Manager側: ツールメタデータ同期実装
- **ファイル**: `apps/manager/src/features/mcps/api/sync/syncToolMetadata.ts`（新規）
- **実装**:
  ```typescript
  export const syncToolMetadata = async (lastSyncVersion?: string) => {
    const templates = await prisma.mcpServerTemplate.findMany({
      where: lastSyncVersion ? { updatedAt: { gt: new Date(lastSyncVersion) } } : {},
      include: { tools: true },
    });

    return {
      syncVersion: new Date().toISOString(),
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        url: t.url,
        transportType: t.transportType,
        tools: t.tools,
      })),
    };
  };
  ```

##### 2.4 Proxy側: 設定同期クライアント実装
- **ファイル**: `apps/mcp-proxy/src/features/sync/index.ts`（新規）
- **実装**:
  ```typescript
  // 30分ごとに同期（デフォルト、環境変数で変更可能）
  const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS) || 30 * 60 * 1000;

  export const initializeSync = () => {
    // 起動時に即座に同期
    syncPolicies().catch(console.error);
    syncToolMetadata().catch(console.error);

    // 定期同期
    setInterval(async () => {
      await syncPolicies();
      await syncToolMetadata();
    }, SYNC_INTERVAL_MS);
  };

  const syncPolicies = async () => {
    const response = await fetch(`${MANAGER_SYNC_URL}/api/sync/policies`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MANAGER_SYNC_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizationId: process.env.ORGANIZATION_ID,
        syncVersion: await getLastSyncVersion(),
      }),
    });

    const { policies, syncVersion } = await response.json();
    await savePoliciesLocally(policies, syncVersion);
  };

  // 手動同期トリガーAPI
  app.post('/api/sync/trigger', adminAuth, async (c) => {
    await syncPolicies();
    await syncToolMetadata();
    return c.json({ status: 'success', syncedAt: new Date().toISOString() });
  });
  ```

##### 2.5 Proxy側: ローカルキャッシュ実装
- **ファイル**: `apps/mcp-proxy/src/features/sync/policySync.ts`（新規）
- **実装**:
  ```typescript
  export const savePoliciesLocally = async (policies: Policy[], syncVersion: string) => {
    await prisma.$transaction([
      // 既存ポリシーを削除
      prisma.localPolicy.deleteMany(),
      // 新しいポリシーを保存
      prisma.localPolicy.createMany({ data: policies }),
      // 同期ログ記録
      prisma.policySyncLog.create({
        data: { syncVersion, syncedAt: new Date(), status: 'success' },
      }),
    ]);
  };

  // フォールバック: 同期失敗時はローカルキャッシュ使用
  export const getLocalPolicies = async () => {
    return await prisma.localPolicy.findMany();
  };
  ```

##### 2.6 Manager側: MCPサーバー管理APIの制限
- **ファイル**: `apps/manager/src/features/mcps/api/router.ts`
- **変更**:
  ```typescript
  export const userMcpServerRouter = router({
    // 削除機能を読み取り専用化
    delete: protectedProcedure.mutation(() => {
      throw new Error('Self-hosted版ではサーバー削除はローカルで行ってください');
    }),

    // ツール同期を読み取り専用化
    refreshTools: protectedProcedure.mutation(() => {
      throw new Error('Self-hosted版ではツール同期は自動で行われます');
    }),

    // execute権限のみ許可
    validatePermission: protectedProcedure.query(async ({ input }) => {
      // write権限チェックを削除
      return { canExecute: true };
    }),
  });
  ```

#### 検証
- [ ] 設定同期APIがポリシーのみを返却（ペイロードなし）することを確認
- [ ] Proxy側が30分ごとに同期することを確認
- [ ] 手動同期トリガーAPIが動作することを確認
- [ ] 同期失敗時にローカルキャッシュを使用することを確認

---

### Phase 3: Docker環境整備（1週間）

**目的**: Self-hosted版の簡単なセットアップ

#### タスク

##### 3.1 Dockerfileに統一
- **ファイル**: `apps/mcp-proxy/Dockerfile`
- **変更**: 環境変数でCloud版互換モード維持
- **最適化**: マルチステージビルド

##### 3.2 docker-compose.yaml作成
- **ファイル**: `docker/self-hosted/compose.yaml`（新規）
- **実装**: [アーキテクチャドキュメント参照](./architecture/hybrid-architecture.md#デプロイメント)

##### 3.3 環境変数テンプレート作成
- **ファイル**: `docker/self-hosted/.env.template`（新規）
- **内容**:
  ```bash
  # Deployment Mode
  DEPLOYMENT_MODE=self-hosted

  # Manager Sync
  MANAGER_SYNC_URL=https://manager.tumiki.io/api/sync
  MANAGER_SYNC_API_KEY=org_xxx

  # Database
  DATABASE_URL=postgresql://tumiki:password@db:5432/tumiki

  # Keycloak
  KEYCLOAK_ISSUER=http://keycloak:8080/realms/tumiki

  # SIEM (optional)
  SIEM_TYPE=splunk
  SIEM_ENDPOINT=https://splunk.example.com:8088/services/collector
  SIEM_TOKEN=xxx
  ```

##### 3.4 CI/CDパイプライン更新
- **ファイル**: `.github/workflows/docker-publish.yml`
- **変更**: タグを `tumiki/mcp-proxy:vX.X.X` に統一

##### 3.5 セットアップドキュメント作成
- **ファイル**: `docker/self-hosted/README.md`（新規）

#### 検証
- [ ] docker-compose up -d で起動することを確認
- [ ] ヘルスチェックが成功することを確認
- [ ] セットアップ時間が30分以内であることを確認

---

### Phase 4: 監査ログ・SIEM連携（1週間）

**目的**: コンプライアンス対応（金融庁ガイドライン等）

#### タスク

##### 4.1 ローカル監査ログ実装
- **ファイル**: `apps/mcp-proxy/src/features/audit/index.ts`（新規）
- **実装**:
  ```typescript
  import fs from 'fs';
  import path from 'path';

  const AUDIT_LOG_PATH = '/var/log/tumiki/audit.jsonl';

  export const writeAuditLog = (entry: AuditLogEntry) => {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: entry.userId,
      orgId: entry.orgId,
      mcpServerSlug: entry.mcpServerSlug,
      toolName: entry.toolName,
      status: entry.status,
      error: entry.error ? maskPii(entry.error) : undefined,
    }) + '\n';

    fs.appendFileSync(AUDIT_LOG_PATH, line);
  };
  ```

##### 4.2 SIEM連携アダプター実装
- **ファイル**: `apps/mcp-proxy/src/features/audit/siemExporter.ts`（新規）
- **実装**:
  ```typescript
  export const exportToSiem = async (entry: AuditLogEntry) => {
    const siemType = process.env.SIEM_TYPE;

    if (siemType === 'splunk') {
      await exportToSplunk(entry);
    } else if (siemType === 'qradar') {
      await exportToQRadar(entry);
    }
  };

  const exportToSplunk = async (entry: AuditLogEntry) => {
    await fetch(process.env.SIEM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Splunk ${process.env.SIEM_TOKEN}`,
      },
      body: JSON.stringify({ event: entry }),
    });
  };
  ```

##### 4.3 監査ログ出力項目定義
- **記録項目**: タイムスタンプ、ユーザーID、組織ID、MCPサーバーSlug、ツール名、ステータス、エラーメッセージ（PII除去済み）
- **除外**: プロンプト内容、レスポンスデータ

#### 検証
- [ ] 監査ログがJSON Lines形式で出力されることを確認
- [ ] SIEM連携（Splunk/QRadar）が動作することを確認
- [ ] PIIが除去されていることを確認

---

### Phase 5: Prismaスキーマ拡張（1週間）

**目的**: 設定同期、監査ログのデータモデル整備

#### タスク

##### 5.1 McpServerテーブル拡張
- **ファイル**: `packages/db/prisma/schema/mcpServer.prisma`
- **追加**:
  ```prisma
  model McpServer {
    // 既存フィールド
    id String @id @default(cuid())

    // 追加フィールド
    deploymentMode DeploymentMode @default(SELF_HOSTED)
    syncVersion String?
  }

  enum DeploymentMode {
    CLOUD
    SELF_HOSTED
  }
  ```

##### 5.2 設定同期ログテーブル作成
- **ファイル**: `packages/db/prisma/schema/sync.prisma`（新規）
- **実装**:
  ```prisma
  model PolicySyncLog {
    id String @id @default(cuid())
    syncVersion String
    syncedAt DateTime
    status String // 'success' | 'error'
    error String?
  }

  model MetadataSyncLog {
    id String @id @default(cuid())
    syncVersion String
    syncedAt DateTime
    status String
    error String?
  }

  model AnonymousStat {
    id String @id @default(cuid())
    organizationId String
    requestCount Int
    errorRate Float
    recordedAt DateTime
  }
  ```

##### 5.3 マイグレーション実行
- **コマンド**:
  ```bash
  cd packages/db
  pnpm db:migrate:dev --name add_self_hosted_support
  ```

#### 検証
- [ ] マイグレーションが成功することを確認
- [ ] 新しいテーブルにデータ保存できることを確認

---

### Phase 6: セキュリティ検証・ドキュメント（1週間）

**目的**: ペイロード流出防止の技術的保証、ドキュメント整備

#### タスク

##### 6.1 セキュリティ統合テスト作成
- **ファイル**: `apps/mcp-proxy/src/__tests__/security/noCloudLeak.test.ts`（新規）
- **実装**:
  ```typescript
  import { describe, test, expect, vi } from 'vitest';

  describe('ペイロード流出防止テスト', () => {
    test('Manager APIへの通信にMCPペイロードが含まれないこと', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ policies: [] }),
      });
      global.fetch = mockFetch;

      await syncWithManager();

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      // アサーション
      expect(requestBody).not.toHaveProperty('prompt');
      expect(requestBody).not.toHaveProperty('response');
      expect(requestBody).not.toHaveProperty('apiKey');
      expect(requestBody).toHaveProperty('organizationId');
      expect(requestBody).toHaveProperty('syncVersion');
    });
  });
  ```

##### 6.2 ペイロード検証ユーティリティ作成
- **ファイル**: `apps/mcp-proxy/src/shared/security/payloadValidator.ts`（新規）
- **実装**:
  ```typescript
  export const validateNoSensitiveData = (payload: unknown) => {
    const payloadStr = JSON.stringify(payload);

    // 禁止キーワードチェック
    const forbiddenKeys = ['prompt', 'response', 'apiKey', 'password', 'token'];
    for (const key of forbiddenKeys) {
      if (payloadStr.includes(`"${key}"`)) {
        throw new Error(`Sensitive data detected: ${key}`);
      }
    }
  };
  ```

##### 6.3 セキュリティホワイトペーパー作成
- **ファイル**: `docs/security/WHITEPAPER.md`（新規）
- **内容**: データレジデンシー保証、ペイロード流出防止の技術的説明、暗号化方式、認証・認可メカニズム

##### 6.4 コンプライアンスガイド作成
- **ファイル**: `docs/compliance/GUIDELINES.md`（新規）
- **内容**: GDPR、金融庁ガイドライン、医療情報システムの安全管理ガイドライン対応

##### 6.5 運用ガイド作成
- **ファイル**: `docs/operations/RUNBOOK.md`（新規）
- **内容**: 監査ログローテーション、SIEM連携設定、バックアップ・リストア手順、トラブルシューティング

#### 検証
- [ ] セキュリティテストが100%パスすることを確認
- [ ] ドキュメントがレビュー承認されることを確認

---

## リスク管理

| リスク | 影響度 | 対応策 | 担当者 |
|--------|--------|--------|--------|
| Regex実装がGCP DLPより精度が低い | 中 | カスタムルール追加機能、将来Presidio統合 | 開発 |
| 設定同期の遅延 | 中 | ローカルキャッシュフォールバック、手動同期トリガー | 開発 |
| PostgreSQL単一障害点 | 高 | HA構成推奨、自動バックアップ | インフラ |
| SIEM連携の多様性 | 低 | 初期はSplunk/QRadar、汎用JSON Lines形式 | 開発 |

---

## マイルストーン

| フェーズ | 期間 | 完了基準 |
|---------|------|---------|
| Phase 1 | Week 1-2 | Google Cloud依存削除、テスト100%パス |
| Phase 2 | Week 3-4 | 設定同期API実装、同期動作確認 |
| Phase 3 | Week 5 | docker-compose起動成功、セットアップ時間<30分 |
| Phase 4 | Week 6 | SIEM連携動作確認 |
| Phase 5 | Week 7 | マイグレーション成功 |
| Phase 6 | Week 8 | セキュリティテスト100%パス、ドキュメント完成 |

---

## 次のステップ

1. Phase 1開始: Google Cloud依存削除
2. 並行作業: Manager側設定同期API設計
3. 週次レビュー: 各フェーズ完了時にセキュリティ観点でレビュー
