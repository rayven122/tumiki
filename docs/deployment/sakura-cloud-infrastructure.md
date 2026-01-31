# さくらのクラウド インフラ構成

Tumikiプラットフォームの本番インフラ構成ドキュメント。

## ネットワーク構成

```
インターネット
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare                                │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ manager.tumiki  │  │ auth.tumiki     │                   │
│  │    .cloud       │  │   .cloud        │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
└───────────┼────────────────────┼────────────────────────────┘
            │                    │
            ▼                    ▼
       Vercel/GCR         Cloudflare Tunnel
            │                    │
            │                    ▼
            │    ┌───────────────────────────────┐
            │    │ さくらのクラウド (192.168.0.0/24) │
            │    │                               │
            │    │  ┌─────────────────────┐     │
            │    │  │ tumiki-keycloak     │     │
            │    │  │ 192.168.0.90        │     │
            │    │  │ ┌───────┐ ┌───────┐ │     │
            │    │  │ │nginx  │→│KC     │ │     │
            │    │  │ │:8080  │ │:8080  │ │     │
            │    │  │ └───────┘ └───────┘ │     │
            │    │  └──────────┬──────────┘     │
            │    │             │                │
            │    │  ┌──────────▼──────────┐     │
            │    │  │ tumiki-prod-db      │     │
            │    │  │ 192.168.0.100       │     │
            │    │  │ PostgreSQL :5432    │     │
            │    │  └─────────────────────┘     │
            │    └───────────────────────────────┘
            │
            ▼
     API呼び出し (Vercel/Cloud Run → Keycloak)
```

## サーバー構成

### tumiki-keycloak (192.168.0.90)

Keycloak認証サーバー用VM。

| 項目 | 値 |
|-----|-----|
| ホスト名 | tumiki-keycloak |
| プライベートIP | 192.168.0.90 |
| OS | Ubuntu 22.04 LTS |
| Docker | 最新版 |
| 公開ポート | 8080 (nginx経由) |

**コンテナ構成:**
- `tumiki-nginx` - CORSプロキシ (8080:80)
- `tumiki-keycloak` - Keycloak本体 (内部のみ)

### tumiki-prod-db (192.168.0.100)

PostgreSQLデータベースサーバー。

| 項目 | 値 |
|-----|-----|
| ホスト名 | tumiki-prod-db |
| プライベートIP | 192.168.0.100 |
| OS | Ubuntu 22.04 LTS |
| PostgreSQL | 15.x |
| ポート | 5432 |

**データベース:**
- `keycloak` - Keycloak用データベース
- `tumiki` - アプリケーション用データベース

## Cloudflare Tunnel設定

Cloudflare Tunnelでセキュアな接続を提供。

| ドメイン | 転送先 | 説明 |
|---------|--------|------|
| auth.tumiki.cloud | 192.168.0.90:8080 | Keycloak認証 |

### Tunnel設定例

```yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/<tunnel-id>.json

ingress:
  - hostname: auth.tumiki.cloud
    service: http://192.168.0.90:8080
  - service: http_status:404
```

## SSH接続設定

`~/.ssh/config` の設定例:

```
# Keycloak VM
Host tumiki-keycloak
  HostName <keycloak-vm-public-ip>
  User tumiki
  IdentityFile ~/.ssh/id_rsa
  ForwardAgent yes

# Database VM
Host tumiki-prod-db
  HostName <db-vm-public-ip>
  User tumiki
  IdentityFile ~/.ssh/id_rsa

# メインサーバー経由のアクセス（踏み台）
Host tumiki-keycloak-via-main
  HostName 192.168.0.90
  User tumiki
  IdentityFile ~/.ssh/id_rsa
  ProxyJump tumiki-main
```

## デプロイフロー

```
1. ローカル開発
   └── pnpm setup:dev
       └── docker/local/compose.yaml

2. 本番デプロイ
   ├── pnpm keycloak:prod:setup-db  # DB準備
   ├── pnpm keycloak:prod:setup     # Docker準備
   ├── pnpm keycloak:prod:deploy    # コンテナ起動
   └── pnpm keycloak:prod:apply     # Terraform適用
```

## 環境変数

### 本番環境 (docker/prod/.env)

```bash
# Keycloak管理者
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=<secure-password>

# PostgreSQL接続
KC_DB_HOST=192.168.0.100
KC_DB_NAME=keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=<secure-password>

# Terraform用
KEYCLOAK_CLIENT_ID=tumiki-manager
KEYCLOAK_CLIENT_SECRET=<client-secret>
```

## セキュリティ

### ネットワークセキュリティ

- プライベートネットワーク内通信のみ
- Cloudflare Tunnelでエンドツーエンド暗号化
- パブリックIPは踏み台のみ（または不要）

### 認証セキュリティ

- SSHキー認証のみ（パスワード認証無効）
- Keycloak管理者パスワードは強力なものを使用
- クライアントシークレットは環境変数で管理

### 推奨事項

1. 定期的なセキュリティアップデート
2. Keycloakバージョンの定期更新
3. データベースの定期バックアップ
4. ログの監視と保存

## 関連ドキュメント

- [docker/prod/README.md](../../docker/prod/README.md) - デプロイガイド
- [terraform/keycloak/README.md](../../terraform/keycloak/README.md) - Terraform設定
- [docs/auth/keycloak-dcr-setup.md](../auth/keycloak-dcr-setup.md) - DCR設定
