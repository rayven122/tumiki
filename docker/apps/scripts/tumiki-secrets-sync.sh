#!/usr/bin/env bash
# Infisical から prod シークレットを取得して ~/tumiki/.env を更新する。
# 差分があった場合のみ docker compose を再起動する。
#
# 前提: 実行ユーザーが事前に `infisical login` を完了していること。
# 配置: /usr/local/bin/tumiki-secrets-sync または任意のパス。systemd timer から呼ばれる。
set -euo pipefail

# ===== 設定 =====
TUMIKI_DIR="${TUMIKI_DIR:-$HOME/tumiki}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.production.yaml}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_PATH="${INFISICAL_PATH:-/}"

ENV_FILE="$TUMIKI_DIR/.env"
NEW_ENV="$(mktemp --tmpdir tumiki-env.XXXXXX)"
trap 'rm -f "$NEW_ENV"' EXIT

# ===== シークレット取得 =====
# `infisical login` 済みのセッションを利用。失敗したら timer 単発の終了コードで通知。
infisical export \
  --env="$INFISICAL_ENV" \
  --path="$INFISICAL_PATH" \
  --format=dotenv \
  > "$NEW_ENV"

# 空ファイルが書き込まれた場合は安全側に倒して中断（誤って .env を空にしない）
if [[ ! -s "$NEW_ENV" ]]; then
  echo "infisical export returned empty output; aborting" >&2
  exit 1
fi

# ===== 差分検知 =====
if cmp -s "$NEW_ENV" "$ENV_FILE" 2>/dev/null; then
  # 変更なし: 何もしない（compose の状態は維持）
  exit 0
fi

# ===== 反映 =====
install -m 600 "$NEW_ENV" "$ENV_FILE"
cd "$TUMIKI_DIR"
# up -d は env 変更を検知したコンテナだけ recreate する
docker compose -f "$COMPOSE_FILE" up -d
echo "secrets synced and compose updated"
