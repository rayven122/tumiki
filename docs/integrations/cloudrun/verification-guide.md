# Cloud Run MCP サーバー連携 動作検証ガイド

このドキュメントでは、実装した Cloud Run MCP サーバー連携の動作検証方法を説明します。

## 前提条件

### 1. Cloud Run サービスの確認

```bash
# デプロイ済みのサービスを確認
gcloud run services list --platform managed

# サービスの詳細を確認
gcloud run services describe deepl-mcp --region=asia-northeast1
gcloud run services describe figma-mcp --region=asia-northeast1
```

### 2. 認証情報の準備

#### Google Cloud 認証（ローカル開発）

```bash
# Application Default Credentials を設定
gcloud auth application-default login

# 認証情報が正しく設定されているか確認
gcloud auth application-default print-access-token
```

#### API キーの準備

`.env` ファイルに必要な API キーを設定：

```env
# DeepL API Key
DEEPL_API_KEY=your-deepl-api-key

# Figma API Keys
FIGMA_API_KEY=your-figma-api-key
FIGMA_OAUTH_TOKEN=your-figma-oauth-token
```

## 検証方法

### ✅ レベル 1: 基本接続テスト

#### 1-1. Cloud Run エンドポイントの疎通確認

```bash
# DeepL MCP
curl -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  https://deepl-mcp-67726874216.asia-northeast1.run.app/health

# Figma MCP
curl -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  https://figma-mcp-67726874216.asia-northeast1.run.app/health
```

**期待する結果**: HTTP 200 または MCP サーバーからの応答

#### 1-2. ProxyServer からの接続テスト

```bash
cd apps/proxyServer
pnpm with-env npx tsx scripts/test-cloudrun-connection.ts
```

**期待する出力例**:

```
🚀 Cloud Run MCP サーバー接続テスト開始

📡 テスト: DeepL MCP (Cloud Run)
   URL: https://deepl-mcp-67726874216.asia-northeast1.run.app
   ⏳ MCP クライアントを作成中...
   ✅ クライアント作成成功
   ⏳ サーバーに接続中...
   ✅ 接続成功
   ⏳ サーバー情報を取得中...
   ✅ サーバー情報:
      - 名前: deepl-mcp-server
      - バージョン: 1.0.0
   ⏳ ツールリストを取得中...
   ✅ ツール数: 3
   📋 利用可能なツール:
      - translate: Translate text using DeepL API
      - detect_language: Detect the language of text
      - get_usage: Get DeepL API usage statistics
   ✅ DeepL MCP (Cloud Run) のテスト完了
```

### ✅ レベル 2: 認証機能の検証

#### 2-1. Cloud Run IAM 認証の確認

```bash
# OAuth2.0 トークンの取得をテスト
cd apps/proxyServer
pnpm with-env npx tsx -e "
import { getCloudRunAccessToken } from './src/utils/cloudRunAuth.js';
const token = await getCloudRunAccessToken();
console.log('✅ Access token obtained:', token.substring(0, 20) + '...');
"
```

**期待する結果**: アクセストークンが正常に取得される

#### 2-2. API キーヘッダーの送信確認

Cloud Run のログで API キーが正しく送信されているか確認：

```bash
# DeepL MCP のログを確認
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=deepl-mcp" \
  --limit=10 \
  --format=json

# Figma MCP のログを確認
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=figma-mcp" \
  --limit=10 \
  --format=json
```

### ✅ レベル 3: エンドツーエンドテスト

#### 3-1. データベースにサーバー登録

```bash
# プロジェクトルートで
cd packages/scripts
pnpm db:seed
```

または、Manager UI から手動で登録：

1. Manager にログイン
2. MCP サーバー設定画面を開く
3. 「DeepL MCP (Cloud Run)」を検索
4. 環境変数に API キーを設定
5. 「保存」をクリック

#### 3-2. Manager UI からの接続テスト

1. **Manager を起動**:

   ```bash
   cd apps/manager
   pnpm dev
   ```

2. **ProxyServer を起動**:

   ```bash
   cd apps/proxyServer
   pnpm with-env pnpm start
   ```

3. **Manager UI で接続テスト**:
   - ブラウザで `https://local.tumiki.cloud:3000` を開く
   - MCP サーバー一覧から「DeepL MCP (Cloud Run)」を選択
   - 「接続テスト」ボタンをクリック
   - ツールリストが表示されることを確認

#### 3-3. MCP ツールの実行テスト

Manager UI で実際にツールを実行：

**DeepL の場合**:
1. `translate` ツールを選択
2. パラメータを入力:
   ```json
   {
     "text": "Hello, World!",
     "target_lang": "JA"
   }
   ```
3. 「実行」をクリック
4. 翻訳結果が表示されることを確認

**Figma の場合**:
1. `get_file` ツールを選択
2. Figma ファイル ID を指定
3. ファイル情報が取得できることを確認

### ✅ レベル 4: エラーハンドリングの検証

#### 4-1. 認証エラーのテスト

無効な認証情報でテスト：

```bash
# ADC を一時的に無効化
export GOOGLE_APPLICATION_CREDENTIALS=/tmp/invalid.json

# テストスクリプトを実行（エラーが期待される）
cd apps/proxyServer
pnpm with-env npx tsx scripts/test-cloudrun-connection.ts

# 環境変数をリセット
unset GOOGLE_APPLICATION_CREDENTIALS
```

**期待する結果**:
```
❌ エラー: Cloud Run authentication error: ...
```

#### 4-2. API キーエラーのテスト

無効な API キーでテスト：

```bash
# 無効な API キーを設定
export DEEPL_API_KEY=invalid-key

# テストスクリプトを実行
cd apps/proxyServer
pnpm with-env npx tsx scripts/test-cloudrun-connection.ts
```

**期待する結果**: MCP サーバーから API キーエラーが返される

#### 4-3. ネットワークエラーのテスト

無効な URL でテスト：

```typescript
// test-cloudrun-connection.ts を編集
// URL を無効なものに変更
url: "https://invalid-url-12345.run.app"
```

**期待する結果**: 接続エラーが適切に処理される

## トラブルシューティング

### ❌ 接続エラー: 403 Forbidden

**原因**: Cloud Run IAM 認証の権限不足

**解決方法**:

```bash
# サービスアカウントに Cloud Run Invoker 権限を付与
gcloud run services add-iam-policy-binding deepl-mcp \
  --region=asia-northeast1 \
  --member=user:your-email@example.com \
  --role=roles/run.invoker
```

### ❌ 接続エラー: 401 Unauthorized

**原因**: アクセストークンの有効期限切れまたは無効

**解決方法**:

```bash
# ADC を再設定
gcloud auth application-default login

# トークンが取得できるか確認
gcloud auth application-default print-access-token
```

### ❌ API キーエラー

**原因**: API キーが正しく設定されていない

**解決方法**:

1. `.env` ファイルの API キーを確認
2. Cloud Run のログで環境変数が正しく渡されているか確認:

   ```bash
   gcloud logging read "resource.type=cloud_run_revision \
     AND resource.labels.service_name=deepl-mcp \
     AND textPayload=~'DEEPL_API_KEY'" \
     --limit=5
   ```

### ❌ タイムアウトエラー

**原因**: Cloud Run のコールドスタート

**解決方法**:

- 最小インスタンス数を設定（本番環境推奨）:

  ```bash
  gcloud run services update deepl-mcp \
    --region=asia-northeast1 \
    --min-instances=1
  ```

## 性能検証

### レスポンスタイムの測定

```bash
# DeepL MCP のレスポンスタイム測定
time curl -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' \
  https://deepl-mcp-67726874216.asia-northeast1.run.app
```

**期待する結果**:
- 初回（コールドスタート）: 2-5秒
- 2回目以降（ウォーム）: 100-500ms

### 同時接続数のテスト

```bash
# 10 並列リクエスト
for i in {1..10}; do
  curl -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
    https://deepl-mcp-67726874216.asia-northeast1.run.app/health &
done
wait
```

## 検証チェックリスト

- [ ] Cloud Run サービスがデプロイされている
- [ ] Google Cloud 認証が設定されている
- [ ] API キーが `.env` に設定されている
- [ ] 基本接続テストが成功する
- [ ] Cloud Run IAM 認証が動作する
- [ ] API キーが正しく送信される
- [ ] Manager UI から接続できる
- [ ] MCP ツールが実行できる
- [ ] エラーハンドリングが適切に動作する
- [ ] レスポンスタイムが許容範囲内

## 参考資料

- [Cloud Run MCP 連携ガイド](./cloudrun-mcp-integration.md)
- [Google Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [MCP SDK ドキュメント](https://modelcontextprotocol.io)

---

**最終更新**: 2025-10-26
