# syntax=docker/dockerfile:1.7

# ========================================
# Tumiki Manager - Cloud Run Dockerfile
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
COPY .npmrc ./
COPY tooling ./tooling
COPY packages/db ./packages/db
COPY packages/keycloak ./packages/keycloak
COPY packages/mailer ./packages/mailer
COPY packages/oauth-token-manager ./packages/oauth-token-manager
COPY packages/slack ./packages/slack
COPY packages/license ./packages/license
COPY packages/prompts ./packages/prompts
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY apps/manager ./apps/manager

# .env.example をダミー値として利用
# - /app/.env: packages/db の dotenv 読み込み用
# - apps/manager/.env: Next.js が PRISMA_FIELD_ENCRYPTION_KEY 等を process.env に読み込む用
COPY .env.example .env
COPY .env.example apps/manager/.env

# Python MCP インストールをスキップ
ENV CI=true

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --prod=false

# manager 依存パッケージのみを順序解決してビルド
RUN pnpm turbo run build --filter=@tumiki/manager^...

# Next.js standalone モードでビルド
# NEXT_PUBLIC_TUMIKI_EDITION はnext.config.jsより前に解決されるためプロセス環境変数として渡す
RUN NEXT_PUBLIC_TUMIKI_EDITION=ee pnpm --filter @tumiki/manager run build:bare

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
COPY --from=build --chown=nodejs:nodejs /app/apps/manager/.next/standalone/ ./

# 静的アセット
COPY --from=build --chown=nodejs:nodejs /app/apps/manager/.next/static ./apps/manager/.next/static
COPY --from=build --chown=nodejs:nodejs /app/apps/manager/public ./apps/manager/public

USER nodejs

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/manager/server.js"]
