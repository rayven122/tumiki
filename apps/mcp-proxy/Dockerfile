# syntax=docker/dockerfile:1.7

# ========================================
# Tumiki MCP Proxy - Cloud Run Dockerfile
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
COPY packages/license ./packages/license
COPY packages/mcp-core-proxy ./packages/mcp-core-proxy
COPY packages/oauth-token-manager ./packages/oauth-token-manager
COPY packages/prompts ./packages/prompts
COPY packages/shared ./packages/shared
COPY packages/slack ./packages/slack
COPY apps/mcp-proxy ./apps/mcp-proxy

# Prisma postinstall 用のダミー DATABASE_URL（実際の接続には使用されない）
RUN echo "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder" > .env

# Python MCP インストールをスキップ
ENV CI=true

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --prod=false

# mcp-proxy の依存に加えて、通知機能で参照する @tumiki/slack もビルド
RUN pnpm turbo run build --filter=@tumiki/mcp-proxy^... --filter=@tumiki/slack

RUN pnpm --filter @tumiki/mcp-proxy build

# Prisma Client 生成コードをステージング（Production stage でコピー）
# require.resolve で pnpm シンボリックリンクを自動解決し、@prisma/client と .prisma/client をコピー
WORKDIR /app
RUN PRISMA_DIR=$(node -e "console.log(require('path').dirname(require.resolve('@prisma/client')))") && \
    MODULES_DIR=$(dirname "$(dirname "$PRISMA_DIR")") && \
    cp -rL "$PRISMA_DIR" /prisma-client && \
    cp -rL "$MODULES_DIR/.prisma/client" /prisma-generated

# ========================================
# Stage 3: Production
# ========================================
FROM node:24-alpine AS production

# corepack で pnpm を有効化（本番依存関係のインストールに必要）
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# dumb-init: シグナル伝播、wget: ヘルスチェック
RUN apk add --no-cache dumb-init wget

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=nodejs:nodejs .npmrc ./
COPY --chown=nodejs:nodejs packages/db/package.json ./packages/db/
COPY --chown=nodejs:nodejs packages/license/package.json ./packages/license/
COPY --chown=nodejs:nodejs packages/mcp-core-proxy/package.json ./packages/mcp-core-proxy/
COPY --chown=nodejs:nodejs packages/oauth-token-manager/package.json ./packages/oauth-token-manager/
COPY --chown=nodejs:nodejs packages/prompts/package.json ./packages/prompts/
COPY --chown=nodejs:nodejs packages/shared/package.json ./packages/shared/
COPY --chown=nodejs:nodejs packages/slack/package.json ./packages/slack/
COPY --chown=nodejs:nodejs apps/mcp-proxy/package.json ./apps/mcp-proxy/
COPY --chown=nodejs:nodejs tooling/typescript/package.json ./tooling/typescript/

# Prisma postinstall 用のダミー DATABASE_URL（実際の接続には使用されない）
RUN echo "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder" > .env

# Python MCP インストールをスキップ
ENV CI=true

# 本番依存関係のみインストール（postinstall スクリプトをスキップ）
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# ビルドステージの Prisma Client を配置
# @prisma/client（ランタイム）と .prisma/client（生成コード）の両方が必要
COPY --from=build /prisma-client /prisma-client
COPY --from=build /prisma-generated /prisma-generated
RUN DEST=$(find node_modules/.pnpm -path '*/@prisma+client@*/node_modules' -type d | head -1) && \
    if [ -z "$DEST" ]; then echo "Error: @prisma/client not found in pnpm store" && exit 1; fi && \
    cp -r /prisma-client/* "$DEST/@prisma/client/" && \
    mkdir -p "$DEST/.prisma" && \
    cp -r /prisma-generated "$DEST/.prisma/client" && \
    rm -rf /prisma-client /prisma-generated

# ビルド成果物
COPY --from=build --chown=nodejs:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/license/dist ./packages/license/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/mcp-core-proxy/dist ./packages/mcp-core-proxy/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/oauth-token-manager/dist ./packages/oauth-token-manager/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/prompts/dist ./packages/prompts/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/slack/dist ./packages/slack/dist
COPY --from=build --chown=nodejs:nodejs /app/apps/mcp-proxy/dist ./apps/mcp-proxy/dist

USER nodejs

WORKDIR /app/apps/mcp-proxy

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/index.js"]
