# ========================================
# Tumiki Manager - Cloud Run Dockerfile
# ========================================
# Multi-stage build for optimized production image
# Context: Project root (for monorepo support)

# ========================================
# Stage 1: Base
# ========================================
FROM node:22-alpine AS base

# corepack で pnpm を有効化（バージョンは package.json の packageManager フィールドに従う）
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# ========================================
# Stage 2: Dependencies
# ========================================
FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY .npmrc ./

# 各パッケージの package.json をコピー（pnpm install のワークスペース解決に必要）
COPY packages/db/package.json ./packages/db/
COPY packages/keycloak/package.json ./packages/keycloak/
COPY packages/mailer/package.json ./packages/mailer/
COPY packages/oauth-token-manager/package.json ./packages/oauth-token-manager/
COPY packages/slack/package.json ./packages/slack/
COPY tooling/typescript/package.json ./tooling/typescript/
COPY tooling/tailwind/package.json ./tooling/tailwind/
COPY tooling/eslint/package.json ./tooling/eslint/
COPY tooling/prettier/package.json ./tooling/prettier/
COPY tooling/vitest/package.json ./tooling/vitest/
COPY apps/manager/package.json ./apps/manager/

# Prisma の postinstall スクリプトに必要な設定とスキーマ
COPY packages/db/prisma.config.ts ./packages/db/
COPY packages/db/prisma ./packages/db/prisma

# Prisma postinstall 用のダミー DATABASE_URL（実際の接続には使用されない）
RUN echo "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder" > .env

# Python MCP インストールをスキップ
ENV CI=true

RUN pnpm install --frozen-lockfile --prod=false

# ========================================
# Stage 3: Build
# ========================================
FROM dependencies AS build

COPY tooling/typescript ./tooling/typescript
COPY tooling/tailwind ./tooling/tailwind
COPY packages/db ./packages/db
COPY packages/keycloak ./packages/keycloak
COPY packages/mailer ./packages/mailer
COPY packages/oauth-token-manager ./packages/oauth-token-manager
COPY packages/slack ./packages/slack
COPY apps/manager ./apps/manager

# 依存関係の順序に従ってビルド
WORKDIR /app/packages/db
RUN pnpm db:generate && pnpm build

WORKDIR /app/packages/keycloak
RUN pnpm build

WORKDIR /app/packages/mailer
RUN pnpm build

WORKDIR /app/packages/oauth-token-manager
RUN pnpm build

WORKDIR /app/packages/slack
RUN pnpm build

# Next.js standalone モードでビルド
WORKDIR /app/apps/manager
RUN pnpm with-env next build

# ========================================
# Stage 4: Production
# ========================================
FROM node:22-alpine AS production

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
