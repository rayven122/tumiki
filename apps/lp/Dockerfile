# syntax=docker/dockerfile:1.7

# ========================================
# Tumiki LP - Dockerfile
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
COPY patches ./patches
COPY .npmrc ./
COPY tooling ./tooling
COPY apps/lp ./apps/lp

COPY .env.example .env

ENV CI=true

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --prod=false

RUN pnpm --filter @tumiki/lp run build

# ========================================
# Stage 3: Production
# ========================================
FROM node:24-alpine AS production

RUN apk add --no-cache dumb-init wget

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=build --chown=nodejs:nodejs /app/apps/lp/.next/standalone/ ./
COPY --from=build --chown=nodejs:nodejs /app/apps/lp/.next/static ./apps/lp/.next/static
COPY --from=build --chown=nodejs:nodejs /app/apps/lp/public ./apps/lp/public

USER nodejs

ENV NODE_ENV=production
ENV PORT=3200
ENV HOSTNAME=0.0.0.0

EXPOSE 3200

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3200/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/lp/server.js"]
