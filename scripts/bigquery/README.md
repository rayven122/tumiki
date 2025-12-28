# BigQuery MCP Request Logs

MCPリクエストログをBigQueryに保存するためのスキーマとセットアップスクリプト。

## 構成

```
scripts/bigquery/
├── README.md                    # このファイル
├── mcp_requests_schema.json     # BigQueryテーブルスキーマ
└── setup.sh                     # セットアップスクリプト
```

## セットアップ

### 前提条件

- gcloud CLI がインストールされていること
- bq コマンドが利用可能であること
- 適切なGCP権限があること
  - `roles/pubsub.admin`
  - `roles/bigquery.admin`

### 実行方法

```bash
cd scripts/bigquery

# 開発環境
./setup.sh dev YOUR_PROJECT_ID

# ステージング環境
./setup.sh staging YOUR_PROJECT_ID

# 本番環境
./setup.sh prod YOUR_PROJECT_ID
```

### 作成されるリソース

dev/stagingは共通のDBを使用するため、同じトピック・データセットを共有します。

| 環境        | Pub/Sub Topic        | BigQuery Dataset | BigQuery Table |
| ----------- | -------------------- | ---------------- | -------------- |
| dev/staging | mcp-request-logs-dev | tumiki_logs_dev  | mcp_requests   |
| prod        | mcp-request-logs     | tumiki_logs      | mcp_requests   |

## 環境変数

セットアップ後、mcp-proxyに以下の環境変数を設定:

```env
# 開発環境・ステージング環境（共通）
PUBSUB_MCP_LOGS_TOPIC=mcp-request-logs-dev

# 本番環境
PUBSUB_MCP_LOGS_TOPIC=mcp-request-logs
```

## サービスアカウント権限

### mcp-proxy用（Pub/Sub発行権限）

mcp-proxyが使用するサービスアカウントに以下の権限を追加:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```

### Pub/Subサービスアカウント用（BigQuery書き込み権限）

BigQuery Subscriptionを使用するには、Pub/Subサービスアカウントに書き込み権限が必要:

```bash
# プロジェクト番号を確認
gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"

# Pub/SubサービスアカウントにBigQuery書き込み権限を付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:service-PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"
```

## テーブル設計

### パーティショニング

- `publish_time` フィールドで日次パーティション
- 古いデータの自動削除やコスト最適化に有効

### スキーマ

BigQuery Subscriptionはメッセージ全体を`data`カラムにJSON形式で格納します。
クエリ時にJSON関数を使用してフィールドを抽出します。

| フィールド        | 型        | 説明                                            |
| ----------------- | --------- | ----------------------------------------------- |
| data              | STRING    | ログデータ（JSON形式）                          |
| subscription_name | STRING    | Pub/Subサブスクリプション名                     |
| message_id        | STRING    | Pub/SubメッセージID                             |
| publish_time      | TIMESTAMP | Pub/Sub発行時刻                                 |
| attributes        | STRING    | メッセージ属性（organizationId, userId を含む） |

### dataカラム内のJSONフィールド

| フィールド        | 型        | 説明                     |
| ----------------- | --------- | ------------------------ |
| id                | STRING    | ログID                   |
| mcpServerId       | STRING    | MCPサーバーID            |
| organizationId    | STRING    | 組織ID                   |
| userId            | STRING    | ユーザーID               |
| mcpApiKeyId       | STRING    | APIキーID                |
| toolName          | STRING    | ツール名                 |
| transportType     | STRING    | トランスポートタイプ     |
| method            | STRING    | MCPメソッド              |
| httpStatus        | INT64     | HTTPステータス           |
| durationMs        | INT64     | 実行時間(ms)             |
| inputBytes        | INT64     | リクエストサイズ         |
| outputBytes       | INT64     | レスポンスサイズ         |
| errorCode         | INT64     | エラーコード             |
| errorSummary      | STRING    | エラー概要               |
| errorDetails      | JSON      | エラー詳細               |
| userAgent         | STRING    | User-Agent               |
| timestamp         | TIMESTAMP | タイムスタンプ           |
| requestBody       | JSON      | リクエストJSON           |
| responseBody      | JSON      | レスポンスJSON           |
| postgresLogFailed | BOOL      | PostgreSQL記録失敗フラグ |

## クエリ例

### 組織別の使用状況

`attributes`カラムにはJSON形式で`organizationId`と`userId`が格納されています。

```sql
SELECT
  JSON_VALUE(attributes, '$.organizationId') as organizationId,
  COUNT(*) as request_count,
  SUM(CAST(JSON_VALUE(data, '$.durationMs') AS INT64)) / 1000 as total_duration_sec,
  SUM(CAST(JSON_VALUE(data, '$.inputBytes') AS INT64) + CAST(JSON_VALUE(data, '$.outputBytes') AS INT64)) as total_bytes
FROM `tumiki_logs_dev.mcp_requests`
WHERE publish_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY organizationId
ORDER BY request_count DESC
```

### エラー分析

```sql
SELECT
  JSON_VALUE(data, '$.toolName') as toolName,
  JSON_VALUE(data, '$.errorCode') as errorCode,
  JSON_VALUE(data, '$.errorSummary') as errorSummary,
  COUNT(*) as error_count
FROM `tumiki_logs_dev.mcp_requests`
WHERE JSON_VALUE(data, '$.errorCode') IS NOT NULL
  AND publish_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY toolName, errorCode, errorSummary
ORDER BY error_count DESC
```

### ユーザー別のツール使用状況

```sql
SELECT
  JSON_VALUE(attributes, '$.userId') as userId,
  JSON_VALUE(data, '$.toolName') as toolName,
  COUNT(*) as usage_count,
  AVG(CAST(JSON_VALUE(data, '$.durationMs') AS FLOAT64)) as avg_duration_ms
FROM `tumiki_logs_dev.mcp_requests`
WHERE JSON_VALUE(attributes, '$.organizationId') = 'your-org-id'
  AND publish_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY userId, toolName
ORDER BY usage_count DESC
```

### ビュー作成（オプション）

頻繁にクエリする場合、JSONを展開したビューを作成すると便利です：

```sql
CREATE VIEW `tumiki_logs_dev.mcp_requests_view` AS
SELECT
  JSON_VALUE(data, '$.id') as id,
  JSON_VALUE(data, '$.mcpServerId') as mcpServerId,
  JSON_VALUE(attributes, '$.organizationId') as organizationId,
  JSON_VALUE(attributes, '$.userId') as userId,
  JSON_VALUE(data, '$.toolName') as toolName,
  JSON_VALUE(data, '$.method') as method,
  CAST(JSON_VALUE(data, '$.durationMs') AS INT64) as durationMs,
  CAST(JSON_VALUE(data, '$.inputBytes') AS INT64) as inputBytes,
  CAST(JSON_VALUE(data, '$.outputBytes') AS INT64) as outputBytes,
  CAST(JSON_VALUE(data, '$.errorCode') AS INT64) as errorCode,
  JSON_VALUE(data, '$.errorSummary') as errorSummary,
  TIMESTAMP(JSON_VALUE(data, '$.timestamp')) as timestamp,
  publish_time,
  message_id
FROM `tumiki_logs_dev.mcp_requests`
```

## アクセス制御（マルチテナント対応）

BigQueryへの直接アクセスは管理者のみに制限し、ユーザー向けのデータアクセスはmanagerアプリ経由で提供します。

### 設計方針

- **BigQuery直接アクセス**: 管理者のみ（GCPコンソール/CLI）
- **ユーザー向け**: managerアプリのAPIを通じてアクセス
- **フィルタリング**: 認証済みユーザーのorganizationIdで自動フィルタリング

### managerアプリでの実装例

```typescript
// server/api/routers/analytics.ts
export const analyticsRouter = router({
  getUsageStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.session.user;

      // organizationIdで必ずフィルタリング（セキュリティ上必須）
      const query = `
        SELECT
          JSON_VALUE(data, '$.toolName') as toolName,
          COUNT(*) as request_count,
          SUM(CAST(JSON_VALUE(data, '$.durationMs') AS INT64)) as total_duration_ms
        FROM \`tumiki_logs.mcp_requests\`
        WHERE JSON_VALUE(attributes, '$.organizationId') = @orgId
          AND publish_time BETWEEN @startDate AND @endDate
        GROUP BY toolName
        ORDER BY request_count DESC
      `;

      const [rows] = await bigQueryClient.query({
        query,
        params: {
          orgId: organizationId,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });

      return rows;
    }),
});
```

### メリット

- 組織ごとのサービスアカウント管理が不要
- 既存の認証・認可システムを活用
- アプリケーション層で柔軟にアクセス制御可能
- `attributes`カラムの`organizationId`で効率的なフィルタリング
