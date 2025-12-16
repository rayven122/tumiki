#!/bin/bash
# ========================================
# Keycloak GCE デプロイスクリプト
# ========================================
# Keycloak を Google Compute Engine にデプロイします

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
cd "$(dirname "$0")/../../.." || error_exit "プロジェクトルートに移動できません"

info "=== Keycloak GCE デプロイ開始 ==="

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
  "CLOUD_SQL_INSTANCE"
  "KEYCLOAK_ADMIN_USERNAME"
  "KEYCLOAK_ADMIN_PASSWORD"
  "KEYCLOAK_DB_USER"
  "KEYCLOAK_DB_PASSWORD"
  "KEYCLOAK_DOMAIN"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    error_exit "環境変数 $var が設定されていません"
  fi
done

# デフォルト値の設定
GCP_REGION=${GCP_REGION:-asia-northeast1}
GCP_ZONE=${GCP_ZONE:-asia-northeast1-a}
INSTANCE_NAME=${INSTANCE_NAME:-keycloak-vm}
MACHINE_TYPE=${MACHINE_TYPE:-e2-small}

info "📋 デプロイ設定:"
echo "  プロジェクト: $GCP_PROJECT_ID"
echo "  リージョン: $GCP_REGION"
echo "  ゾーン: $GCP_ZONE"
echo "  インスタンス名: $INSTANCE_NAME"
echo "  マシンタイプ: $MACHINE_TYPE"
echo "  ドメイン: $KEYCLOAK_DOMAIN"

# GCP プロジェクトの設定
info "🔧 GCP プロジェクトを設定中..."
gcloud config set project "$GCP_PROJECT_ID"

# Cloud SQL 接続文字列の構築
KC_DB_URL="jdbc:postgresql:///${KEYCLOAK_DB_USER}?host=/cloudsql/${CLOUD_SQL_INSTANCE}&user=${KEYCLOAK_DB_USER}&password=${KEYCLOAK_DB_PASSWORD}&sslmode=disable"

# .env ファイルの作成（一時）
info "📝 環境変数ファイルを作成中..."
cat > /tmp/keycloak.env << EOF
KEYCLOAK_ADMIN_USERNAME=${KEYCLOAK_ADMIN_USERNAME}
KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}
KC_DB_URL=${KC_DB_URL}
KEYCLOAK_DOMAIN=${KEYCLOAK_DOMAIN}
KEYCLOAK_REALM=${KEYCLOAK_REALM:-tumiki}
EOF

# Startup Script の作成
info "📜 Startup Script を作成中..."
cat > /tmp/startup-script.sh << 'SCRIPT'
#!/bin/bash
set -e

# Docker と Docker Compose のインストール
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  systemctl enable docker
  systemctl start docker
fi

if ! command -v docker-compose &> /dev/null; then
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

# 作業ディレクトリの作成
mkdir -p /opt/keycloak
cd /opt/keycloak

# 環境変数ファイルの取得（metadata から）
curl -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/attributes/env-file" \
  -o .env

# Docker Compose ファイルの取得（metadata から）
curl -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/attributes/docker-compose" \
  -o docker-compose.yml

# Realm 設定の取得（metadata から）
mkdir -p config
curl -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/attributes/realm-config" \
  -o config/tumiki-realm.json

# Cloud SQL Proxy のインストールと起動
if ! command -v cloud-sql-proxy &> /dev/null; then
  curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.linux.amd64
  chmod +x cloud-sql-proxy
  mv cloud-sql-proxy /usr/local/bin/
fi

# Cloud SQL Proxy をサービスとして起動
cat > /etc/systemd/system/cloud-sql-proxy.service << 'EOF'
[Unit]
Description=Cloud SQL Proxy
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloud-sql-proxy --unix-socket /cloudsql CLOUD_SQL_INSTANCE
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# CLOUD_SQL_INSTANCE を置換
CLOUD_SQL_INSTANCE=$(curl -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/attributes/cloud-sql-instance")
sed -i "s|CLOUD_SQL_INSTANCE|${CLOUD_SQL_INSTANCE}|g" /etc/systemd/system/cloud-sql-proxy.service

systemctl daemon-reload
systemctl enable cloud-sql-proxy
systemctl start cloud-sql-proxy

# Keycloak の起動
docker-compose up -d

# ログを確認
docker-compose logs -f
SCRIPT

# VM インスタンスの作成または更新
info "🖥️  VM インスタンスを作成中..."

if gcloud compute instances describe "$INSTANCE_NAME" --zone="$GCP_ZONE" &> /dev/null; then
  warn "⚠️  インスタンス '$INSTANCE_NAME' は既に存在します。更新します..."

  # インスタンスを停止
  gcloud compute instances stop "$INSTANCE_NAME" --zone="$GCP_ZONE" --quiet

  # メタデータを更新
  gcloud compute instances add-metadata "$INSTANCE_NAME" \
    --zone="$GCP_ZONE" \
    --metadata-from-file startup-script=/tmp/startup-script.sh,env-file=/tmp/keycloak.env,docker-compose=docker/keycloak/prod-gce/docker-compose.yml,realm-config=docker/keycloak/tumiki-realm.json \
    --metadata cloud-sql-instance="$CLOUD_SQL_INSTANCE" \
    --quiet

  # インスタンスを起動
  gcloud compute instances start "$INSTANCE_NAME" --zone="$GCP_ZONE" --quiet
else
  # 新規作成
  gcloud compute instances create "$INSTANCE_NAME" \
    --zone="$GCP_ZONE" \
    --machine-type="$MACHINE_TYPE" \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --boot-disk-size=10GB \
    --boot-disk-type=pd-standard \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --metadata-from-file startup-script=/tmp/startup-script.sh,env-file=/tmp/keycloak.env,docker-compose=docker/keycloak/prod-gce/docker-compose.yml,realm-config=docker/keycloak/tumiki-realm.json \
    --metadata cloud-sql-instance="$CLOUD_SQL_INSTANCE" \
    --tags=http-server,https-server \
    --quiet || error_exit "VM インスタンスの作成に失敗しました"
fi

# ファイアウォールルールの作成
info "🔥 ファイアウォールルールを設定中..."
if ! gcloud compute firewall-rules describe allow-keycloak &> /dev/null; then
  gcloud compute firewall-rules create allow-keycloak \
    --allow tcp:8080 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server \
    --quiet
fi

# 外部IPアドレスの取得
EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" \
  --zone="$GCP_ZONE" \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

# 一時ファイルの削除
rm -f /tmp/startup-script.sh /tmp/keycloak.env .env.production

info "✅ デプロイ完了!"
echo ""
echo "📍 VM 外部IP: $EXTERNAL_IP"
echo "🔗 Keycloak URL: http://$EXTERNAL_IP:8080"
echo "🔗 管理コンソール: http://$EXTERNAL_IP:8080/admin"
echo ""
warn "⚠️  次のステップ:"
echo "  1. Cloud Load Balancer を設定してカスタムドメイン ($KEYCLOAK_DOMAIN) を設定"
echo "  2. SSL証明書を設定"
echo "  3. 管理コンソールにアクセスして動作確認"
echo ""
info "VM ログを確認:"
echo "  gcloud compute ssh $INSTANCE_NAME --zone=$GCP_ZONE --command='sudo docker-compose -f /opt/keycloak/docker-compose.yml logs -f'"

info "=== デプロイ完了 ==="
