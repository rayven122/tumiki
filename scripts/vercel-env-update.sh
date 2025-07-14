#!/bin/bash

# =============================================================================
# Vercel 環境変数一括更新スクリプト（開発環境専用）
# =============================================================================
#
# .envファイルの内容でVercelの開発環境の環境変数を上書き更新するスクリプトです。
#
# 使用方法:
#   ./scripts/vercel-env-update.sh [ENV_FILE]
#
# 例:
#   ./scripts/vercel-env-update.sh .env
#   ./scripts/vercel-env-update.sh apps/proxyServer/.env
#
# 引数:
#   ENV_FILE - 環境変数ファイルのパス (デフォルト: .env)
#
# =============================================================================

set -euo pipefail

# 引数の取得
ENV_FILE="${1:-.env}"
ENVIRONMENT="development"  # 開発環境固定

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

# 前提条件チェック
check_prerequisites() {
    log_info "前提条件をチェックしています..."
    
    # Vercel CLI の確認
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI が見つかりません"
        log_error "以下のコマンドでインストールしてください:"
        log_error "npm install -g vercel"
        exit 1
    fi
    
    # Vercel 認証確認
    if ! vercel whoami &>/dev/null; then
        log_error "Vercel 認証が必要です"
        log_error "vercel login を実行してください"
        exit 1
    fi
    
    # 環境変数ファイルの確認
    if [ ! -f "$ENV_FILE" ]; then
        log_error "環境変数ファイル '$ENV_FILE' が見つかりません"
        exit 1
    fi
    
    log_info "✓ 前提条件をクリアしました"
}

# 既存の環境変数を削除
remove_existing_env() {
    local key="$1"
    log_info "既存の $key を削除中..."
    
    # 環境変数が存在するかチェック
    if vercel env ls "$ENVIRONMENT" 2>/dev/null | grep -q "^$key"; then
        # 既存の環境変数IDを取得して削除
        local env_id=$(vercel env ls "$ENVIRONMENT" --json 2>/dev/null | jq -r ".[] | select(.key == \"$key\") | .id" | head -1)
        if [ -n "$env_id" ] && [ "$env_id" != "null" ]; then
            if echo "y" | vercel env rm "$env_id" &>/dev/null; then
                log_info "✓ 既存の $key を削除しました"
                return 0
            else
                log_warn "✗ 既存の $key の削除に失敗しました"
                return 1
            fi
        else
            log_warn "✗ $key の環境変数IDが取得できませんでした"
            return 1
        fi
    else
        log_info "$key は存在しないため削除をスキップしました"
        return 0
    fi
}

# 環境変数をVercelに追加
add_env_variable() {
    local key="$1"
    local value="$2"
    
    log_info "$key を追加中..."
    
    if printf "%s" "$value" | vercel env add "$key" "$ENVIRONMENT" &>/dev/null; then
        log_info "✓ $key を追加しました"
        return 0
    else
        log_error "✗ $key の追加に失敗しました"
        return 1
    fi
}

# 環境変数をVercelに更新（削除→追加）
update_env_variables() {
    log_info "環境変数ファイル '$ENV_FILE' から Vercel 開発環境を更新しています..."
    
    local count=0
    local success_count=0
    local error_count=0
    
    while IFS= read -r line || [ -n "$line" ]; do
        # コメント行と空行をスキップ
        if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "$line" ]] || [[ $line =~ ^[[:space:]]*$ ]]; then
            continue
        fi
        
        # KEY=VALUE形式を解析
        if [[ $line =~ ^([^=]+)=(.*)$ ]]; then
            local key="${BASH_REMATCH[1]}"
            local value="${BASH_REMATCH[2]}"
            
            # キーと値をトリム
            key=$(echo "$key" | xargs)
            value=$(echo "$value" | sed 's/^["'\'']\|["'\'']$//g')
            
            count=$((count + 1))
            
            log_info "[$count] $key を更新中..."
            
            # 既存の環境変数を削除してから追加
            if remove_existing_env "$key" && add_env_variable "$key" "$value"; then
                log_info "✓ $key を更新しました"
                success_count=$((success_count + 1))
            else
                log_error "✗ $key の更新に失敗しました"
                error_count=$((error_count + 1))
            fi
            
            echo ""  # 区切り用の空行
        else
            log_warn "無効な形式の行をスキップしました: $line"
        fi
    done < "$ENV_FILE"
    
    # 結果の表示
    echo ""
    log_info "==============================="
    log_info "結果サマリー:"
    log_info "==============================="
    log_info "処理済み: $count 個"
    log_info "成功: $success_count 個"
    if [ $error_count -gt 0 ]; then
        log_warn "失敗: $error_count 個"
    else
        log_info "失敗: $error_count 個"
    fi
    log_info "==============================="
    
    if [ $error_count -gt 0 ]; then
        log_warn "一部の環境変数の更新に失敗しました"
        return 1
    else
        log_info "全ての環境変数の更新が完了しました"
        return 0
    fi
}

# 設定結果の確認
verify_env_variables() {
    log_info "設定された環境変数を確認しています..."
    
    echo ""
    log_info "Vercel 開発環境の環境変数一覧:"
    echo "==============================="
    vercel env ls "$ENVIRONMENT" || {
        log_warn "環境変数の一覧取得に失敗しました"
        return 1
    }
    echo "==============================="
}

# ヘルプ表示
show_help() {
    cat << EOF
使用方法: ./scripts/vercel-env-update.sh [ENV_FILE]

.envファイルの内容でVercelの開発環境の環境変数を上書き更新します。

引数:
    ENV_FILE  環境変数ファイルのパス (デフォルト: .env)

例:
    # ルートの.envファイルで開発環境を更新
    ./scripts/vercel-env-update.sh .env
    
    # ProxyServerの.envファイルで開発環境を更新
    ./scripts/vercel-env-update.sh apps/proxyServer/.env

前提条件:
    - Vercel CLI がインストール済み (npm install -g vercel)
    - Vercel 認証が完了済み (vercel login)
    - プロジェクトがVercelにリンク済み (vercel link)
    - jq コマンドがインストール済み (brew install jq)

注意事項:
    - 開発環境 (development) のみを対象とします
    - 既存の環境変数は削除されてから再作成されます（完全上書き）
    - コメント行 (#) と空行は自動的にスキップされます
    - KEY=VALUE 形式以外の行は警告と共にスキップされます

EOF
}

# メイン処理
main() {
    # ヘルプ表示
    if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
        show_help
        exit 0
    fi
    
    log_info "Vercel 開発環境変数一括更新スクリプトを開始します"
    log_info "ファイル: $ENV_FILE"
    log_info "環境: development (固定)"
    echo ""
    
    check_prerequisites
    echo ""
    
    if update_env_variables; then
        echo ""
        verify_env_variables
        echo ""
        log_info "✅ 処理が正常に完了しました!"
        exit 0
    else
        echo ""
        log_error "❌ 処理中にエラーが発生しました"
        exit 1
    fi
}

# スクリプト実行
main "$@"