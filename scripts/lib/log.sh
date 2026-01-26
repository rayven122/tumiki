#!/usr/bin/env bash
# 共通ログ関数ライブラリ
# 使用方法: source "$(dirname "$0")/lib/log.sh"

# 色定義
readonly LOG_RED='\033[0;31m'
readonly LOG_GREEN='\033[0;32m'
readonly LOG_YELLOW='\033[1;33m'
readonly LOG_NC='\033[0m' # No Color

# ログ関数
log_info() { echo -e "${LOG_GREEN}[INFO]${LOG_NC} $1"; }
log_warn() { echo -e "${LOG_YELLOW}[WARN]${LOG_NC} $1"; }
log_error() { echo -e "${LOG_RED}[ERROR]${LOG_NC} $1" >&2; }

# 環境変数チェックヘルパー
# 使用例: check_required_vars "VAR1" "VAR2" "VAR3"
check_required_vars() {
  local missing=()

  for var in "$@"; do
    if [[ -z "${!var:-}" ]]; then
      missing+=("$var")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    log_error "必須環境変数が設定されていません:"
    for var in "${missing[@]}"; do
      echo "  - $var" >&2
    done
    return 1
  fi
  return 0
}
