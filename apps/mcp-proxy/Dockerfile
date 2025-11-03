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

# Copy all package.json files from packages and apps
COPY packages/db/package.json ./packages/db/
COPY apps/mcp-proxy/package.json ./apps/mcp-proxy/

# Copy Prisma config and schema BEFORE install (required for postinstall script)
COPY packages/db/prisma.config.ts ./packages/db/
COPY packages/db/prisma ./packages/db/prisma

# Create a minimal .env file for Prisma (postinstall needs it but won't use the value)
RUN echo "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder" > .env

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# ========================================
# Stage 3: Build
# ========================================
FROM dependencies AS build

# Copy source code
COPY packages/db ./packages/db
COPY apps/mcp-proxy ./apps/mcp-proxy

# Build packages in correct order
WORKDIR /app/packages/db
RUN pnpm db:generate && pnpm build

# Build mcp-proxy
WORKDIR /app/apps/mcp-proxy
RUN pnpm build

# ========================================
# Stage 4: Production
# ========================================
FROM node:22-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependency files
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=nodejs:nodejs .npmrc ./
COPY --chown=nodejs:nodejs packages/db/package.json ./packages/db/
COPY --chown=nodejs:nodejs apps/mcp-proxy/package.json ./apps/mcp-proxy/

# Copy Prisma config and schema BEFORE install (required for postinstall script)
COPY --from=build --chown=nodejs:nodejs /app/packages/db/prisma.config.ts ./packages/db/
COPY --from=build --chown=nodejs:nodejs /app/packages/db/prisma ./packages/db/prisma

# Create a minimal .env file for Prisma (postinstall needs it but won't use the value)
RUN echo "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder" > .env

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=build --chown=nodejs:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/db/node_modules/.prisma ./packages/db/node_modules/.prisma
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
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "dist/index.js"]
