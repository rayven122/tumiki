# syntax=docker/dockerfile:1.7

# ========================================
# Tumiki Cloud API - Dockerfile
# ========================================
# Multi-stage build for optimized production image
# Context: Project root (for monorepo support)

# ========================================
# Stage 1: Base
# ========================================
FROM node:24-alpine AS base

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
COPY apps/tumiki-cloud-api ./apps/tumiki-cloud-api

ENV CI=true

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --prod=false

RUN pnpm turbo run build --filter=@tumiki/tumiki-cloud-api^...
RUN pnpm --filter @tumiki/tumiki-cloud-api run build

# 本番依存のみ抽出（dist と node_modules 用）
RUN pnpm --filter @tumiki/tumiki-cloud-api deploy --prod /prod/tumiki-cloud-api

# ========================================
# Stage 3: Production
# ========================================
FROM node:24-alpine AS production

# dumb-init: シグナル伝播、wget: ヘルスチェック
RUN apk add --no-cache dumb-init wget

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=build --chown=nodejs:nodejs /prod/tumiki-cloud-api/dist ./dist
COPY --from=build --chown=nodejs:nodejs /prod/tumiki-cloud-api/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /prod/tumiki-cloud-api/package.json ./package.json

USER nodejs

ENV NODE_ENV=production
ENV PORT=8443

EXPOSE 8443

# /health エンドポイント（mTLS 不要のヘルスチェックパス）
# 本番では NODE_ENV=production ガードで TLS 必須となるため HTTPS のみで検査する
# 自己ヘルスチェック用に --no-check-certificate を使用（証明書の検証は外部から行う）
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --no-check-certificate --spider \
    "https://localhost:${PORT}/health" || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/index.js"]
