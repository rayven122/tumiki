<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/images/logo.svg">
  <img alt="Tumiki Logo" src="docs/images/logo.svg" width="80">
</picture>

# Tumiki

**An AI integration platform that connects your AI agents with business tools**

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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Some files are licensed under the Elastic License v2.0 (ELv2). See [LICENSE.EE](LICENSE.EE) for details.

## Support

- [GitHub Issues](https://github.com/rayven122/tumiki/issues) - Bug reports and feature requests
