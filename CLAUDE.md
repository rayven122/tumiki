# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tumiki** is an MCP (Model Context Protocol) server management system built as a Next.js web application with a Node.js proxy server. It provides centralized management for multiple MCP servers, API key management, and unified access URLs for MCP clients.

## Architecture

### Monorepo Structure
- `apps/manager/` - Next.js web application (port 3000) with tRPC API, NextAuth, and Prisma
- `apps/proxyServer/` - Express/Hono MCP proxy server (port 8080) handling MCP protocol communication
- `packages/db/` - Shared Prisma database package with multi-schema architecture
- `tooling/` - Shared ESLint, Prettier, Tailwind, and TypeScript configurations

### Technology Stack
- **Frontend**: Next.js 15 + React 19 + App Router + tRPC + Tailwind CSS + Radix UI
- **Backend**: Express/Hono + MCP SDK + SSE for real-time communication
- **Database**: PostgreSQL + Prisma with field encryption and Neon adapter
- **Auth**: NextAuth.js with Google/GitHub OAuth
- **AI**: Vercel AI SDK with multiple providers

## Development Commands

### Core Development
```bash
pnpm dev                  # Start all applications in watch mode
pnpm build               # Build all applications  
pnpm start               # Start production servers
```

### Code Quality
```bash
pnpm lint                # ESLint across all packages
pnpm lint:fix            # Auto-fix ESLint issues
pnpm format              # Check Prettier formatting
pnpm format:fix          # Auto-format with Prettier
pnpm typecheck           # TypeScript type checking
pnpm check               # Run all quality checks (lint + format + typecheck)
```

### Database Management
```bash
cd apps/manager
pnpm db:migrate          # Run database migrations
pnpm db:deploy           # Deploy migrations to production
pnpm db:studio           # Open Prisma Studio
pnpm db:generate         # Generate Prisma client and Zod schemas
```

### Docker Deployment
```bash
# Development with self-signed SSL
docker compose -f ./docker/compose.dev.yaml up -d

# Production with Let's Encrypt SSL  
docker compose -f ./docker/compose.prod.yaml up -d
```

## Key Architecture Patterns

### Database Schema Organization
The Prisma schema is split across multiple files:
- `base.prisma` - Core configuration and generators
- `nextAuth.prisma` - Authentication tables
- `mcpServer.prisma` - MCP server definitions and tools
- `userMcpServer.prisma` - User-specific server configurations
- `organization.prisma` - Multi-tenant organization support
- `chat.prisma` - Chat/messaging functionality

### API Architecture
- **tRPC Routers**: Located in `apps/manager/src/server/api/routers/`
- **MCP Proxy**: Handles MCP protocol communication via SSE in `apps/proxyServer/`
- **Type Safety**: Full-stack type safety with automatic API generation

### Security Features
- Field-level encryption for sensitive data (API keys, tokens)
- OAuth authentication with Google/GitHub
- Role-based access control
- JWT session management

## Important Notes

### Environment Variables
Required variables include `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `NODE_ENV`.

### Package Management
Uses pnpm workspaces with Node.js >=22.14.0 and pnpm@10.11.0.

### Testing and Quality
Always run `pnpm check` before committing to ensure code quality. TypeScript strict mode is enforced across all packages.