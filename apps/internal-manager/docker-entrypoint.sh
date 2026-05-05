#!/bin/sh
# 起動時に Prisma migrate deploy を実行してから Next.js サーバーを起動する。
# - migration が失敗した場合はコンテナを起動させない（healthcheck NG → デプロイ失敗扱い）
# - Prisma 自体が advisory lock を取るため、複数レプリカ同時起動でも競合しない
# - 既存 DB を baseline 化していない環境では migrate deploy が失敗するため、
#   初回のみ手動で `prisma migrate resolve --applied <name>` が必要
set -e

echo "[entrypoint] Running prisma migrate deploy for @tumiki/internal-db..."
prisma migrate deploy --schema=/app/packages/internal-db/prisma/schema
echo "[entrypoint] Migrations applied"

exec "$@"
