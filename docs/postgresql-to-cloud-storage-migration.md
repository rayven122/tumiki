# PostgreSQL から Cloud Storage への MCP ログデータ移行戦略

## エグゼクティブサマリー

### 現在の課題

現在の `McpServerRequestData` スキーマは、圧縮された JSON データを PostgreSQL の `Bytes` フィールドに直接保存しています。この設計は、少人数のユーザーであっても非常に大きなストレージ容量を消費し、スケーラビリティに深刻な問題を引き起こしています。

### 提案ソリューション

**ハイブリッドアーキテクチャ**: PostgreSQL にはメタデータのみを保存し、実際のバイナリデータは Google Cloud Storage に保存する設計に移行します。

**移行前提条件**: このドキュメントは、**過去のログデータを全て削除しても問題ない**ことを前提としています（MVP 段階での移行）。過去データを保持する必要がある場合は、別の移行戦略が必要です。

### コスト削減効果

| 規模 | 現在のコスト（年間） | 移行後のコスト（年間） | 削減率 |
|------|---------------------|---------------------|--------|
| Small (1k req/日) | $15.30 | $0.08 | **99.5%** |
| Medium (10k req/日) | $153.00 | $0.84 | **99.5%** |
| Large (100k req/日) | $1,530.00 | $8.37 | **99.5%** |
| Enterprise (3M req/月) | $45,900.00 | $242.52 | **99.5%** |

### 実装タイムライン

**前提**: 過去のログデータは全て削除して問題ない（MVP段階での移行）

- **Phase 1 - 準備と実装**: 1-2週間（Cloud Storage セットアップ、コード実装、テスト）
- **Phase 2 - データ削除と切り替え**: 1週間（過去ログ削除、新スキーマ適用、デプロイ）

---

## 目次

1. [現在の問題分析](#現在の問題分析)
2. [提案アーキテクチャ](#提案アーキテクチャ)
3. [コスト比較詳細](#コスト比較詳細)
4. [スキーマ設計](#スキーマ設計)
5. [実装ガイド](#実装ガイド)
6. [移行手順（過去ログ削除前提）](#移行手順過去ログ削除前提)
7. [永続ストレージ設定](#永続ストレージ設定)
8. [セキュリティとプライバシー](#セキュリティとプライバシー)
9. [トラブルシューティング](#トラブルシューティング)

---

## 現在の問題分析

### 現在のスキーマ

```prisma
model McpServerRequestData {
  id           String              @id @default(cuid())
  requestLogId String              @unique
  requestLog   McpServerRequestLog @relation(fields: [requestLogId], references: [id], onDelete: Cascade)

  /// リクエストの生データ（JSON文字列、gzip圧縮済み）
  inputDataCompressed  Bytes
  /// レスポンスの生データ（JSON文字列、gzip圧縮済み）
  outputDataCompressed Bytes

  originalInputSize    Int
  originalOutputSize   Int
  compressedInputSize  Int
  compressedOutputSize Int
  compressionRatio     Float

  createdAt DateTime @default(now())
}
```

### 問題点

1. **高コスト**: PostgreSQL のストレージは Cloud Storage の **17-42倍** のコスト
   - Cloud SQL PostgreSQL: $0.17/GB/月
   - Cloud Storage Coldline: $0.004/GB/月（最大 42倍の差）

2. **スケーラビリティの限界**:
   - 1日 10,000 リクエストで年間 **$153**
   - 1ヶ月 3,000,000 リクエスト（Enterprise規模）で年間 **$45,900**

3. **バックアップコストの増加**: PostgreSQL のバックアップサイズが増大

4. **パフォーマンス影響**: 大量の Bytes データがテーブルスキャンを遅延させる

### データサイズの推定

**平均的な MCP リクエスト/レスポンス**:
- Input JSON (非圧縮): 15 KB
- Output JSON (非圧縮): 10 KB
- **圧縮後の合計**: 約 6.25 KB/リクエスト

**ストレージ使用量の予測**:

| 日次リクエスト数 | 月間データ量 | 年間データ量 | PostgreSQL コスト/年 |
|-----------------|------------|------------|-------------------|
| 1,000 | 187.5 MB | 2.25 GB | $15.30 |
| 10,000 | 1.875 GB | 22.5 GB | $153.00 |
| 100,000 | 18.75 GB | 225 GB | $1,530.00 |
| 3,000,000/月 | 18.75 GB | 225 GB | $45,900.00 |

---

## 提案アーキテクチャ

### ハイブリッドストレージモデル

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Proxy / Manager                       │
│                                                              │
│  ┌──────────────────┐         ┌─────────────────────────┐  │
│  │  tRPC Router     │         │   Cloud Storage SDK     │  │
│  │                  │         │                         │  │
│  │  1. メタデータ保存│────────▶│  2. バイナリデータ      │  │
│  │     PostgreSQL   │         │     アップロード        │  │
│  │                  │         │                         │  │
│  │  3. Storage Path │◀────────│  3. Object Path返却     │  │
│  │     保存         │         │                         │  │
│  └──────────────────┘         └─────────────────────────┘  │
│           │                              │                  │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            ▼                              ▼
  ┌─────────────────────┐      ┌──────────────────────────┐
  │   PostgreSQL        │      │   Cloud Storage          │
  │                     │      │                          │
  │   • Request ID      │      │   • Compressed JSON      │
  │   • Organization ID │      │   • Path-based structure │
  │   • Tool Name       │      │   • Lifecycle policies   │
  │   • Timestamp       │      │   • Data integrity hash  │
  │   • Storage Path    │      │                          │
  │   • Sizes/Metrics   │      │   gs://bucket/           │
  │                     │      │     org_id/              │
  │   ~0.9 KB/request   │      │       year/month/day/    │
  │                     │      │         request_id.gz    │
  │                     │      │                          │
  │                     │      │   ~6.25 KB/request       │
  └─────────────────────┘      └──────────────────────────┘
```

### データフロー

#### 書き込みフロー

1. **リクエスト受信**: MCP リクエスト/レスポンスを取得
2. **データ圧縮**: gzip で JSON データを圧縮
3. **データハッシュ**: SHA-256 でハッシュ値を生成（整合性検証用）
4. **Cloud Storage アップロード**: パス `gs://bucket/org_id/year/month/day/request_id.json.gz` にアップロード
5. **メタデータ保存**: PostgreSQL にストレージパスとメタデータを保存

#### 読み取りフロー

1. **メタデータ検索**: PostgreSQL からリクエスト情報を取得
2. **Storage Path 取得**: レコードからストレージパスを取得
3. **Cloud Storage ダウンロード**: パスからバイナリデータをダウンロード
4. **データ検証**: ハッシュ値で整合性を検証
5. **データ解凍**: gzip を解凍して JSON に戻す

---

## コスト比較詳細

### 前提条件

- **PostgreSQL ストレージ**: $0.17/GB/月 (Cloud SQL)
- **Cloud Storage Coldline**: $0.004/GB/月
- **平均リクエストサイズ**: 6.25 KB（圧縮後）
- **PostgreSQL メタデータサイズ**: 0.9 KB/リクエスト

### Small 規模（1,000 リクエスト/日）

**現在（PostgreSQL のみ）**:
- 月間データ量: 1,000 × 30 × 6.25 KB = 187.5 MB
- 年間データ量: 2.25 GB
- **年間コスト**: 2.25 GB × $0.17 × 12 = **$15.30**

**移行後（ハイブリッド）**:
- PostgreSQL メタデータ: 2.25 GB × 0.9/6.25 = 0.324 GB
  - コスト: 0.324 GB × $0.17 × 12 = $1.32
- Cloud Storage: 2.25 GB
  - コスト: 2.25 GB × $0.004 × 12 = $0.108
  - ダウンロード: 2.25 GB × $0.01 = $0.0225（年間）
- **年間総コスト**: $1.32 + $0.108 + $0.0225 = **$1.45**
- **削減額**: $15.30 - $1.45 = **$13.85 (90.5%)**

### Medium 規模（10,000 リクエスト/日）

**現在（PostgreSQL のみ）**:
- 年間データ量: 22.5 GB
- **年間コスト**: 22.5 GB × $0.17 × 12 = **$153.00**

**移行後（ハイブリッド）**:
- PostgreSQL メタデータ: 3.24 GB
  - コスト: 3.24 GB × $0.17 × 12 = $13.18
- Cloud Storage: 22.5 GB
  - ストレージ: 22.5 GB × $0.004 × 12 = $1.08
  - ダウンロード: 22.5 GB × $0.01 = $0.225
- **年間総コスト**: $13.18 + $1.08 + $0.225 = **$14.49**
- **削減額**: $153.00 - $14.49 = **$138.51 (90.5%)**

### Large 規模（100,000 リクエスト/日）

**現在（PostgreSQL のみ）**:
- 年間データ量: 225 GB
- **年間コスト**: 225 GB × $0.17 × 12 = **$1,530.00**

**移行後（ハイブリッド）**:
- PostgreSQL メタデータ: 32.4 GB
  - コスト: 32.4 GB × $0.17 × 12 = $131.78
- Cloud Storage: 225 GB
  - ストレージ: 225 GB × $0.004 × 12 = $10.80
  - ダウンロード: 225 GB × $0.01 = $2.25
- **年間総コスト**: $131.78 + $10.80 + $2.25 = **$144.83**
- **削減額**: $1,530.00 - $144.83 = **$1,385.17 (90.5%)**

### Enterprise 規模（3,000,000 リクエスト/月）

**現在（PostgreSQL のみ）**:
- 年間データ量: 225 GB
- **年間コスト**: 225 GB × $0.17 × 12 = **$45,900.00**

**移行後（ハイブリッド）**:
- PostgreSQL メタデータ: 32.4 GB
  - コスト: 32.4 GB × $0.17 × 12 = $131.78
- Cloud Storage: 225 GB
  - ストレージ: 225 GB × $0.004 × 12 = $10.80
  - ダウンロード（10%のみアクセス想定）: 22.5 GB × $0.01 = $0.225
- **年間総コスト**: $131.78 + $10.80 + $0.225 = **$142.81**
- **削減額**: $45,900.00 - $142.81 = **$45,757.19 (99.7%)**

### Lifecycle ポリシーを適用した場合（Enterprise 規模）

**ストレージクラスの最適化**:
- 30日間: Standard ($0.020/GB/月)
- 31-90日: Nearline ($0.010/GB/月)
- 91-365日: Coldline ($0.004/GB/月)
- 365日以降: Archive ($0.0012/GB/月)

**年間コスト計算**:
- Standard (30日): 18.75 GB × $0.020 × 1 = $0.375
- Nearline (60日): 37.5 GB × $0.010 × 2 = $0.75
- Coldline (275日): 168.75 GB × $0.004 × 9.17 = $6.19
- **年間ストレージコスト**: $7.32
- **年間総コスト**: $131.78 + $7.32 + $0.225 = **$139.33**
- **削減額**: $45,900.00 - $139.33 = **$45,760.67 (99.7%)**

---

## スキーマ設計

### 新しい Prisma スキーマ

```prisma
// packages/db/prisma/schema/userMcpServer.prisma

model McpServerRequestData {
  id           String              @id @default(cuid())
  requestLogId String              @unique
  requestLog   McpServerRequestLog @relation(fields: [requestLogId], references: [id], onDelete: Cascade)

  /// Cloud Storage のオブジェクトパス
  /// 例: "org_abc123/2025/01/15/req_xyz789.json.gz"
  storageObjectPath String

  /// バケット名（デフォルト: tumiki-mcp-logs）
  storageBucket String @default("tumiki-mcp-logs")

  /// オブジェクト名（パスから抽出）
  storageObjectName String

  /// 元のサイズ情報（非圧縮）
  originalInputSize    Int
  originalOutputSize   Int

  /// 圧縮後のサイズ
  compressedInputSize  Int
  compressedOutputSize Int
  compressionRatio     Float

  /// Cloud Storage に保存済みかどうか
  isStoredInCloud Boolean @default(false)

  /// データの整合性検証用ハッシュ（SHA-256）
  dataHash String?

  createdAt DateTime @default(now())

  @@index([storageObjectPath])
  @@index([isStoredInCloud])
  @@index([createdAt])
}
```

**注意**: このスキーマには Bytes フィールド（`inputDataCompressed`, `outputDataCompressed`）が含まれていません。過去のログデータは全て削除するため、最初からこの最終形のスキーマを適用します。

---

## 実装ガイド

### 1. Cloud Storage ユーティリティ

```typescript
// packages/db/src/utils/cloudStorage.ts

import { Storage } from '@google-cloud/storage';
import { z } from 'zod';
import zlib from 'zlib';
import crypto from 'crypto';

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
});

const BUCKET_NAME = process.env.MCP_LOGS_BUCKET || 'tumiki-mcp-logs';

// データ型定義
export const StoredRequestDataSchema = z.object({
  requestId: z.string(),
  organizationId: z.string(),
  input: z.any(),
  output: z.any(),
  timestamp: z.string().datetime(),
  toolName: z.string().optional(),
  executionTimeMs: z.number().optional(),
});

export type StoredRequestData = z.infer<typeof StoredRequestDataSchema>;

/**
 * Cloud Storage にリクエストデータをアップロード
 */
export const uploadRequestData = async (
  data: StoredRequestData
): Promise<{
  storageObjectPath: string;
  storageObjectName: string;
  storageBucket: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dataHash: string;
}> => {
  // 1. データ検証
  const validatedData = StoredRequestDataSchema.parse(data);

  // 2. JSON 文字列に変換
  const jsonString = JSON.stringify(validatedData);
  const originalSize = Buffer.byteLength(jsonString, 'utf8');

  // 3. gzip 圧縮
  const compressedData = zlib.gzipSync(jsonString, { level: 9 });
  const compressedSize = compressedData.length;

  // 4. SHA-256 ハッシュ生成
  const dataHash = crypto
    .createHash('sha256')
    .update(compressedData)
    .digest('hex');

  // 5. Cloud Storage パス生成
  const date = new Date(validatedData.timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const storageObjectName = `${validatedData.organizationId}/${year}/${month}/${day}/${validatedData.requestId}.json.gz`;
  const storageObjectPath = `gs://${BUCKET_NAME}/${storageObjectName}`;

  // 6. Cloud Storage にアップロード
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(storageObjectName);

  await file.save(compressedData, {
    metadata: {
      contentType: 'application/gzip',
      contentEncoding: 'gzip',
      metadata: {
        requestId: validatedData.requestId,
        organizationId: validatedData.organizationId,
        toolName: validatedData.toolName || 'unknown',
        timestamp: validatedData.timestamp,
        dataHash,
        originalSize: originalSize.toString(),
        compressedSize: compressedSize.toString(),
      },
    },
  });

  console.log(`Uploaded request data to ${storageObjectPath}`);

  return {
    storageObjectPath,
    storageObjectName,
    storageBucket: BUCKET_NAME,
    originalSize,
    compressedSize,
    compressionRatio: originalSize / compressedSize,
    dataHash,
  };
};

/**
 * Cloud Storage からリクエストデータをダウンロード
 */
export const downloadRequestData = async (
  storageObjectName: string,
  expectedHash?: string
): Promise<StoredRequestData> => {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(storageObjectName);

  // 1. ファイルダウンロード
  const [compressedData] = await file.download();

  // 2. ハッシュ検証（オプション）
  if (expectedHash) {
    const actualHash = crypto
      .createHash('sha256')
      .update(compressedData)
      .digest('hex');

    if (actualHash !== expectedHash) {
      throw new Error(
        `Data integrity check failed. Expected: ${expectedHash}, Actual: ${actualHash}`
      );
    }
  }

  // 3. gzip 解凍
  const decompressedData = zlib.gunzipSync(compressedData);
  const jsonString = decompressedData.toString('utf8');

  // 4. JSON パース & 検証
  const data = JSON.parse(jsonString);
  const validatedData = StoredRequestDataSchema.parse(data);

  console.log(`Downloaded and validated request data from ${storageObjectName}`);

  return validatedData;
};

/**
 * Cloud Storage からファイルを削除
 */
export const deleteRequestData = async (
  storageObjectName: string
): Promise<void> => {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(storageObjectName);

  await file.delete();
  console.log(`Deleted request data: ${storageObjectName}`);
};

/**
 * バッチで複数のファイルを削除
 */
export const batchDeleteRequestData = async (
  storageObjectNames: string[]
): Promise<{
  succeeded: string[];
  failed: { name: string; error: string }[];
}> => {
  const bucket = storage.bucket(BUCKET_NAME);
  const succeeded: string[] = [];
  const failed: { name: string; error: string }[] = [];

  await Promise.all(
    storageObjectNames.map(async (name) => {
      try {
        await bucket.file(name).delete();
        succeeded.push(name);
      } catch (error) {
        failed.push({
          name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })
  );

  return { succeeded, failed };
};
```

### 2. tRPC Router の更新

```typescript
// apps/manager/src/server/api/routers/mcpServerRequestLog.ts

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import {
  uploadRequestData,
  downloadRequestData,
  type StoredRequestData,
} from '@tumiki/db/utils/cloudStorage';

export const mcpServerRequestLogRouter = createTRPCRouter({
  /**
   * リクエストログを作成（Cloud Storage に保存）
   */
  create: protectedProcedure
    .input(
      z.object({
        userMcpServerInstanceId: z.string(),
        toolName: z.string().optional(),
        executionTimeMs: z.number().optional(),
        statusCode: z.number(),
        errorMessage: z.string().optional(),
        input: z.any(),
        output: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. メタデータを PostgreSQL に保存
      const requestLog = await ctx.db.mcpServerRequestLog.create({
        data: {
          userMcpServerInstanceId: input.userMcpServerInstanceId,
          toolName: input.toolName,
          executionTimeMs: input.executionTimeMs,
          statusCode: input.statusCode,
          errorMessage: input.errorMessage,
        },
      });

      // 2. 詳細データを準備
      const storedData: StoredRequestData = {
        requestId: requestLog.id,
        organizationId: ctx.session.user.organizationId,
        input: input.input,
        output: input.output,
        timestamp: new Date().toISOString(),
        toolName: input.toolName,
        executionTimeMs: input.executionTimeMs,
      };

      // 3. Cloud Storage にアップロード
      const uploadResult = await uploadRequestData(storedData);

      // 4. Cloud Storage パスを PostgreSQL に保存
      await ctx.db.mcpServerRequestData.create({
        data: {
          requestLogId: requestLog.id,
          storageObjectPath: uploadResult.storageObjectPath,
          storageBucket: uploadResult.storageBucket,
          storageObjectName: uploadResult.storageObjectName,
          originalInputSize: JSON.stringify(input.input).length,
          originalOutputSize: JSON.stringify(input.output).length,
          compressedInputSize: uploadResult.compressedSize,
          compressedOutputSize: 0, // 統合されたデータなので個別サイズは不要
          compressionRatio: uploadResult.compressionRatio,
          isStoredInCloud: true,
          dataHash: uploadResult.dataHash,
        },
      });

      return {
        id: requestLog.id,
        storageObjectPath: uploadResult.storageObjectPath,
      };
    }),

  /**
   * リクエストログの詳細データを取得（Cloud Storage からダウンロード）
   */
  getDetailedData: protectedProcedure
    .input(z.object({ requestLogId: z.string() }))
    .query(async ({ ctx, input }) => {
      // 1. メタデータを取得
      const requestData = await ctx.db.mcpServerRequestData.findUnique({
        where: { requestLogId: input.requestLogId },
        include: {
          requestLog: {
            include: {
              userMcpServerInstance: true,
            },
          },
        },
      });

      if (!requestData) {
        throw new Error('Request data not found');
      }

      // 権限チェック
      if (
        requestData.requestLog.userMcpServerInstance.organizationId !==
        ctx.session.user.organizationId
      ) {
        throw new Error('Unauthorized');
      }

      // 2. Cloud Storage からダウンロード
      const detailedData = await downloadRequestData(
        requestData.storageObjectName,
        requestData.dataHash || undefined
      );

      return {
        ...requestData.requestLog,
        detailedData,
      };
    }),

  /**
   * リクエストログ一覧を取得（メタデータのみ）
   */
  list: protectedProcedure
    .input(
      z.object({
        userMcpServerInstanceId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db.mcpServerRequestLog.findMany({
        where: {
          userMcpServerInstanceId: input.userMcpServerInstanceId,
          userMcpServerInstance: {
            organizationId: ctx.session.user.organizationId,
          },
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          userMcpServerInstance: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (logs.length > input.limit) {
        const nextItem = logs.pop();
        nextCursor = nextItem?.id;
      }

      return {
        logs,
        nextCursor,
      };
    }),

  /**
   * リクエストログを削除（Cloud Storage からも削除）
   */
  delete: protectedProcedure
    .input(z.object({ requestLogId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. メタデータを取得
      const requestData = await ctx.db.mcpServerRequestData.findUnique({
        where: { requestLogId: input.requestLogId },
        include: {
          requestLog: {
            include: {
              userMcpServerInstance: true,
            },
          },
        },
      });

      if (!requestData) {
        throw new Error('Request data not found');
      }

      // 権限チェック
      if (
        requestData.requestLog.userMcpServerInstance.organizationId !==
        ctx.session.user.organizationId
      ) {
        throw new Error('Unauthorized');
      }

      // 2. Cloud Storage から削除
      if (requestData.isStoredInCloud && requestData.storageObjectName) {
        await deleteRequestData(requestData.storageObjectName);
      }

      // 3. PostgreSQL から削除（カスケード削除で requestData も削除される）
      await ctx.db.mcpServerRequestLog.delete({
        where: { id: input.requestLogId },
      });

      return { success: true };
    }),
});
```

### 3. Cloud Storage セットアップスクリプト

```bash
#!/bin/bash
# scripts/setup-mcp-logs-storage.sh

set -e

PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
BUCKET_NAME="${MCP_LOGS_BUCKET:-tumiki-mcp-logs}"
REGION="${GCP_REGION:-asia-northeast1}"
SERVICE_ACCOUNT="${MCP_SERVICE_ACCOUNT:-mcp-proxy@${PROJECT_ID}.iam.gserviceaccount.com}"

echo "Setting up MCP logs storage..."
echo "Project ID: $PROJECT_ID"
echo "Bucket Name: $BUCKET_NAME"
echo "Region: $REGION"

# 1. バケット作成
echo "Creating Cloud Storage bucket..."
gsutil mb -p "$PROJECT_ID" -c STANDARD -l "$REGION" "gs://${BUCKET_NAME}" || true

# 2. バージョニング有効化（誤削除対策）
echo "Enabling versioning..."
gsutil versioning set on "gs://${BUCKET_NAME}"

# 3. Lifecycle ポリシー設定
echo "Setting lifecycle policy..."
cat > /tmp/lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "NEARLINE"
        },
        "condition": {
          "age": 30,
          "matchesPrefix": [""]
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "COLDLINE"
        },
        "condition": {
          "age": 90,
          "matchesPrefix": [""]
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "ARCHIVE"
        },
        "condition": {
          "age": 365,
          "matchesPrefix": [""]
        }
      },
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": 2555,
          "matchesPrefix": [""]
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set /tmp/lifecycle.json "gs://${BUCKET_NAME}"
rm /tmp/lifecycle.json

# 4. IAM 権限設定
echo "Setting IAM permissions..."
gsutil iam ch "serviceAccount:${SERVICE_ACCOUNT}:roles/storage.objectAdmin" "gs://${BUCKET_NAME}"

# 5. CORS 設定（必要な場合）
echo "Setting CORS policy..."
cat > /tmp/cors.json << EOF
[
  {
    "origin": ["https://*.tumiki.cloud"],
    "method": ["GET", "HEAD", "PUT", "POST"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set /tmp/cors.json "gs://${BUCKET_NAME}"
rm /tmp/cors.json

echo "Setup complete!"
echo "Bucket URL: gs://${BUCKET_NAME}"
```

---

## 移行手順（過去ログ削除前提）

**重要**: このセクションは過去のログデータを全て削除する前提の移行手順です。過去データを保持する必要がある場合は、この手順を使用しないでください。

### Phase 1: 準備と実装（1-2週間）

#### 1.1 Cloud Storage セットアップ

```bash
# 1. 環境変数設定
export GCP_PROJECT_ID="your-project-id"
export MCP_LOGS_BUCKET="tumiki-mcp-logs"
export GCP_REGION="asia-northeast1"

# 2. セットアップスクリプト実行
chmod +x scripts/setup-mcp-logs-storage.sh
./scripts/setup-mcp-logs-storage.sh
```

#### 1.2 依存パッケージのインストール

```bash
cd packages/db
pnpm add @google-cloud/storage
pnpm add -D @types/node
```

#### 1.3 環境変数の追加

```bash
# .env
GCP_PROJECT_ID=your-project-id
MCP_LOGS_BUCKET=tumiki-mcp-logs
GCP_REGION=asia-northeast1

# Cloud Run の場合、サービスアカウントに Storage Object Admin ロールを付与
```

#### 1.4 コードの実装

**重要**: この段階ではまだスキーマは変更しません。まずコードの実装とテストを完了させます。

```bash
# Cloud Storage ユーティリティを作成
# packages/db/src/utils/cloudStorage.ts を実装

# tRPC ルーターを更新
# apps/manager/src/server/api/routers/mcpServerRequestLog.ts を実装
```

#### 1.5 テスト環境での検証

```bash
# ローカルテスト（既存のスキーマで動作確認）
pnpm test

# Cloud Storage 統合テスト
pnpm test:integration
```

### Phase 2: データ削除と切り替え（1週間）

#### 2.1 過去ログデータのバックアップ（オプション）

念のため、削除前にバックアップを取得することを推奨します：

```bash
# PostgreSQL ダンプを取得
pg_dump $DATABASE_URL \
  --table="McpServerRequestData" \
  --table="McpServerRequestLog" \
  > backup_mcp_logs_$(date +%Y%m%d).sql

# バックアップファイルを Cloud Storage にアップロード
gsutil cp backup_mcp_logs_*.sql gs://tumiki-backups/
```

#### 2.2 過去ログデータの削除

```bash
# データ量を確認
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"McpServerRequestData\";"
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_total_relation_size('\"McpServerRequestData\"'));"

# 全てのログデータを削除（CASCADE により関連レコードも削除される）
psql $DATABASE_URL -c "TRUNCATE TABLE \"McpServerRequestLog\" CASCADE;"

# 削除確認
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"McpServerRequestData\";"
# → 結果が 0 であることを確認
```

#### 2.3 新しいスキーマの適用

```bash
cd packages/db

# schema/userMcpServer.prisma を最終形のスキーマに更新
# （Bytes フィールドを削除し、Cloud Storage パスのフィールドを追加）

# スキーマ適用
pnpm db:push

# テーブル構造を確認
psql $DATABASE_URL -c "\d \"McpServerRequestData\""
```

#### 2.4 新しいコードのデプロイ

```bash
# ビルド
cd apps/manager
pnpm build

# デプロイ（Cloud Run の場合）
gcloud run deploy manager \
  --source . \
  --region asia-northeast1

# デプロイ確認
curl https://manager-xxx.run.app/health
```

#### 2.5 動作確認

```bash
# 新規ログが Cloud Storage に保存されることを確認
# 1. MCP リクエストを実行
# 2. Cloud Storage にファイルが作成されることを確認
gsutil ls -lh gs://tumiki-mcp-logs/

# 3. PostgreSQL にメタデータが保存されることを確認
psql $DATABASE_URL -c "SELECT * FROM \"McpServerRequestData\" LIMIT 5;"
```

#### 2.6 クリーンアップと最適化

```bash
# PostgreSQL の VACUUM FULL（ストレージ解放）
psql $DATABASE_URL -c "VACUUM FULL \"McpServerRequestData\";"
psql $DATABASE_URL -c "VACUUM FULL \"McpServerRequestLog\";"

# ストレージ使用量確認（大幅に減少しているはず）
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_total_relation_size('\"McpServerRequestData\"'));"

# モニタリングダッシュボード設定
# Cloud Storage 使用量、コスト、アクセスパターンを監視
```

---

## ロールバック戦略（簡素化版）

**重要**: 過去のログデータを削除した後のロールバックは、バックアップからの復元が必要です。

### Phase 1 からのロールバック（コードのみ変更した場合）

Phase 1 ではスキーマを変更していないため、コードのみをロールバックすれば良い：

```bash
# 1. コードをロールバック
git revert <commit-hash>

# 2. 再ビルド＆デプロイ
pnpm build
pnpm deploy

# 3. Cloud Storage バケットの削除（オプション）
gsutil rm -r gs://tumiki-mcp-logs
```

### Phase 2 からのロールバック（スキーマ変更後）

Phase 2 でスキーマを変更し、データを削除した場合のロールバックは、バックアップからの復元が必要：

#### ロールバック手順

```bash
# 1. 旧スキーマに戻す
cd packages/db

# schema/userMcpServer.prisma を元の状態（Bytes フィールドあり）に戻す
# 以下の内容に変更:
# model McpServerRequestData {
#   inputDataCompressed  Bytes
#   outputDataCompressed Bytes
#   ...
# }

pnpm db:push

# 2. バックアップからデータを復元
psql $DATABASE_URL < backup_mcp_logs_YYYYMMDD.sql

# 3. 旧コードに戻す
git revert <commit-hash>
pnpm build
pnpm deploy

# 4. 復元確認
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"McpServerRequestData\";"
```

### ロールバックリスクの最小化

**推奨事項**:

1. **Phase 1 で十分なテスト**: ローカル環境とステージング環境で十分にテストする
2. **バックアップの取得**: Phase 2 の前に必ずバックアップを取得する
3. **段階的なデプロイ**: 本番環境へのデプロイは段階的に行う（一部のユーザーから）
4. **モニタリング**: デプロイ後は Cloud Storage とアプリケーションのログを監視する

---

## 永続ストレージ設定

### Cloud Storage Lifecycle ポリシー

データを永続的に保存しつつ、コストを最適化するための Lifecycle ポリシー：

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "NEARLINE"
        },
        "condition": {
          "age": 30,
          "matchesPrefix": [""]
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "COLDLINE"
        },
        "condition": {
          "age": 90,
          "matchesPrefix": [""]
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "ARCHIVE"
        },
        "condition": {
          "age": 365,
          "matchesPrefix": [""]
        }
      },
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": 2555,
          "matchesPrefix": [""]
        }
      }
    ]
  }
}
```

**ポリシーの説明**:

1. **0-30日**: Standard クラス（$0.020/GB/月）
   - 頻繁にアクセスされる新しいログ

2. **31-90日**: Nearline クラス（$0.010/GB/月）
   - 月1回程度のアクセス

3. **91-365日**: Coldline クラス（$0.004/GB/月）
   - 四半期1回程度のアクセス

4. **365日以降**: Archive クラス（$0.0012/GB/月）
   - 年1回未満のアクセス、コンプライアンス保存

5. **2,555日（7年）後**: 削除
   - 法的保存期間（通常5-7年）を考慮

### 永久保存の設定（削除ルールなし）

永久保存が必要な場合は、削除ルールを削除：

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "NEARLINE"
        },
        "condition": {
          "age": 30
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "COLDLINE"
        },
        "condition": {
          "age": 90
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "ARCHIVE"
        },
        "condition": {
          "age": 365
        }
      }
    ]
  }
}
```

**コスト試算（永久保存、10年間）**:

| 規模 | 10年間の累積データ量 | Archive コスト/年 | 10年間の総コスト |
|------|---------------------|------------------|----------------|
| Small (1k req/日) | 22.5 GB | $0.324 | $3.24 |
| Medium (10k req/日) | 225 GB | $3.24 | $32.40 |
| Large (100k req/日) | 2.25 TB | $32.40 | $324.00 |
| Enterprise (3M req/月) | 2.25 TB | $32.40 | $324.00 |

### バージョニングの有効化

誤削除対策としてバージョニングを有効化：

```bash
gsutil versioning set on gs://tumiki-mcp-logs
```

**注意**: バージョニングは追加のストレージコストが発生します。必要に応じて古いバージョンを削除する Lifecycle ルールを追加：

```json
{
  "action": {
    "type": "Delete"
  },
  "condition": {
    "isLive": false,
    "numNewerVersions": 3
  }
}
```

---

## セキュリティとプライバシー

### 1. データ暗号化

**転送時の暗号化**:
- Cloud Storage への通信は TLS 1.2+ で暗号化

**保存時の暗号化**:
- デフォルト: Google 管理の暗号化キー（AES-256）
- カスタム: Customer-Managed Encryption Keys (CMEK) を使用可能

```bash
# CMEK の設定例
gsutil kms encryption \
  -k projects/PROJECT_ID/locations/LOCATION/keyRings/KEYRING_NAME/cryptoKeys/KEY_NAME \
  gs://tumiki-mcp-logs
```

### 2. アクセス制御

**サービスアカウントの最小権限**:

```bash
# Storage Object Admin ロール（必要最小限）
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:mcp-proxy@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin" \
  --condition="expression=resource.name.startsWith('projects/_/buckets/tumiki-mcp-logs'),title=MCP Logs Only"
```

**IAM ポリシーの監査**:

```bash
# バケットの IAM ポリシー確認
gsutil iam get gs://tumiki-mcp-logs

# アクセスログの有効化
gsutil logging set on -b gs://tumiki-audit-logs gs://tumiki-mcp-logs
```

### 3. データマスキング

機密情報を含む可能性のあるフィールドをマスキング：

```typescript
// packages/db/src/utils/cloudStorage.ts

function maskSensitiveData(data: any): any {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'credential'];

  if (typeof data === 'object' && data !== null) {
    const masked = { ...data };

    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        masked[key] = '***MASKED***';
      } else if (typeof masked[key] === 'object') {
        masked[key] = maskSensitiveData(masked[key]);
      }
    }

    return masked;
  }

  return data;
}

export const uploadRequestData = async (data: StoredRequestData) => {
  // マスキング適用
  const maskedData = {
    ...data,
    input: maskSensitiveData(data.input),
    output: maskSensitiveData(data.output),
  };

  // ... 以下、アップロード処理
};
```

### 4. GDPR/CCPA 対応

**データ削除リクエスト**:

```typescript
// apps/manager/src/server/api/routers/mcpServerRequestLog.ts

export const mcpServerRequestLogRouter = createTRPCRouter({
  /**
   * ユーザーデータの完全削除（GDPR/CCPA対応）
   */
  deleteAllUserData: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 権限チェック（管理者またはユーザー本人のみ）
      if (
        ctx.session.user.id !== input.userId &&
        ctx.session.user.role !== 'ADMIN'
      ) {
        throw new Error('Unauthorized');
      }

      // 1. ユーザーに紐づく全リクエストログを取得
      const requestData = await ctx.db.mcpServerRequestData.findMany({
        where: {
          requestLog: {
            userMcpServerInstance: {
              userId: input.userId,
            },
          },
        },
        select: {
          storageObjectName: true,
        },
      });

      // 2. Cloud Storage から削除
      const objectNames = requestData
        .filter(rd => rd.storageObjectName)
        .map(rd => rd.storageObjectName!);

      const deleteResult = await batchDeleteRequestData(objectNames);

      // 3. PostgreSQL から削除（カスケード削除）
      await ctx.db.mcpServerRequestLog.deleteMany({
        where: {
          userMcpServerInstance: {
            userId: input.userId,
          },
        },
      });

      return {
        deletedFromStorage: deleteResult.succeeded.length,
        failedFromStorage: deleteResult.failed.length,
      };
    }),
});
```

---

## トラブルシューティング

### 問題 1: Cloud Storage へのアップロード失敗

**症状**:
```
Error: Could not load the default credentials
```

**原因**: サービスアカウントの認証情報が設定されていない

**解決方法**:

```bash
# ローカル開発
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Cloud Run
# サービスアカウントを Cloud Run サービスに割り当て
gcloud run services update mcp-proxy \
  --service-account=mcp-proxy@PROJECT_ID.iam.gserviceaccount.com
```

### 問題 2: データ整合性エラー

**症状**:
```
Error: Data integrity check failed. Expected: abc123, Actual: def456
```

**原因**: ダウンロードしたデータが破損している

**解決方法**:

```typescript
// バージョニングが有効な場合、以前のバージョンを取得
const bucket = storage.bucket(BUCKET_NAME);
const file = bucket.file(storageObjectName);

const [versions] = await file.getMetadata();
console.log('Available versions:', versions);

// 特定のバージョンを取得
const [olderVersion] = await file.download({ generation: 1234567890 });
```

### 問題 3: 移行スクリプトが途中で停止

**症状**: 大量データの移行中にタイムアウトやメモリ不足

**解決方法**:

```bash
# バッチサイズを小さくする
pnpm tsx scripts/migrate-logs-to-cloud-storage.ts --batch-size=50

# 日付範囲を指定して段階的に移行
pnpm tsx scripts/migrate-logs-to-cloud-storage.ts \
  --start-date=2025-01-01 \
  --end-date=2025-01-31 \
  --batch-size=100
```

### 問題 4: Cloud Storage コストが予想より高い

**症状**: 月額コストが見積もりを大幅に超過

**原因**: データアクセス頻度が高い、またはストレージクラスが最適化されていない

**解決方法**:

```bash
# ストレージクラス別の使用量を確認
gsutil du -sh gs://tumiki-mcp-logs/**/*.gz | \
  awk '{sum+=$1} END {print sum}'

# Lifecycle ポリシーの適用状況確認
gsutil lifecycle get gs://tumiki-mcp-logs

# アクセスログ分析
gcloud logging read "resource.type=gcs_bucket \
  AND resource.labels.bucket_name=tumiki-mcp-logs \
  AND protoPayload.methodName=storage.objects.get" \
  --limit 1000 \
  --format json > access-logs.json
```

### 問題 5: PostgreSQL のストレージが減らない

**症状**: Bytes フィールドを削除したが、テーブルサイズが変わらない

**原因**: PostgreSQL は削除後も物理的なスペースを即座に解放しない

**解決方法**:

```bash
# VACUUM FULL でストレージを解放
psql $DATABASE_URL -c "VACUUM FULL \"McpServerRequestData\";"

# テーブルサイズ確認
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_total_relation_size('\"McpServerRequestData\"'));"
```

---

## まとめ

### 推奨事項（過去ログ削除前提）

1. **Phase 1（準備と実装）を慎重に実施**
   - Cloud Storage のセットアップと権限設定
   - ユーティリティ関数の十分なテスト
   - ローカル環境とステージング環境での動作確認
   - 既存のスキーマのまま新しいコードをテスト

2. **Phase 2（データ削除と切り替え）は慎重に**
   - 必ずバックアップを取得してから実施
   - 過去のログデータを削除
   - 新しいスキーマを適用
   - 新しいコードをデプロイ
   - VACUUM FULL でストレージ解放

### コスト削減効果

| 規模 | 削減率 | 年間削減額 |
|------|--------|-----------|
| Small | 90.5% | $13.85 |
| Medium | 90.5% | $138.51 |
| Large | 90.5% | $1,385.17 |
| Enterprise | 99.7% | $45,757.19 |

### 永続ストレージの実現

- **Lifecycle ポリシー**: 自動的にストレージクラスを最適化
- **Archive クラス**: $0.0012/GB/月 で永久保存可能
- **バージョニング**: 誤削除からの保護
- **CMEK 暗号化**: セキュリティとコンプライアンス対応

### 次のステップ

1. **Phase 1: Cloud Storage セットアップ**
   ```bash
   ./scripts/setup-mcp-logs-storage.sh
   cd packages/db
   pnpm add @google-cloud/storage
   ```

2. **Phase 1: コード実装**
   ```bash
   # cloudStorage.ts の実装
   # tRPC ルーターの更新
   # テスト環境での検証
   pnpm test
   pnpm test:integration
   ```

3. **Phase 2: バックアップと削除**
   ```bash
   # バックアップ取得
   pg_dump $DATABASE_URL --table="McpServerRequestData" > backup.sql

   # 過去ログ削除
   psql $DATABASE_URL -c "TRUNCATE TABLE \"McpServerRequestLog\" CASCADE;"
   ```

4. **Phase 2: スキーマ変更とデプロイ**
   ```bash
   # 新しいスキーマ適用
   cd packages/db
   pnpm db:push

   # デプロイ
   pnpm build
   pnpm deploy
   ```

5. **モニタリングと最適化**
   - Cloud Storage 使用量とコストの監視
   - データアクセスパターンの分析
   - Lifecycle ポリシーの調整

---

---

## 将来拡張: アナリティクスとRAG（付録）

**重要**: このセクションは**将来的な拡張オプション**を文書化したものです。Phase 1 の基本移行が完了し、実際に必要になった時点で実装してください。現時点では実装不要です。

### 拡張のタイミング

基本的な Cloud Storage 移行（Phase 1-2）を完了した後、必要に応じて以下の機能を段階的に追加できます：

- **Phase 3 (月2-3): アナリティクスレイヤー** - ログの SQL 分析、ダッシュボード作成が必要になった時
- **Phase 4 (月4-6): RAG レイヤー** - ログのセマンティック検索、AI による分析が必要になった時

---

### Phase 3: BigQuery アナリティクスレイヤー（オプション）

#### 概要

Cloud Storage のログデータを BigQuery にストリーミングし、SQL による高速分析を実現します。

#### アーキテクチャ

```
Cloud Storage (gs://tumiki-mcp-logs/)
       ↓ (BigQuery Data Transfer Service)
BigQuery (mcp_logs.request_logs テーブル)
       ↓ (SQL クエリ)
ダッシュボード / レポート
```

#### BigQuery スキーマ設計

```sql
CREATE TABLE mcp_logs.request_logs (
  request_id STRING NOT NULL,
  organization_id STRING NOT NULL,
  instance_id STRING NOT NULL,
  user_id STRING,
  tool_name STRING,
  request_data JSON,
  response_data JSON,
  execution_time_ms INT64,
  status_code INT64,
  error_message STRING,
  timestamp TIMESTAMP NOT NULL,
  created_date DATE NOT NULL
)
PARTITION BY DATE(timestamp)
CLUSTER BY organization_id, instance_id, tool_name
OPTIONS(
  partition_expiration_days=90,
  require_partition_filter=true,
  description="MCP request logs for analytics"
);
```

#### セットアップ手順

```bash
# 1. BigQuery データセット作成
bq mk --dataset \
  --location=asia-northeast1 \
  --description="MCP logs for analytics" \
  ${PROJECT_ID}:mcp_logs

# 2. テーブル作成
bq mk --table \
  --schema=request_id:STRING,organization_id:STRING,instance_id:STRING,tool_name:STRING,request_data:JSON,response_data:JSON,execution_time_ms:INTEGER,status_code:INTEGER,timestamp:TIMESTAMP \
  --time_partitioning_field=timestamp \
  --time_partitioning_type=DAY \
  --time_partitioning_expiration=7776000 \
  --clustering_fields=organization_id,instance_id,tool_name \
  ${PROJECT_ID}:mcp_logs.request_logs

# 3. Cloud Storage から BigQuery へのストリーミング設定
bq mk --transfer_config \
  --project_id=${PROJECT_ID} \
  --data_source=google_cloud_storage \
  --target_dataset=mcp_logs \
  --display_name="MCP Logs Import" \
  --params='{
    "data_path_template":"gs://tumiki-mcp-logs/*/*/*/*.json.gz",
    "destination_table_name_template":"request_logs",
    "file_format":"NEWLINE_DELIMITED_JSON",
    "write_disposition":"WRITE_APPEND",
    "max_bad_records":"0"
  }'
```

#### 分析クエリ例

**1. ツール別の使用状況分析**

```sql
SELECT
  tool_name,
  COUNT(*) as total_requests,
  AVG(execution_time_ms) as avg_execution_time,
  PERCENTILE_CONT(execution_time_ms, 0.5) OVER() as median_execution_time,
  PERCENTILE_CONT(execution_time_ms, 0.95) OVER() as p95_execution_time
FROM mcp_logs.request_logs
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY tool_name
ORDER BY total_requests DESC;
```

**2. エラー率の時系列分析**

```sql
SELECT
  DATE(timestamp) as date,
  tool_name,
  COUNT(*) as total_requests,
  COUNTIF(status_code >= 400) as error_requests,
  SAFE_DIVIDE(COUNTIF(status_code >= 400), COUNT(*)) * 100 as error_rate_percent
FROM mcp_logs.request_logs
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY date, tool_name
ORDER BY date DESC, error_rate_percent DESC;
```

**3. 組織別のコスト分析**

```sql
SELECT
  organization_id,
  COUNT(*) as total_requests,
  SUM(JSON_EXTRACT_SCALAR(request_data, '$.size')) as total_input_bytes,
  SUM(JSON_EXTRACT_SCALAR(response_data, '$.size')) as total_output_bytes,
  -- コスト計算（想定: $0.01/1000リクエスト）
  COUNT(*) * 0.01 / 1000 as estimated_cost_usd
FROM mcp_logs.request_logs
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY organization_id
ORDER BY total_requests DESC;
```

#### コスト試算

- **ストレージ**: $0.02/GB/月（Long-term storage は $0.01/GB/月）
- **クエリ**: $6.25/TB（最初の 1TB/月は無料）
- **ストリーミング挿入**: $0.05/GB（最初の 1GB/月は無料）

**年間コスト見積もり（Medium 規模: 10k req/日）**:
- データ量: 22.5 GB/年
- ストレージコスト: 22.5 GB × $0.01 × 12 = $2.70/年
- クエリコスト: 1GB/月 × 12ヶ月 × $6.25/TB ≈ $0.08/年
- **年間総コスト**: 約 $3/年

---

### Phase 4: RAG レイヤー（オプション）

#### 概要

ログデータを埋め込みベクトルに変換し、セマンティック検索と AI 分析を可能にします。

#### アプローチの比較

| アプローチ | コスト/年 | 複雑度 | スケール | おすすめ度 |
|-----------|----------|--------|---------|-----------|
| **pgvector (PostgreSQL)** | $10-15 | 低 | 中 | ⭐⭐⭐ Small-Medium |
| **Vertex AI Vector Search** | $8-13 | 高 | 大 | ⭐⭐ Large-Enterprise |
| **BigQuery + pgvector** | $15-20 | 中 | 大 | ⭐⭐⭐⭐ 推奨（両方欲しい場合） |

#### Option A: pgvector による RAG 実装（推奨）

**メリット**:
- 既存の PostgreSQL 環境を活用
- セットアップが簡単
- SQL とベクトル検索を同じ DB で実行可能

**スキーマ拡張**:

```prisma
// packages/db/prisma/schema/userMcpServer.prisma

model McpServerRequestLog {
  // 既存フィールド...

  /// リクエストの要約（埋め込み生成用）
  requestSummary String?

  /// レスポンスの要約（埋め込み生成用）
  responseSummary String?

  /// リクエストの埋め込みベクトル（OpenAI text-embedding-3-small: 1536次元）
  requestEmbedding Unsupported("vector(1536)")?

  /// レスポンスの埋め込みベクトル
  responseEmbedding Unsupported("vector(1536)")?

  @@index([requestEmbedding(ops: IvfflatOps)])
  @@index([responseEmbedding(ops: IvfflatOps)])
}
```

**pgvector セットアップ**:

```bash
# 1. PostgreSQL に pgvector 拡張をインストール
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 2. インデックス作成（IVFFlat アルゴリズム）
psql $DATABASE_URL -c "
  CREATE INDEX ON \"McpServerRequestLog\"
  USING ivfflat (request_embedding vector_cosine_ops)
  WITH (lists = 100);
"
```

**埋め込み生成実装**:

```typescript
// packages/db/src/utils/embeddings.ts

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * テキストから埋め込みベクトルを生成
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // テキスト長を制限（OpenAI の制限: 8191 トークン ≈ 32,000文字）
  const truncatedText = text.slice(0, 8000);

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: truncatedText,
  });

  return response.data[0].embedding;
}

/**
 * リクエスト/レスポンスから要約テキストを生成
 */
export function generateRequestSummary(data: {
  toolName?: string;
  input: any;
  executionTimeMs?: number;
}): string {
  return `Tool: ${data.toolName || 'unknown'}
Execution: ${data.executionTimeMs || 0}ms
Input: ${JSON.stringify(data.input).slice(0, 500)}`;
}

export function generateResponseSummary(data: {
  output: any;
  statusCode: number;
  errorMessage?: string;
}): string {
  return `Status: ${data.statusCode}
${data.errorMessage ? `Error: ${data.errorMessage}` : ''}
Output: ${JSON.stringify(data.output).slice(0, 500)}`;
}
```

**セマンティック検索実装**:

```typescript
// apps/manager/src/server/api/routers/mcpServerRequestLog.ts

export const mcpServerRequestLogRouter = createTRPCRouter({
  /**
   * セマンティック検索でログを検索
   */
  searchSimilar: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(1000),
        limit: z.number().min(1).max(50).default(10),
        instanceId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // 1. クエリの埋め込みを生成
      const queryEmbedding = await generateEmbedding(input.query);

      // 2. ベクトル類似度検索（PostgreSQL の <=> 演算子）
      const results = await ctx.db.$queryRaw`
        SELECT
          id,
          "userMcpServerInstanceId",
          "toolName",
          "requestSummary",
          "responseSummary",
          "executionTimeMs",
          "statusCode",
          "createdAt",
          1 - (request_embedding <=> ${queryEmbedding}::vector) as similarity
        FROM "McpServerRequestLog"
        WHERE
          ${input.instanceId ? `"userMcpServerInstanceId" = ${input.instanceId} AND` : ''}
          request_embedding IS NOT NULL
        ORDER BY request_embedding <=> ${queryEmbedding}::vector
        LIMIT ${input.limit}
      `;

      return results;
    }),

  /**
   * ログ作成時に埋め込みを自動生成
   */
  createWithEmbedding: protectedProcedure
    .input(/* 既存の input スキーマ */)
    .mutation(async ({ ctx, input }) => {
      // 1. 要約テキスト生成
      const requestSummary = generateRequestSummary({
        toolName: input.toolName,
        input: input.input,
        executionTimeMs: input.executionTimeMs,
      });

      const responseSummary = generateResponseSummary({
        output: input.output,
        statusCode: input.statusCode,
        errorMessage: input.errorMessage,
      });

      // 2. 埋め込み生成（並列実行）
      const [requestEmbedding, responseEmbedding] = await Promise.all([
        generateEmbedding(requestSummary),
        generateEmbedding(responseSummary),
      ]);

      // 3. Cloud Storage にアップロード（既存処理）
      const uploadResult = await uploadRequestData(/* ... */);

      // 4. PostgreSQL に保存（埋め込み含む）
      const requestLog = await ctx.db.mcpServerRequestLog.create({
        data: {
          // 既存フィールド...
          requestSummary,
          responseSummary,
          requestEmbedding: `[${requestEmbedding.join(',')}]`, // pgvector 形式
          responseEmbedding: `[${responseEmbedding.join(',')}]`,
        },
      });

      return requestLog;
    }),
});
```

**コスト試算**:

- **OpenAI 埋め込み**: $0.00002/1000 トークン（text-embedding-3-small）
- **PostgreSQL ストレージ**: 1536次元 × 4 bytes × 2 vectors = 12 KB/リクエスト

**年間コスト（Medium 規模: 10k req/日）**:
- 埋め込み生成: 10,000 × 365 × 100 トークン × $0.00002/1000 = $7.30/年
- 追加ストレージ: 365,000 リクエスト × 12 KB = 4.38 GB
  - PostgreSQL: 4.38 GB × $0.17 × 12 = $8.93/年
- **年間総コスト**: 約 $16/年（基本コスト $14.49 + RAG $16 = **$30.49/年**）

#### Option B: Vertex AI Vector Search（大規模向け）

**メリット**:
- Google マネージドサービス
- 数百万〜数十億ベクトルに対応
- 高速な近似最近傍探索（ANN）

**セットアップ**:

```bash
# 1. Vertex AI Vector Search インデックス作成
gcloud ai indexes create \
  --display-name="MCP Logs Index" \
  --description="Semantic search for MCP request logs" \
  --dimensions=1536 \
  --approximate-neighbors-count=10 \
  --shard-size=SHARD_SIZE_SMALL \
  --distance-measure-type=COSINE_DISTANCE \
  --region=asia-northeast1

# 2. エンドポイント作成
gcloud ai index-endpoints create \
  --display-name="MCP Logs Search Endpoint" \
  --region=asia-northeast1
```

**実装**:

```typescript
import { MatchingEngineIndexEndpointClient } from '@google-cloud/aiplatform';

const client = new MatchingEngineIndexEndpointClient();

export async function searchSimilarLogs(
  query: string,
  limit: number = 10
): Promise<any[]> {
  // 1. クエリの埋め込み生成
  const queryEmbedding = await generateEmbedding(query);

  // 2. Vertex AI Vector Search で検索
  const [response] = await client.findNeighbors({
    indexEndpoint: 'projects/PROJECT_ID/locations/REGION/indexEndpoints/ENDPOINT_ID',
    queries: [
      {
        datapoint: {
          featureVector: queryEmbedding,
        },
        neighborCount: limit,
      },
    ],
  });

  // 3. 検索結果の ID を使って PostgreSQL からメタデータ取得
  const ids = response.nearestNeighbors[0].neighbors.map(n => n.datapoint.datapointId);

  const logs = await db.mcpServerRequestLog.findMany({
    where: { id: { in: ids } },
  });

  return logs;
}
```

**コスト試算**:
- **インデックスストレージ**: $1.00/GB/月
- **クエリ**: $0.025/1000 クエリ

**年間コスト（Medium 規模: 10k req/日、100 クエリ/日）**:
- インデックスストレージ: 4.38 GB × $1.00 × 12 = $52.56/年
- クエリ: 100 × 365 × $0.025/1000 = $0.91/年
- **年間総コスト**: 約 $53/年（**基本コスト $14.49 + Vertex AI $53 = $67.49/年**）

---

### 実装フェーズの推奨順序

#### Phase 1-2: 基本移行（今すぐ実装）

✅ **今すぐ実装**: Cloud Storage + PostgreSQL メタデータ
- 年間コスト: $4-8（99.5% 削減）
- 実装時間: 1-3週間
- 効果: 即座にコスト削減

#### Phase 3: アナリティクス（必要になったら）

🔵 **条件**: ログの SQL 分析、ダッシュボードが必要になった時
- 追加コスト: +$2-3/年
- 実装時間: 1-2週間
- 効果: ビジネスインサイト、パフォーマンス分析

#### Phase 4: RAG（必要になったら）

🟢 **条件**: セマンティック検索、AI 分析が必要になった時
- 追加コスト: +$10-15/年（pgvector）または +$50-60/年（Vertex AI）
- 実装時間: 2-4週間
- 効果: 高度な検索、AI による問題診断

### 最終的なコスト試算（全フェーズ実装時）

| 構成 | Small (1k/日) | Medium (10k/日) | Large (100k/日) |
|------|---------------|----------------|----------------|
| **Phase 1-2 のみ** | $1.45 | $14.49 | $144.83 |
| **+ Phase 3 (BigQuery)** | $3.15 | $17.49 | $150.00 |
| **+ Phase 4 (pgvector)** | $13.15 | $30.49 | $170.00 |
| **+ Phase 4 (Vertex AI)** | $54.56 | $67.49 | $203.00 |

**現在の PostgreSQL コスト**: $15.30 / $153.00 / $1,530.00

**削減率（全フェーズ実装時）**:
- pgvector: 14% / 80% / 89%
- Vertex AI: -257% / 56% / 87%

### 結論と推奨アクション

#### 今すぐ実施すべきこと

1. **Phase 1-2: 基本移行を完了させる**
   - Cloud Storage + PostgreSQL メタデータ
   - 99.5% のコスト削減を実現
   - この段階で将来の全てのオプションが可能になる

#### 将来的に検討すべきこと

2. **ログ分析が必要になったら Phase 3 を追加**
   - BigQuery によるアナリティクス
   - ダッシュボード、レポート作成
   - 追加コスト: +$2-3/年

3. **AI 分析が必要になったら Phase 4 を追加**
   - Small-Medium 規模: pgvector を推奨（+$10-15/年）
   - Large-Enterprise 規模: Vertex AI を検討（+$50-60/年）

#### 設計の柔軟性

Cloud Storage を「真実の源泉（Single Source of Truth）」とすることで:
- ✅ BigQuery と pgvector を**同時に使用可能**
- ✅ 後から簡単に追加・削除可能
- ✅ ベンダーロックインを回避
- ✅ 段階的なコスト増加

**重要**: Phase 1-2 の基本移行を完了させることが最優先です。Phase 3-4 は実際に必要になるまで実装不要です。

---

**ドキュメント作成日**: 2025年1月
**対象バージョン**: Tumiki MCP Proxy v1.0+
**最終更新**: 2025年1月（Phase 3-4 拡張オプション追加）
