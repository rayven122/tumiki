#!/bin/bash
# ========================================
# Cloud SQL for PostgreSQL セットアップ
# ========================================
# Keycloak 用の Cloud SQL インスタンスを作成します

set -e

# 色付き出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# エラーハンドリング
error_exit() {
  echo -e "${RED}エラー: $1${NC}" >&2
  exit 1
}

info() {
  echo -e "${GREEN}$1${NC}"
}

warn() {
  echo -e "${YELLOW}$1${NC}"
}

# プロジェクトルートに移動
cd "$(dirname "$0")/../.." || error_exit "プロジェクトルートに移動できません"

info "=== Cloud SQL セットアップ開始 ==="

# gcloud CLI の確認
if ! command -v gcloud &> /dev/null; then
  error_exit "gcloud CLI がインストールされていません"
fi

# Vercel CLI の確認
if ! command -v vercel &> /dev/null; then
  error_exit "Vercel CLI がインストールされていません。'npm i -g vercel' でインストールしてください。"
fi

# Vercel Secret から環境変数を取得
info "📦 Vercel Secret を取得中..."
if ! vercel env pull .env.production --yes; then
  error_exit "Vercel Secret の取得に失敗しました"
fi

# 環境変数を読み込み
if [ ! -f .env.production ]; then
  error_exit ".env.production ファイルが見つかりません"
fi

set -a
source .env.production
set +a

# 必須環境変数のチェック
REQUIRED_VARS=(
  "GCP_PROJECT_ID"
  "KEYCLOAK_DB_USER"
  "KEYCLOAK_DB_PASSWORD"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    error_exit "環境変数 $var が設定されていません"
  fi
done

# デフォルト値の設定
GCP_REGION=${GCP_REGION:-asia-northeast1}
INSTANCE_NAME=${CLOUD_SQL_INSTANCE_NAME:-keycloak-db}

info "📋 セットアップ設定:"
echo "  プロジェクト: $GCP_PROJECT_ID"
echo "  リージョン: $GCP_REGION"
echo "  インスタンス名: $INSTANCE_NAME"

# GCP プロジェクトの設定
info "🔧 GCP プロジェクトを設定中..."
gcloud config set project "$GCP_PROJECT_ID"

# Cloud SQL インスタンスの作成
info "💾 Cloud SQL インスタンスを作成中..."

if gcloud sql instances describe "$INSTANCE_NAME" &> /dev/null; then
  warn "⚠️  インスタンス '$INSTANCE_NAME' は既に存在します。スキップします。"
else
  gcloud sql instances create "$INSTANCE_NAME" \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region="$GCP_REGION" \
    --storage-type=SSD \
    --storage-size=10GB \
    --no-storage-auto-increase \
    --backup-start-time=03:00 \
    --database-flags=max_connections=100 \
    --quiet || error_exit "Cloud SQL インスタンスの作成に失敗しました"
fi

# データベースの作成
info "🗄️  データベースを作成中..."

if gcloud sql databases describe keycloak --instance="$INSTANCE_NAME" &> /dev/null; then
  warn "⚠️  データベース 'keycloak' は既に存在します。スキップします。"
else
  gcloud sql databases create keycloak \
    --instance="$INSTANCE_NAME" \
    --quiet || error_exit "データベースの作成に失敗しました"
fi

# ユーザーの作成
info "👤 データベースユーザーを作成中..."

if gcloud sql users describe "$KEYCLOAK_DB_USER" --instance="$INSTANCE_NAME" &> /dev/null; then
  warn "⚠️  ユーザー '$KEYCLOAK_DB_USER' は既に存在します。スキップします。"
else
  gcloud sql users create "$KEYCLOAK_DB_USER" \
    --instance="$INSTANCE_NAME" \
    --password="$KEYCLOAK_DB_PASSWORD" \
    --quiet || error_exit "ユーザーの作成に失敗しました"
fi

# 接続文字列の取得
CLOUD_SQL_INSTANCE=$(gcloud sql instances describe "$INSTANCE_NAME" \
  --format='get(connectionName)' 2>/dev/null)

# 一時ファイルの削除
rm -f .env.production

info "✅ Cloud SQL セットアップ完了!"
echo ""
echo "📍 接続文字列: $CLOUD_SQL_INSTANCE"
echo ""
warn "⚠️  次のステップ:"
echo "  1. Vercel に CLOUD_SQL_INSTANCE を追加:"
echo "     vercel env add CLOUD_SQL_INSTANCE"
echo "     値: $CLOUD_SQL_INSTANCE"
echo ""
echo "  2. Keycloak をデプロイ:"
echo "     ./docker/keycloak/prod-gce/deploy.sh"
echo ""

info "=== セットアップ完了 ==="
