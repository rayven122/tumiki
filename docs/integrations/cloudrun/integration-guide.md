<!-- cSpell:words cloudrun deepl -->

# Cloud Run MCP サーバー連携ガイド

Cloud Run にデプロイされた MCP サーバーを Tumiki プロジェクトで利用するための設定ガイドです。

## 概要

[tumiki-mcp-cloudrun](https://github.com/rayven122/tumiki-mcp-cloudrun) リポジトリでデプロイされた MCP サーバーは HTTP エンドポイントとして公開され、Tumiki プロジェクトから Streamable HTTPS 経由で接続できます。

### アーキテクチャ

```text
┌─────────────────┐
│ Tumiki Manager  │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│ Tumiki Proxy    │
│   Server        │
└────────┬────────┘
         │ Streamable HTTP
         │ Client Transport
         ▼
┌─────────────────────────────────┐
│   Google Cloud Run              │
│  ┌──────────────────────────┐   │
│  │ tumiki-mcp-http-adapter  │   │
│  │   (HTTP → stdio 変換)    │   │
│  └──────────┬───────────────┘   │
│             ▼                   │
│  ┌──────────────────────────┐   │
│  │   MCP Server (stdio)     │   │
│  │  (DeepL, Figma, etc.)    │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

## Tumiki での設定

### MCP サーバーの登録

Cloud Run にデプロイされた MCP サーバーを Tumiki で利用するには、`packages/scripts/src/constants/mcpServers.ts` に定義を追加します。

#### 設定例（DeepL MCP Server）

```typescript
{
  name: "DeepL MCP (Cloud Run)",
  description: "Cloud Run にデプロイされた DeepL 翻訳サービス",
  tags: ["翻訳", "ツール", "Cloud Run"],
  iconPath: "/logos/deepl.svg",
  // Cloud Run の URL を指定
  url: "https://deepl-mcp-xxxxx-an.a.run.app",
  // トランスポートタイプを STREAMABLE_HTTPS に設定
  transportType: "STREAMABLE_HTTPS" as const,
  // 環境変数（HTTP ヘッダーとして送信される）
  envVars: ["DEEPL_API_KEY"],
  // 認証タイプ
  authType: "API_KEY" as const,
  isPublic: true,
}
```

#### 設定例（Figma MCP Server）

```typescript
{
  name: "Figma (Cloud Run)",
  description: "Cloud Run にデプロイされた Figma デザイン連携",
  tags: ["デザイン", "UI/UX", "Cloud Run"],
  iconPath: "/logos/figma.svg",
  url: "https://figma-mcp-xxxxx-an.a.run.app",
  transportType: "STREAMABLE_HTTPS" as const,
  envVars: ["FIGMA_API_KEY", "FIGMA_OAUTH_TOKEN"],
  authType: "API_KEY" as const,
  isPublic: true,
}
```

### 設定パラメータ説明

| パラメータ | 説明 | 必須 |
|----------|------|------|
| `name` | MCP サーバーの表示名 | ✅ |
| `description` | MCP サーバーの説明 | - |
| `tags` | カテゴリー分類用のタグ配列 | - |
| `iconPath` | アイコンのパス | - |
| `url` | Cloud Run のサービス URL | ✅ |
| `transportType` | 接続方式（`STREAMABLE_HTTPS` を指定） | ✅ |
| `envVars` | 環境変数のキー配列（HTTP ヘッダーとして送信） | - |
| `authType` | 認証タイプ（`NONE`, `API_KEY`, `OAUTH`） | ✅ |
| `isPublic` | 公開設定 | - |

### TransportType の選択

Cloud Run にデプロイされた MCP サーバーへの接続には **STREAMABLE_HTTPS** を使用します。

- **STREAMABLE_HTTPS**: HTTP ベースの双方向通信に適している

## 認証設定

### Cloud Run IAM 認証

Cloud Run は IAM 認証で保護されています。Tumiki ProxyServer から接続する際は、OAuth2.0 アクセストークンを使用した安全な認証方式を採用します。

#### サービスアカウントの設定

既存の Cloud Run デプロイ用サービスアカウントに Cloud Run Invoker 権限を付与します。

```bash
# 既存のサービスアカウント（例: github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com）
# に Cloud Run Invoker 権限を付与

gcloud run services add-iam-policy-binding deepl-mcp \
  --region=asia-northeast1 \
  --member=serviceAccount:github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/run.invoker
```

#### OAuth2.0 アクセストークンによる認証

サービスアカウントキーファイルを使用せず、OAuth2.0 アクセストークンを取得して Authorization ヘッダーで認証する方式を推奨します。

**メリット**:

- ✅ **セキュリティ向上**: キーファイルをファイルシステムに保存しない
- ✅ **トークンの有効期限**: 短期間のトークンで自動更新
- ✅ **監査ログ**: Cloud IAM でアクセス履歴を追跡可能

**実装方法**:

ProxyServer で Google Cloud SDK を使用してアクセストークンを取得し、HTTP リクエストの Authorization ヘッダーに含めます。

```typescript
import { GoogleAuth } from 'google-auth-library';

// Google Cloud 認証クライアント
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

// アクセストークンを取得
const client = await auth.getClient();
const accessToken = await client.getAccessToken();

// HTTP リクエストに Authorization ヘッダーを追加
const headers = {
  'Authorization': `Bearer ${accessToken.token}`,
  // その他のヘッダー
};
```

**環境設定**:

ProxyServer の環境で Application Default Credentials (ADC) を設定します。本番環境では既存のデプロイ用サービスアカウントの認証情報が自動的に使用されます。

```bash
# ローカル開発環境での設定
gcloud auth application-default login
```

**セキュリティのポイント**:

- ✅ **ファイル不要**: サービスアカウントキーファイルをファイルシステムに保存しない
- ✅ **環境変数不要**: `GOOGLE_APPLICATION_CREDENTIALS` 環境変数の設定が不要
- ✅ **自動トークン管理**: Google Auth Library がトークンの取得と更新を自動処理
- ✅ **本番環境**: Cloud Run や GCE では自動的にサービスアカウント認証情報を使用

### API キーの管理

MCP サーバーが必要とする API キー（DeepL API Key など）は、Tumiki Manager の UI から設定します。

1. **Manager にログイン**
2. **MCP サーバー設定画面**で対象のサーバーを選択
3. **環境変数**タブで API キーを入力
4. **保存**

API キーは暗号化されてデータベースに保存され、HTTP ヘッダー経由で Cloud Run の MCP サーバーに送信されます。

## 接続フロー

### リクエストフロー

```text
1. Tumiki Manager (Frontend)
   ↓ HTTP Request with API Key
2. Tumiki ProxyServer
   ↓ StreamableHTTPClientTransport.connect(url)
3. Cloud Run MCP Server
   ↓ HTTP Header → Environment Variable
4. tumiki-mcp-http-adapter
   ↓ stdio
5. MCP Server (DeepL, Figma, etc.)
```

### データフロー

1. **Manager → ProxyServer**
    - ユーザーが Manager UI で MCP サーバーを選択
    - Manager は ProxyServer に接続リクエストを送信
    - API キーなどの認証情報を含む

2. **ProxyServer → Cloud Run**
    - ProxyServer は StreamableHTTPClientTransport を作成
    - Cloud Run の URL に接続
    - IAM 認証トークンをヘッダーに含める

3. **Cloud Run → MCP Server**
    - tumiki-mcp-http-adapter が HTTP ヘッダーを環境変数に変換
    - MCP サーバーが stdio で起動
    - JSON-RPC メッセージを交換

## トラブルシューティング

### 接続エラー

**症状**: `Failed to connect to Cloud Run MCP Server`

**対処法**:

1. Cloud Run の URL が正しいか確認
2. Cloud Run サービスが起動しているか確認

    ```bash
    gcloud run services describe SERVICE_NAME --region=asia-northeast1
    ```

3. IAM 認証が正しく設定されているか確認

    ```bash
    gcloud run services get-iam-policy SERVICE_NAME \
      --region=asia-northeast1
    ```

### 認証エラー

**症状**: `403 Forbidden` または `401 Unauthorized`

**対処法**:

1. サービスアカウントに Cloud Run Invoker 権限があるか確認

    ```bash
    gcloud run services get-iam-policy SERVICE_NAME \
      --region=asia-northeast1 \
      --format=json | grep -A 5 "roles/run.invoker"
    ```

2. Application Default Credentials (ADC) が正しく設定されているか確認

    ```bash
    gcloud auth application-default print-access-token
    ```

    トークンが正常に取得できることを確認

3. アクセストークンの有効期限を確認
    - OAuth2.0 トークンは通常 1 時間で期限切れ
    - Google Auth Library による自動更新を確認

### API キーエラー

**症状**: MCP サーバーが `API Key is missing` エラーを返す

**対処法**:

1. Tumiki Manager で API キーが正しく設定されているか確認
2. Cloud Run のログで環境変数が正しく渡されているか確認

    ```bash
    gcloud logging read "resource.type=cloud_run_revision \
      AND resource.labels.service_name=SERVICE_NAME" \
      --limit=50
    ```

3. tumiki-mcp-http-adapter の `--header-env` マッピングが正しいか確認

### タイムアウトエラー

**症状**: `Connection timeout`

**対処法**:

1. Cloud Run のコールドスタートに時間がかかる可能性
2. ネットワーク接続を確認
3. Cloud Run のタイムアウト設定を確認

## セキュリティ考慮事項

### 最小権限の原則

1. **Cloud Run IAM**
    - 必要最小限の権限のみを付与（Cloud Run Invoker のみ）
    - 既存のデプロイ用サービスアカウントを再利用
    - 権限の定期的な監査

2. **認証トークン管理**
    - OAuth2.0 アクセストークンを使用（短期間で自動更新）
    - サービスアカウントキーファイルをファイルシステムに保存しない
    - Application Default Credentials (ADC) による安全な認証情報管理

3. **API キーの管理**
    - Tumiki のフィールドレベル暗号化で保護
    - 環境変数として直接コミットしない
    - MCP サーバーへは HTTP ヘッダー経由で送信

4. **ネットワークセキュリティ**
    - Cloud Run の Ingress 設定で許可された接続元のみ受け入れ
    - VPC コネクタの使用を検討（プライベートネットワーク）
    - HTTPS 通信の強制

### 監査ログ

Cloud Run の監査ログで接続履歴を追跡：

```bash
# Cloud Logging でフィルタリング
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=deepl-mcp" \
  --limit=50 \
  --format=json
```

## まとめ

Cloud Run にデプロイされた MCP サーバーを Tumiki で利用することで：

- ✅ **スケーラビリティ**: 使用量に応じた自動スケーリング
- ✅ **コスト効率**: 使用した分だけ課金
- ✅ **メンテナンス**: マネージドサービスで運用負荷が低い
- ✅ **セキュリティ**: IAM 認証とフィールドレベル暗号化

## 関連リソース

- [tumiki-mcp-cloudrun リポジトリ](https://github.com/rayven122/tumiki-mcp-cloudrun)
- [tumiki-mcp-http-adapter](https://github.com/rayven122/tumiki-mcp-http-adapter)
- [Google Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [MCP SDK ドキュメント](https://modelcontextprotocol.io)

## 次のステップ

1. Cloud Run にデプロイされた MCP サーバーの URL を取得
2. Tumiki の `mcpServers.ts` に設定を追加
3. Manager UI から接続テスト
4. 本番環境へのデプロイ

---

**最終更新**: 2025-10-26
