# Tumiki Self-Hosted MCP Proxy 運用ガイド

**バージョン**: 1.0
**最終更新**: 2026-03-15

---

## 概要

本ドキュメントは、Tumiki Self-Hosted MCP Proxyの日常運用、トラブルシューティング、メンテナンス手順を記載します。

---

## 1. セットアップ

### 1.1 前提条件

| 項目 | 要件 |
|------|------|
| **OS** | Ubuntu 22.04 LTS / RHEL 8+ |
| **Docker** | 24.0+ |
| **Docker Compose** | 2.20+ |
| **CPU** | 4 Core以上推奨 |
| **メモリ** | 8 GB以上推奨 |
| **ストレージ** | 100 GB以上推奨（監査ログ含む） |

### 1.2 初期セットアップ

```bash
# 1. リポジトリクローン
git clone https://github.com/rayven122/tumiki.git
cd tumiki

# 2. 環境変数設定
cp docker/self-hosted/.env.template .env
vim .env  # 編集

# 3. Docker Compose起動
cd docker/self-hosted
docker compose up -d

# 4. Keycloak初期設定（Terraform）
cd ../../terraform/keycloak
terraform init
terraform apply

# 5. ヘルスチェック
curl http://localhost:8080/health
```

### 1.3 環境変数設定

#### 必須項目
```bash
# Deployment Mode
DEPLOYMENT_MODE=self-hosted

# Manager Sync
MANAGER_SYNC_URL=https://manager.tumiki.io/api/sync
MANAGER_SYNC_API_KEY=org_xxx  # Manager UIで発行

# Database
DATABASE_URL=postgresql://tumiki:password@db:5432/tumiki

# Keycloak
KEYCLOAK_ISSUER=http://keycloak:8080/realms/tumiki

# Prisma Encryption
PRISMA_FIELD_ENCRYPTION_KEY=k1.aesgcm256.xxx
```

#### オプション項目
```bash
# 設定同期
SYNC_INTERVAL_MS=1800000  # 30分（デフォルト）

# SIEM連携
SIEM_TYPE=splunk  # splunk | qradar | none
SIEM_ENDPOINT=https://splunk.example.com:8088/services/collector
SIEM_TOKEN=xxx

# ログレベル
LOG_LEVEL=info  # debug | info | warn | error
```

---

## 2. 日常運用

### 2.1 ヘルスチェック

```bash
# MCP Proxyヘルスチェック
curl http://localhost:8080/health

# 期待レスポンス
{
  "status": "ok",
  "timestamp": "2026-03-15T12:00:00Z",
  "uptime": 86400
}
```

### 2.2 ログ確認

#### コンテナログ
```bash
# MCP Proxyログ
docker compose logs -f mcp-proxy

# PostgreSQLログ
docker compose logs -f db

# Keycloakログ
docker compose logs -f keycloak
```

#### 監査ログ
```bash
# JSON Lines形式
tail -f /var/log/tumiki/audit.jsonl

# 直近100件
tail -n 100 /var/log/tumiki/audit.jsonl | jq .

# エラーのみ抽出
grep '"status":"error"' /var/log/tumiki/audit.jsonl | jq .
```

#### PostgreSQLログ確認
```sql
-- 直近100件のリクエストログ
SELECT * FROM mcp_server_request_log
ORDER BY timestamp DESC
LIMIT 100;

-- エラーのみ
SELECT * FROM mcp_server_request_log
WHERE status = 'error'
ORDER BY timestamp DESC
LIMIT 100;

-- 組織別の統計
SELECT organization_id, COUNT(*) as request_count
FROM mcp_server_request_log
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY organization_id;
```

### 2.3 設定同期の確認

#### 同期ログ確認
```sql
-- 最新の同期ログ
SELECT * FROM policy_sync_log
ORDER BY synced_at DESC
LIMIT 10;

SELECT * FROM metadata_sync_log
ORDER BY synced_at DESC
LIMIT 10;

-- 同期失敗の確認
SELECT * FROM policy_sync_log
WHERE status = 'error'
ORDER BY synced_at DESC;
```

#### 手動同期トリガー
```bash
# 管理者トークン取得（Keycloak）
ACCESS_TOKEN=$(curl -X POST http://keycloak:8080/realms/tumiki/protocol/openid-connect/token \
  -d "client_id=mcp-proxy" \
  -d "grant_type=password" \
  -d "username=admin@tumiki.local" \
  -d "password=xxx" | jq -r .access_token)

# 手動同期実行
curl -X POST http://localhost:8080/api/sync/trigger \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# レスポンス例
# {"status":"success","syncedAt":"2026-03-15T12:00:00Z"}
```

### 2.4 リソース監視

```bash
# コンテナリソース使用状況
docker stats

# ディスク使用量
df -h /var/lib/docker
df -h /var/log/tumiki

# PostgreSQLデータサイズ
docker compose exec db psql -U tumiki -c "SELECT pg_size_pretty(pg_database_size('tumiki'));"
```

---

## 3. バックアップ・リストア

### 3.1 PostgreSQLバックアップ

#### 日次フルバックアップ
```bash
#!/bin/bash
# /usr/local/bin/tumiki-backup.sh

BACKUP_DIR="/var/backups/tumiki"
DATE=$(date +%Y%m%d_%H%M%S)

# フルバックアップ
docker compose exec -T db pg_dump -U tumiki tumiki | gzip > "${BACKUP_DIR}/tumiki_${DATE}.sql.gz"

# 古いバックアップ削除（90日以上）
find ${BACKUP_DIR} -name "tumiki_*.sql.gz" -mtime +90 -delete

echo "Backup completed: tumiki_${DATE}.sql.gz"
```

#### cron設定
```bash
# crontab -e
0 2 * * * /usr/local/bin/tumiki-backup.sh >> /var/log/tumiki/backup.log 2>&1
```

#### WALアーカイブ（PITR対応）
```bash
# PostgreSQL設定（postgresql.conf）
archive_mode = on
archive_command = 'cp %p /var/backups/tumiki/wal/%f'
```

### 3.2 リストア

#### フルリストア
```bash
# 1. コンテナ停止
docker compose stop mcp-proxy

# 2. データベースリストア
gunzip -c /var/backups/tumiki/tumiki_20260315_020000.sql.gz | \
  docker compose exec -T db psql -U tumiki tumiki

# 3. コンテナ起動
docker compose start mcp-proxy
```

#### PITRリストア
```bash
# recovery.conf設定
restore_command = 'cp /var/backups/tumiki/wal/%f %p'
recovery_target_time = '2026-03-15 12:00:00'
```

### 3.3 監査ログバックアップ

```bash
# S3へバックアップ（AWS CLI使用）
aws s3 sync /var/log/tumiki/audit.jsonl s3://tumiki-audit-logs/

# オブジェクトストレージへバックアップ（rclone使用）
rclone sync /var/log/tumiki/audit.jsonl remote:tumiki-audit-logs/
```

---

## 4. メンテナンス

### 4.1 アップデート

```bash
# 1. 新しいイメージ取得
docker compose pull

# 2. コンテナ再起動（ローリングアップデート）
docker compose up -d --no-deps --build mcp-proxy

# 3. ヘルスチェック
curl http://localhost:8080/health

# 4. ログ確認
docker compose logs -f mcp-proxy
```

### 4.2 データベースメンテナンス

#### VACUUM（定期実行）
```sql
-- 全テーブルのVACUUM
VACUUM ANALYZE;

-- 特定テーブル
VACUUM ANALYZE mcp_server_request_log;
```

#### インデックス再構築
```sql
-- インデックスの肥大化確認
SELECT schemaname, tablename, indexname,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- 再構築
REINDEX TABLE mcp_server_request_log;
```

#### パーティション管理
```sql
-- 新しいパーティション作成（月次）
CREATE TABLE mcp_server_request_log_2026_04 PARTITION OF mcp_server_request_log
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- 古いパーティション削除（90日経過後）
DROP TABLE mcp_server_request_log_2025_12;
```

### 4.3 ログローテーション

#### logrotate設定
```bash
# /etc/logrotate.d/tumiki
/var/log/tumiki/audit.jsonl {
  daily
  rotate 90
  compress
  delaycompress
  notifempty
  create 0600 tumiki tumiki
  postrotate
    docker compose exec mcp-proxy kill -USR1 1
  endscript
}
```

---

## 5. トラブルシューティング

### 5.1 MCP Proxy起動失敗

#### 症状
```bash
$ docker compose up -d
ERROR: Cannot start service mcp-proxy: ...
```

#### 確認項目
1. **環境変数の確認**
   ```bash
   docker compose config
   ```

2. **ポート衝突の確認**
   ```bash
   sudo lsof -i :8080
   ```

3. **ログ確認**
   ```bash
   docker compose logs mcp-proxy
   ```

### 5.2 設定同期失敗

#### 症状
```sql
SELECT * FROM policy_sync_log WHERE status = 'error' ORDER BY synced_at DESC LIMIT 1;

-- エラーメッセージ例: "Connection refused"
```

#### 確認項目
1. **Manager Sync URL確認**
   ```bash
   echo $MANAGER_SYNC_URL
   curl -I $MANAGER_SYNC_URL/api/sync/policies
   ```

2. **API Key確認**
   ```bash
   curl -X POST $MANAGER_SYNC_URL/api/sync/policies \
     -H "Authorization: Bearer $MANAGER_SYNC_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"organizationId":"org_xxx"}'
   ```

3. **手動同期実行**
   ```bash
   # APIエンドポイント経由（推奨）
   curl -X POST http://localhost:8080/api/sync/trigger \
     -H "Authorization: Bearer ${ADMIN_TOKEN}"

   # または、直接実行
   docker compose exec mcp-proxy node -e "require('./dist/src/features/sync').syncPolicies()"
   ```

### 5.3 認証失敗

#### 症状
```
401 Unauthorized
```

#### 確認項目
1. **Keycloak接続確認**
   ```bash
   curl http://keycloak:8080/realms/tumiki/.well-known/openid-configuration
   ```

2. **JWT検証**
   ```bash
   # JWTデコード（https://jwt.io/ で検証）
   echo $ACCESS_TOKEN | jq -R 'split(".") | .[1] | @base64d | fromjson'
   ```

3. **APIキー確認**
   ```sql
   SELECT * FROM mcp_api_key WHERE mcp_server_id = 'server_xxx';
   ```

### 5.4 PostgreSQL接続失敗

#### 症状
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

#### 確認項目
1. **PostgreSQL起動確認**
   ```bash
   docker compose ps db
   ```

2. **接続テスト**
   ```bash
   docker compose exec db psql -U tumiki -c "SELECT 1;"
   ```

3. **DATABASE_URL確認**
   ```bash
   echo $DATABASE_URL
   ```

### 5.5 SIEM連携失敗

#### 症状
```bash
grep "SIEM export failed" /var/log/tumiki/audit.jsonl
```

#### 確認項目
1. **SIEM接続確認**
   ```bash
   # Splunk HEC
   curl -k -X POST $SIEM_ENDPOINT \
     -H "Authorization: Splunk $SIEM_TOKEN" \
     -d '{"event":"test"}'
   ```

2. **SIEM設定確認**
   ```bash
   echo $SIEM_TYPE
   echo $SIEM_ENDPOINT
   ```

---

## 6. パフォーマンスチューニング

### 6.1 PostgreSQL最適化

#### postgresql.conf
```conf
# メモリ設定（8GB RAM想定）
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 32MB

# WAL設定
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# パフォーマンス監視
track_activities = on
track_counts = on
```

### 6.2 コンテナリソース制限

```yaml
# docker/self-hosted/compose.yaml
services:
  mcp-proxy:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G

  db:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
```

### 6.3 監査ログ最適化

```typescript
// 非同期書き込み
import { promisify } from 'util';
import { appendFile } from 'fs';

const appendFileAsync = promisify(appendFile);

export const writeAuditLogAsync = async (entry: AuditLogEntry) => {
  const line = JSON.stringify(entry) + '\n';
  await appendFileAsync(AUDIT_LOG_PATH, line);
};
```

---

## 7. セキュリティ運用

### 7.1 定期的なセキュリティ更新

```bash
# 依存パッケージ更新
docker compose exec mcp-proxy npm audit fix

# OSパッチ適用（Ubuntu）
sudo apt update && sudo apt upgrade -y

# Docker再ビルド
docker compose build --no-cache
docker compose up -d
```

### 7.2 脆弱性スキャン

```bash
# Trivy（コンテナスキャン）
trivy image tumiki/mcp-proxy:latest

# npm audit
docker compose exec mcp-proxy npm audit
```

### 7.3 アクセスログレビュー

```sql
-- 失敗した認証試行（過去24時間）
SELECT user_id, COUNT(*) as failed_attempts
FROM mcp_server_request_log
WHERE status = 'error'
  AND error LIKE '%Unauthorized%'
  AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY user_id
HAVING COUNT(*) > 10
ORDER BY failed_attempts DESC;

-- 異常なAPIアクセスパターン
SELECT user_id, COUNT(*) as request_count,
       COUNT(DISTINCT mcp_server_slug) as unique_servers
FROM mcp_server_request_log
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 1000
ORDER BY request_count DESC;
```

---

## 8. ディザスタリカバリー

### 8.1 バックアップ戦略

| 項目 | 頻度 | 保持期間 | 保存先 |
|------|------|---------|--------|
| **PostgreSQLフルバックアップ** | 日次 | 90日 | ローカル + S3 |
| **WALアーカイブ** | 随時 | 90日 | ローカル + S3 |
| **監査ログ** | 日次 | 永続 | S3 Glacier |
| **設定ファイル** | 変更時 | 永続 | Git |

### 8.2 リカバリー手順

#### シナリオ1: データベース障害
```bash
# 1. 最新バックアップからリストア
gunzip -c /var/backups/tumiki/tumiki_20260315_020000.sql.gz | \
  docker compose exec -T db psql -U tumiki tumiki

# 2. WALリプレイ（PITR）
# recovery.conf設定後、PostgreSQL再起動

# 3. ヘルスチェック
curl http://localhost:8080/health
```

#### シナリオ2: 全体障害（サーバー故障）
```bash
# 1. 新しいサーバーにDockerインストール
# 2. リポジトリクローン
# 3. 環境変数復元
# 4. PostgreSQLリストア
# 5. Docker Compose起動
```

---

## 9. 監視・アラート

### 9.1 監視項目

| 項目 | 閾値 | アラート先 |
|------|------|----------|
| **CPU使用率** | > 80% | Slack |
| **メモリ使用率** | > 80% | Slack |
| **ディスク使用率** | > 80% | Slack |
| **PostgreSQL接続数** | > 80% | Slack |
| **エラー率** | > 5% | Slack + PagerDuty |
| **レスポンスタイム** | > 1000ms | Slack |

### 9.2 Prometheus + Grafana設定

```yaml
# docker/self-hosted/compose.yaml（追加）
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
```

---

## 10. サポート連絡先

### 技術サポート
- **Email**: support@tumiki.io
- **対応時間**: 平日 9:00-18:00 JST
- **レスポンスタイム**: 営業日24時間以内

### セキュリティインシデント
- **Email**: security@tumiki.io
- **緊急連絡先**: +81-XX-XXXX-XXXX（24時間対応）

---

**改訂履歴**

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0 | 2026-03-15 | 初版作成 |
