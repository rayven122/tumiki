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
# Stage 2: Dependencies
# ========================================
FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY .npmrc ./

# 各パッケージの package.json をコピー（pnpm install のワークスペース解決に必要）
COPY packages/db/package.json ./packages/db/
COPY packages/oauth-token-manager/package.json ./packages/oauth-token-manager/
COPY apps/mcp-proxy/package.json ./apps/mcp-proxy/
COPY tooling/typescript/package.json ./tooling/typescript/

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
COPY packages/db ./packages/db
COPY packages/oauth-token-manager ./packages/oauth-token-manager
COPY apps/mcp-proxy ./apps/mcp-proxy

# 依存関係の順序に従ってビルド
WORKDIR /app/packages/db
RUN pnpm db:generate && pnpm build

WORKDIR /app/packages/oauth-token-manager
RUN pnpm build

WORKDIR /app/apps/mcp-proxy
RUN pnpm build

# ========================================
# Stage 4: Production
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
COPY --chown=nodejs:nodejs packages/oauth-token-manager/package.json ./packages/oauth-token-manager/
COPY --chown=nodejs:nodejs apps/mcp-proxy/package.json ./apps/mcp-proxy/
COPY --chown=nodejs:nodejs tooling/typescript/package.json ./tooling/typescript/

# Prisma postinstall 用のダミー DATABASE_URL（実際の接続には使用されない）
RUN echo "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder" > .env

# Python MCP インストールをスキップ
ENV CI=true

# 本番依存関係のみインストール（postinstall スクリプトをスキップ）
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# ビルド済み Prisma Client をコピー（ネットワーク依存の再生成を回避）
COPY --from=build --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=nodejs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

# ビルド成果物
COPY --from=build --chown=nodejs:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/oauth-token-manager/dist ./packages/oauth-token-manager/dist
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
