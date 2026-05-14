# Tumiki Apps Docker Compose

`apps/manager` と `apps/mcp-proxy` を Docker Compose で運用するための設定。

## ファイル構成

| パス                                  | 用途                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `compose.yaml`                        | base 定義（`db` / `redis` / `manager` / `mcp-proxy` / `internal-manager` 共通） |
| `compose.staging.yaml`                | staging 用 override（`minio` 追加、`internal-manager` 環境変数差分）            |
| `compose.production.yaml`             | **production 専用 standalone 定義**。base は使わず単独で起動する                |
| `compose.production.verify.yaml`      | 旧 systemd と並行して疎通確認するための一時検証用 compose                       |
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
│  │  → docker-socket-proxy 経由で Docker │               │
│  └──────────────────────────────────────┘               │
└─────────────────┬─────────────┬─────────────────────────┘
                  │             │
       ┌──────────▼───┐  ┌──────▼─────────────────┐
       │ Infisical    │  │ External PostgreSQL    │
       │ (SoT)        │  │ <DB_HOST>:5432         │
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

認証は **Machine Identity (Universal Auth)** を使用。Client ID / Secret は `/etc/infisical/agent.env` に保存され（`root:ubuntu` 0640）、systemd unit の `EnvironmentFile=` 経由でスクリプトに注入される。スクリプトは毎回 access token を新規発行して使い切るため、token TTL の影響を受けない。

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

Watchtower は Docker API を操作するため、`compose.production.yaml` では `tecnativa/docker-socket-proxy` を介して Docker socket へのアクセス範囲を絞る。Watchtower 本体は現在稼働確認済みの `nickfedor/watchtower:1.16.1` を digest 固定し、更新時はタグ差分を確認してから変更する。`WATCHTOWER_NOTIFICATION_URL` が空の場合は通知なし (`notify=no`) として稼働することを `tumiki-sakura-prod` の Watchtower ログで確認済み。

`docker-socket-proxy` は `socket-proxy` internal network に隔離し、`manager` / `mcp-proxy` からは到達できない。Watchtower は GHCR と通知先へ外向き通信するため `app` network にも参加する。`DELETE` は許可していないため、Watchtower の image cleanup は無効化している。ディスク使用量は別途 `docker image prune` などの運用で管理する。

GHCR の `tumiki-manager` / `tumiki-mcp-proxy` image は、`tumiki-sakura-prod` 上で Docker 認証設定なしに `docker pull` できることを確認済み。Private package に変更する場合は、VM 上で `docker login ghcr.io` を実行し、生成された Docker config を Watchtower に読ませる。

```yaml
watchtower:
  volumes:
    - /home/ubuntu/.docker/config.json:/config.json:ro
```

`config.json` は owner / permission を絞り、不要になった credential は GHCR 側で revoke する。

### production verify compose

`compose.production.verify.yaml` は、旧 systemd サービスを止めずに別ポートで image の疎通確認を行うための一時検証用。`restart: "no"`、`127.0.0.1` bind、`SKIP_MIGRATE=true` でリスクを下げているが、本番 `.env` / 本番 DB を共有する。migration は抑止されるがアプリロジックからの本番 DB 書き込みは防げないため、短時間の health check だけに使う。

```bash
docker compose -f compose.production.verify.yaml up -d
curl -sf http://localhost:3001/api/health
curl -sf http://localhost:8082/health
docker compose -f compose.production.verify.yaml down
docker compose -f compose.production.verify.yaml ps
```

検証後は `down` 済みであることを必ず確認する。将来的に検証を頻繁に行う場合は、read-only DB ユーザーまたは staging DB を参照する `.env.verify` に切り替える。

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

Watchtower を止めてから特定サービスだけ戻す場合は、以下の順で実施する。

```bash
cd ~/tumiki
docker compose -f compose.production.yaml stop watchtower
# compose.production.yaml の manager / mcp-proxy image を戻したいタグに変更
docker compose -f compose.production.yaml pull manager mcp-proxy
docker compose -f compose.production.yaml up -d --no-deps manager mcp-proxy
```

## production への初回セットアップ

> 既存の systemd unit (`tumiki-manager.service` / `tumiki-mcp-proxy.service`) で稼働している環境を Docker Compose に移行する手順。

### 1. Docker / Compose plugin インストール

```bash
ssh tumiki-sakura-prod
# 本番環境では Docker 公式 apt リポジトリ経由のインストールを推奨:
# https://docs.docker.com/engine/install/ubuntu/
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt-get install -y docker-compose-plugin
# 反映のため一度ログアウトして入り直す
```

### 2. Infisical Machine Identity の発行と配置

systemd timer は非対話セッションで動くため、ユーザーの `infisical login` セッション
ではなく **Machine Identity (Universal Auth)** を使う。

#### 2.1 Identity を発行（Web UI）

1. Infisical Web (`https://secrets.rayven.cloud`) → `tumiki` プロジェクト → **Access Control → Machine Identities → Create**
2. **Auth Method**: `Universal Auth` を選択
3. Allowed IP: 本番 VM の egress IP（不明なら `0.0.0.0/0` で発行 → 後で絞る）
4. **Client ID** と **Client Secret** を控える（Secret は発行直後のみ表示）
5. 同プロジェクトの **Access Control → Identity Members** に identity を追加し、`prod` 環境への **Read 権限**を付与（最小権限）

#### 2.2 認証情報を VM に配置

```bash
ssh tumiki-sakura-prod
sudo mkdir -p /etc/infisical
sudo install -m 0640 -o root -g ubuntu /dev/stdin /etc/infisical/agent.env <<EOF
INFISICAL_UNIVERSAL_AUTH_CLIENT_ID=<貼り付け>
INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET=<貼り付け>
INFISICAL_API_URL=https://secrets.rayven.cloud
INFISICAL_PROJECT_ID=<tumiki プロジェクトの UUID>
EOF

# 権限確認 (-rw-r----- 1 root ubuntu)
ls -la /etc/infisical/agent.env

# 動作テスト
set -a; source /etc/infisical/agent.env; set +a
TOKEN=$(infisical login --method=universal-auth \
  --domain="$INFISICAL_API_URL" \
  --plain --silent)
INFISICAL_TOKEN="$TOKEN" infisical export --env=prod --path=/ --format=dotenv \
  --domain="$INFISICAL_API_URL" \
  --projectId="$INFISICAL_PROJECT_ID" | wc -l
```

`> 0` 行が出ればOK。`Project ID is required when using machine identity` が出る場合は `INFISICAL_PROJECT_ID` の確認、`Invalid credentials` の場合は `INFISICAL_API_URL` または client-id/secret を見直す。

本番 VM では `infisical version 0.43.79` で動作確認済み。同等以上の CLI を利用する。

### 3. ディレクトリ・compose 配置

```bash
mkdir -p ~/tumiki
# ローカルから compose ファイル転送
exit
scp docker/apps/compose.production.yaml tumiki-sakura-prod:~/tumiki/
```

### 4. secrets-sync スクリプト + systemd unit 配置

`tumiki-secrets-sync.service` は `User=ubuntu` / `Group=ubuntu` を前提にしている。別ユーザーで運用する場合は unit 内のユーザー名、`Environment=HOME`、`Environment=TUMIKI_DIR`、および `/etc/infisical/agent.env` の group ownership を実環境に合わせて変更する。

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

GitHub Actions の production job で使う `DEPLOY_USER` には、少なくとも `tumiki-secrets-sync.service` の起動と状態確認を非対話で実行できる sudoers 設定が必要。

```sudoers
# /etc/sudoers.d/tumiki-deploy
deploy-user ALL=(ALL) NOPASSWD: /bin/systemctl start tumiki-secrets-sync.service, /bin/systemctl status --no-pager tumiki-secrets-sync.service
```

`deploy-user` は実際の `vars.DEPLOY_USER` に置き換える。`systemctl` の実パスが異なる場合は `command -v systemctl` で確認して合わせる。

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
