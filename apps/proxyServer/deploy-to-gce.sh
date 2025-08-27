#!/bin/bash
set -euo pipefail

# =============================================================================
# Tumiki ProxyServer - GitベースGCEデプロイメントスクリプト
# =============================================================================
#
# このスクリプトはtumikiリポジトリをGCE VMにデプロイします。
# VM上に設定済みのSSHキーを使用してGitHub認証を行います。
#
# 使用方法:
#   ./deploy-to-gce.sh           # 通常のデプロイ
#   DRY_RUN=true ./deploy-to-gce.sh  # ドライラン（実際には実行しない）
#
# 環境変数:
#   INSTANCE_NAME  - GCEインスタンス名 (デフォルト: tumiki-instance-20250601)
#   ZONE          - GCEゾーン (デフォルト: asia-northeast2-c)
#   PROJECT_ID    - GCEプロジェクトID (デフォルト: mcp-server-455206)
#   REMOTE_PATH   - デプロイ先パス (デフォルト: /opt/tumiki)
#   DEPLOY_USER   - デプロイ用ユーザー (デフォルト: tumiki-deploy)
#   DRY_RUN       - ドライランモード (デフォルト: false)
#
# デプロイフロー:
#   1. tumikiリポジトリ (git@github.com:rayven122/tumiki.git) を使用
#   2. /opt/tumiki が存在する場合はpull、存在しない場合はclone
#   3. VM上で依存関係インストールとビルド (sudo git使用)
#   4. PM2でアプリケーション起動
#
# 前提条件:
#   - VM上でSSHキーが設定済み (sudo git clone可能)
#   - Node.js 22.x, pnpm, PM2がインストール済み
#
# =============================================================================

# 設定変数
INSTANCE_NAME="${INSTANCE_NAME:-tumiki-instance-20250601}"
ZONE="${ZONE:-asia-northeast2-c}"
PROJECT_ID="${PROJECT_ID:-mcp-server-455206}"
REMOTE_PATH="${REMOTE_PATH:-/opt/tumiki}"
DEPLOY_USER="${DEPLOY_USER:-tumiki-deploy}"  # デプロイ用共通ユーザー
REPO_URL="${REPO_URL:-git@github.com:rayven122/tumiki.git}"  # リポジトリURL
DRY_RUN="${DRY_RUN:-false}"

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_dry_run() {
    echo -e "${YELLOW}[DRY RUN]${NC} $1"
}

# Dry run実行関数
execute_command() {
    local description="$1"
    shift
    
    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "$description"
        log_dry_run "実行予定コマンド: $*"
        return 0
    else
        log_info "$description"
        "$@"
    fi
}

# 前提条件チェック
check_prerequisites() {
    log_info "前提条件をチェックしています..."
    
    # gcloud CLI の確認
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI が見つかりません"
        log_error "Google Cloud SDK をインストールしてください"
        exit 1
    fi
    
    # gcloud 認証確認
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
        log_error "Google Cloud 認証が必要です"
        log_error "gcloud auth login を実行してください"
        exit 1
    fi
    
    # Git の確認
    if ! command -v git &> /dev/null; then
        log_error "Git が見つかりません"
        log_error "Git をインストールしてください"
        exit 1
    fi
    
    # Vercel CLI の確認
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI が見つかりません"
        log_error "以下のコマンドでインストールしてください:"
        log_error "npm install -g vercel"
        exit 1
    fi
    
    # Vercel 認証確認（プロジェクトルートで実行）
    log_info "Vercelプロジェクトの設定を確認中..."
    local current_dir=$(pwd)
    local project_root="../../"
    
    if cd "$project_root" 2>/dev/null; then
        if ! vercel whoami &>/dev/null; then
            log_error "Vercel 認証が必要です"
            log_error "vercel login を実行してください"
            cd "$current_dir"
            exit 1
        fi
        
        # プロジェクトがリンクされているかチェック
        if [ ! -f ".vercel/project.json" ]; then
            log_warn "プロジェクトがVercelにリンクされていない可能性があります"
            log_warn "プロジェクトルートで 'vercel link' を実行してください"
        fi
        
        cd "$current_dir"
    else
        log_error "プロジェクトルートディレクトリ $project_root が見つかりません"
        exit 1
    fi
    
    if [ -z "$PROJECT_ID" ]; then
        log_error "PROJECT_ID が設定されていません"
        exit 1
    fi
    
    if ! gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID &>/dev/null; then
        log_error "インスタンス $INSTANCE_NAME が見つかりません"
        exit 1
    fi
    
    log_info "デプロイ先: $INSTANCE_NAME ($ZONE)"
    log_info "デプロイユーザー: $DEPLOY_USER"
}

# デプロイ設定
CURRENT_BRANCH="main"  # 使用するブランチ

# Vercelから環境変数を取得
fetch_vercel_env() {
    log_info "Vercelから本番環境の環境変数を取得しています..."
    
    local env_file="apps/proxyServer/.env"
    local current_dir=$(pwd)
    
    # スクリプトがプロジェクトルートから実行されている場合の対応
    if [ -f "package.json" ] && [ -d "apps/proxyServer" ]; then
        # プロジェクトルートから実行されている
        local project_root="."
    else
        # apps/proxyServerディレクトリから実行されている
        local project_root="../../"
    fi
    
    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "環境変数取得"
        log_dry_run "実行予定コマンド: cd $project_root && vercel env pull --environment=production $env_file"
        return 0
    fi
    
    log_info "プロジェクトルートディレクトリに移動中..."
    
    # プロジェクトルートに移動
    if ! cd "$project_root"; then
        log_error "プロジェクトルートディレクトリに移動できませんでした"
        cd "$current_dir"
        return 1
    fi
    
    # Vercelから環境変数を取得
    log_info "vercel env pull を実行中..."
    if ! vercel env pull --environment=production "$env_file"; then
        log_error "Vercelからの環境変数取得に失敗しました"
        log_error "以下を確認してください:"
        log_error "1. vercel login が完了している"
        log_error "2. このプロジェクトがVercelにリンクされている (vercel link)"
        log_error "3. 本番環境の環境変数が設定されている"
        log_error "4. 現在のディレクトリがプロジェクトルートである"
        cd "$current_dir"
        return 1
    fi
    
    # 元のディレクトリに戻る
    cd "$current_dir"
    
    if [ ! -f ".env" ]; then
        log_error "環境変数ファイル .env が作成されませんでした"
        return 1
    fi
    
    log_info "環境変数ファイル .env を取得しました"
    
    # ファイルサイズを確認
    local file_size=$(wc -l < ".env")
    log_info "環境変数の数: $file_size 行"
}

# 環境変数ファイルをVMに転送
transfer_env_file() {
    log_info "環境変数ファイルをVMに転送しています..."
    
    local env_file=".env"
    
    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "環境変数ファイル転送"
        log_dry_run "実行予定コマンド: gcloud compute scp $env_file $DEPLOY_USER@$INSTANCE_NAME:$REMOTE_PATH/"
        return 0
    fi
    
    if [ ! -f "$env_file" ]; then
        log_warn "環境変数ファイル $env_file が見つかりません"
        log_warn "VM上でテンプレートファイルが作成されます"
        return 0
    fi
    
    # 環境変数ファイルをVMに転送
    if ! gcloud compute scp "$env_file" "$DEPLOY_USER@$INSTANCE_NAME:$REMOTE_PATH/" --zone="$ZONE" --project="$PROJECT_ID"; then
        log_error "環境変数ファイルの転送に失敗しました"
        log_warn "VM上でテンプレートファイルが作成されます"
        return 0
    fi
    
    log_info "環境変数ファイルをVMに転送しました"
}

# VMへのデプロイ
deploy_to_vm() {
    log_info "VMにGitベースデプロイを実行しています..."
    
    # VM上でのGitベースセットアップ
    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "VM上でのGitベースセットアップ"
        log_dry_run "実行予定コマンド: gcloud compute ssh (Git clone/pull, ビルド, PM2起動)"
    else
        gcloud compute ssh $DEPLOY_USER@$INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID --command="
            set -e
            
            # ディレクトリ準備
            # 注意: この時点で /opt/tumiki は $DEPLOY_USER 所有であることが前提
            # 初回セットアップ時はrootユーザーで以下を実行:
            # sudo mkdir -p /opt/tumiki && sudo chown $DEPLOY_USER:$DEPLOY_USER /opt/tumiki
            if [ ! -d \"$REMOTE_PATH\" ]; then
                echo \"エラー: $REMOTE_PATH が存在しません。\"
                echo \"rootユーザーで以下を実行してください:\"
                echo \"  sudo mkdir -p $REMOTE_PATH && sudo chown $DEPLOY_USER:$DEPLOY_USER $REMOTE_PATH\"
                exit 1
            fi
            
            echo \"==============================\"
            echo \"デプロイ情報:\"
            echo \"==============================\"
            echo \"現在のデプロイユーザー: \$USER\"
            echo \"デプロイ先ディレクトリ: $REMOTE_PATH\"
            echo \"リポジトリURL: $REPO_URL\"
            echo \"ブランチ: $CURRENT_BRANCH\"
            echo \"==============================\"
            
            # 既存のアプリ停止
            echo \"既存のアプリケーションを停止中...\"
            if command -v pm2 &>/dev/null; then
                pm2 delete tumiki-proxy-server 2>/dev/null || true
                pm2 kill 2>/dev/null || true  # 念のため全PM2プロセスをクリーンアップ
            fi
            
            # Node.js環境セットアップ
            echo \"環境をセットアップ中...\"
            if ! command -v node &>/dev/null; then
                echo \"Node.js 22.x をインストール中...\"
                curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
                sudo apt-get install -y nodejs
            else
                echo \"Node.js $(node --version) が既にインストールされています\"
            fi
            
            if ! command -v pnpm &>/dev/null; then
                echo \"pnpm をインストール中...\"
                sudo npm install -g pnpm@latest
            else
                echo \"pnpm $(pnpm --version) が既にインストールされています\"
            fi
            
            if ! command -v pm2 &>/dev/null; then
                echo \"PM2 をインストール中...\"
                sudo npm install -g pm2
            else
                echo \"PM2 $(pm2 --version) が既にインストールされています\"
            fi
            
            if ! command -v git &>/dev/null; then
                echo \"Git をインストール中...\"
                sudo apt-get update
                sudo apt-get install -y git
            else
                echo \"Git $(git --version) が既にインストールされています\"
            fi
            
            # Git設定（認証プロンプト回避）
            export GIT_TERMINAL_PROMPT=0
            git config --global user.name \"Deployment Bot\"
            git config --global user.email \"deploy@tumiki.local\"
            
            # SSHキーの確認（デプロイユーザー用）
            echo \"\"
            echo \"SSHキーの設定を確認中...\"
            if [ ! -f ~/.ssh/id_rsa ] && [ ! -f ~/.ssh/id_ed25519 ]; then
                echo \"警告: SSHキーが見つかりません\"
                echo \"SSHキーを設定してください:\"
                echo \"  1. ローカルマシンで: gcloud compute ssh $DEPLOY_USER@$INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID\"
                echo \"  2. VM上で: ssh-keygen -t ed25519 -C 'deploy@tumiki.local'\"
                echo \"  3. 公開鍵をGitHubに追加: cat ~/.ssh/id_ed25519.pub\"
                exit 1
            fi
            
            # GitHubへのSSH接続テスト
            echo \"GitHubへのSSH接続をテスト中...\"
            
            if ! ssh -o StrictHostKeyChecking=no -T git@github.com 2>&1 | grep -q \"successfully authenticated\"; then
                echo \"エラー: GitHubへのSSH接続に失敗しました\"
                echo \"\"
                echo \"以下の手順でSSHキーを設定してください:\"
                echo \"1. SSHキーを生成（まだの場合）:\"
                echo \"   ssh-keygen -t ed25519 -C 'deploy@tumiki.local'\"
                echo \"\"
                echo \"2. 公開鍵を表示:\"
                echo \"   cat ~/.ssh/id_ed25519.pub\"
                echo \"\"
                echo \"3. GitHubに公開鍵を追加:\"
                echo \"   https://github.com/settings/keys\"
                echo \"\"
                echo \"4. 接続テスト:\"
                echo \"   ssh -T git@github.com\"
                exit 1
            fi
            echo \"GitHubへのSSH接続が確認できました\"
            
            # リポジトリのクローンまたは更新
            if [ -d \"$REMOTE_PATH/.git\" ]; then
                echo 'リポジトリを更新中...'
                cd $REMOTE_PATH
                # git操作を実行
                git fetch origin
                git reset --hard origin/$CURRENT_BRANCH
                git clean -fd
                echo 'リポジトリを最新の状態に更新しました'
                echo \"現在のコミット: $(git log -1 --format='%h %s')\"
            else
                echo 'リポジトリをクローン中...'
                
                # ディレクトリが存在するが.gitがない場合は削除
                if [ -d \"$REMOTE_PATH\" ] && [ ! -d \"$REMOTE_PATH/.git\" ]; then
                    echo '既存のディレクトリ（Git管理外）を削除中...'
                    sudo rm -rf $REMOTE_PATH
                fi
                
                # 親ディレクトリを作成（必要に応じて）
                sudo mkdir -p /opt
                
                # 一時ディレクトリにクローンしてから移動
                echo \"リポジトリをクローン中...\"
                TEMP_DIR=\"/tmp/tumiki_deploy_\$(date +%s)\"
                
                if ! git clone -b $CURRENT_BRANCH $REPO_URL \$TEMP_DIR; then
                    echo 'エラー: Gitクローンに失敗しました'
                    echo 'リポジトリURL: $REPO_URL'
                    echo 'ブランチ: $CURRENT_BRANCH'
                    echo ''
                    echo 'SSHキーが正しく設定されているか確認してください:'
                    echo '  ssh -T git@github.com'
                    exit 1
                fi
                
                # クローンしたディレクトリを目的地に移動
                # 注意: /opt/tumiki は事前に $DEPLOY_USER 所有に設定されている前提
                mv \$TEMP_DIR $REMOTE_PATH
                
                echo 'リポジトリのクローンが完了しました'
                cd $REMOTE_PATH
                echo \"現在のコミット: $(git log -1 --format='%h %s')\"
            fi
            
            # 作業ディレクトリに移動
            cd $REMOTE_PATH
            
            # 依存関係インストール
            echo ''
            echo '=============================='
            echo '依存関係をインストール中...'
            echo '=============================='
            export NODE_OPTIONS='--max-old-space-size=1536'
            if ! pnpm install --frozen-lockfile; then
                echo '警告: frozen-lockfileでのインストールに失敗しました。lockfileを更新してリトライします...'
                pnpm install --no-frozen-lockfile
            fi
            echo '依存関係のインストールが完了しました'
            
            # @tumiki/db ビルド
            echo ''
            echo '=============================='
            echo '@tumiki/db パッケージをビルド中...'
            echo '=============================='
            cd packages/db
            pnpm db:generate
            pnpm build
            
            # @tumiki/tsup-config ビルド
            echo ''
            echo '=============================='
            echo '@tumiki/tsup-config パッケージをビルド中...'
            echo '=============================='
            cd ../../tooling/tsup-config
            pnpm build
            
            # @tumiki/utils ビルド
            echo ''
            echo '=============================='
            echo '@tumiki/utils パッケージをビルド中...'
            echo '=============================='
            cd ../../packages/utils
            pnpm build
            
            # データベースマイグレーション実行
            echo ''
            echo '=============================='
            echo 'データベースマイグレーションを実行中...'
            echo '=============================='
            if pnpm db:deploy; then
                echo 'データベースマイグレーションが完了しました'
            else
                echo '警告: データベースマイグレーションに失敗しました'
                echo 'DATABASE_URLが正しく設定されているか確認してください'
                echo 'マイグレーションエラーを無視して続行します...'
            fi
            
            # ProxyServer ビルド
            echo ''
            echo '=============================='
            echo 'ProxyServer をビルド中...'
            echo '=============================='
            cd ../../apps/proxyServer
            pnpm build
            
            # PM2で起動
            echo ''
            echo '=============================='
            echo 'アプリケーションを起動中...'
            echo '=============================='
            pnpm pm2:start
            pm2 save
            
            # PM2 自動起動設定
            echo 'PM2 自動起動を設定中...'
            # 注意: PM2の自動起動設定にはsudoが必要です
            # 初回セットアップ時にrootユーザーで実行してください:
            # pm2 startup systemd -u tumiki-deploy --hp /home/tumiki-deploy
            pm2 save || true
            
            # ステータス表示
            echo ''
            echo '=============================='
            echo 'デプロイ完了！'
            echo '=============================='
            pm2 status
            echo ''
            echo 'ログを確認する場合: pm2 logs tumiki-proxy-server'
            echo 'アプリを再起動する場合: pm2 restart tumiki-proxy-server'
        "
    fi
}

# メイン処理
main() {
    log_info "デプロイメントを開始します..."
    log_info "リポジトリURL: $REPO_URL"
    log_info "ブランチ: $CURRENT_BRANCH"
    
    check_prerequisites
    
    # Vercel環境変数の取得（エラーでも続行）
    if fetch_vercel_env; then
        transfer_env_file
    else
        log_warn "Vercel環境変数の取得に失敗しましたが、デプロイを続行します"
        log_warn "VM上で既存の.envファイルまたはデフォルト設定が使用されます"
    fi
    
    deploy_to_vm
    
    # 外部IPアドレス取得と表示
    if [ "$DRY_RUN" = "true" ]; then
        log_dry_run "外部IPアドレス取得"
        log_dry_run "実行予定コマンド: gcloud compute instances describe で外部IP取得"
        EXTERNAL_IP="[DRY_RUN_MODE]"
    else
        EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME \
            --zone=$ZONE \
            --format='get(networkInterfaces[0].accessConfigs[0].natIP)' \
            --project=$PROJECT_ID)
    fi
    
    log_info "✅ デプロイメント完了!"
    log_info ""
    log_info "=============================="
    log_info "アクセス情報:"
    log_info "=============================="
    log_info "アクセスURL: http://$EXTERNAL_IP:8080"
    log_info "ヘルスチェック: http://$EXTERNAL_IP:8080/health"
    log_info ""
    log_info "=============================="
    log_info "管理コマンド:"
    log_info "=============================="
    log_info "SSH接続:"
    log_info "  gcloud compute ssh $DEPLOY_USER@$INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID"
    log_info ""
    log_info "環境変数設定:"
    log_info "  nano $REMOTE_PATH/apps/proxyServer/.env"
    log_info ""
    log_info "アプリ管理:"
    log_info "  pm2 restart tumiki-proxy-server  # 再起動"
    log_info "  pm2 logs tumiki-proxy-server     # ログ表示"
    log_info "  pm2 status                       # ステータス確認"
    log_info "============================="
}

# エラーハンドリングとクリーンアップ
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "エラーが発生しました (exit code: $exit_code)"
        log_error "デプロイが失敗しました。ログを確認してください。"
    fi
}

trap cleanup EXIT ERR

# ヘルプ表示
show_help() {
    cat << EOF
Usage: ./deploy-to-gce.sh [OPTIONS]

Tumiki ProxyServer GCEデプロイメントスクリプト

このスクリプトは以下を自動実行します:
1. Vercelから本番環境の環境変数を取得 (.env.production)
2. 環境変数ファイルをVMに転送
3. GitリポジトリをVM上でクローン/更新
4. 依存関係のインストールとビルド
5. PM2でアプリケーションを起動

OPTIONS:
    -h, --help              このヘルプメッセージを表示
    --dry-run               実際の実行を行わずにコマンドを表示

前提条件:
    - gcloud CLI がインストール済み (gcloud auth login 実行済み)
    - Vercel CLI がインストール済み (vercel login 実行済み)
    - プロジェクトがVercelにリンク済み
    - VM上で初回セットアップが完了済み

環境変数:
    INSTANCE_NAME          GCEインスタンス名 (default: tumiki-instance-20250601)
    ZONE                   GCEゾーン (default: asia-northeast2-c)
    PROJECT_ID             GCPプロジェクトID (default: mcp-server-455206)
    REMOTE_PATH            デプロイ先パス (default: /opt/tumiki)
    DEPLOY_USER            デプロイユーザー (default: tumiki-deploy)
    REPO_URL               リポジトリURL (default: git@github.com:rayven122/tumiki.git)

例:
    # 通常のデプロイ
    ./deploy-to-gce.sh

    # ドライラン（実際には実行しない）
    ./deploy-to-gce.sh --dry-run
    
    # カスタムインスタンスへのデプロイ
    INSTANCE_NAME=my-instance ./deploy-to-gce.sh

    # 別のデプロイユーザーを使用
    DEPLOY_USER=production-deploy ./deploy-to-gce.sh

詳細なドキュメント:
    docs/proxy-server-deployment.md

EOF
}

# コマンドライン引数の処理
for arg in "$@"; do
    case $arg in
        -h|--help)
            show_help
            exit 0
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        *)
            log_error "不明なオプション: $arg"
            show_help
            exit 1
            ;;
    esac
done

# スクリプト実行
main "$@"
