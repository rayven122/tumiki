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
set +x

export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

TUMIKI_DIR="${TUMIKI_DIR:-$HOME/tumiki}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.production.yaml}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"
readonly RECONCILE_COUNT_EXCLUDE_PATTERN="^watchtower$"
WATCHTOWER_RECONCILE_GRACE_SEC="${WATCHTOWER_RECONCILE_GRACE_SEC:-120}"

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
NEW_ENV_SORTED="$(mktemp --tmpdir tumiki-env-sorted.XXXXXX)"
CURRENT_ENV_SORTED="$(mktemp --tmpdir tumiki-current-env-sorted.XXXXXX)"
trap 'rm -f "$NEW_ENV" "$NEW_ENV_SORTED" "$CURRENT_ENV_SORTED" "$LOCK_FILE"' EXIT

# === 認証 ===
# Universal Auth の Client ID / Secret は環境変数から読み込ませる。
# TOKEN は export しない bash 変数として保持し、infisical export の子プロセスにだけ渡す。
TOKEN="$(timeout 30 infisical login \
  --method=universal-auth \
  --domain="$INFISICAL_API_URL" \
  --plain --silent)"
if [[ -z "$TOKEN" ]]; then
  echo "infisical login returned empty token; aborting" >&2
  exit 1
fi

# === シークレット取得 ===
# Machine Identity の場合 --projectId が必須。
# inline env は ps 引数への漏洩を防ぐが、子プロセスの /proc/PID/environ には短時間現れる。
INFISICAL_TOKEN="$TOKEN" timeout 30 infisical export \
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
sort "$NEW_ENV" > "$NEW_ENV_SORTED"
if [[ -f "$ENV_FILE" ]]; then
  sort "$ENV_FILE" > "$CURRENT_ENV_SORTED"
fi
if [[ ! -f "$ENV_FILE" ]] || ! cmp -s "$NEW_ENV_SORTED" "$CURRENT_ENV_SORTED"; then
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

list_unhealthy_services() {
  docker compose -f "$COMPOSE_FILE" ps --status running -q \
    | xargs -r docker inspect --format '{{ index .Config.Labels "com.docker.compose.service" }} {{ if .State.Health }}{{ .State.Health.Status }}{{ end }}' \
    | awk -v exclude="$RECONCILE_COUNT_EXCLUDE_PATTERN" '$1 !~ exclude && $2 == "unhealthy" { print $1 }'
}

count_expected_services() {
  docker compose -f "$COMPOSE_FILE" config --services \
    | awk -v exclude="$RECONCILE_COUNT_EXCLUDE_PATTERN" '$0 !~ exclude && /^[a-z0-9_-]+$/ { count++ } END { print count + 0 }'
}

RUNNING=$(count_running_services)
EXPECTED=$(count_expected_services)
UNHEALTHY_SERVICES="$(list_unhealthy_services)"
UNHEALTHY_COUNT="$(printf "%s\n" "$UNHEALTHY_SERVICES" | awk 'NF { count++ } END { print count + 0 }')"

if [[ "$EXPECTED" -eq 0 ]]; then
  echo "ERROR: docker compose config returned 0 services; aborting" >&2
  exit 1
fi

if [[ "$RUNNING" -lt "$EXPECTED" ]]; then
  # Watchtower の更新中は一時的に running 数が減るため、猶予内で段階的に再確認する。
  ELAPSED=0
  while [[ "$RUNNING" -lt "$EXPECTED" && "$ELAPSED" -lt "$WATCHTOWER_RECONCILE_GRACE_SEC" ]]; do
    sleep 10
    ELAPSED=$((ELAPSED + 10))
    RUNNING=$(count_running_services)
  done
  RUNNING=$(count_running_services)
  UNHEALTHY_SERVICES="$(list_unhealthy_services)"
  UNHEALTHY_COUNT="$(printf "%s\n" "$UNHEALTHY_SERVICES" | awk 'NF { count++ } END { print count + 0 }')"
fi

if [[ "$DIFF" -eq 1 || "$RUNNING" -lt "$EXPECTED" || "$UNHEALTHY_COUNT" -gt 0 ]]; then
  if [[ "$DIFF" -eq 0 && "$RUNNING" -ge "$EXPECTED" && "$UNHEALTHY_COUNT" -gt 0 ]]; then
    readarray -t UNHEALTHY_SERVICE_ARRAY <<< "$UNHEALTHY_SERVICES"
    for SERVICE in "${UNHEALTHY_SERVICE_ARRAY[@]}"; do
      if [[ ! "$SERVICE" =~ ^[a-z0-9_-]+$ ]]; then
        echo "ERROR: unexpected docker compose service name: $SERVICE" >&2
        exit 1
      fi
    done
    docker compose -f "$COMPOSE_FILE" restart "${UNHEALTHY_SERVICE_ARRAY[@]}"
  fi
  if [[ "$DIFF" -eq 1 || "$RUNNING" -lt "$EXPECTED" ]]; then
    docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
  fi
  echo "compose reconciled (diff=$DIFF, running=${RUNNING}/${EXPECTED}, unhealthy=${UNHEALTHY_COUNT})"
fi
