# OAuth Integration Guide

## Quick Start

This guide walks you through integrating OAuth authentication into your Tumiki application, from basic setup to advanced implementation patterns.

## Prerequisites

- Auth0 account with configured social connections
- Tumiki project with authentication enabled
- Node.js >= 22.14.0
- Database with OAuth schema migrations applied

## Table of Contents

1. [Basic Integration](#basic-integration)
2. [Frontend Implementation](#frontend-implementation)
3. [Backend Implementation](#backend-implementation)
4. [MCP Server Integration](#mcp-server-integration)
5. [Advanced Patterns](#advanced-patterns)
6. [Testing](#testing)
7. [Production Checklist](#production-checklist)

## Basic Integration

### Step 1: Configure Auth0 Provider

1. Log into Auth0 Dashboard
2. Navigate to **Authentication > Social**
3. Select your provider (e.g., GitHub)
4. Configure OAuth app settings:

```javascript
// Example GitHub OAuth App Configuration
{
  "name": "Tumiki Integration",
  "homepage_url": "https://tumiki.cloud",
  "callback_url": "https://[auth0-domain]/login/callback",
  "scopes": ["read:user", "repo", "admin:org"]
}
```

### Step 2: Update Environment Variables

Add provider-specific configuration to `.env`:

```bash
# Auth0 Configuration
AUTH0_SECRET='[your-auth0-secret]'
AUTH0_BASE_URL='https://tumiki.cloud'
AUTH0_ISSUER_BASE_URL='https://[auth0-domain]'
AUTH0_CLIENT_ID='[your-client-id]'
AUTH0_CLIENT_SECRET='[your-client-secret]'
AUTH0_AUDIENCE='https://api.tumiki.cloud'

# Management API
AUTH0_MANAGEMENT_DOMAIN='[auth0-domain]'
AUTH0_MANAGEMENT_CLIENT_ID='[management-client-id]'
AUTH0_MANAGEMENT_CLIENT_SECRET='[management-client-secret]'
AUTH0_MANAGEMENT_AUDIENCE='https://[auth0-domain]/api/v2/'
```

### Step 3: Apply Database Migrations

```bash
cd packages/db
pnpm db:migrate:dev
pnpm db:push
```

## Frontend Implementation

### Basic Connection Component

```typescript
// components/oauth/ConnectProvider.tsx
import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import type { OAuthProvider } from '@tumiki/auth';

export const ConnectProvider: React.FC<{ provider: OAuthProvider }> = ({
  provider
}) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const connectMutation = trpc.oauth.startOAuthConnection.useMutation({
    onSuccess: (data) => {
      // Redirect to OAuth provider
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      console.error(`Failed to connect ${provider}:`, error);
      setIsConnecting(false);
    },
  });

  const handleConnect = () => {
    setIsConnecting(true);
    connectMutation.mutate({
      provider,
      returnTo: window.location.pathname,
    });
  };

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="btn btn-primary"
    >
      {isConnecting ? 'Connecting...' : `Connect ${provider}`}
    </button>
  );
};
```

### Connection Status Display

```typescript
// components/oauth/ConnectionStatus.tsx
import { trpc } from '@/utils/trpc';
import type { OAuthProvider } from '@tumiki/auth';

export const ConnectionStatus: React.FC<{ provider: OAuthProvider }> = ({
  provider
}) => {
  const { data: status, isLoading } = trpc.oauth.getConnectionStatus.useQuery({
    provider,
  });

  if (isLoading) return <div>Loading...</div>;

  if (!status?.connected) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-red-500">●</span>
        <span>Not connected</span>
        <ConnectProvider provider={provider} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-green-500">●</span>
      <span>Connected</span>
      {status.expiresAt && (
        <span className="text-sm text-gray-500">
          Expires: {new Date(status.expiresAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
};
```

### Provider Selection Grid

```typescript
// components/oauth/ProviderGrid.tsx
import { OAUTH_PROVIDERS } from '@tumiki/auth';
import { ConnectionStatus } from './ConnectionStatus';

const providerIcons: Record<string, string> = {
  google: '🔍',
  github: '💻',
  slack: '💬',
  notion: '📝',
  linkedin: '💼',
  figma: '🎨',
  discord: '🎮',
};

export const ProviderGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {OAUTH_PROVIDERS.map((provider) => (
        <div
          key={provider}
          className="p-4 border rounded-lg hover:shadow-md"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{providerIcons[provider]}</span>
            <h3 className="font-semibold capitalize">{provider}</h3>
          </div>
          <ConnectionStatus provider={provider} />
        </div>
      ))}
    </div>
  );
};
```

### Using Access Tokens

```typescript
// hooks/useProviderApi.ts
import { useEffect, useState } from "react";
import { trpc } from "@/utils/trpc";
import type { OAuthProvider } from "@tumiki/auth";

export const useProviderApi = (provider: OAuthProvider) => {
  const [apiClient, setApiClient] = useState<any>(null);

  const { data: token } = trpc.oauth.getProviderAccessToken.useQuery({
    provider,
  });

  useEffect(() => {
    if (!token) return;

    // Example: GitHub API client
    if (provider === "github") {
      setApiClient({
        getUser: async () => {
          const response = await fetch("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${token}` },
          });
          return response.json();
        },
        getRepos: async () => {
          const response = await fetch("https://api.github.com/user/repos", {
            headers: { Authorization: `Bearer ${token}` },
          });
          return response.json();
        },
      });
    }
  }, [token, provider]);

  return { apiClient, token };
};
```

## Backend Implementation

### Custom OAuth Router Extension

```typescript
// server/api/routers/oauth/custom.ts
import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { getProviderAccessToken } from "@tumiki/auth";

export const customOAuthRouter = createTRPCRouter({
  // Fetch user data from provider
  getProviderUserData: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["github", "google", "slack"]),
      }),
    )
    .query(async ({ input, ctx }) => {
      const token = await getProviderAccessToken(input.provider);

      if (!token) {
        throw new Error(`Not connected to ${input.provider}`);
      }

      // Provider-specific API calls
      switch (input.provider) {
        case "github":
          return fetchGitHubUser(token);
        case "google":
          return fetchGoogleProfile(token);
        case "slack":
          return fetchSlackUser(token);
        default:
          throw new Error("Unsupported provider");
      }
    }),

  // Revoke provider connection
  revokeConnection: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["github", "google", "slack"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Clear token from database
      await ctx.db.oAuthToken.deleteMany({
        where: {
          userMcpConfig: {
            userId: ctx.session.user.id,
          },
          oauthClient: {
            mcpServer: {
              name: input.provider,
            },
          },
        },
      });

      return { success: true };
    }),
});

// Helper functions
async function fetchGitHubUser(token: string) {
  const response = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

async function fetchGoogleProfile(token: string) {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.json();
}

async function fetchSlackUser(token: string) {
  const response = await fetch("https://slack.com/api/users.identity", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}
```

### Token Refresh Middleware

```typescript
// server/middleware/oauth-refresh.ts
import { NextRequest, NextResponse } from "next/server";
import { managementClient } from "@tumiki/auth";

export async function oauthRefreshMiddleware(request: NextRequest) {
  // Check if token needs refresh
  const session = await getSession(request);
  if (!session?.user?.sub) return NextResponse.next();

  const user = await managementClient.users.get({
    id: session.user.sub,
    fields: "identities",
  });

  for (const identity of user.data.identities || []) {
    if (identity.expires_in && identity.expires_in < 3600) {
      // Token expires in less than 1 hour, refresh it
      await refreshProviderToken(identity);
    }
  }

  return NextResponse.next();
}

async function refreshProviderToken(identity: any) {
  // Implementation depends on provider
  // Some providers support refresh tokens, others require re-authentication
  console.log(`Refreshing token for ${identity.connection}`);
}
```

### Webhook Handler for Token Events

```typescript
// pages/api/webhooks/oauth.ts
import { NextApiRequest, NextApiResponse } from "next";
import { verifyWebhookSignature } from "@tumiki/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Verify webhook signature
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const { event, data } = req.body;

  switch (event) {
    case "oauth.token.created":
      await handleTokenCreated(data);
      break;
    case "oauth.token.expired":
      await handleTokenExpired(data);
      break;
    case "oauth.connection.failed":
      await handleConnectionFailed(data);
      break;
    default:
      console.log(`Unhandled event: ${event}`);
  }

  res.status(200).json({ received: true });
}

async function handleTokenCreated(data: any) {
  // Log successful connection
  console.log(`User ${data.userId} connected ${data.provider}`);

  // Optional: Send notification
  await sendConnectionNotification(data.userId, data.provider);
}

async function handleTokenExpired(data: any) {
  // Mark token as invalid in database
  await db.oAuthToken.update({
    where: { id: data.tokenId },
    data: { isValid: false },
  });
}

async function handleConnectionFailed(data: any) {
  // Log failure and notify user
  console.error(`Connection failed for ${data.userId}: ${data.error}`);
  await sendFailureNotification(data.userId, data.provider, data.error);
}
```

## MCP Server Integration

### Configure OAuth for MCP Servers

```typescript
// server/mcp/oauth-config.ts
import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";

export const mcpOAuthRouter = createTRPCRouter({
  // Configure OAuth token as environment variable for MCP server
  configureTokenForMcp: protectedProcedure
    .input(
      z.object({
        mcpServerId: z.string(),
        provider: z.enum(["github", "notion", "figma"]),
        envVarName: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Get provider token
      const token = await getProviderAccessToken(input.provider);

      if (!token) {
        throw new Error(`No ${input.provider} token available`);
      }

      // Save to MCP server environment variables
      await ctx.db.userMcpServerConfig.update({
        where: {
          id: input.mcpServerId,
        },
        data: {
          environmentVariables: {
            upsert: {
              where: {
                configId_name: {
                  configId: input.mcpServerId,
                  name: input.envVarName,
                },
              },
              create: {
                name: input.envVarName,
                value: token, // Will be encrypted automatically
                description: `OAuth token for ${input.provider}`,
              },
              update: {
                value: token,
              },
            },
          },
        },
      });

      return { success: true };
    }),

  // List available tokens for MCP configuration
  getAvailableTokens: protectedProcedure.query(async ({ ctx }) => {
    const connections = await Promise.all(
      ["github", "notion", "figma"].map(async (provider) => {
        const connected = await checkOAuthConnection(provider);
        return { provider, connected };
      }),
    );

    return connections.filter((c) => c.connected);
  }),
});
```

### MCP Server Token Usage

```typescript
// mcp-servers/github-tool/index.ts
import { McpServer } from "@modelcontextprotocol/sdk";

const server = new McpServer({
  name: "github-tool",
  version: "1.0.0",
});

server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "github_create_issue",
        description: "Create a GitHub issue",
        inputSchema: {
          type: "object",
          properties: {
            repo: { type: "string" },
            title: { type: "string" },
            body: { type: "string" },
          },
          required: ["repo", "title"],
        },
      },
    ],
  };
});

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  // Get OAuth token from environment variable
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GitHub token not configured");
  }

  if (name === "github_create_issue") {
    const response = await fetch(
      `https://api.github.com/repos/${args.repo}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: args.title,
          body: args.body,
        }),
      },
    );

    const issue = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Created issue #${issue.number}: ${issue.title}`,
        },
      ],
    };
  }
});

server.start();
```

## Advanced Patterns

### Automatic Token Rotation

```typescript
// services/oauth/token-rotation.ts
import { CronJob } from "cron";
import { db } from "@tumiki/db";
import { refreshProviderToken } from "@tumiki/auth";

// Run every hour
const tokenRotationJob = new CronJob("0 * * * *", async () => {
  const expiringTokens = await db.oAuthToken.findMany({
    where: {
      isValid: true,
      expiresAt: {
        lte: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      },
    },
    include: {
      oauthClient: true,
    },
  });

  for (const token of expiringTokens) {
    try {
      if (token.refreshToken) {
        const newToken = await refreshProviderToken(
          token.oauthClient,
          token.refreshToken,
        );

        await db.oAuthToken.update({
          where: { id: token.id },
          data: {
            accessToken: newToken.access_token,
            expiresAt: new Date(Date.now() + newToken.expires_in * 1000),
            refreshCount: token.refreshCount + 1,
          },
        });
      }
    } catch (error) {
      console.error(`Failed to refresh token ${token.id}:`, error);

      await db.oAuthToken.update({
        where: { id: token.id },
        data: {
          isValid: false,
          lastError: error.message,
          lastErrorAt: new Date(),
        },
      });
    }
  }
});

tokenRotationJob.start();
```

### Multi-Provider Data Aggregation

```typescript
// services/oauth/data-aggregator.ts
import { getProviderAccessToken } from "@tumiki/auth";

interface AggregatedUserData {
  profiles: Record<string, any>;
  repositories: any[];
  documents: any[];
  designs: any[];
}

export async function aggregateUserData(
  userId: string,
): Promise<AggregatedUserData> {
  const data: AggregatedUserData = {
    profiles: {},
    repositories: [],
    documents: [],
    designs: [],
  };

  // Fetch from multiple providers in parallel
  const [githubData, notionData, figmaData] = await Promise.allSettled([
    fetchGitHubData(userId),
    fetchNotionData(userId),
    fetchFigmaData(userId),
  ]);

  if (githubData.status === "fulfilled") {
    data.profiles.github = githubData.value.profile;
    data.repositories = githubData.value.repos;
  }

  if (notionData.status === "fulfilled") {
    data.profiles.notion = notionData.value.profile;
    data.documents = notionData.value.pages;
  }

  if (figmaData.status === "fulfilled") {
    data.profiles.figma = figmaData.value.profile;
    data.designs = figmaData.value.files;
  }

  return data;
}

async function fetchGitHubData(userId: string) {
  const token = await getProviderAccessToken("github");
  if (!token) throw new Error("GitHub not connected");

  const [profile, repos] = await Promise.all([
    fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()),
    fetch("https://api.github.com/user/repos", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()),
  ]);

  return { profile, repos };
}

// Similar implementations for fetchNotionData and fetchFigmaData
```

### Conditional Feature Access

```typescript
// components/features/ConditionalFeature.tsx
import { trpc } from '@/utils/trpc';
import type { OAuthProvider } from '@tumiki/auth';

interface ConditionalFeatureProps {
  requiredProvider: OAuthProvider;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ConditionalFeature: React.FC<ConditionalFeatureProps> = ({
  requiredProvider,
  children,
  fallback,
}) => {
  const { data: status } = trpc.oauth.getConnectionStatus.useQuery({
    provider: requiredProvider,
  });

  if (!status?.connected) {
    return (
      fallback || (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p>This feature requires {requiredProvider} connection.</p>
          <ConnectProvider provider={requiredProvider} />
        </div>
      )
    );
  }

  return <>{children}</>;
};

// Usage
<ConditionalFeature requiredProvider="github">
  <GitHubRepositories />
</ConditionalFeature>
```

## Testing

### Unit Tests

```typescript
// __tests__/oauth/oauth-service.test.ts
import { describe, test, expect, vi } from "vitest";
import { getProviderAccessToken, checkOAuthConnection } from "@tumiki/auth";

describe("OAuth Service", () => {
  test("getProviderAccessToken returns token for connected provider", async () => {
    // Mock Auth0 Management API
    vi.mock("@tumiki/auth/clients", () => ({
      managementClient: {
        users: {
          get: vi.fn().mockResolvedValue({
            data: {
              identities: [
                {
                  connection: "github",
                  access_token: "mock-github-token",
                },
              ],
            },
          }),
        },
      },
    }));

    const token = await getProviderAccessToken("github");
    expect(token).toBe("mock-github-token");
  });

  test("checkOAuthConnection returns false for unconnected provider", async () => {
    vi.mock("@tumiki/auth/clients", () => ({
      managementClient: {
        users: {
          get: vi.fn().mockResolvedValue({
            data: { identities: [] },
          }),
        },
      },
    }));

    const connected = await checkOAuthConnection("slack");
    expect(connected).toBe(false);
  });
});
```

### Integration Tests

```typescript
// __tests__/oauth/oauth-flow.integration.test.ts
import { describe, test, expect } from "vitest";
import { createTestClient } from "@/test/utils";

describe("OAuth Flow Integration", () => {
  test("complete OAuth connection flow", async () => {
    const client = await createTestClient();

    // Start OAuth connection
    const { authUrl } = await client.oauth.startOAuthConnection.mutate({
      provider: "github",
    });

    expect(authUrl).toContain("github.com/login/oauth/authorize");
    expect(authUrl).toContain("client_id=");
    expect(authUrl).toContain("state=");
    expect(authUrl).toContain("scope=");
  });

  test("retrieve token after connection", async () => {
    const client = await createTestClient({
      user: {
        identities: [
          {
            connection: "github",
            access_token: "test-token",
          },
        ],
      },
    });

    const token = await client.oauth.getProviderAccessToken.query({
      provider: "github",
    });

    expect(token).toBe("test-token");
  });
});
```

### E2E Tests

```typescript
// e2e/oauth-connection.spec.ts
import { test, expect } from "@playwright/test";

test.describe("OAuth Connection", () => {
  test("user can connect GitHub account", async ({ page }) => {
    // Login to application
    await page.goto("/login");
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "password");
    await page.click('button[type="submit"]');

    // Navigate to connections page
    await page.goto("/settings/connections");

    // Click connect GitHub
    await page.click("text=Connect github");

    // Should redirect to GitHub OAuth page
    await expect(page).toHaveURL(/github\.com\/login\/oauth/);

    // Simulate OAuth callback
    await page.goto("/settings/connections?oauth_success=github");

    // Should show connected status
    await expect(page.locator("text=Connected")).toBeVisible();
  });
});
```

## Production Checklist

### Security

- [ ] Enable PKCE for all OAuth flows
- [ ] Implement token encryption at rest
- [ ] Set up token rotation schedule
- [ ] Configure rate limiting for API endpoints
- [ ] Enable audit logging for OAuth events
- [ ] Implement IP allowlisting for sensitive operations

### Performance

- [ ] Cache tokens appropriately
- [ ] Implement connection pooling
- [ ] Set up token prefetching for active users
- [ ] Configure CDN for OAuth callback pages
- [ ] Optimize database indexes for token queries

### Monitoring

- [ ] Set up alerts for failed connections
- [ ] Monitor token expiration rates
- [ ] Track OAuth provider availability
- [ ] Log all authorization events
- [ ] Monitor rate limit usage

### Compliance

- [ ] Review data retention policies
- [ ] Implement user consent flows
- [ ] Set up data export capabilities
- [ ] Configure GDPR compliance features
- [ ] Document data processing activities

### Deployment

- [ ] Verify environment variables
- [ ] Test OAuth flows in staging
- [ ] Set up rollback procedures
- [ ] Configure health checks
- [ ] Document recovery procedures

## Troubleshooting

### Common Issues and Solutions

| Issue                     | Solution                                    |
| ------------------------- | ------------------------------------------- |
| "No access token found"   | User needs to connect provider first        |
| "Token expired"           | Implement automatic token refresh           |
| "Invalid state parameter" | Session expired, restart OAuth flow         |
| "Insufficient scopes"     | Request additional scopes during connection |
| "Rate limit exceeded"     | Implement caching and request batching      |
| "Provider unavailable"    | Add retry logic with exponential backoff    |

### Debug Mode

Enable debug logging for OAuth operations:

```typescript
// utils/oauth-debug.ts
export const enableOAuthDebug = () => {
  if (process.env.NODE_ENV === "development") {
    window.addEventListener("oauth:event", (event: CustomEvent) => {
      console.group(`🔐 OAuth Event: ${event.detail.type}`);
      console.log("Provider:", event.detail.provider);
      console.log("Data:", event.detail.data);
      console.groupEnd();
    });
  }
};
```

### Support Resources

- [Auth0 Documentation](https://auth0.com/docs)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [Provider-Specific Docs](#provider-specific-documentation)
- [Tumiki Support](mailto:support@tumiki.cloud)
