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

TUMIKI_DIR="${TUMIKI_DIR:-$HOME/tumiki}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.production.yaml}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"

: "${INFISICAL_UNIVERSAL_AUTH_CLIENT_ID:?env not set}"
: "${INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET:?env not set}"
: "${INFISICAL_API_URL:?env not set}"
: "${INFISICAL_PROJECT_ID:?env not set}"

ENV_FILE="$TUMIKI_DIR/.env"
NEW_ENV="$(mktemp --tmpdir tumiki-env.XXXXXX)"
trap 'rm -f "$NEW_ENV"' EXIT

# === 認証 ===
# Universal Auth の Client ID / Secret は環境変数から読み込ませ、
# secret が ps /proc 等のコマンドライン引数に出ないようにする。
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
if ! cmp -s "$NEW_ENV" "$ENV_FILE" 2>/dev/null; then
  install -m 600 "$NEW_ENV" "$ENV_FILE"
  DIFF=1
fi

# === コンテナ稼働確認 ===
# 差分が無くても、初期化やクラッシュでアプリコンテナが落ちていた場合に再立ち上げする。
# watchtower 自体は secrets 変更で再起動不要なため、同時実行時の過剰 reconcile を避ける。
cd "$TUMIKI_DIR"
RUNNING=$(docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null \
  | awk '$0 != "watchtower" && NF { count++ } END { print count + 0 }')
EXPECTED=$(docker compose -f "$COMPOSE_FILE" config --services 2>/dev/null \
  | awk '$0 != "watchtower" && /^[A-Za-z0-9_.-]+$/ { count++ } END { print count + 0 }')

if [[ "$EXPECTED" -eq 0 ]]; then
  echo "ERROR: docker compose config returned 0 services; aborting" >&2
  exit 1
fi

if [[ "$DIFF" -eq 1 || "$RUNNING" -lt "$EXPECTED" ]]; then
  docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
  echo "compose reconciled (diff=$DIFF, running=${RUNNING}/${EXPECTED})"
fi
