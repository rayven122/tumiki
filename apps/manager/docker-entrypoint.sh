#!/bin/sh
# 起動時に Prisma migrate deploy を実行してから Next.js サーバーを起動する。
# - migration が失敗した場合はコンテナを起動させない（healthcheck NG → デプロイ失敗扱い）
# - Prisma 自体が advisory lock を取るため、複数レプリカ同時起動でも競合しない
# - 既存 DB を baseline 化していない環境では migrate deploy が失敗するため、
#   初回のみ手動で `prisma migrate resolve --applied <name>` が必要
# - CI smoke test 等の DB を持たない環境では SKIP_MIGRATE=true で migration をバイパス可能
set -e

if [ "${SKIP_MIGRATE:-false}" = "true" ]; then
  echo "[entrypoint] SKIP_MIGRATE=true, skipping prisma migrate deploy"
else
  echo "[entrypoint] Running prisma migrate deploy for @tumiki/db..."
  prisma migrate deploy --schema=/app/packages/db/prisma/schema
  echo "[entrypoint] Migrations applied"
fi

exec "$@"
