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
: "${INFISICAL_PROJECT_ID:?env not set}"

ENV_FILE="$TUMIKI_DIR/.env"
NEW_ENV="$(mktemp --tmpdir tumiki-env.XXXXXX)"
trap 'rm -f "$NEW_ENV"' EXIT

# === 認証 ===
# Universal Auth で access token を取得（短命だが本スクリプト実行内で使い切る）。
TOKEN="$(infisical login \
  --method=universal-auth \
  --client-id="$INFISICAL_UNIVERSAL_AUTH_CLIENT_ID" \
  --client-secret="$INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET" \
  --plain --silent)"

# === シークレット取得 ===
# Machine Identity の場合 --projectId が必須。
infisical export \
  --env="$INFISICAL_ENV" \
  --path="$INFISICAL_PATH" \
  --format=dotenv \
  --projectId="$INFISICAL_PROJECT_ID" \
  --token="$TOKEN" \
  > "$NEW_ENV"

# 空応答ガード: CLI バグや一時障害で .env を空にしてサービス停止しないようにする
if [[ ! -s "$NEW_ENV" ]]; then
  echo "infisical export returned empty output; aborting" >&2
  exit 1
fi

# === 差分検知 ===
if cmp -s "$NEW_ENV" "$ENV_FILE" 2>/dev/null; then
  exit 0
fi

# === 反映 ===
install -m 600 "$NEW_ENV" "$ENV_FILE"
cd "$TUMIKI_DIR"
docker compose -f "$COMPOSE_FILE" up -d
echo "secrets synced and compose updated"
