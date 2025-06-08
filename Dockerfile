# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/manager/package.json ./apps/manager/
COPY tooling/ ./tooling/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/manager/package.json ./apps/manager/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/apps/manager/.next ./apps/manager/.next
COPY --from=builder /app/apps/manager/public ./apps/manager/public
COPY --from=builder /app/apps/manager/next.config.js ./apps/manager/
COPY --from=builder /app/apps/manager/prisma ./apps/manager/prisma

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app/apps/manager

CMD ["pnpm", "start"]