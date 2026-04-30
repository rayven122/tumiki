# syntax=docker/dockerfile:1.7

# ========================================
# Tumiki Hosting Console - Dockerfile
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
COPY packages/db ./packages/db
COPY packages/tenant-db ./packages/tenant-db
COPY packages/ui ./packages/ui
COPY apps/tenant-console ./apps/tenant-console

COPY .env.example .env

ENV CI=true

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --prod=false

RUN pnpm turbo run build --filter=@tumiki/tenant-console^...

RUN pnpm --filter @tumiki/tenant-console run build:bare

# ========================================
# Stage 3: Production
# ========================================
FROM node:24-alpine AS production

# helm: テナントプロビジョニング用、dumb-init: シグナル伝播、wget: ヘルスチェック
RUN apk add --no-cache dumb-init wget curl bash && \
    curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash && \
    rm -rf /var/cache/apk/*

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=build --chown=nodejs:nodejs /app/apps/tenant-console/.next/standalone/ ./
COPY --from=build --chown=nodejs:nodejs /app/apps/tenant-console/.next/static ./apps/tenant-console/.next/static
COPY --from=build --chown=nodejs:nodejs /app/apps/tenant-console/public ./apps/tenant-console/public 2>/dev/null || true

# Helm chart を同梱（テナントデプロイ用）
COPY --chown=nodejs:nodejs infra/k3s/helm/internal-manager ./helm/internal-manager

USER nodejs

ENV NODE_ENV=production
ENV PORT=3200
ENV HOSTNAME=0.0.0.0

EXPOSE 3200

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3200/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/tenant-console/server.js"]
