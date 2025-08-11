# GitHub Actions CI/CDセットアップガイド

## 概要

このドキュメントでは、GitHub ActionsによるCI/CDパイプラインのセットアップ手順を説明します。

### デプロイフロー

- **Pull Request作成/更新** → Vercelプレビュー環境へ自動デプロイ
- **mainブランチへのpush** → Vercelステージング環境へ自動デプロイ
- **v*タグの作成** → 本番環境へ自動デプロイ（Vercel + GCE）
- **手動トリガー** → 環境を選択してデプロイ

### 環境別デプロイ対象

| 環境 | トリガー | Vercel | GCE ProxyServer |
|------|---------|---------|-----------------|
| Preview | Pull Request | ✅ | ❌ |
| Staging | mainブランチへのpush | ✅ | ❌ |
| Production | v*タグの作成 | ✅ | ✅ |

## 必要なGitHub Secrets設定

### 1. Vercel関連

#### `VERCEL_TOKEN`
Vercel APIトークンを取得して設定します。

```bash
# Vercel Dashboardにアクセス
# Settings > Tokens > Create Token
# スコープ: Full Access
```

#### `VERCEL_ORG_ID`
```bash
# プロジェクトルートで実行
cat .vercel/project.json | grep orgId
```

#### `VERCEL_PROJECT_ID`
```bash
# プロジェクトルートで実行
cat .vercel/project.json | grep projectId
```

### 2. Google Cloud Platform関連

#### サービスアカウントの作成

```bash
# 本番環境用サービスアカウント（GCEデプロイは本番のみ）
gcloud iam service-accounts create tumiki-deploy-production \
  --display-name="Tumiki Deploy Production" \
  --project=YOUR_PROJECT_ID
```

#### 必要な権限の付与

```bash
# 本番環境用サービスアカウントに権限を付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:tumiki-deploy-production@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/compute.instanceAdmin.v1"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:tumiki-deploy-production@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/compute.osLogin"
```

#### サービスアカウントキーの作成

```bash
# 本番環境用
gcloud iam service-accounts keys create sa-key-production.json \
  --iam-account=tumiki-deploy-production@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

#### GitHub Secretsへの登録

```bash
# sa-key-production.jsonの内容を`GCP_SA_KEY_PRODUCTION`として登録
```

#### その他のGCP関連Secrets

- `GCP_PROJECT_ID`: GCPプロジェクトID
- `GCE_ZONE`: GCEインスタンスのゾーン（例: `asia-northeast2-c`）
- `GCE_INSTANCE_NAME_PRODUCTION`: 本番環境のインスタンス名

### 3. データベース関連

#### `DATABASE_URL_STAGING`
ステージング環境のデータベース接続文字列

```
postgresql://user:password@host:port/staging_db?schema=public
```

#### `DATABASE_URL_PRODUCTION`
本番環境のデータベース接続文字列

```
postgresql://user:password@host:port/production_db?schema=public
```

## GitHub Secretsの登録方法

1. GitHubリポジトリにアクセス
2. Settings → Secrets and variables → Actions
3. "New repository secret"をクリック
4. Name と Secret を入力して保存

### 一括登録スクリプト（GitHub CLI使用）

```bash
# GitHub CLIをインストール
brew install gh  # macOS
# または https://cli.github.com/ から取得

# 認証
gh auth login

# Secretsの登録
gh secret set VERCEL_TOKEN --body="your-vercel-token"
gh secret set VERCEL_ORG_ID --body="your-org-id"
gh secret set VERCEL_PROJECT_ID --body="your-project-id"
gh secret set GCP_PROJECT_ID --body="your-gcp-project-id"
gh secret set GCE_ZONE --body="asia-northeast2-c"
gh secret set GCE_INSTANCE_NAME_PRODUCTION --body="tumiki-instance-production"
gh secret set DATABASE_URL_STAGING --body="your-staging-db-url"
gh secret set DATABASE_URL_PRODUCTION --body="your-production-db-url"

# JSONファイルから読み込む場合
gh secret set GCP_SA_KEY_PRODUCTION < sa-key-production.json
```

## GitHub Environments（オプション）

より高度な管理を行う場合は、GitHub Environmentsを設定します。

### 環境の作成

1. Settings → Environments
2. "New environment"をクリック
3. `staging`と`production`を作成

### 環境固有のSecrets設定

各環境で以下のSecretsを設定：
- `DATABASE_URL`
- `GCP_SA_KEY` (本番環境のみ)
- `GCE_INSTANCE_NAME` (本番環境のみ)

### デプロイ保護ルール（本番環境）

production環境で以下を設定：
- Required reviewers: レビュアーを指定
- Wait timer: デプロイ前の待機時間
- Deployment branches: `v*`タグのみ許可

## デプロイの実行

### 自動デプロイ

```bash
# Pull Request作成（プレビュー環境へのデプロイ）
git checkout -b feature/new-feature
git push origin feature/new-feature
# GitHubでPull Requestを作成

# ステージング環境へのデプロイ（Vercelのみ）
git push origin main

# 本番環境へのデプロイ（Vercel + GCE）
git tag v1.0.0
git push origin v1.0.0
```

### Pull Requestプレビュー

Pull Requestを作成すると：
1. 自動的にVercelへデプロイ
2. PRにプレビューURLがコメントされる
3. 新しいコミットで自動更新

### 手動デプロイ

1. GitHubリポジトリのActionsタブ
2. "CD"ワークフロー選択
3. "Run workflow"をクリック
4. 環境を選択（staging/production）
5. "Run workflow"実行

## トラブルシューティング

### Vercelデプロイが失敗する場合

```bash
# プロジェクトがリンクされているか確認
vercel link

# トークンの有効性確認
vercel whoami --token YOUR_TOKEN
```

### GCEデプロイが失敗する場合

```bash
# サービスアカウントの権限確認
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:tumiki-deploy-*"

# インスタンスへのアクセス確認
gcloud compute ssh tumiki-deploy@INSTANCE_NAME \
  --zone=ZONE \
  --project=PROJECT_ID
```

### データベース接続エラー

```bash
# 接続文字列の確認
psql "DATABASE_URL"

# ネットワーク接続確認
nc -zv DATABASE_HOST DATABASE_PORT
```

## セキュリティベストプラクティス

1. **最小権限の原則**
   - サービスアカウントには必要最小限の権限のみ付与
   - 環境ごとに異なるサービスアカウントを使用

2. **Secrets管理**
   - Secretsは定期的にローテーション
   - 不要になったSecretsは削除
   - アクセスログを定期的に確認

3. **環境分離**
   - ステージングと本番環境は完全に分離
   - データベースは環境ごとに別インスタンス
   - ネットワークも可能な限り分離

4. **監査ログ**
   - GitHub Actionsの実行ログを定期的に確認
   - GCPの監査ログを有効化
   - 異常なアクセスパターンを監視

## 参考リンク

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Google Cloud SDK Documentation](https://cloud.google.com/sdk/docs)
- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments)