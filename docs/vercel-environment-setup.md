# Vercel 環境変数セットアップ

Vercelの各環境で適切なCloud Run URLにアクセスするための設定手順

## 🎯 環境別のCloud Run URL

| Vercel環境     | Cloud Runサービス              | URLパターン                                            | カスタムドメイン              |
| -------------- | ------------------------------ | ------------------------------------------------------ | ----------------------------- |
| **Preview**    | `tumiki-mcp-proxy-pr-{PR番号}` | `https://tumiki-mcp-proxy-pr-{PR番号}-xxxxx.a.run.app` | なし（各PRごとに異なる）      |
| **Production** | `tumiki-mcp-proxy-production`  | `https://tumiki-mcp-proxy-production-xxxxx.a.run.app`  | `https://server.tumiki.cloud` |

**Preview環境の注意**:

- 各PRごとに独立したCloud Runサービスが作成されます（例: PR #372 → `tumiki-mcp-proxy-pr-372`）
- URLはPRごとに異なるため、固定のカスタムドメインは使用しません
- PR環境のCloud Run URLはGitHub Actionsのデプロイログで確認できます

**Staging/Production環境**:

- カスタムドメインは初回デプロイ時に自動的に設定されます（GitHub Actionsで実行）
- DNS設定が必要な場合は、GitHub Actionsのログに手順が表示されます
- DNS設定完了後、SSL証明書が自動発行されます（最大48時間）

## 📝 設定手順

### Preview環境

Preview環境では、各PRごとに異なるCloud Run URLが生成されます。

**推奨アプローチ**:

1. **ローカル開発**: `http://localhost:8080` を使用（`apps/manager/src/utils/url.ts` のデフォルト値）
2. **PR環境での動作確認**: 必要に応じてGitHub Actionsのログから自動生成URLを確認

**PR環境のCloud Run URLの確認方法**:

```bash
# PR #372の例
gcloud run services describe tumiki-mcp-proxy-pr-372 \
  --region=asia-northeast1 \
  --format='value(status.url)'
```

**注意**: 各PRごとに異なるサービスが作成されるため、固定のVercel環境変数設定は困難です。

### Production環境（カスタムドメイン使用）

Production環境では、カスタムドメインを使用することで固定URLを設定できます。

#### 前提条件

カスタムドメインのDNS設定が完了していることを確認してください。
詳細は [Cloud Run カスタムドメイン設定](./cloudrun-custom-domain.md) を参照。

#### Vercelプロジェクト設定（1回のみ）

VercelダッシュボードまたはCLIで環境変数を設定：

```
Settings → Environment Variables → Add New
```

| 環境       | Name                        | Value                         |
| ---------- | --------------------------- | ----------------------------- |
| Production | `NEXT_PUBLIC_MCP_PROXY_URL` | `https://server.tumiki.cloud` |

#### CLIでの設定

```bash
# Production環境（カスタムドメイン使用）
vercel env add NEXT_PUBLIC_MCP_PROXY_URL production
# 入力: https://server.tumiki.cloud
```

**利点**:

- ✅ 1回設定すれば、以降の手動設定は不要
- ✅ URLが変更されないため、安定した運用が可能
- ✅ GitHub Actionsで自動的にカスタムドメインが設定される

## ✅ 設定確認

### 環境変数の確認

```bash
# 設定済み環境変数の確認
vercel env ls
```

### 動作確認

1. **Preview環境**: PRを作成してデプロイ
2. **Production環境**: mainブランチにマージ
3. ブラウザの開発者ツールでNetwork タブを確認
4. MCPリクエストが適切なURLに送信されているか確認

## 🔍 トラブルシューティング

### 環境変数が反映されない場合

1. Vercelで再デプロイ
2. ブラウザキャッシュをクリア
3. 環境変数名が正確か確認（`NEXT_PUBLIC_` プレフィックス必須）

### 間違ったCloud Runにアクセスしている場合

ブラウザ開発者ツールで確認：

```javascript
// Consoleで確認
console.log(process.env.NEXT_PUBLIC_MCP_PROXY_URL);
```

## 📚 関連ドキュメント

- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Cloud Run デプロイメントガイド](./cloudrun-mcp-proxy-deployment.md)
- [デプロイメントワークフロー](../.github/workflows/DEPLOYMENT.md)
