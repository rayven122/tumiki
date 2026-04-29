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
Proxmox VM（tumiki-staging）
  ├── tumiki-db        postgres:16-alpine  （ポート非公開）
  ├── tumiki-redis     redis:7-alpine      （ポート非公開）
  ├── tumiki-manager   ghcr.io/rayven122/tumiki-manager:main
  ├── tumiki-mcp-proxy ghcr.io/rayven122/tumiki-mcp-proxy:main
  └── tumiki-internal-manager ghcr.io/rayven122/tumiki-internal-manager:main
```

## CD パイプライン

### 自動デプロイ

`main` ブランチへの push/マージ時に自動実行。

```
main push
  → Docker Publish（GHCR にイメージをプッシュ）
  → Deploy Apps / staging（自動トリガー）
```

### 手動デプロイ

GitHub Actions の `Deploy Apps` ワークフローを手動実行。

1. GitHub → Actions → Deploy Apps → Run workflow
2. `environment: staging`、`image_tag: main`（任意）を指定

### デプロイフロー

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

### 接続経路

```
GitHub Actions Runner
  ↓ SSH（ProxyCommand: cloudflared access ssh）
Cloudflare Tunnel（stg-ssh.tumiki.cloud）
  ↓
tumiki-staging VM（10.11.0.14）
```

## シークレット管理

シークレットは Infisical（セルフホスト）で管理。**GitHub Actions を通過しない。**

```
VM（Infisical CLI）
  → infisical export --env=staging
  → .env 生成（デプロイ後に即削除）
  → docker compose up
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
| `DEPLOY_SSH_PRIVATE_KEY` | Secret | VM への SSH 秘密鍵（ed25519） |

## VM への SSH 接続

Cloudflare Zero Trust Access 経由のため、`cloudflared` が必要。

```bash
# cloudflared がインストールされた端末から
ssh -o ProxyCommand="cloudflared access ssh --hostname stg-ssh.tumiki.cloud" hisuzuya@stg-ssh.tumiki.cloud

# または踏み台サーバー経由（lab-proxmox）
ssh -J lab-proxmox hisuzuya@10.11.0.14
```

## コンテナ操作

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

## ヘルスチェック

```bash
curl https://stg.tumiki.cloud/api/health        # Manager
curl https://stg-mcp.tumiki.cloud/health        # MCP Proxy
curl https://stg-internal.tumiki.cloud/api/health  # Internal Manager
```

## トラブルシューティング

### コンテナが起動しない

```bash
cd ~/tumiki && docker compose logs --tail=50
```

### .env が存在しない（デプロイ後は削除される）

手動デプロイを実行して .env を再生成してください。

### Infisical 認証エラー

VM 上で Machine Identity が正しく設定されているか確認。

```bash
infisical export --env=staging --domain https://secrets.rayven.cloud
```
