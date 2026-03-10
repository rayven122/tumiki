<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/images/logo.svg">
  <img alt="Tumiki Logo" src="docs/images/logo.svg" width="80">
</picture>

# Tumiki

**An AI integration platform that connects your AI agents with business tools**

[![CI](https://github.com/rayven122/tumiki/actions/workflows/ci.yml/badge.svg)](https://github.com/rayven122/tumiki/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.14.0-green)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.11.0-orange)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Discord](https://img.shields.io/badge/Discord-Join%20us-7289da?logo=discord&logoColor=white)](https://discord.com/invite/gp9SetUmGe)

[日本語版はこちら](README.ja.md)

---

<p align="center">
  <img src="docs/images/screenshot.png" alt="Tumiki Dashboard" width="800">
</p>

## Overview

Tumiki is an AI integration platform that uses MCP (Model Context Protocol) to connect AI with your business tools, transforming it into a digital employee that understands your company's unique context and workflows.

Manage multiple SaaS tools and AI agents in one place, improving team productivity. Centralized MCP server management dramatically simplifies complex configuration work.

## What is MCP?

**MCP (Model Context Protocol)** is an open standard that allows AI assistants to securely connect with your business tools.

Think of it like this: Just as USB connects your devices to your computer, MCP connects AI to your apps like Notion, Slack, and Google Calendar.

## Key Features

| Feature                            | Description                                                          |
| ---------------------------------- | -------------------------------------------------------------------- |
| **Connect AI with Business Tools** | Seamlessly integrate your AI with various business tools             |
| **Control Roles and Permissions**  | Manage access control with fine-grained role and permission settings |
| **Centralized Tool Integration**   | Manage all your tool integrations from a single, unified dashboard   |
| **Visualize Activity Logs**        | Track and analyze all activities with comprehensive logging          |
| **Secure Operation**               | Enterprise-level security for safe management of confidential data   |
| **Fast Setup**                     | Build your AI agent team environment in minutes with no expertise    |

## Awards & Recognition

### 🏆 NEDO GenIAC Prize 2025

Tumiki was awarded the [**NEDO GenIAC Prize**](https://geniac-prize.nedo.go.jp/) in **Category 03: AI Safety** (October 2025).

> _"A practical and immediately effective proposal that could become the foundation for standard technology supporting safe AI utilization in enterprises."_
>
> — GenIAC Prize Review Committee

**Proposal:** "Integrated Risk Countermeasures through MCP Server Security Enhancement and AI Permission Control"

### 📜 Patent

**Japan Patent No. 7731114** — "Information Processing System Management System"

- **Patentee:** RAYVEN Inc.
- **Filed:** April 9, 2025
- **Registered:** August 21, 2025
- **PCT Application:** Filed (International patent pending)

This patent covers the core MCP management infrastructure technology used in Tumiki.

## Project Structure

Tumiki is a monorepo managed with [Turborepo](https://turbo.build/repo) and [pnpm workspaces](https://pnpm.io/workspaces).

```
tumiki/
├── apps/
│   ├── manager/          # Web dashboard (Next.js 15 + React 19)
│   ├── mcp-proxy/        # MCP Proxy server (Hono)
│   └── desktop/          # Desktop application (Tauri + Electron)
├── packages/
│   ├── db/               # Database layer (Prisma ORM + Field Encryption)
│   ├── oauth-token-manager/  # OAuth token management
│   ├── keycloak/         # Keycloak integration utilities
│   ├── mailer/           # Email service
│   ├── slack/            # Slack integration
│   └── scripts/          # Shared build scripts
├── docker/               # Docker Compose configurations
└── terraform/            # Infrastructure as Code (Keycloak)
```

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Agents                                 │
│              (Claude, GPT, Custom Agents, etc.)                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ MCP Protocol
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Proxy Server                            │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│    │   Router    │  │   Auth      │  │   Logging   │            │
│    └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │  Slack  │          │  Notion │          │   ...   │
   └─────────┘          └─────────┘          └─────────┘
                    Business Tools
```

## Getting Started

### For Users (SaaS)

Contact us for SaaS access.

### For Developers

#### Prerequisites

- Node.js >= 22.14.0
- pnpm 10.11.0
- Docker

#### Quick Start

```bash
# Clone the repository
git clone https://github.com/rayven122/tumiki.git
cd tumiki

# Install dependencies
pnpm install

# Start Docker containers (PostgreSQL, Redis, Keycloak)
pnpm docker:up

# Set up development environment (first time only)
pnpm setup:dev

# Start development servers
pnpm dev
```

For detailed setup instructions, see [docs/SETUP.md](./docs/SETUP.md).

### Available Scripts

```bash
# Development
pnpm dev              # Start all development servers
pnpm build            # Build all packages and apps
pnpm test             # Run tests
pnpm typecheck        # TypeScript type checking
pnpm lint             # Run ESLint
pnpm format           # Check code formatting

# Docker
pnpm docker:up        # Start containers
pnpm docker:down      # Stop and remove containers
pnpm docker:logs      # View container logs

# Database
cd packages/db
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio
```

## Tech Stack

### Frontend

- [Next.js 15](https://nextjs.org) - React 19 + App Router
- [tRPC](https://trpc.io) - Type-safe API
- [Tailwind CSS](https://tailwindcss.com) - CSS Framework
- [Radix UI](https://www.radix-ui.com/) - UI Component Library

### Backend

- [Hono](https://hono.dev) - Web Framework
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP SDK
- [Keycloak](https://www.keycloak.org) - Authentication & Authorization

### Database & Infrastructure

- [PostgreSQL](https://postgresql.org) - Primary Database
- [Prisma](https://prisma.io) - ORM + Field Encryption
- [Redis](https://redis.io) - Cache & Session Management
- [Turbo](https://turbo.build/repo) - Monorepo Build System

## Documentation

- [Setup Guide](./docs/SETUP.md) - Detailed setup instructions
- [Environment Variables](./docs/environment-variables.md) - Configuration reference
- [Manager Architecture](./docs/architecture/manager-features-architecture.md) - Feature-based architecture guide

## Community

- [Discord](https://discord.com/invite/gp9SetUmGe) - Join our community for discussions and support
- [GitHub Issues](https://github.com/rayven122/tumiki/issues) - Bug reports and feature requests

## License

This project is dual-licensed:

- **MIT License** - For most of the codebase. See [LICENSE](LICENSE) for details.
- **Elastic License v2.0 (ELv2)** - For Enterprise Edition features (files with `.ee.ts` extension). See [LICENSE.EE](LICENSE.EE) for details.

## Support

If you find Tumiki useful, please consider giving it a ⭐ on GitHub!

For enterprise support and custom integrations, please reach out on [Discord](https://discord.com/invite/gp9SetUmGe).
