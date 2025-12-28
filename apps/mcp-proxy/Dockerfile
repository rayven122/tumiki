# ========================================
# Tumiki MCP Proxy - Cloud Run Dockerfile
# ========================================
# Multi-stage build for optimized production image
# Context: Project root (for monorepo support)

# ========================================
# Stage 1: Base
# ========================================
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# Set working directory
WORKDIR /app

# ========================================
# Stage 2: Dependencies
# ========================================
FROM base AS dependencies

# Copy dependency files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY .npmrc ./

# Copy all package.json files from packages, apps, and tooling
COPY packages/db/package.json ./packages/db/
COPY packages/oauth-token-manager/package.json ./packages/oauth-token-manager/
COPY apps/mcp-proxy/package.json ./apps/mcp-proxy/
COPY tooling/typescript/package.json ./tooling/typescript/

# Copy Prisma config and schema BEFORE install (required for postinstall script)
COPY packages/db/prisma.config.ts ./packages/db/
COPY packages/db/prisma ./packages/db/prisma

# Create a minimal .env file for Prisma (postinstall needs it but won't use the value)
RUN echo "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder" > .env

# Set CI environment variable to skip Python MCP installation
ENV CI=true

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# ========================================
# Stage 3: Build
# ========================================
FROM dependencies AS build

# Copy source code
COPY tooling/typescript ./tooling/typescript
COPY packages/db ./packages/db
COPY packages/oauth-token-manager ./packages/oauth-token-manager
COPY apps/mcp-proxy ./apps/mcp-proxy

# Build packages in correct order
WORKDIR /app/packages/db
RUN pnpm db:generate && pnpm build

# Build oauth-token-manager
WORKDIR /app/packages/oauth-token-manager
RUN pnpm build

# Build mcp-proxy
WORKDIR /app/apps/mcp-proxy
RUN pnpm build

# ========================================
# Stage 4: Production
# ========================================
FROM node:22-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# Install dumb-init and wget for proper signal handling and health checks
RUN apk add --no-cache dumb-init wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependency files
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=nodejs:nodejs .npmrc ./
COPY --chown=nodejs:nodejs packages/db/package.json ./packages/db/
COPY --chown=nodejs:nodejs packages/oauth-token-manager/package.json ./packages/oauth-token-manager/
COPY --chown=nodejs:nodejs apps/mcp-proxy/package.json ./apps/mcp-proxy/
COPY --chown=nodejs:nodejs tooling/typescript/package.json ./tooling/typescript/

# Copy Prisma config and schema BEFORE install (required for postinstall script)
COPY --from=build --chown=nodejs:nodejs /app/packages/db/prisma.config.ts ./packages/db/
COPY --from=build --chown=nodejs:nodejs /app/packages/db/prisma ./packages/db/prisma

# Create a minimal .env file for Prisma (postinstall needs it but won't use the value)
RUN echo "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder" > .env

# Set CI environment variable to skip Python MCP installation
ENV CI=true

# Install all dependencies without running scripts (to avoid network errors in postinstall)
RUN pnpm install --frozen-lockfile --prod=false --ignore-scripts

# Generate Prisma Client with retry logic to handle network errors
RUN cd packages/db && \
    for i in 1 2 3; do \
      pnpm db:generate && break || \
      (echo "Prisma generate failed (attempt $i/3), retrying..." && sleep 5); \
    done

# Remove dev dependencies to reduce image size
RUN pnpm prune --prod

# Copy built artifacts
COPY --from=build --chown=nodejs:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/oauth-token-manager/dist ./packages/oauth-token-manager/dist
COPY --from=build --chown=nodejs:nodejs /app/apps/mcp-proxy/dist ./apps/mcp-proxy/dist

# Switch to non-root user
USER nodejs

# Set working directory to mcp-proxy
WORKDIR /app/apps/mcp-proxy

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "dist/index.js"]
