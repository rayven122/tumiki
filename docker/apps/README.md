# Tumiki Apps Docker Compose

`apps/manager` と `apps/mcp-proxy` を Docker Compose で運用するための設定。

## ファイル構成

| ファイル                  | 用途                                                                            |
| ------------------------- | ------------------------------------------------------------------------------- |
| `compose.yaml`            | base 定義（`db` / `redis` / `manager` / `mcp-proxy` / `internal-manager` 共通） |
| `compose.staging.yaml`    | staging 用 override（`minio` 追加、`internal-manager` 環境変数差分）            |
| `compose.production.yaml` | **production 専用 standalone 定義**。base は使わず単独で起動する                |
| `.env.example`            | compose 実行に必要な環境変数のサンプル                                          |

`compose.production.yaml` は `compose.yaml` の override ではなく **独立した定義**。本番では DB / Redis を外部ホストに置き、`internal-manager` も対象外のため、構成を切り出している。

## アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│ tumiki-sakura-prod VM                           │
│                                                 │
│  ┌──────────────┐   ┌────────────────┐          │
│  │ tumiki-      │   │ tumiki-        │          │
│  │ manager      │   │ mcp-proxy      │          │
│  │ :3000→8080   │   │ :8080→8080     │          │
│  └──────┬───────┘   └────────┬───────┘          │
│         │                    │                  │
│         │  ┌─────────────────▼──────────────┐   │
│         │  │ tumiki-watchtower              │   │
│         │  │ (5分ごとに :latest を pull)    │   │
│         │  └────────────────────────────────┘   │
│         │                                       │
└─────────┼───────────────────────────────────────┘
          │
   ┌──────▼────────┐    ┌──────────────────────┐
   │ Cloudflare    │    │ External PostgreSQL  │
   │ Tunnel        │    │ 192.168.0.100:5432   │
   └───────────────┘    └──────────────────────┘
```

## production: Watchtower による自動更新

### 仕組み

1. リリースタグ (`v*`) を push
2. [`docker-publish.yml`](../../.github/workflows/docker-publish.yml) が GHCR に `:latest` / `:1.2.3` / `:1.2` を発行
3. VM 上の Watchtower が 5 分ごとに `:latest` の digest を確認
4. digest 変化を検知 → 古いコンテナ停止 → 新 image で起動 → 通知

`main` ブランチ push では `:main` タグのみが更新され `:latest` は変わらないため、Watchtower は反応しない。

### 通知

`.env` の `WATCHTOWER_NOTIFICATION_URL` に [Shoutrrr 形式の URL](https://containrrr.dev/shoutrrr/) を設定すると、更新成功・失敗を通知する。

```dotenv
# Slack の例
WATCHTOWER_NOTIFICATION_URL=slack://hook:T0000/B0000/XXXXXXXX@channel
```

### ロールバック

`:latest` で固定運用しているため、過去版に戻すには `compose.production.yaml` の `image:` を直接書き換える。

```bash
# 1. compose.production.yaml を編集して特定バージョンに固定
#    image: ghcr.io/rayven122/tumiki-manager:1.2.2
# 2. 反映
ssh tumiki-sakura-prod
cd ~/tumiki
docker compose -f compose.production.yaml pull
docker compose -f compose.production.yaml up -d
```

ロールバック中は Watchtower が再度 `:latest` に上書きしないよう、対象サービスから `com.centurylinklabs.watchtower.enable=true` ラベルを一時的に外すか、Watchtower 自体を停止することを推奨。

## production への初回セットアップ

> 既存の systemd unit (`tumiki-manager.service` / `tumiki-mcp-proxy.service`) で稼働している環境を Docker Compose に移行する手順。

### 1. Docker / Compose plugin インストール

```bash
ssh tumiki-sakura-prod
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt-get install -y docker-compose-plugin
# 反映のため一度ログアウトして入り直す
```

### 2. ディレクトリ準備

```bash
mkdir -p ~/tumiki
```

### 3. compose ファイルと .env の配置

GitHub Actions `Deploy Apps` を `production` で `workflow_dispatch` 実行すると、Infisical のシークレットを使って `~/tumiki/compose.production.yaml` と `~/tumiki/.env` が自動配置され、`docker compose up -d` まで実施される。

手動で行う場合：

```bash
# ローカルから
scp docker/apps/compose.production.yaml tumiki-sakura-prod:~/tumiki/
# .env は Infisical から取得して 600 で配置
infisical export --env=prod --format=dotenv | \
  ssh tumiki-sakura-prod 'install -m 600 /dev/stdin ~/tumiki/.env'
```

### 4. 旧 systemd サービス停止 → コンテナ起動

```bash
ssh tumiki-sakura-prod
sudo systemctl stop tumiki-manager tumiki-mcp-proxy
cd ~/tumiki
docker compose -f compose.production.yaml pull
docker compose -f compose.production.yaml up -d
```

### 5. ヘルスチェック

```bash
curl -sf http://localhost:3000/api/health | jq .
curl -sf http://localhost:8080/health | jq .
docker compose -f compose.production.yaml ps
docker compose -f compose.production.yaml logs --tail=100
```

### 6. 問題なければ systemd を無効化

```bash
sudo systemctl disable tumiki-manager tumiki-mcp-proxy
# unit ファイルは残す（緊急ロールバック用）。完全に消す場合は次節参照。
```

### 緊急ロールバック（systemd に戻す）

```bash
cd ~/tumiki && docker compose -f compose.production.yaml down
sudo systemctl start tumiki-manager tumiki-mcp-proxy
```

## 運用コマンド

```bash
# ログ
docker compose -f compose.production.yaml logs -f --tail=100 manager

# 再起動
docker compose -f compose.production.yaml restart manager

# 手動 pull + 再起動（Watchtower を待たずに反映したいとき）
docker compose -f compose.production.yaml pull
docker compose -f compose.production.yaml up -d

# Watchtower のログ
docker logs -f tumiki-watchtower
```
