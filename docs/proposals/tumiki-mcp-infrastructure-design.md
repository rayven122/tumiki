# Tumiki MCP インフラ設計書

**作成日**: 2026-03-05
**ステータス**: Draft

---

## 目次

1. [ネットワーク構成](#1-ネットワーク構成)
2. [SSH設定](#2-ssh設定)
3. [VM構成](#3-vm構成)
4. [ソフトウェア構成](#4-ソフトウェア構成)
5. [セットアップ手順](#5-セットアップ手順)
6. [デプロイ設定](#6-デプロイ設定)
7. [監視・運用](#7-監視運用)

---

## 1. ネットワーク構成

### 1.1 さくらのクラウド 全体構成

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         さくらのクラウド - tumiki                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ 共有セグメント (192.168.0.0/24) ────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌─────────────────┐                                                  │  │
│  │  │ tumiki-router   │  VPNルータ                                       │  │
│  │  │ 113703028715    │  外部接続                                        │  │
│  │  └────────┬────────┘                                                  │  │
│  │           │                                                           │  │
│  │  ─────────┼───────────────────────────────────────────────────────   │  │
│  │           │                                                           │  │
│  │  ┌────────┴────────┬─────────────────┬─────────────────┐             │  │
│  │  │                 │                 │                 │             │  │
│  │  ▼                 ▼                 ▼                 ▼             │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │tumiki-main  │  │tumiki-mcp   │  │tumiki-      │  │tumiki-      │  │  │
│  │  │             │  │   (新規)    │  │keycloak     │  │prod-db      │  │  │
│  │  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤  │  │
│  │  │4CPU / 8GB   │  │2CPU / 4GB   │  │2CPU / 4GB   │  │PostgreSQL14 │  │  │
│  │  │192.168.0.10 │  │192.168.0.20 │  │192.168.0.90 │  │192.168.0.100│  │  │
│  │  │20GB SSD     │  │20GB SSD     │  │20GB SSD     │  │             │  │  │
│  │  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤  │  │
│  │  │Cloudflared  │  │MCP Wrapper  │  │Keycloak     │  │PostgreSQL   │  │  │
│  │  │tumiki-proxy │  │             │  │             │  │             │  │  │
│  │  │(踏み台)     │  │             │  │             │  │             │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  │        │                 │                                            │  │
│  │        │                 │                                            │  │
│  └────────┼─────────────────┼────────────────────────────────────────────┘  │
│           │                 │                                               │
│           │ Cloudflare      │ 内部通信                                      │
│           │ Tunnel          │ (192.168.0.x)                                │
│           ▼                 │                                               │
│  ┌─────────────────┐        │                                               │
│  │ ssh.tumiki.cloud│        │                                               │
│  │ (外部公開)      │────────┘                                               │
│  └─────────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 通信フロー

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           通信フロー                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  【MCPリクエストフロー】                                                     │
│                                                                             │
│  Client (Claude)                                                            │
│       │                                                                     │
│       │ HTTPS                                                               │
│       ▼                                                                     │
│  Cloudflare (tumiki.app)                                                    │
│       │                                                                     │
│       │ Cloudflare Tunnel                                                   │
│       ▼                                                                     │
│  tumiki-main (192.168.0.10)                                                │
│  └── tumiki-proxy                                                          │
│       │                                                                     │
│       │ HTTP (内部ネットワーク)                                             │
│       │ POST http://192.168.0.20:8080/mcp/{serverName}                     │
│       ▼                                                                     │
│  tumiki-mcp (192.168.0.20)                                                 │
│  └── Universal MCP Wrapper                                                 │
│       │                                                                     │
│       │ stdio                                                               │
│       ▼                                                                     │
│  MCP Server Process                                                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  【SSH接続フロー】                                                           │
│                                                                             │
│  開発者PC                                                                   │
│       │                                                                     │
│       │ ssh tumiki-sakura-mcp                                              │
│       ▼                                                                     │
│  Cloudflared Access                                                        │
│       │                                                                     │
│       │ ProxyCommand                                                        │
│       ▼                                                                     │
│  tumiki-main (踏み台)                                                       │
│       │                                                                     │
│       │ ProxyJump                                                           │
│       ▼                                                                     │
│  tumiki-mcp (192.168.0.20)                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. SSH設定

### 2.1 SSH Config 追加

```bash
# ~/.ssh/config に追加

Host tumiki-sakura-mcp
    HostName 192.168.0.20
    User ubuntu
    ProxyJump tumiki-sakura-prod
    ForwardAgent yes
```

### 2.2 全体の SSH Config

```bash
# ~/.ssh/config

# 踏み台サーバー（Cloudflared経由）
Host tumiki-sakura-prod
    HostName ssh.tumiki.cloud
    User ubuntu
    ProxyCommand cloudflared access ssh --hostname %h
    ForwardAgent yes

# Keycloak サーバー
Host tumiki-sakura-keycloak
    HostName 192.168.0.90
    User ubuntu
    ProxyJump tumiki-sakura-prod
    ForwardAgent yes

# データベースサーバー
Host tumiki-sakura-db
    HostName 192.168.0.100
    User ubuntu
    ProxyJump tumiki-sakura-prod
    ForwardAgent yes

# MCP Wrapper サーバー（新規）
Host tumiki-sakura-mcp
    HostName 192.168.0.20
    User ubuntu
    ProxyJump tumiki-sakura-prod
    ForwardAgent yes
```

### 2.3 接続確認

```bash
# 接続テスト
ssh tumiki-sakura-mcp

# 接続できたら確認
whoami      # → ubuntu
hostname    # → tumiki-mcp
ip addr     # → 192.168.0.20
```

---

## 3. VM構成

### 3.1 tumiki-mcp スペック

| 項目 | 値 |
|------|-----|
| ホスト名 | tumiki-mcp |
| IPアドレス | 192.168.0.20 |
| CPU | 2コア |
| メモリ | 4GB |
| ディスク | 20GB SSD |
| OS | Ubuntu 22.04 LTS (想定) |

### 3.2 ポート使用計画

| ポート | 用途 | アクセス元 |
|--------|------|-----------|
| 22 | SSH | tumiki-main (踏み台) |
| 8080 | MCP Wrapper HTTP | tumiki-main (tumiki-proxy) |
| 9090 | Prometheus metrics | tumiki-main (監視) |

### 3.3 ファイアウォール設定

```bash
# UFW設定
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH（内部ネットワークのみ）
sudo ufw allow from 192.168.0.0/24 to any port 22

# MCP Wrapper（tumiki-mainのみ）
sudo ufw allow from 192.168.0.10 to any port 8080

# Prometheus metrics（tumiki-mainのみ）
sudo ufw allow from 192.168.0.10 to any port 9090

sudo ufw enable
```

---

## 4. ソフトウェア構成

### 4.1 インストール一覧

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ソフトウェア構成                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  【ランタイム】                                                              │
│  ├── Node.js 22 LTS (MCPサーバー実行用)                                     │
│  ├── Go 1.22+ (tumiki-mcp-http-adapter)                                    │
│  └── Python 3.11+ (一部MCPサーバー用)                                       │
│                                                                             │
│  【プロセス管理】                                                            │
│  └── PM2 (Node.js プロセスマネージャー)                                     │
│                                                                             │
│  【アプリケーション】                                                        │
│  └── tumiki-mcp-http-adapter (Universal MCP Wrapper)                       │
│                                                                             │
│  【監視】                                                                    │
│  └── Node Exporter (Prometheus metrics)                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 ディレクトリ構成

```
/opt/tumiki-mcp/
├── bin/
│   └── tumiki-mcp-http           # Go バイナリ
├── config/
│   └── catalog-cache.json        # カタログキャッシュ
├── logs/
│   ├── wrapper.log               # Wrapper ログ
│   └── mcp-servers/              # MCPサーバー別ログ
├── tmp/
│   └── npm-cache/                # npm キャッシュ
└── ecosystem.config.js           # PM2 設定
```

---

## 5. セットアップ手順

### 5.1 初期セットアップスクリプト

```bash
#!/bin/bash
# setup-tumiki-mcp.sh
# tumiki-mcp サーバーの初期セットアップ

set -e

echo "=== Tumiki MCP Server Setup ==="

# 1. システム更新
echo "[1/8] Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. 必要パッケージインストール
echo "[2/8] Installing dependencies..."
sudo apt install -y curl wget git build-essential

# 3. Node.js 22 インストール
echo "[3/8] Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version

# 4. Go インストール
echo "[4/8] Installing Go..."
wget https://go.dev/dl/go1.22.0.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz
rm go1.22.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
export PATH=$PATH:/usr/local/go/bin
go version

# 5. PM2 インストール
echo "[5/8] Installing PM2..."
sudo npm install -g pm2
pm2 --version

# 6. ディレクトリ作成
echo "[6/8] Creating directories..."
sudo mkdir -p /opt/tumiki-mcp/{bin,config,logs,tmp}
sudo chown -R ubuntu:ubuntu /opt/tumiki-mcp

# 7. tumiki-mcp-http-adapter ビルド
echo "[7/8] Building tumiki-mcp-http-adapter..."
cd /tmp
git clone https://github.com/rayven122/tumiki-mcp-http-adapter.git
cd tumiki-mcp-http-adapter
go build -o /opt/tumiki-mcp/bin/tumiki-mcp-http ./cmd/tumiki-mcp-http
chmod +x /opt/tumiki-mcp/bin/tumiki-mcp-http

# 8. PM2 設定
echo "[8/8] Configuring PM2..."
cat > /opt/tumiki-mcp/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: "mcp-wrapper",
      script: "/opt/tumiki-mcp/bin/tumiki-mcp-http",
      args: [
        "--dynamic",
        "--catalog-url", "http://192.168.0.10:3000/api/catalog",
        "--max-processes", "10",
        "--idle-timeout", "180",
        "--port", "8080"
      ],
      cwd: "/opt/tumiki-mcp",
      env: {
        NODE_ENV: "production",
        NPM_CONFIG_CACHE: "/opt/tumiki-mcp/tmp/npm-cache"
      },
      out_file: "/opt/tumiki-mcp/logs/wrapper.log",
      error_file: "/opt/tumiki-mcp/logs/wrapper-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000
    }
  ]
};
EOF

echo "=== Setup Complete ==="
echo "Next steps:"
echo "  1. Configure firewall: sudo ufw allow from 192.168.0.10 to any port 8080"
echo "  2. Start service: cd /opt/tumiki-mcp && pm2 start ecosystem.config.js"
echo "  3. Enable startup: pm2 save && pm2 startup"
```

### 5.2 手動セットアップ手順

```bash
# 1. SSH接続
ssh tumiki-sakura-mcp

# 2. セットアップスクリプトをダウンロード・実行
curl -fsSL https://raw.githubusercontent.com/rayven122/tumiki/main/scripts/setup-tumiki-mcp.sh | bash

# または手動で実行
# ... (上記スクリプトの内容を手動で実行)

# 3. ファイアウォール設定
sudo ufw allow from 192.168.0.10 to any port 8080
sudo ufw enable

# 4. サービス起動
cd /opt/tumiki-mcp
pm2 start ecosystem.config.js

# 5. 自動起動設定
pm2 save
pm2 startup
# 表示されるコマンドを実行

# 6. 動作確認
curl http://localhost:8080/health
```

---

## 6. デプロイ設定

### 6.1 GitHub Actions CI/CD

```yaml
# .github/workflows/deploy-mcp-wrapper.yml

name: Deploy MCP Wrapper

on:
  push:
    branches: [main]
    paths:
      - 'apps/mcp-wrapper/**'
      - '.github/workflows/deploy-mcp-wrapper.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Build
        run: |
          cd apps/mcp-wrapper
          go build -o tumiki-mcp-http ./cmd/tumiki-mcp-http

      - name: Deploy to Sakura Cloud
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SAKURA_SSH_KEY }}
          CLOUDFLARE_SERVICE_TOKEN_ID: ${{ secrets.CF_SERVICE_TOKEN_ID }}
          CLOUDFLARE_SERVICE_TOKEN_SECRET: ${{ secrets.CF_SERVICE_TOKEN_SECRET }}
        run: |
          # SSH設定
          mkdir -p ~/.ssh
          echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa

          # Cloudflared インストール
          curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
          chmod +x cloudflared

          # SSH Config
          cat > ~/.ssh/config << EOF
          Host tumiki-sakura-prod
              HostName ssh.tumiki.cloud
              User ubuntu
              ProxyCommand ./cloudflared access ssh --hostname %h
              StrictHostKeyChecking no

          Host tumiki-sakura-mcp
              HostName 192.168.0.20
              User ubuntu
              ProxyJump tumiki-sakura-prod
              StrictHostKeyChecking no
          EOF

          # デプロイ
          scp apps/mcp-wrapper/tumiki-mcp-http tumiki-sakura-mcp:/opt/tumiki-mcp/bin/
          ssh tumiki-sakura-mcp "cd /opt/tumiki-mcp && pm2 restart mcp-wrapper"
```

### 6.2 手動デプロイ

```bash
# ローカルでビルド
cd tumiki-mcp-http-adapter
go build -o tumiki-mcp-http ./cmd/tumiki-mcp-http

# サーバーにコピー
scp tumiki-mcp-http tumiki-sakura-mcp:/opt/tumiki-mcp/bin/

# サービス再起動
ssh tumiki-sakura-mcp "pm2 restart mcp-wrapper"
```

---

## 7. 監視・運用

### 7.1 ログ確認

```bash
# リアルタイムログ
ssh tumiki-sakura-mcp "pm2 logs mcp-wrapper"

# ログファイル直接確認
ssh tumiki-sakura-mcp "tail -f /opt/tumiki-mcp/logs/wrapper.log"
```

### 7.2 プロセス管理

```bash
# ステータス確認
ssh tumiki-sakura-mcp "pm2 status"

# 再起動
ssh tumiki-sakura-mcp "pm2 restart mcp-wrapper"

# 停止
ssh tumiki-sakura-mcp "pm2 stop mcp-wrapper"

# メトリクス確認
ssh tumiki-sakura-mcp "pm2 monit"
```

### 7.3 ヘルスチェック

```bash
# tumiki-main から確認
ssh tumiki-sakura-prod "curl -s http://192.168.0.20:8080/health"

# ローカルから確認（SSH経由）
ssh tumiki-sakura-mcp "curl -s http://localhost:8080/health"
```

### 7.4 アラート設定

```bash
# PM2 でクラッシュ検知
# ecosystem.config.js に追加

{
  // ...
  max_restarts: 10,
  min_uptime: 5000,
  // Slack通知（PM2 Plus または自前スクリプト）
}
```

---

## 8. tumiki-proxy 側の設定

### 8.1 環境変数追加

```bash
# tumiki-main の tumiki-proxy 環境変数

UNIVERSAL_WRAPPER_URL=http://192.168.0.20:8080
```

### 8.2 ルーティング設定

```typescript
// tumiki-proxy/src/config.ts

export const config = {
  // ...
  universalWrapperUrl: process.env.UNIVERSAL_WRAPPER_URL || "http://192.168.0.20:8080",
};
```

---

## 9. チェックリスト

### 9.1 セットアップ完了チェック

```
□ SSH接続確認
  ssh tumiki-sakura-mcp

□ Node.js インストール確認
  node --version  # v22.x.x

□ Go インストール確認
  go version  # go1.22.x

□ PM2 インストール確認
  pm2 --version

□ ディレクトリ作成確認
  ls -la /opt/tumiki-mcp/

□ バイナリ配置確認
  /opt/tumiki-mcp/bin/tumiki-mcp-http --help

□ ファイアウォール確認
  sudo ufw status

□ サービス起動確認
  pm2 status

□ ヘルスチェック確認
  curl http://localhost:8080/health

□ tumiki-main からの接続確認
  # tumiki-main で実行
  curl http://192.168.0.20:8080/health
```

### 9.2 運用チェック

```
□ ログローテーション設定
□ 自動起動設定 (pm2 startup)
□ バックアップ設定
□ 監視アラート設定
```

---

## 付録A: トラブルシューティング

| 症状 | 原因 | 解決策 |
|------|------|--------|
| SSH接続できない | 踏み台経由の設定ミス | ProxyJump設定を確認 |
| ポート8080に接続できない | ファイアウォール | `sudo ufw allow from 192.168.0.10 to any port 8080` |
| PM2が起動しない | Node.jsパス | `which node` で確認 |
| MCPサーバー起動失敗 | npm キャッシュ | `/opt/tumiki-mcp/tmp/npm-cache` を確認 |
| メモリ不足 | 同時プロセス過多 | `max-processes` を減らす |

---

## 付録B: コマンドリファレンス

```bash
# SSH接続
ssh tumiki-sakura-mcp

# サービス操作
pm2 start ecosystem.config.js
pm2 restart mcp-wrapper
pm2 stop mcp-wrapper
pm2 delete mcp-wrapper

# ログ
pm2 logs mcp-wrapper
pm2 logs mcp-wrapper --lines 100

# 監視
pm2 monit
pm2 status

# 設定再読み込み
pm2 reload ecosystem.config.js
```
