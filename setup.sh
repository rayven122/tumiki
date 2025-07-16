#!/bin/bash

# Tumiki 初回環境構築スクリプト
# このスクリプトは、SETUP.md に記載されている手順を自動化します

set -e

# 色付きの出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_error() {
    echo -e "${RED}エラー:${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}警告:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Node.js バージョンチェック
check_node_version() {
    print_step "Node.js バージョンをチェック中..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js がインストールされていません。Node.js >=22.14.0 をインストールしてください。"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
    NODE_MINOR=$(echo $NODE_VERSION | cut -d'.' -f2)
    
    if [ "$NODE_MAJOR" -lt 22 ] || ([ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 14 ]); then
        print_error "Node.js のバージョンが古いです。>=22.14.0 が必要です。現在: v$NODE_VERSION"
        exit 1
    fi
    
    print_success "Node.js v$NODE_VERSION"
}

# pnpm バージョンチェック
check_pnpm_version() {
    print_step "pnpm バージョンをチェック中..."
    
    if ! command -v pnpm &> /dev/null; then
        print_warning "pnpm がインストールされていません。インストールします..."
        npm install -g pnpm@latest
    fi
    
    PNPM_VERSION=$(pnpm -v)
    PNPM_MAJOR=$(echo $PNPM_VERSION | cut -d'.' -f1)
    PNPM_MINOR=$(echo $PNPM_VERSION | cut -d'.' -f2)
    
    if [ "$PNPM_MAJOR" -lt 10 ] || ([ "$PNPM_MAJOR" -eq 10 ] && [ "$PNPM_MINOR" -lt 11 ]); then
        print_error "pnpm のバージョンが古いです。>=10.11.0 が必要です。現在: v$PNPM_VERSION"
        exit 1
    fi
    
    print_success "pnpm v$PNPM_VERSION"
}

# Docker チェック
check_docker() {
    print_step "Docker のインストール状況をチェック中..."
    
    if command -v docker &> /dev/null && docker compose version &> /dev/null; then
        print_success "Docker がインストールされています"
        return 0
    else
        print_warning "Docker がインストールされていません。Neon DB を使用する場合は後で設定してください。"
        return 1
    fi
}

# Vercel CLI チェック
check_vercel_cli() {
    print_step "Vercel CLI のインストール状況をチェック中..."
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI がインストールされていません。インストールします..."
        npm install -g vercel@latest
    fi
    
    print_success "Vercel CLI がインストールされています"
}

# 依存関係のインストール
install_dependencies() {
    print_step "依存関係をインストール中..."
    pnpm install
    print_success "依存関係のインストールが完了しました"
}

# 環境変数のセットアップ
setup_env() {
    print_step "環境変数をセットアップ中..."
    
    if [ -f ".env" ]; then
        print_warning ".env ファイルが既に存在します。"
        read -p "Vercel から環境変数を再取得しますか？ (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_success "既存の .env ファイルを使用します"
            return
        fi
    fi
    
    # Vercel CLI でログイン確認
    if ! vercel whoami &> /dev/null; then
        print_warning "Vercel にログインしていません。ログインプロセスを開始します..."
        vercel login
    fi
    
    # 環境変数を取得
    print_step "Vercel から環境変数を取得中..."
    vercel env pull .env
    print_success "環境変数の取得が完了しました"
}

# DATABASE_URL の設定
setup_database_url() {
    print_step "DATABASE_URL をセットアップ中..."
    
    # 既存の DATABASE_URL をチェック
    if grep -q "^DATABASE_URL=" .env 2>/dev/null; then
        CURRENT_DB_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2-)
        if [[ $CURRENT_DB_URL == *"localhost"* ]] || [[ $CURRENT_DB_URL == *"127.0.0.1"* ]]; then
            print_success "ローカル DATABASE_URL が設定されています"
            return
        fi
    fi
    
    # Docker が利用可能かチェック
    if command -v docker &> /dev/null && docker compose version &> /dev/null; then
        echo
        echo "データベースのセットアップ方法を選択してください:"
        echo "1) Docker PostgreSQL (推奨)"
        echo "2) Neon DB (リモート)"
        echo "3) スキップ (後で手動設定)"
        read -p "選択 (1-3): " -n 1 -r
        echo
        
        case $REPLY in
            1)
                print_step "Docker PostgreSQL コンテナを起動中..."
                docker compose -f ./docker/compose.dev.yaml up -d
                
                # DATABASE_URL を更新
                if grep -q "^DATABASE_URL=" .env; then
                    # macOS と Linux の両方で動作する sed コマンド
                    if [[ "$OSTYPE" == "darwin"* ]]; then
                        sed -i '' 's|^DATABASE_URL=.*|DATABASE_URL="postgresql://postgres:password@localhost:5432/tumiki"|' .env
                    else
                        sed -i 's|^DATABASE_URL=.*|DATABASE_URL="postgresql://postgres:password@localhost:5432/tumiki"|' .env
                    fi
                else
                    echo 'DATABASE_URL="postgresql://postgres:password@localhost:5432/tumiki"' >> .env
                fi
                
                print_success "Docker PostgreSQL が設定されました"
                ;;
            2)
                print_warning "Neon DB の接続 URL を手動で .env ファイルに設定してください"
                print_warning "Neon プロジェクト: https://console.neon.tech/app/projects/blue-hat-21566859/branches"
                ;;
            3)
                print_warning "データベース設定をスキップしました。後で手動で設定してください"
                ;;
            *)
                print_warning "無効な選択です。データベース設定をスキップします"
                ;;
        esac
    else
        print_warning "Docker がインストールされていません。Neon DB の接続 URL を手動で設定してください"
    fi
}

# データベースのマイグレーション
migrate_database() {
    print_step "データベースのマイグレーションを実行中..."
    
    # DATABASE_URL が設定されているかチェック
    if ! grep -q "^DATABASE_URL=" .env 2>/dev/null; then
        print_warning "DATABASE_URL が設定されていません。マイグレーションをスキップします"
        return
    fi
    
    cd packages/db
    
    # マイグレーションの実行
    if pnpm db:deploy; then
        print_success "データベースのマイグレーションが完了しました"
    else
        print_error "データベースのマイグレーションに失敗しました"
        print_warning "データベースが起動していることを確認してください"
        cd ../..
        return 1
    fi
    
    cd ../..
}

# メイン処理
main() {
    echo "============================================"
    echo "  Tumiki 初回環境構築セットアップ"
    echo "============================================"
    echo
    
    # 前提条件のチェック
    check_node_version
    check_pnpm_version
    DOCKER_AVAILABLE=$(check_docker && echo true || echo false)
    check_vercel_cli
    
    echo
    
    # 依存関係のインストール
    install_dependencies
    
    echo
    
    # 環境変数のセットアップ
    setup_env
    
    echo
    
    # DATABASE_URL のセットアップ
    setup_database_url
    
    echo
    
    # データベースのマイグレーション
    migrate_database
    
    echo
    echo "============================================"
    echo "  セットアップが完了しました！"
    echo "============================================"
    echo
    echo "開発サーバーを起動するには:"
    echo "  pnpm dev"
    echo
    echo "アクセス先:"
    echo "  Manager: http://localhost:3000"
    echo "  ProxyServer: http://localhost:8080"
    echo
    
    if [[ "$DOCKER_AVAILABLE" == "false" ]]; then
        print_warning "Docker がインストールされていないため、データベースの手動設定が必要な場合があります"
    fi
}

# スクリプトの実行
main