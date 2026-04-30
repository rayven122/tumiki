# Staging 環境

## 概要

| 項目 | 内容 |
|------|------|
| ホスト | Proxmox VM（tumiki-staging） |
| プライベート IP | `10.11.0.14` |
| SSH アクセス | `stg-ssh.tumiki.cloud`（Cloudflare Tunnel 経由） |
| デプロイ方式 | GitHub Actions → SSH → Docker Compose |
| シークレット管理 | Infisical（セルフホスト: `https://secrets.rayven.cloud`） |

## エンドポイント

| サービス | URL | ポート |
|---------|-----|--------|
| Manager | https://stg.tumiki.cloud | 8080 |
| MCP Proxy | https://stg-mcp.tumiki.cloud | 8081 |
| Internal Manager | https://stg-internal.tumiki.cloud | 3100 |
| Auth（Keycloak） | https://stg-auth.tumiki.cloud | - |

## インフラ構成

```
Cloudflare（DNS + Tunnel + Zero Trust Access）
  ↓ HTTPS
Proxmox VM: tumiki-staging（10.11.0.14）    ← アプリ VM
  ├── tumiki-db        postgres:16-alpine  （ポート非公開）
  ├── tumiki-redis     redis:7-alpine      （ポート非公開）
  ├── tumiki-manager   ghcr.io/rayven122/tumiki-manager:main
  ├── tumiki-mcp-proxy ghcr.io/rayven122/tumiki-mcp-proxy:main
  └── tumiki-internal-manager ghcr.io/rayven122/tumiki-internal-manager:main

Proxmox VM: keycloak-staging（10.11.0.15） ← Keycloak 専用 VM
  └── keycloak         quay.io/keycloak/keycloak（Docker Compose）
```

## CD パイプライン

### アプリデプロイ（自動）

`main` ブランチへの push/マージ時に自動実行。

```
main push
  → Docker Publish（GHCR にイメージをプッシュ）
  → Deploy Apps / staging（自動トリガー）
```

### アプリデプロイ（手動）

GitHub Actions の `Deploy Apps` ワークフローを手動実行。

1. GitHub → Actions → Deploy Apps → Run workflow
2. `environment: staging`、`image_tag: main`（任意）を指定

### アプリデプロイフロー

```
① Checkout               リポジトリをチェックアウト
② Setup Cloudflare SSH   cloudflared + SSH 設定（composite action）
③ Transfer compose.yaml  VM に compose.yaml を転送
④ Deploy containers      VM 上で実行:
   - infisical export → .env 生成（VM が Infisical から直接取得）
   - docker compose pull（最新イメージ取得）
   - docker compose up -d
   - .env 削除
⑤ Verify health endpoints 3エンドポイントが 200 OK になるまで確認
⑥ Cleanup               一時ファイル・SSH 鍵を削除
```

### Keycloak デプロイフロー

`docker/keycloak-staging/**` または `docker/keycloak/themes/**` の変更時に自動実行。

```
① Checkout
② Setup Cloudflare SSH    cloudflared + SSH 設定（stg-ssh.tumiki.cloud 宛て）
③ Configure ProxyJump     ~/.ssh/config に 10.11.0.15 向け ProxyJump を設定
④ Transfer files          compose.yaml・テーマファイルを Keycloak VM に転送
⑤ Deploy Keycloak         Keycloak VM 上で:
   - infisical run（Machine Identity）でシークレット注入
   - docker compose pull & up
⑥ Verify health           localhost:9000/health/ready を確認
⑦ Cleanup
```

### Keycloak 接続経路（2ホップ）

```
GitHub Actions Runner
  ↓ SSH（ProxyCommand: cloudflared access ssh）
Cloudflare Tunnel → tumiki-staging VM（10.11.0.14）
  ↓ ProxyJump（staging-deploy@stg-ssh.tumiki.cloud → keycloak-deploy@10.11.0.15）
keycloak-staging VM（10.11.0.15）
```

### アプリ接続経路

```
GitHub Actions Runner
  ↓ SSH（ProxyCommand: cloudflared access ssh）
Cloudflare Tunnel → tumiki-staging VM（10.11.0.14）
```

## SSH ユーザーと権限

### staging VM（10.11.0.14）: `staging-deploy`

| 項目 | 内容 |
|------|------|
| UID/GID | 1001 |
| グループ | `staging-deploy`, `users`, `docker` |
| sudo | なし |
| シェル | `/bin/bash` |
| ホームディレクトリ | `/home/staging-deploy` |

**authorized_keys** (`/home/staging-deploy/.ssh/authorized_keys`):

```
# アプリデプロイ用（DEPLOY_SSH_PRIVATE_KEY）- staging VMでのコマンド実行を許可
no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAAC3Nz...Auh github-actions-deploy

# Keycloak ProxyJump用（KEYCLOAK_DEPLOY_SSH_PRIVATE_KEY）- 転送先を10.11.0.15:22のみに制限
no-X11-forwarding,no-agent-forwarding,permitopen="10.11.0.15:22" ssh-ed25519 AAAAC3Nz...Amm keycloak-deploy@staging
```

- `github-actions-deploy` 鍵: アプリデプロイコマンドの実行のみ許可
- `keycloak-deploy@staging` 鍵: `10.11.0.15:22` への ProxyJump のみ許可（`permitopen` でポート転送先を制限）

### Keycloak VM（10.11.0.15）: `keycloak-deploy`

| 項目 | 内容 |
|------|------|
| UID/GID | 1001 |
| グループ | `keycloak-deploy`, `users`, `docker` |
| sudo | なし |
| シェル | `/bin/bash` |
| ホームディレクトリ | `/home/keycloak-deploy` |

**authorized_keys** (`/home/keycloak-deploy/.ssh/authorized_keys`):

```
no-pty,no-X11-forwarding,no-agent-forwarding,no-port-forwarding ssh-ed25519 AAAAC3Nz...Amm keycloak-deploy@staging
```

- PTY割り当て・X11転送・エージェント転送・ポート転送をすべて禁止
- docker コマンド実行のみ許可（docker グループ所属）

## シークレット管理

シークレットは Infisical（セルフホスト）で管理。**GitHub Actions を通過しない。**

### アプリデプロイ時

```
VM（Infisical CLI）
  → infisical export --env=staging
  → .env 生成（デプロイ後に即削除）
  → docker compose up
```

### Keycloak デプロイ時（GitHub Actions → リモート VM）

GitHub Actions で Machine Identity（Universal Auth）を使い、env var 経由でリモートに渡す。

```yaml
env:
  INFISICAL_UNIVERSAL_AUTH_CLIENT_ID: ${{ secrets.INFISICAL_MACHINE_IDENTITY_CLIENT_ID }}
  INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET: ${{ secrets.INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET }}
run: |
  ssh keycloak-deploy@10.11.0.15 bash -l << REMOTE_SCRIPT
    export INFISICAL_UNIVERSAL_AUTH_CLIENT_ID="${INFISICAL_UNIVERSAL_AUTH_CLIENT_ID}"
    export INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET="${INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET}"
    infisical run --method=universal-auth --env=staging ...
  REMOTE_SCRIPT
```

### Infisical 設定

| 項目 | 値 |
|------|-----|
| ドメイン | https://secrets.rayven.cloud |
| プロジェクト ID | `dbff850c-430a-431b-b7fe-efc744e304d6` |
| 環境 | `staging` |
| 認証方式 | Machine Identity（Universal Auth） |

## GitHub Secrets / Variables

### Environment: staging

| 名前 | 種別 | 内容 |
|------|------|------|
| `CF_ACCESS_CLIENT_ID` | Secret | Cloudflare Access Service Token Client ID |
| `CF_ACCESS_CLIENT_SECRET` | Secret | Cloudflare Access Service Token Client Secret |
| `DEPLOY_SSH_PRIVATE_KEY` | Secret | `staging-deploy` へのアプリデプロイ用 SSH 秘密鍵（ed25519） |
| `KEYCLOAK_DEPLOY_SSH_PRIVATE_KEY` | Secret | `staging-deploy` への Keycloak ProxyJump 用 SSH 秘密鍵（ed25519） |
| `INFISICAL_MACHINE_IDENTITY_CLIENT_ID` | Secret | Infisical Machine Identity Client ID |
| `INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET` | Secret | Infisical Machine Identity Client Secret |

## VM への SSH 接続（手動）

Cloudflare Zero Trust Access 経由のため、`cloudflared` が必要。

```bash
# staging VM（アプリ）
ssh -o ProxyCommand="cloudflared access ssh --hostname stg-ssh.tumiki.cloud" staging-deploy@stg-ssh.tumiki.cloud

# staging VM（踏み台経由）
ssh -J lab-proxmox hisuzuya@10.11.0.14

# Keycloak VM（踏み台経由）
ssh -J lab-proxmox hisuzuya@10.11.0.15
```

## コンテナ操作

### アプリ（staging VM: 10.11.0.14）

```bash
# 状態確認
cd ~/tumiki && docker compose ps

# ログ確認
docker compose logs <service> --tail=50

# 手動再起動
export IMAGE_TAG=main
infisical export --env=staging --format=dotenv --domain https://secrets.rayven.cloud > .env
docker compose up -d --remove-orphans
rm -f .env
```

### Keycloak（keycloak VM: 10.11.0.15）

```bash
# 状態確認
cd ~/keycloak && docker compose ps

# ログ確認
docker compose logs keycloak --tail=50

# ヘルスチェック
curl http://localhost:9000/health/ready
```

## ヘルスチェック

```bash
curl https://stg.tumiki.cloud/api/health           # Manager
curl https://stg-mcp.tumiki.cloud/health           # MCP Proxy
curl https://stg-internal.tumiki.cloud/api/health  # Internal Manager
curl https://stg-auth.tumiki.cloud/health/ready    # Keycloak
```

## トラブルシューティング

### コンテナが起動しない

```bash
cd ~/tumiki && docker compose logs --tail=50
```

### Keycloak が起動しない

```bash
# Keycloak VM に踏み台経由で接続
ssh -J lab-proxmox hisuzuya@10.11.0.15
cd ~/keycloak && docker compose logs keycloak --tail=50
```

### .env が存在しない（デプロイ後は削除される）

手動デプロイを実行して .env を再生成してください。

### Infisical 認証エラー（アプリ VM）

VM 上で Machine Identity が正しく設定されているか確認。

```bash
infisical export --env=staging --domain https://secrets.rayven.cloud
```

### SSH 接続できない

- `cloudflared` のバージョンを確認
- Cloudflare Access の Service Token が有効か確認
- GitHub Secrets の SSH 秘密鍵が正しいか確認（`DEPLOY_SSH_PRIVATE_KEY` / `KEYCLOAK_DEPLOY_SSH_PRIVATE_KEY`）
