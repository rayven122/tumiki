# syntax=docker/dockerfile:1.7

# ========================================
# Tumiki Internal Manager - Dockerfile
# ========================================
# Multi-stage build for optimized production image
# Context: Project root (for monorepo support)

# ========================================
# Stage 1: Base
# ========================================
FROM node:24-alpine AS base

# corepack で pnpm を有効化（バージョンは package.json の packageManager フィールドに従う）
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# ========================================
# Stage 2: Build
# ========================================
FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY patches ./patches
COPY .npmrc ./
COPY tooling ./tooling
COPY packages/db ./packages/db
COPY packages/internal-db ./packages/internal-db
COPY packages/keycloak ./packages/keycloak
COPY packages/ui ./packages/ui
COPY apps/internal-manager ./apps/internal-manager

# .env.example をダミー値として利用（packages/db の dotenv 読み込み用）
COPY .env.example .env

ENV CI=true

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --prod=false

# internal-manager 依存パッケージのみを順序解決してビルド
RUN pnpm turbo run build --filter=@tumiki/internal-manager^...

# Next.js standalone モードでビルド（build:bare はinfisical不使用）
RUN pnpm --filter @tumiki/internal-manager run build:bare

# saml-jackson が動的 import で jose / openid-client を読み込む際、Node.js は node_modules/<pkg> を探す。
# pnpm の standalone コピーは .pnpm 仮想ストア形式になるためルートリンクが作られない。
# 相対パスで symlink を作成して、production stage へ COPY 後も解決できるようにする。
# openid-client@6 は実装内部で oauth4webapi を動的 import するため、oauth4webapi も同様に symlink する。
# パッケージが見つからない場合はビルドを失敗させ、壊れた symlink が staging まで届かないようにする。
RUN cd /app/apps/internal-manager/.next/standalone/node_modules && \
    jose_pkg=$(ls .pnpm/ | grep '^jose@' | sort -V | tail -1) && \
    [ -n "$jose_pkg" ] || { echo "ERROR: jose package not found in .pnpm/"; exit 1; } && \
    ln -s ".pnpm/${jose_pkg}/node_modules/jose" jose && \
    oidc_pkg=$(ls .pnpm/ | grep '^openid-client@' | sort -V | tail -1) && \
    [ -n "$oidc_pkg" ] || { echo "ERROR: openid-client package not found in .pnpm/"; exit 1; } && \
    ln -s ".pnpm/${oidc_pkg}/node_modules/openid-client" openid-client && \
    o4w_pkg=$(ls .pnpm/ | grep '^oauth4webapi@' | sort -V | tail -1) && \
    [ -n "$o4w_pkg" ] || { echo "ERROR: oauth4webapi package not found in .pnpm/"; exit 1; } && \
    ln -s ".pnpm/${o4w_pkg}/node_modules/oauth4webapi" oauth4webapi

# ========================================
# Stage 3: Production
# ========================================
FROM node:24-alpine AS production

# dumb-init: シグナル伝播、wget: ヘルスチェック
RUN apk add --no-cache dumb-init wget

# Prisma CLI（起動時 migrate deploy 用）
# - standalone build には devDependency の prisma が含まれないため global install
# - バージョンは packages/internal-db の prisma と揃える
RUN npm install -g prisma@6.19.0 && npm cache clean --force

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# standalone 出力（node_modules と server.js を含む）
COPY --from=build --chown=nodejs:nodejs /app/apps/internal-manager/.next/standalone/ ./

# 静的アセット
COPY --from=build --chown=nodejs:nodejs /app/apps/internal-manager/.next/static ./apps/internal-manager/.next/static
COPY --from=build --chown=nodejs:nodejs /app/apps/internal-manager/public ./apps/internal-manager/public

# Prisma schema（起動時 migrate deploy で参照）
COPY --from=build --chown=nodejs:nodejs /app/packages/internal-db/prisma ./packages/internal-db/prisma

# Entrypoint（起動時に prisma migrate deploy → node server.js）
COPY --chown=nodejs:nodejs apps/internal-manager/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nodejs

ENV NODE_ENV=production
ENV PORT=3100
ENV HOSTNAME=0.0.0.0

EXPOSE 3100

# migration 実行のため start_period を 30s → 60s に延長
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/api/health || exit 1

ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "apps/internal-manager/server.js"]
