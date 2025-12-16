# Keycloak GCE デプロイ

Keycloak を Google Compute Engine にデプロイするための設定とスクリプト。

## 📋 前提条件

- Google Cloud Platform アカウント
- GCP プロジェクトの作成
- gcloud CLI のインストールと認証
- Vercel CLI のインストール（`npm i -g vercel`）

## 💰 料金見積もり

詳細な料金見積もりについては [PRICING.md](./PRICING.md) を参照してください。

**概算（e2-small構成）**:
- Compute Engine（e2-small）: 約 $24.18/月
- Cloud SQL（db-f1-micro）: 約 $13.45/月
- **合計**: 約 **$37.63/月**（約5,645円/月、1ドル=150円換算）

**Cloud Run と比較**: 約 **56%削減**（Cloud Run: $85.15/月）

## 🚀 クイックスタート

### 1. Cloud SQL のセットアップ

Cloud Run と同じ Cloud SQL を使用します：

```bash
./docker/keycloak/cloudrun/setup-sql.sh
```

### 2. Vercel に環境変数を設定

以下の環境変数を Vercel プロジェクトに追加してください：

```bash
# GCP 設定
GCP_PROJECT_ID=your-project-id
GCP_REGION=asia-northeast1
GCP_ZONE=asia-northeast1-a
CLOUD_SQL_INSTANCE=project-id:region:instance-name

# Keycloak 管理者認証情報
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=secure-password

# データベース認証情報
KEYCLOAK_DB_USER=keycloak
KEYCLOAK_DB_PASSWORD=secure-db-password

# Keycloak 設定
KEYCLOAK_DOMAIN=auth.tumiki.cloud
KEYCLOAK_REALM=tumiki
KEYCLOAK_CLIENT_ID=tumiki-manager
KEYCLOAK_CLIENT_SECRET=tumiki-client-secret

# オプション（デフォルト値あり）
INSTANCE_NAME=keycloak-vm
MACHINE_TYPE=e2-small
```

### 3. GCE にデプロイ

```bash
./docker/keycloak/prod-gce/deploy.sh
```

このスクリプトは以下を実行します：
- Vercel Secret の取得
- VM インスタンスの作成（e2-small）
- Docker と Docker Compose のインストール
- Cloud SQL Proxy の設定
- Keycloak の起動

### 4. 動作確認

```bash
# VM の外部IPを取得
gcloud compute instances describe keycloak-vm \
  --zone=asia-northeast1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'

# ブラウザでアクセス
# http://<EXTERNAL_IP>:8080/admin
```

### 5. カスタムドメインの設定（オプション）

Cloud Load Balancer を設定してカスタムドメインと SSL を設定：

```bash
# Load Balancer の作成
gcloud compute backend-services create keycloak-backend \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=keycloak-health \
  --global

# ヘルスチェックの作成
gcloud compute health-checks create http keycloak-health \
  --port=8080 \
  --request-path=/health/ready

# インスタンスグループの作成と追加
# ... (詳細は後述)
```

## 📁 ファイル構成

```
gce/
├── README.md              # このファイル
├── PRICING.md             # 詳細な料金見積もり
├── deploy.sh              # GCE デプロイスクリプト
├── docker-compose.yml     # Docker Compose 設定
└── .env.example           # 環境変数サンプル
```

## 🔍 動作確認

### 1. VM へ SSH 接続

```bash
gcloud compute ssh keycloak-vm --zone=asia-northeast1-a
```

### 2. Docker ログの確認

```bash
cd /opt/keycloak
sudo docker-compose logs -f
```

### 3. Cloud SQL Proxy の確認

```bash
sudo systemctl status cloud-sql-proxy
```

### 4. Keycloak 管理コンソール

ブラウザで `http://<EXTERNAL_IP>:8080/admin` にアクセスして、管理者認証情報でログイン。

## 🔧 トラブルシューティング

### VM が起動しない

VM のシリアルコンソールログを確認：
```bash
gcloud compute instances get-serial-port-output keycloak-vm \
  --zone=asia-northeast1-a
```

### Cloud SQL に接続できない

1. Cloud SQL Proxy のログを確認：
```bash
gcloud compute ssh keycloak-vm --zone=asia-northeast1-a \
  --command='sudo journalctl -u cloud-sql-proxy -f'
```

2. VM サービスアカウントに Cloud SQL Client 権限があるか確認
3. Cloud SQL インスタンスが起動しているか確認

### Keycloak が起動しない

Docker ログを確認：
```bash
gcloud compute ssh keycloak-vm --zone=asia-northeast1-a \
  --command='cd /opt/keycloak && sudo docker-compose logs keycloak'
```

## 🔄 更新デプロイ

Keycloak の設定を更新した場合：

```bash
./docker/keycloak/prod-gce/deploy.sh
```

既存の VM が存在する場合、停止→メタデータ更新→再起動を実行します。

## 📊 リソースのスケーリング

### マシンタイプの変更

```bash
# VM を停止
gcloud compute instances stop keycloak-vm --zone=asia-northeast1-a

# マシンタイプを変更（e2-medium: 2 vCPU, 4GB メモリ）
gcloud compute instances set-machine-type keycloak-vm \
  --machine-type=e2-medium \
  --zone=asia-northeast1-a

# VM を起動
gcloud compute instances start keycloak-vm --zone=asia-northeast1-a
```

**料金への影響**:
- e2-small → e2-medium: 約 +$24/月（約3,600円/月）

### ディスクサイズの拡張

```bash
# ディスクサイズを拡張（10GB → 20GB）
gcloud compute disks resize keycloak-vm \
  --size=20GB \
  --zone=asia-northeast1-a

# VM内でファイルシステムを拡張
gcloud compute ssh keycloak-vm --zone=asia-northeast1-a \
  --command='sudo resize2fs /dev/sda1'
```

## 🗑️ リソースの削除

不要になった場合は、以下のコマンドでリソースを削除できます：

```bash
# VM インスタンスの削除
gcloud compute instances delete keycloak-vm --zone=asia-northeast1-a

# ファイアウォールルールの削除
gcloud compute firewall-rules delete allow-keycloak

# Cloud SQL インスタンスの削除（共通）
gcloud sql instances delete keycloak-db
```

**注意**: Cloud SQL インスタンスを削除すると、すべてのデータが失われます。必要に応じてバックアップを取得してください。

## 🔐 セキュリティ推奨事項

### 1. ファイアウォールルールの制限

デフォルトではすべてのIPからのアクセスを許可していますが、本番環境では制限することを推奨：

```bash
# 特定のIPのみ許可
gcloud compute firewall-rules update allow-keycloak \
  --source-ranges=203.0.113.0/24  # 自社のIP範囲
```

### 2. Cloud Load Balancer の使用

外部IPを直接公開せず、Load Balancer 経由でアクセス：
- SSL/TLS 終端
- DDoS 保護
- カスタムドメイン

### 3. サービスアカウントの権限最小化

VM のサービスアカウントに必要最小限の権限のみ付与：
- Cloud SQL Client（必須）
- Logging Writer（推奨）
- Monitoring Metric Writer（推奨）

## 📚 参考リンク

- [Compute Engine Documentation](https://cloud.google.com/compute/docs)
- [Cloud SQL for PostgreSQL](https://cloud.google.com/sql/docs/postgres)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [料金詳細](./PRICING.md)

## 💡 GCE vs Cloud Run

| 項目 | GCE | Cloud Run |
|------|-----|-----------|
| 月額料金 | $37.63 | $85.15 |
| コールドスタート | なし | 15-30秒（JVM） |
| 自動スケーリング | 手動 | 自動 |
| 管理負荷 | やや高い | 低い |
| カスタマイズ性 | 高い | 低い |

**GCE が適している場合**:
- ✅ JVMアプリケーション（Keycloak など）
- ✅ 常時稼働が必要
- ✅ コスト重視
- ✅ カスタマイズが必要

**Cloud Run が適している場合**:
- ✅ Node.js / Go などの軽量アプリ
- ✅ トラフィックが不定期
- ✅ 管理負荷を最小化したい
- ✅ 自動スケーリングが必要
