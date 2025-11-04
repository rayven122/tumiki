# Cloud Run カスタムドメイン設定

Cloud Runサービスにカスタムドメインを設定する手順

## 🎯 ドメイン構成

| 環境 | カスタムドメイン | Cloud Runサービス |
|-----|----------------|------------------|
| **Preview** | なし（各PRごとに異なる） | `tumiki-mcp-proxy-pr-{PR番号}` |
| **Staging** | `stg-server.tumiki.cloud` | `tumiki-mcp-proxy-staging` |
| **Production** | `server.tumiki.cloud` | `tumiki-mcp-proxy-production` |

**注意**: Preview環境では各PRごとに独立したCloud Runサービスが作成されるため、カスタムドメインは使用しません。

## ✨ 自動設定（Staging/Production環境）

**GitHub ActionsでStaging/Production環境のカスタムドメインが自動設定されます。**

初回デプロイ時に、`.github/actions/deploy-cloudrun/action.yml` が自動的に:
1. カスタムドメインマッピングを作成（Staging/Productionのみ）
2. DNS設定が必要な場合は手順を表示
3. SSL証明書の自動プロビジョニングを開始

**必要な作業（初回のみ）**:
- GitHub Actionsのログに表示されるDNS設定を実行
- SSL証明書の発行を待つ（最大48時間）

**以降のデプロイ**: 自動的にカスタムドメインが使用されます

**Preview環境**: カスタムドメインは設定されません（各PRごとに異なるサービスが作成されるため）

## 📝 手動設定手順（オプション）

GitHub Actionsによる自動設定を使用しない場合のみ、以下の手順を実行してください。

### 1. ドメインマッピングの作成

```bash
# Staging環境
gcloud run domain-mappings create \
  --service=tumiki-mcp-proxy-staging \
  --domain=stg-server.tumiki.cloud \
  --region=asia-northeast1

# Preview環境
gcloud run domain-mappings create \
  --service=tumiki-mcp-proxy-preview \
  --domain=preview-server.tumiki.cloud \
  --region=asia-northeast1

# Production環境（既に設定済みの場合はスキップ）
gcloud run domain-mappings create \
  --service=tumiki-mcp-proxy-production \
  --domain=server.tumiki.cloud \
  --region=asia-northeast1
```

### 2. DNS設定を取得

コマンド実行後、以下のような出力が表示されます：

```
Waiting for certificate provisioning. You must configure your DNS records for certificate issuance to begin.
```

DNS設定を確認：

```bash
# Staging環境のDNS設定を確認
gcloud run domain-mappings describe stg-server.tumiki.cloud \
  --region=asia-northeast1

# Preview環境のDNS設定を確認
gcloud run domain-mappings describe preview-server.tumiki.cloud \
  --region=asia-northeast1
```

出力例：
```yaml
resourceRecords:
- name: stg-server.tumiki.cloud
  rrdata: ghs.googlehosted.com
  type: CNAME
```

### 3. DNSレコードの設定

Cloud DNS、Route53、Cloudflare等でCNAMEレコードを追加：

#### Staging環境

```
タイプ: CNAME
名前: stg-server
値: ghs.googlehosted.com
TTL: 3600
```

#### Preview環境

```
タイプ: CNAME
名前: preview-server
値: ghs.googlehosted.com
TTL: 3600
```

### 4. SSL証明書の発行を待機

DNSレコード設定後、数分～数時間で自動的にSSL証明書が発行されます：

```bash
# 証明書の状態確認
gcloud run domain-mappings describe stg-server.tumiki.cloud \
  --region=asia-northeast1 \
  --format='value(status.conditions)'
```

`Ready` が `True` になれば完了です。

## 🔧 GitHub Actionsによる自動設定

**実装済み**: `.github/actions/deploy-cloudrun/action.yml` にカスタムドメイン自動設定が統合されています。

### 動作内容

デプロイ完了後、以下の処理が自動実行されます：

1. **ドメインマッピングの確認**
   - 既存のドメインマッピングをチェック
   - SSL証明書のステータスを確認

2. **ドメインマッピングの作成**（初回のみ）
   - カスタムドメインとCloud Runサービスをマッピング
   - DNS設定手順をログに表示

3. **SSL証明書の自動プロビジョニング**
   - DNS設定完了後、自動的に開始
   - 証明書のステータスを表示

### GitHub Actionsログの例

**Staging環境の初回デプロイ時**:
```
🌐 Setting up custom domain: stg-server.tumiki.cloud
⚠️  Custom domain not configured yet
📝 Creating domain mapping...
✅ Domain mapping created

⚠️  DNS CONFIGURATION REQUIRED
================================================
Please add the following DNS record:

  Type:  CNAME
  Name:  stg-server
  Value: ghs.googlehosted.com
  TTL:   3600

SSL certificate will be automatically provisioned
after DNS propagation (may take up to 48 hours).
================================================
```

**2回目以降のデプロイ**:
```
🌐 Setting up custom domain: stg-server.tumiki.cloud
✅ Custom domain already configured
✅ SSL certificate is ready
```

**Preview環境**:
```
🔵 Preview deployment for PR #372
Service: tumiki-mcp-proxy-pr-372
（カスタムドメイン設定はスキップされます）
```

## 🌐 Vercel環境変数の更新

カスタムドメイン設定後、Vercelの環境変数を更新：

| 環境 | 変数名 | 値 |
|-----|-------|-----|
| Preview | `NEXT_PUBLIC_MCP_PROXY_URL` | `https://preview-server.tumiki.cloud` |
| Staging | `NEXT_PUBLIC_MCP_PROXY_URL` | `https://stg-server.tumiki.cloud` |
| Production | `NEXT_PUBLIC_MCP_PROXY_URL` | `https://server.tumiki.cloud` |

### Vercelで設定

```bash
# Preview環境
vercel env add NEXT_PUBLIC_MCP_PROXY_URL preview
# 値: https://preview-server.tumiki.cloud

# Staging環境（新規追加）
vercel env add NEXT_PUBLIC_MCP_PROXY_URL preview
# 値: https://stg-server.tumiki.cloud

# Production環境
vercel env add NEXT_PUBLIC_MCP_PROXY_URL production
# 値: https://server.tumiki.cloud
```

## ✅ 設定確認

### 1. ドメインマッピングの確認

```bash
# すべてのドメインマッピングを確認
gcloud run domain-mappings list --region=asia-northeast1
```

### 2. SSL証明書の確認

```bash
# Staging
curl -I https://stg-server.tumiki.cloud/health

# Production
curl -I https://server.tumiki.cloud/health
```

### 3. DNS設定の確認

```bash
# CNAME レコードの確認
dig stg-server.tumiki.cloud CNAME
dig server.tumiki.cloud CNAME
```

### 4. Preview環境のCloud Runサービス確認

```bash
# PR #372の例
gcloud run services describe tumiki-mcp-proxy-pr-372 \
  --region=asia-northeast1 \
  --format='value(status.url)'
```

**注意**: Preview環境のCloud Runサービスは、PRクローズ時に自動的に削除されます（`.github/workflows/cleanup-pr.yml` で実行）

## 🔍 トラブルシューティング

### SSL証明書が発行されない

1. DNSレコードが正しいか確認
   ```bash
   dig stg-server.tumiki.cloud CNAME
   ```

2. DNS伝播を待つ（最大48時間）

3. ドメインマッピングの状態確認
   ```bash
   gcloud run domain-mappings describe stg-server.tumiki.cloud \
     --region=asia-northeast1
   ```

### ドメインマッピングの削除

```bash
# 間違って設定した場合
gcloud run domain-mappings delete stg-server.tumiki.cloud \
  --region=asia-northeast1
```

### Preview環境のCloud Runサービス削除

Preview環境のCloud Runサービスは、PRクローズ時に自動的に削除されます。

手動で削除する場合：
```bash
# PR #372の例
gcloud run services delete tumiki-mcp-proxy-pr-372 \
  --region=asia-northeast1
```

## 📚 関連ドキュメント

- [Cloud Run Custom Domains](https://cloud.google.com/run/docs/mapping-custom-domains)
- [Vercel環境変数セットアップ](./vercel-environment-setup.md)
- [Cloud Runデプロイメントガイド](./cloudrun-mcp-proxy-deployment.md)
