#!/usr/bin/env bash
# Infisical Universal Auth で prod シークレットを取得し ~/tumiki/.env を更新する。
# 差分があった場合のみ docker compose up -d で影響を受けるコンテナを recreate する。
#
# 必要な環境変数（systemd の EnvironmentFile=/etc/infisical/agent.env 経由で注入）:
#   INFISICAL_UNIVERSAL_AUTH_CLIENT_ID      Machine Identity の Client ID
#   INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET  Machine Identity の Client Secret
#   INFISICAL_API_URL                       Self-hosted Infisical のドメイン
#   INFISICAL_PROJECT_ID                    プロジェクト UUID
set -euo pipefail

export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

TUMIKI_DIR="${TUMIKI_DIR:-$HOME/tumiki}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.production.yaml}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
RECONCILE_COUNT_EXCLUDE_PATTERN="${RECONCILE_COUNT_EXCLUDE_PATTERN:-^watchtower$}"
WATCHTOWER_RECONCILE_GRACE_SEC="${WATCHTOWER_RECONCILE_GRACE_SEC:-60}"

: "${INFISICAL_UNIVERSAL_AUTH_CLIENT_ID:?env not set}"
: "${INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET:?env not set}"
: "${INFISICAL_API_URL:?env not set}"
: "${INFISICAL_PROJECT_ID:?env not set}"

ENV_FILE="$TUMIKI_DIR/.env"
LOCK_FILE="$TUMIKI_DIR/.tumiki-secrets-sync.lock"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another tumiki-secrets-sync instance is running; exiting"
  exit 0
fi

NEW_ENV="$(mktemp --tmpdir tumiki-env.XXXXXX)"
trap 'rm -f "$NEW_ENV"' EXIT

# === 認証 ===
# Universal Auth の Client ID / Secret は環境変数から読み込ませ、
# secret が ps /proc 等のコマンドライン引数に出ないようにする。
# TOKEN は export しない bash 変数として保持し、infisical export の子プロセスにだけ渡す。
TOKEN="$(infisical login \
  --method=universal-auth \
  --domain="$INFISICAL_API_URL" \
  --plain --silent)"

# === シークレット取得 ===
# Machine Identity の場合 --projectId が必須。Access token はプロセス引数に出さない。
INFISICAL_TOKEN="$TOKEN" infisical export \
  --env="$INFISICAL_ENV" \
  --path="$INFISICAL_PATH" \
  --format=dotenv \
  --domain="$INFISICAL_API_URL" \
  --projectId="$INFISICAL_PROJECT_ID" \
  > "$NEW_ENV"
unset TOKEN

# 空応答ガード: CLI バグや一時障害で .env を空にしてサービス停止しないようにする
if [[ ! -s "$NEW_ENV" ]]; then
  echo "infisical export returned empty output; aborting" >&2
  exit 1
fi

# === 差分検知 ===
DIFF=0
if [[ ! -f "$ENV_FILE" ]] || ! diff -q <(sort "$NEW_ENV") <(sort "$ENV_FILE") >/dev/null 2>&1; then
  install -m 600 "$NEW_ENV" "$ENV_FILE"
  DIFF=1
fi

# === コンテナ稼働確認 ===
# 差分が無くても、初期化やクラッシュでアプリコンテナが落ちていた場合に再立ち上げする。
# watchtower 自体は secrets 変更で再起動不要なため、同時実行時の過剰 reconcile を避ける。
# docker-socket-proxy は Watchtower の Docker API 経路なので停止時に復旧対象へ含める。
cd "$TUMIKI_DIR"
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: docker daemon is not running" >&2
  exit 1
fi

count_running_services() {
  docker compose -f "$COMPOSE_FILE" ps --status running --services \
    | awk -v exclude="$RECONCILE_COUNT_EXCLUDE_PATTERN" '$0 !~ exclude && NF { count++ } END { print count + 0 }'
}

count_expected_services() {
  docker compose -f "$COMPOSE_FILE" config --services \
    | awk -v exclude="$RECONCILE_COUNT_EXCLUDE_PATTERN" '$0 !~ exclude && /^[a-z0-9_-]+$/ { count++ } END { print count + 0 }'
}

RUNNING=$(count_running_services)
EXPECTED=$(count_expected_services)

if [[ "$EXPECTED" -eq 0 ]]; then
  echo "ERROR: docker compose config returned 0 services; aborting" >&2
  exit 1
fi

if [[ "$DIFF" -eq 0 && "$RUNNING" -lt "$EXPECTED" ]]; then
  # Watchtower の更新中は一時的に running 数が減るため、短く待って再確認する。
  sleep "$WATCHTOWER_RECONCILE_GRACE_SEC"
  RUNNING=$(count_running_services)
fi

if [[ "$DIFF" -eq 1 || "$RUNNING" -lt "$EXPECTED" ]]; then
  docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
  echo "compose reconciled (diff=$DIFF, running=${RUNNING}/${EXPECTED})"
fi
