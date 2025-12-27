# Keycloak 本番環境デプロイガイド

さくらのクラウドVMへのKeycloakデプロイ手順です。
Cloudflare Tunnelを使用して安全に外部公開します。

## アーキテクチャ

```
[Internet] → [Cloudflare Edge] → [tumiki-main cloudflared] → [tumiki-keycloak]     → [tumiki-prod-db]
                                    192.168.0.10              192.168.0.90:8080       192.168.0.100
                                                                    ↓
                                                              [nginx:80] → [keycloak:8080]
                                                              (CORS対応)
```

**メリット:**

- ポート開放不要（outbound接続のみ）
- DDoS保護が自動的に付与
- WAFによる攻撃防御
- サーバーIPアドレスが非公開
- nginx による CORS ヘッダー統一管理

## 前提条件

### SSH設定

`~/.ssh/config` に以下のホストを定義してください：

```
Host tumiki-sakura-prod
    HostName ssh.tumiki.cloud
    User ubuntu
    ProxyCommand cloudflared access ssh --hostname %h
    ForwardAgent yes

Host tumiki-sakura-keycloak
    HostName 192.168.0.90
    User ubuntu
    ProxyJump tumiki-sakura-prod
    ForwardAgent yes

Host tumiki-sakura-db
    HostName 192.168.0.100
    User ubuntu
    ProxyJump tumiki-sakura-prod
    ForwardAgent yes
```

接続テスト：

```bash
ssh tumiki-sakura-keycloak
ssh tumiki-sakura-db
```

### Cloudflareアカウント

- Cloudflareでドメイン（tumiki.cloud）を管理していること
- Zero Trust（Cloudflare One）にアクセスできること

## クイックスタート

```bash
cd docker/prod

# 1. 環境変数を設定
cp .env.example .env
# .env を編集して値を設定

# 2. Cloudflare Tunnel に Public Hostname を追加（tumiki-main の既存トンネルを使用）
# auth.tumiki.cloud → 192.168.0.90:8080

# 3. PostgreSQL データベースを準備
./deploy.sh setup-db

# 4. Keycloak VM に Docker をインストール
./deploy.sh setup

# 5. Keycloak をデプロイ
./deploy.sh deploy

# 6. 動作確認
./deploy.sh status
./deploy.sh logs
```

## 詳細手順

### 1. Cloudflare Tunnel に Public Hostname を追加

tumiki-main の既存 cloudflared トンネルを使用します。

1. [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/) にアクセス
2. **Networks** → **Tunnels** → 既存のトンネルを選択
3. **Public Hostname** タブ → **Add a public hostname**
4. 以下を設定:

| 項目         | 設定値              |
| ------------ | ------------------- |
| Subdomain    | `auth`              |
| Domain       | `tumiki.cloud`      |
| Service Type | `HTTP`              |
| URL          | `192.168.0.90:8080` |

5. **Save hostname**

> **重要**: Cloudflare Access の「公開されたアプリケーション ルート」に `auth.tumiki.cloud` を追加しないでください。
> 追加すると Access 認証が適用され、DCR（Dynamic Client Registration）などの匿名アクセスがブロックされます。

### 2. 環境変数を設定

```bash
cd docker/prod
cp .env.example .env
```

`.env` を編集：

```bash
# 管理者パスワード
KEYCLOAK_ADMIN_PASSWORD=<strong-password>

# PostgreSQL接続
KC_DB_HOST=192.168.0.100
KC_DB_PASSWORD=<db-password>

# ドメイン
KC_HOSTNAME=auth.tumiki.cloud
```

### 3. PostgreSQL セットアップ

**DBサーバー (192.168.0.100) で以下を実行してください:**

```bash
# PostgreSQL にログイン
sudo -u postgres psql

# データベースとユーザーを作成
CREATE DATABASE keycloak;
CREATE USER keycloak WITH ENCRYPTED PASSWORD '<secure-password>';
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;
\c keycloak
GRANT ALL ON SCHEMA public TO keycloak;
\q

# pg_hba.conf に追加
sudo nano /etc/postgresql/*/main/pg_hba.conf
# 以下を追加:
# host    keycloak    keycloak    192.168.0.90/32    scram-sha-256

# listen_addresses の確認
sudo nano /etc/postgresql/*/main/postgresql.conf
# listen_addresses = '*'

# PostgreSQL を再読み込み
sudo systemctl reload postgresql
```

**接続テスト（tumiki-keycloakから確認）:**

```bash
./deploy.sh setup-db
```

このコマンドは tumiki-keycloak から PostgreSQL への接続をテストします。

### 4. Keycloak VMセットアップ

```bash
./deploy.sh setup
```

Dockerのインストールとディレクトリ作成を行います。
セットアップ後、Dockerグループ反映のため再接続が必要です。

### 5. デプロイ

```bash
./deploy.sh deploy
```

### 6. 動作確認

```bash
./deploy.sh status
./deploy.sh logs
```

ブラウザで https://auth.tumiki.cloud にアクセス。

### DCR（Dynamic Client Registration）確認

匿名 DCR が動作することを確認:

```bash
curl -X POST "https://auth.tumiki.cloud/realms/tumiki/clients-registrations/openid-connect" \
  -H "Content-Type: application/json" \
  -d '{"redirect_uris": ["http://localhost/callback"], "client_name": "Test"}'
```

成功すると `client_id` と `client_secret` を含む JSON が返されます。

## コマンド一覧

```bash
./deploy.sh setup-db   # PostgreSQLデータベース準備
./deploy.sh setup      # 初回セットアップ（Docker インストール）
./deploy.sh deploy     # Keycloakデプロイ
./deploy.sh update     # 設定更新・再デプロイ
./deploy.sh status     # ステータス確認
./deploy.sh logs       # ログ表示
./deploy.sh stop       # サービス停止
./deploy.sh restart    # サービス再起動
./deploy.sh shell      # Keycloak VMにSSH接続
```

## ファイル構成

```
docker/
├── local/                 # ローカル開発環境
│   ├── compose.yaml       # ローカル用 Docker Compose
│   ├── init-db.sql        # ローカルDB初期化（ローカル専用）
│   └── keycloak-cors-proxy/ # CORSプロキシ設定
├── prod/                  # 本番環境（このディレクトリ）
│   ├── README.md          # このファイル
│   ├── compose.yaml       # 本番用 Docker Compose
│   ├── deploy.sh          # デプロイスクリプト
│   ├── .env.example       # 環境変数テンプレート
│   ├── .env               # 環境変数（gitignore対象）
│   └── nginx/
│       └── nginx.conf     # CORS対応リバースプロキシ設定
└── keycloak/              # 共通Keycloak設定
    ├── tumiki-realm.json  # Realm設定
    ├── setup-keycloak.sh  # 初期化スクリプト
    ├── entrypoint.sh      # コンテナエントリーポイント
    └── init-scripts/      # 初期化スクリプト
```

## トラブルシューティング

### Keycloakが起動しない

```bash
# ログを確認
./deploy.sh logs

# PostgreSQL接続を確認（Keycloak VM上で）
./deploy.sh shell
docker exec keycloak nc -zv 192.168.0.100 5432
```

### Cloudflare Tunnel経由でアクセスできない

tumiki-main の既存 cloudflared を使用しているため、以下を確認:

1. tumiki-main で cloudflared が動作しているか確認:

   ```bash
   ssh tumiki-sakura-prod
   sudo systemctl status cloudflared
   ```

2. Cloudflare Zero Trust ダッシュボードでトンネルステータスを確認

3. Public Hostname の設定を確認:
   - Subdomain: `auth`
   - Domain: `tumiki.cloud`
   - Service: `http://192.168.0.90:8080`

### データベース接続エラー

- `pg_hba.conf` で 192.168.0.90 からの接続を許可しているか確認
- `listen_addresses` が `*` または `192.168.0.100` を含むか確認
- PostgreSQLサービスをリロード: `sudo systemctl reload postgresql`

### ドメインにアクセスできない

1. `./deploy.sh status` でコンテナがHealthyか確認
2. Cloudflare Tunnelダッシュボードでトンネルステータスを確認
3. Public Hostnameの設定を確認

## セキュリティ推奨事項

1. **強力なパスワード**: 管理者・DBパスワードは十分強力なものを使用
2. **ファイル権限**: `.env` ファイルは chmod 600（スクリプトが自動設定）
3. **SSH鍵認証**: パスワード認証は無効化
4. **定期バックアップ**: PostgreSQLのバックアップを定期的に取得
5. **Cloudflare WAF**: 必要に応じてWAFルールを有効化

## Cloudflare Zero Trust追加設定（オプション）

### 管理コンソールへのアクセス制限

1. **Access** → **Applications** → **Add an application**
2. **Self-hosted** を選択
3. Application domain: `auth.tumiki.cloud`
4. Path: `/admin/*`
5. ポリシーで許可するユーザー/グループを設定
