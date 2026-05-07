# Tumiki Apps Docker Compose

`apps/manager` と `apps/mcp-proxy` を Docker Compose で運用するための設定。

## ファイル構成

| パス                                  | 用途                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `compose.yaml`                        | base 定義（`db` / `redis` / `manager` / `mcp-proxy` / `internal-manager` 共通） |
| `compose.staging.yaml`                | staging 用 override（`minio` 追加、`internal-manager` 環境変数差分）            |
| `compose.production.yaml`             | **production 専用 standalone 定義**。base は使わず単独で起動する                |
| `.env.example`                        | compose 実行に必要な環境変数のリスト（Infisical 登録の参照用）                  |
| `scripts/tumiki-secrets-sync.sh`      | VM 上で `infisical export` を実行し `.env` 同期 + compose 再同期するスクリプト  |
| `systemd/tumiki-secrets-sync.service` | 上記スクリプトを oneshot 実行する systemd unit                                  |
| `systemd/tumiki-secrets-sync.timer`   | 5 分ごとに service を発火する systemd timer                                     |

`compose.production.yaml` は `compose.yaml` の override ではなく **独立した定義**。本番では DB / Redis を外部ホストに置き、`internal-manager` も対象外のため、構成を切り出している。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│ tumiki-sakura-prod VM                                   │
│                                                         │
│  ┌──────────────┐   ┌────────────────┐                  │
│  │ tumiki-      │   │ tumiki-        │                  │
│  │ manager      │   │ mcp-proxy      │                  │
│  │ :3000→8080   │   │ :8080→8080     │                  │
│  └──────┬───────┘   └────────┬───────┘                  │
│         │ env_file: .env     │                          │
│         ▼                    ▼                          │
│  ┌──────────────────────────────────────┐               │
│  │ ~/tumiki/.env (600, 派生キャッシュ)  │◀──┐           │
│  └──────────────────────────────────────┘   │ 5分ごと   │
│                                             │ 差分時 up │
│  ┌──────────────────────────────────────┐   │           │
│  │ tumiki-secrets-sync.timer            │───┘           │
│  │  → infisical export --env=prod       │               │
│  └──────────────────────────────────────┘               │
│                                                         │
│  ┌──────────────────────────────────────┐               │
│  │ tumiki-watchtower (5分ごと :latest)  │               │
│  └──────────────────────────────────────┘               │
└─────────────────┬─────────────┬─────────────────────────┘
                  │             │
       ┌──────────▼───┐  ┌──────▼─────────────────┐
       │ Infisical    │  │ External PostgreSQL    │
       │ (SoT)        │  │ 192.168.0.100:5432     │
       └──────────────┘  └────────────────────────┘
```

## production 二系統の自動更新

| 対象            | 担当           | トリガー                             |
| --------------- | -------------- | ------------------------------------ |
| **secrets**     | systemd timer  | 5 分ごとに Infisical を polling      |
| **image**       | Watchtower     | 5 分ごとに GHCR `:latest` を polling |
| **compose構造** | GitHub Actions | `workflow_dispatch` で手動実行       |

### secrets 自動更新（Infisical SoT）

1. systemd timer (`tumiki-secrets-sync.timer`) が 5 分ごとに発火
2. `tumiki-secrets-sync.sh` が `infisical export --env=prod --format=dotenv` を実行
3. 既存 `~/tumiki/.env` と差分があれば置き換え（権限 600）
4. `docker compose -f compose.production.yaml up -d` で env 変更を検知したコンテナだけ recreate

`infisical login` 済みのセッションを利用するため、追加の Machine Identity 発行は不要。`infisical login` のトークンが期限切れになった場合は再ログインが必要（journal にエラーが出る）。

### image 自動更新（Watchtower）

1. リリースタグ (`v*`) を push
2. [`docker-publish.yml`](../../.github/workflows/docker-publish.yml) が GHCR に `:latest` / `:1.2.3` / `:1.2` を発行
3. VM 上の Watchtower が 5 分ごとに `:latest` の digest を確認
4. digest 変化を検知 → 古いコンテナ停止 → 新 image で起動 → 通知

`main` ブランチ push では `:main` タグのみが更新され `:latest` は変わらないため、Watchtower は反応しない。

### Watchtower 通知

`.env` の `WATCHTOWER_NOTIFICATION_URL` を Infisical に登録しておくと、更新成功・失敗を [Shoutrrr](https://containrrr.dev/shoutrrr/) 経由で通知できる。

```dotenv
# Slack の例
WATCHTOWER_NOTIFICATION_URL=slack://hook:T0000/B0000/XXXXXXXX@channel
```

### image ロールバック

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

### 2. Infisical CLI 認証確認

```bash
ssh tumiki-sakura-prod
infisical user        # 認証済みかチェック
infisical export --env=prod --path=/ --format=dotenv | head  # 出力できるか確認
```

未認証なら `infisical login` を実行し、`tumiki` プロジェクトの `prod` 環境にアクセスできるアカウントでログインする。

### 3. ディレクトリ・compose 配置

```bash
mkdir -p ~/tumiki
# ローカルから compose ファイル転送
exit
scp docker/apps/compose.production.yaml tumiki-sakura-prod:~/tumiki/
```

### 4. secrets-sync スクリプト + systemd unit 配置

```bash
# ローカルから
scp docker/apps/scripts/tumiki-secrets-sync.sh tumiki-sakura-prod:/tmp/
scp docker/apps/systemd/tumiki-secrets-sync.service tumiki-sakura-prod:/tmp/
scp docker/apps/systemd/tumiki-secrets-sync.timer tumiki-sakura-prod:/tmp/

# VM 上で配置
ssh tumiki-sakura-prod
sudo install -m 755 /tmp/tumiki-secrets-sync.sh /usr/local/bin/tumiki-secrets-sync
sudo install -m 644 /tmp/tumiki-secrets-sync.service /etc/systemd/system/
sudo install -m 644 /tmp/tumiki-secrets-sync.timer /etc/systemd/system/
sudo systemctl daemon-reload
```

### 5. 初回 secrets 同期 + コンテナ起動

```bash
# 旧 systemd サービス停止
sudo systemctl stop tumiki-manager tumiki-mcp-proxy

# 手動で初回同期実行（.env 生成 + compose up -d）
sudo systemctl start tumiki-secrets-sync.service
sudo systemctl status --no-pager tumiki-secrets-sync.service
```

`active (exited)` で終了し、`~/tumiki/.env` が生成されてコンテナが起動していれば成功。

### 6. timer 有効化

```bash
sudo systemctl enable --now tumiki-secrets-sync.timer
sudo systemctl list-timers tumiki-secrets-sync.timer
```

### 7. ヘルスチェック

```bash
curl -sf http://localhost:3000/api/health | jq .
curl -sf http://localhost:8080/health | jq .
docker compose -f compose.production.yaml ps
docker compose -f compose.production.yaml logs --tail=100
```

### 8. 問題なければ旧 systemd を無効化

```bash
sudo systemctl disable tumiki-manager tumiki-mcp-proxy
# unit ファイルは残す（緊急ロールバック用）
```

### 緊急ロールバック（旧 systemd に戻す）

```bash
sudo systemctl stop tumiki-secrets-sync.timer
cd ~/tumiki && docker compose -f compose.production.yaml down
sudo systemctl start tumiki-manager tumiki-mcp-proxy
```

## 運用コマンド

```bash
# secrets-sync の状態確認
systemctl status tumiki-secrets-sync.timer
journalctl -u tumiki-secrets-sync.service -n 50 --no-pager

# 強制的に最新シークレットを取り込み + compose up -d
sudo systemctl start tumiki-secrets-sync.service

# コンテナログ
docker compose -f compose.production.yaml logs -f --tail=100 manager

# 単体再起動
docker compose -f compose.production.yaml restart manager

# 手動 image pull + 再起動（Watchtower を待たない）
docker compose -f compose.production.yaml pull
docker compose -f compose.production.yaml up -d

# Watchtower のログ
docker logs -f tumiki-watchtower
```
