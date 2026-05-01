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
COPY packages/ui ./packages/ui
COPY apps/tenant-console ./apps/tenant-console

COPY .env.example .env

ENV CI=true

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --prod=false

RUN pnpm turbo run build --filter=@tumiki/tenant-console^...

# Next.js のビルドは "Collecting page data" フェーズで route handler を実行する。
# /api/health から db.ts → env.ts が読まれ TENANT_DATABASE_URL が必須になるため、
# ビルド専用のダミー値を渡す（実行時は Infisical Operator が同期した値で上書きされる）。
ENV TENANT_DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm --filter @tumiki/tenant-console run build:bare

# ========================================
# Stage 3: Production
# ========================================
FROM node:24-alpine AS production

# helm/kubectl: テナントプロビジョニング用、dumb-init: シグナル伝播、wget: ヘルスチェック
# バージョン固定 + SHA256チェックサム検証（サプライチェーン攻撃対策）
ENV HELM_VERSION=3.20.2
ENV KUBECTL_VERSION=1.32.3
RUN apk add --no-cache dumb-init wget curl && \
    curl -fsSL "https://get.helm.sh/helm-v${HELM_VERSION}-linux-amd64.tar.gz" -o helm.tar.gz && \
    echo "258e830a9e613c8a7a302d6059b4bb3b9758f2f3e1bb8ea0d707ce10a9a72fea  helm.tar.gz" | sha256sum -c - && \
    tar -zxf helm.tar.gz linux-amd64/helm && \
    mv linux-amd64/helm /usr/local/bin/helm && \
    rm -rf linux-amd64 helm.tar.gz && \
    curl -fsSL "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl" -o /usr/local/bin/kubectl && \
    echo "ab209d0c5134b61486a0486585604a616a5bb2fc07df46d304b3c95817b2d79f  /usr/local/bin/kubectl" | sha256sum -c - && \
    chmod +x /usr/local/bin/kubectl && \
    rm -rf /var/cache/apk/*

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=build --chown=nodejs:nodejs /app/apps/tenant-console/.next/standalone/ ./
COPY --from=build --chown=nodejs:nodejs /app/apps/tenant-console/.next/static ./apps/tenant-console/.next/static
COPY --from=build --chown=nodejs:nodejs /app/apps/tenant-console/public ./apps/tenant-console/public

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
