# Cloud Run MCP Proxy デプロイメントガイド

このガイドでは、Tumiki MCP ProxyをGoogle Cloud Runにデプロイする手順を説明します。

## 📋 目次

1. [概要](#概要)
2. [前提条件](#前提条件)
3. [初回セットアップ](#初回セットアップ)
4. [デプロイ方法](#デプロイ方法)
5. [運用管理](#運用管理)
6. [トラブルシューティング](#トラブルシューティング)
7. [コスト最適化](#コスト最適化)

---

## 概要

### アーキテクチャ

```
GitHub Actions → Docker Build → Artifact Registry → Cloud Run
```

### 主要な特徴

- **ステートレス設計**: 水平スケーリング対応
- **スケールtoゼロ**: 未使用時は自動的に0インスタンスに
- **マネージドサービス**: インフラ管理不要
- **自動デプロイ**: GitHub ActionsによるCI/CD

### リソース構成

| リソース | 設定値 |
|---------|--------|
| **リージョン** | asia-northeast1（東京） |
| **メモリ** | 512Mi |
| **CPU** | 1 vCPU |
| **最小インスタンス** | 0 |
| **最大インスタンス** | 3 |
| **同時実行** | 80 requests/instance |
| **タイムアウト** | 60秒 |

---

## 前提条件

### 必要なツール

- **Google Cloud CLI** (`gcloud`)
- **Docker** (ローカルビルドテスト用、オプション)
- **Node.js** >= 22.14.0
- **pnpm** >= 10.11.0

### Google Cloud プロジェクト設定

1. **Google Cloud プロジェクト作成**
   ```bash
   gcloud projects create YOUR_PROJECT_ID
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **必要なAPIを有効化**
   ```bash
   # Cloud Run API
   gcloud services enable run.googleapis.com

   # Artifact Registry API
   gcloud services enable artifactregistry.googleapis.com

   # Secret Manager API
   gcloud services enable secretmanager.googleapis.com

   # Compute Engine API (VPC Connector用)
   gcloud services enable compute.googleapis.com

   # VPC Access API
   gcloud services enable vpcaccess.googleapis.com
   ```

---

## 初回セットアップ

### 1. Artifact Registry リポジトリ作成

```bash
# Dockerイメージリポジトリを作成
gcloud artifacts repositories create tumiki \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="Tumiki container images"
```

### 2. Secret Manager でシークレット作成

```bash
# データベースURL（ステージング）
echo -n "postgresql://..." | gcloud secrets create tumiki-database-url-staging \
  --data-file=- \
  --replication-policy="automatic"

# データベースURL（本番）
echo -n "postgresql://..." | gcloud secrets create tumiki-database-url-production \
  --data-file=- \
  --replication-policy="automatic"

# Redis URL
echo -n "https://..." | gcloud secrets create tumiki-redis-url \
  --data-file=- \
  --replication-policy="automatic"

# Redis Token
echo -n "..." | gcloud secrets create tumiki-redis-token \
  --data-file=- \
  --replication-policy="automatic"

# キャッシュ暗号化キー（ステージング）
openssl rand -hex 32 | gcloud secrets create tumiki-cache-encryption-key-staging \
  --data-file=- \
  --replication-policy="automatic"

# キャッシュ暗号化キー（本番）
openssl rand -hex 32 | gcloud secrets create tumiki-cache-encryption-key-production \
  --data-file=- \
  --replication-policy="automatic"
```

### 3. サービスアカウント作成

```bash
# サービスアカウント作成
gcloud iam service-accounts create tumiki-mcp-proxy \
  --display-name="Tumiki MCP Proxy Service Account"

# Secret Managerへのアクセス権限付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:tumiki-mcp-proxy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Cloud SQLへのアクセス権限付与（必要な場合）
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:tumiki-mcp-proxy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

### 4. VPC Connector 作成（オプション）

Cloud SQL プライベート接続を使用する場合:

```bash
gcloud compute networks vpc-access connectors create tumiki-vpc-connector \
  --region=asia-northeast1 \
  --subnet-project=YOUR_PROJECT_ID \
  --subnet=default \
  --min-instances=2 \
  --max-instances=3 \
  --machine-type=e2-micro
```

### 5. GitHub Secrets 設定

GitHubリポジトリの Settings > Secrets and variables > Actions で以下を設定:

- `GCP_SA_KEY_STAGING`: ステージング用サービスアカウントキー（JSON）
- `GCP_SA_KEY_PRODUCTION`: 本番用サービスアカウントキー（JSON）
- `GCP_PROJECT_ID`: GCPプロジェクトID

サービスアカウントキーの作成:

```bash
gcloud iam service-accounts keys create key.json \
  --iam-account=tumiki-mcp-proxy@YOUR_PROJECT_ID.iam.gserviceaccount.com

# key.jsonの内容をGitHub Secretsに設定
cat key.json
```

---

## デプロイ方法

### GitHub Actions経由（推奨）

#### ステージング環境

Pull Requestを作成すると自動的にステージング環境にデプロイされます。

#### 本番環境

`main` ブランチへマージすると自動的に本番環境にデプロイされます。

### ローカルから手動デプロイ

#### 1. 認証

```bash
# Google Cloud認証
gcloud auth login
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
```

#### 2. デプロイ実行

**推奨: GitHub Actions を使用**

プルリクエストをマージすると自動的にデプロイされます。

**ローカルから手動デプロイする場合:**

```bash
# Docker ビルド
docker build -t asia-northeast1-docker.pkg.dev/$GCP_PROJECT_ID/tumiki/mcp-proxy:staging-latest \
  -f apps/mcp-proxy/Dockerfile .

# Artifact Registry へプッシュ
docker push asia-northeast1-docker.pkg.dev/$GCP_PROJECT_ID/tumiki/mcp-proxy:staging-latest

# Cloud Run へデプロイ
gcloud run deploy tumiki-mcp-proxy-staging \
  --image=asia-northeast1-docker.pkg.dev/$GCP_PROJECT_ID/tumiki/mcp-proxy:staging-latest \
  --region=asia-northeast1
```

---

## 運用管理

### サービス情報確認

```bash
# サービス一覧
gcloud run services list --region=asia-northeast1

# サービス詳細
gcloud run services describe tumiki-mcp-proxy-production \
  --region=asia-northeast1

# サービスURL取得
gcloud run services describe tumiki-mcp-proxy-production \
  --region=asia-northeast1 \
  --format='value(status.url)'
```

### ログ確認

```bash
# リアルタイムログ
gcloud run services logs tail tumiki-mcp-proxy-production \
  --region=asia-northeast1

# エラーログのみ
gcloud run services logs read tumiki-mcp-proxy-production \
  --region=asia-northeast1 \
  --filter="severity>=ERROR" \
  --limit=50
```

### メトリクス確認

```bash
# Cloud Consoleでメトリクスダッシュボードを開く
gcloud run services describe tumiki-mcp-proxy-production \
  --region=asia-northeast1 \
  --format='value(status.url)' | \
  xargs -I {} open "https://console.cloud.google.com/run/detail/asia-northeast1/tumiki-mcp-proxy-production/metrics"
```

### 環境変数更新

```bash
# 環境変数を更新
gcloud run services update tumiki-mcp-proxy-production \
  --region=asia-northeast1 \
  --set-env-vars="LOG_LEVEL=debug"
```

### シークレット更新

```bash
# Secret Managerのシークレットを更新
echo -n "new-database-url" | gcloud secrets versions add tumiki-database-url-production \
  --data-file=-

# Cloud Runサービスは自動的に最新バージョンを使用
```

### スケーリング設定変更

```bash
# 最小インスタンス数を変更（コールドスタート回避）
gcloud run services update tumiki-mcp-proxy-production \
  --region=asia-northeast1 \
  --min-instances=1 \
  --max-instances=10
```

### ロールバック

```bash
# リビジョン一覧確認
gcloud run revisions list \
  --service=tumiki-mcp-proxy-production \
  --region=asia-northeast1

# 特定のリビジョンにロールバック
gcloud run services update-traffic tumiki-mcp-proxy-production \
  --region=asia-northeast1 \
  --to-revisions=tumiki-mcp-proxy-production-00001-abc=100
```

---

## トラブルシューティング

### コールドスタートが遅い

**問題**: 初回リクエストに2-3秒かかる

**解決策**:
```bash
# 最小インスタンス数を1に設定
gcloud run services update tumiki-mcp-proxy-production \
  --region=asia-northeast1 \
  --min-instances=1
```

### データベース接続エラー

**問題**: Cloud SQL接続エラー

**確認事項**:
1. VPC Connectorが正しく設定されているか
2. サービスアカウントに `roles/cloudsql.client` 権限があるか
3. DATABASE_URLが正しいか

```bash
# サービスアカウント権限確認
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:tumiki-mcp-proxy@*"
```

### メモリ不足エラー

**問題**: `Memory limit exceeded`

**解決策**:
```bash
# メモリを増やす
gcloud run services update tumiki-mcp-proxy-production \
  --region=asia-northeast1 \
  --memory=1Gi
```

### デプロイが失敗する

**問題**: GitHub Actionsでのデプロイが失敗

**確認事項**:
1. Artifact Registry認証が正しく設定されているか
2. GCPサービスアカウントに適切な権限があるか
3. Docker イメージのビルドログを確認

**解決策**:
```bash
# ローカルでDockerビルドをテスト
docker build -t test -f apps/mcp-proxy/Dockerfile .

# GCP認証を確認
gcloud auth list
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
```

### ヘルスチェック失敗

**問題**: デプロイ後にサービスが起動しない

**確認**:
```bash
# ローカルでDockerイメージをテスト
docker build -t mcp-proxy -f apps/mcp-proxy/Dockerfile .
docker run -p 8080:8080 mcp-proxy

# ヘルスチェックエンドポイントをテスト
curl http://localhost:8080/health
```

---

## コスト最適化

### 料金体系

Cloud Runは以下の3つの要素で課金されます:

1. **CPU時間**: vCPU-秒単位
2. **メモリ時間**: GiB-秒単位
3. **リクエスト数**: 100万リクエスト単位

### コスト削減のヒント

#### 1. スケールtoゼロを活用

```bash
# 未使用時は0インスタンスに（デフォルト）
--min-instances=0
```

#### 2. リソースを適切に設定

```bash
# 必要最小限のリソース
--memory=512Mi
--cpu=1
```

#### 3. 同時実行数を最適化

```bash
# 1インスタンスあたりのリクエスト数を増やす
--concurrency=80
```

#### 4. タイムアウトを短く設定

```bash
# 不要な長時間実行を防ぐ
--timeout=60s
```

### コスト見積もり

**例**: 月間100万リクエスト、平均レスポンス時間100ms

- CPU時間: 100万 × 0.1秒 = 100,000 vCPU-秒
- メモリ時間: 100万 × 0.1秒 × 0.5GiB = 50,000 GiB-秒
- リクエスト数: 100万リクエスト

**月額料金**: 約 $5-10（無料枠考慮後）

### モニタリングとアラート

```bash
# Cloud Consoleでコストダッシュボードを確認
# https://console.cloud.google.com/billing/
```

---

## まとめ

Cloud RunへのMCP Proxyデプロイにより、以下のメリットが得られます:

✅ **自動スケーリング**: トラフィックに応じて自動調整
✅ **コスト効率**: 使用した分だけ課金、スケールtoゼロ対応
✅ **高可用性**: マネージドサービスによる自動復旧
✅ **簡単なデプロイ**: GitHub ActionsによるCI/CD自動化
✅ **運用負荷軽減**: インフラ管理不要

---

## 参考リンク

- [Google Cloud Run 公式ドキュメント](https://cloud.google.com/run/docs)
- [Secret Manager 公式ドキュメント](https://cloud.google.com/secret-manager/docs)
- [Artifact Registry 公式ドキュメント](https://cloud.google.com/artifact-registry/docs)
- [GitHub Actions 公式ドキュメント](https://docs.github.com/ja/actions)
