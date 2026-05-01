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

# saml-jackson が動的 import で jose を読み込む際、Node.js は node_modules/jose を探す。
# pnpm の standalone コピーは .pnpm 仮想ストア形式になるためルートリンクが作られない。
# 相対パスで symlink を作成して、production stage へ COPY 後も解決できるようにする。
RUN cd /app/apps/internal-manager/.next/standalone/node_modules && \
    jose_pkg=$(ls .pnpm/ | grep '^jose@' | head -1) && \
    ln -s ".pnpm/${jose_pkg}/node_modules/jose" jose

# ========================================
# Stage 3: Production
# ========================================
FROM node:24-alpine AS production

# dumb-init: シグナル伝播、wget: ヘルスチェック
RUN apk add --no-cache dumb-init wget

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# standalone 出力（node_modules と server.js を含む）
COPY --from=build --chown=nodejs:nodejs /app/apps/internal-manager/.next/standalone/ ./

# 静的アセット
COPY --from=build --chown=nodejs:nodejs /app/apps/internal-manager/.next/static ./apps/internal-manager/.next/static
COPY --from=build --chown=nodejs:nodejs /app/apps/internal-manager/public ./apps/internal-manager/public

USER nodejs

ENV NODE_ENV=production
ENV PORT=3100
ENV HOSTNAME=0.0.0.0

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/internal-manager/server.js"]
