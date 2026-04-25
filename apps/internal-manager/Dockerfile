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
COPY .npmrc ./
COPY tooling ./tooling
COPY packages/db ./packages/db
COPY packages/internal-db ./packages/internal-db
COPY packages/keycloak ./packages/keycloak
COPY packages/ui ./packages/ui
COPY apps/internal-manager ./apps/internal-manager

# Prisma postinstall と next build 用のダミー環境変数（実際の接続には使用されない）
RUN printf '%s\n' \
  "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder" \
  "INTERNAL_DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder" \
  "PRISMA_FIELD_ENCRYPTION_KEY=k1.aesgcm256.FkhfY-sKgaYBJYteXBGudV6g_oBOW1TjU74hbowUl8s=" \
  "OIDC_CLIENT_ID=dummy-oidc-client-id" \
  "OIDC_CLIENT_SECRET=dummy-oidc-client-secret" \
  "OIDC_ISSUER=https://dummy.oidc.local" \
  "AUTH_SECRET=dummy-auth-secret-do-not-use-in-production" \
  > .env

ENV CI=true

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --prod=false

# internal-manager 依存パッケージのみを順序解決してビルド
RUN pnpm turbo run build --filter=@tumiki/internal-manager^...

# Next.js standalone モードでビルド
RUN pnpm --filter @tumiki/internal-manager with-env next build --webpack

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
