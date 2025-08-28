# OAuth API Reference

## Table of Contents

- [Core Types](#core-types)
- [tRPC API Endpoints](#trpc-api-endpoints)
- [OAuth Service Functions](#oauth-service-functions)
- [Error Types](#error-types)
- [Database Models](#database-models)

## Core Types

### OAuthProvider

Supported OAuth providers enumeration.

```typescript
type OAuthProvider =
  | "google"
  | "github"
  | "slack"
  | "notion"
  | "linkedin"
  | "figma"
  | "discord";
```

### OAuthConfig

Configuration interface for OAuth operations.

```typescript
interface OAuthConfig {
  provider: OAuthProvider;
  scopes: string[];
  returnTo?: string;
}
```

### Provider Connection Mapping

Maps providers to Auth0 connection names.

```typescript
const PROVIDER_CONNECTIONS = {
  google: "google-oauth2",
  github: "github",
  slack: "sign-in-with-slack",
  notion: "Notion",
  linkedin: "linkedin",
  figma: "figma",
  discord: "discord",
} as const;
```

## tRPC API Endpoints

### oauth.startOAuthConnection

Initiates OAuth authorization flow for a specified provider.

#### Endpoint Details

- **Type**: `mutation`
- **Protection**: `protectedProcedure` (requires authentication)
- **Path**: `/api/trpc/oauth.startOAuthConnection`

#### Input Schema

```typescript
{
  provider: OAuthProvider;  // Required: Provider to connect
  returnTo?: string;        // Optional: URL to return after auth
  scopes?: string[];        // Optional: Additional scopes to request
}
```

#### Response

```typescript
{
  authUrl: string; // Authorization URL for redirect
  sessionId: string; // Session ID for tracking auth flow
  expiresAt: Date; // Session expiration time
}
```

#### Example Usage

```typescript
const mutation = trpc.oauth.startOAuthConnection.useMutation();

const handleConnect = async () => {
  const result = await mutation.mutateAsync({
    provider: "github",
    returnTo: "/dashboard",
    scopes: ["repo", "read:user"],
  });

  // Redirect user to OAuth provider
  window.location.href = result.authUrl;
};
```

### oauth.getProviderAccessToken

Retrieves the access token for an authenticated provider.

#### Endpoint Details

- **Type**: `query`
- **Protection**: `protectedProcedure`
- **Path**: `/api/trpc/oauth.getProviderAccessToken`

#### Input Schema

```typescript
{
  provider: OAuthProvider; // Required: Provider to get token for
}
```

#### Response

```typescript
string | null; // Access token or null if not connected
```

#### Example Usage

```typescript
const { data: token } = trpc.oauth.getProviderAccessToken.useQuery({
  provider: "github",
});

if (token) {
  // Use token for API calls
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
```

### oauth.getConnectionStatus

Checks the connection status for a specific provider.

#### Endpoint Details

- **Type**: `query`
- **Protection**: `protectedProcedure`
- **Path**: `/api/trpc/oauth.getConnectionStatus`

#### Input Schema

```typescript
{
  provider: OAuthProvider; // Required: Provider to check
}
```

#### Response

```typescript
{
  connected: boolean;       // Connection status
  provider: OAuthProvider;  // Provider name
  expiresAt?: Date;        // Token expiration (if connected)
  lastError?: string;      // Last error message (if any)
  scopes?: string[];       // Authorized scopes (if connected)
}
```

#### Example Usage

```typescript
const { data: status } = trpc.oauth.getConnectionStatus.useQuery({
  provider: "slack",
});

// Display connection status
if (status?.connected) {
  console.log(`Connected to ${status.provider}`);
  if (status.expiresAt) {
    console.log(`Token expires: ${status.expiresAt}`);
  }
}
```

### oauth.saveTokenToEnvVars

Saves OAuth token to environment variables for MCP server usage.

#### Endpoint Details

- **Type**: `mutation`
- **Protection**: `protectedProcedure`
- **Path**: `/api/trpc/oauth.saveTokenToEnvVars`

#### Input Schema

```typescript
{
  provider: OAuthProvider;   // Required: Provider token source
  envVarName: string;        // Required: Environment variable name
  mcpServerId: string;       // Required: Target MCP server ID
  overwrite?: boolean;       // Optional: Overwrite existing value
}
```

#### Response

```typescript
{
  success: boolean;         // Operation status
  envVarName: string;       // Environment variable name
  mcpServerId: string;      // MCP server ID
  message?: string;         // Success/error message
}
```

#### Example Usage

```typescript
const mutation = trpc.oauth.saveTokenToEnvVars.useMutation();

const saveToken = async () => {
  const result = await mutation.mutateAsync({
    provider: "github",
    envVarName: "GITHUB_TOKEN",
    mcpServerId: "mcp_server_123",
    overwrite: true,
  });

  if (result.success) {
    console.log(`Token saved to ${result.envVarName}`);
  }
};
```

## OAuth Service Functions

### getUserIdentityProviderTokens

Retrieves OAuth tokens from Auth0 user identities.

#### Function Signature

```typescript
async function getUserIdentityProviderTokens(
  userId: string,
  provider: OAuthProvider,
): Promise<string | null>;
```

#### Parameters

- `userId` (string): Auth0 user ID
- `provider` (OAuthProvider): Target provider

#### Returns

- `string | null`: Access token or null if not found

#### Throws

- `OAuthError`: With code `CONNECTION_FAILED` on API errors

#### Implementation Location

`packages/auth/src/oauth.ts:26-50`

### getProviderAccessToken

High-level function to retrieve provider access token with session validation.

#### Function Signature

```typescript
async function getProviderAccessToken(
  provider: OAuthProvider,
  request?: NextRequest,
): Promise<string | null>;
```

#### Parameters

- `provider` (OAuthProvider): Target provider
- `request` (NextRequest, optional): HTTP request for session extraction

#### Returns

- `string | null`: Access token or null if not connected

#### Throws

- `OAuthError`: With appropriate error code
  - `UNAUTHORIZED`: No valid session
  - `NO_ACCESS_TOKEN`: Provider not connected
  - `UNKNOWN_ERROR`: Unexpected errors

#### Implementation Location

`packages/auth/src/oauth.ts:58-87`

### checkOAuthConnection

Verifies if a provider is connected for the current session.

#### Function Signature

```typescript
async function checkOAuthConnection(
  provider: OAuthProvider,
  request?: NextRequest,
): Promise<boolean>;
```

#### Parameters

- `provider` (OAuthProvider): Provider to check
- `request` (NextRequest, optional): HTTP request for session

#### Returns

- `boolean`: true if connected, false otherwise

#### Implementation Location

`packages/auth/src/oauth.ts:118-137`

### startOAuthFlow

Initiates OAuth authorization flow through Auth0.

#### Function Signature

```typescript
async function startOAuthFlow(
  provider: OAuthProvider,
  scopes: string[],
  returnTo?: string,
): Promise<{ authUrl: string }>;
```

#### Parameters

- `provider` (OAuthProvider): Target provider
- `scopes` (string[]): OAuth scopes to request
- `returnTo` (string, optional): Return URL after auth

#### Returns

```typescript
{
  authUrl: string; // Authorization URL for redirect
}
```

#### Implementation Location

`packages/auth/src/oauth.ts:89-116`

### isValidOAuthProvider

Type guard to validate OAuth provider strings.

#### Function Signature

```typescript
function isValidOAuthProvider(provider: string): provider is OAuthProvider;
```

#### Parameters

- `provider` (string): Provider string to validate

#### Returns

- `boolean`: Type predicate for OAuthProvider

#### Implementation Location

`packages/auth/src/providers.ts:34-38`

## Error Types

### OAuthError

Custom error class for OAuth operations.

```typescript
class OAuthError extends Error {
  name: "OAuthError";
  code: OAuthErrorCode;
  provider?: OAuthProvider;
  originalError?: unknown;
}
```

### OAuthErrorCode

Error code enumeration for OAuth operations.

```typescript
enum OAuthErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED", // No valid session
  NO_ACCESS_TOKEN = "NO_ACCESS_TOKEN", // Provider not connected
  CONNECTION_FAILED = "CONNECTION_FAILED", // API/Network failure
  INVALID_PROVIDER = "INVALID_PROVIDER", // Unsupported provider
  TOKEN_EXPIRED = "TOKEN_EXPIRED", // Access token expired
  REFRESH_FAILED = "REFRESH_FAILED", // Token refresh failed
  INVALID_STATE = "INVALID_STATE", // OAuth state mismatch
  PKCE_FAILED = "PKCE_FAILED", // PKCE validation failed
  UNKNOWN_ERROR = "UNKNOWN_ERROR", // Unexpected error
}
```

### createOAuthError

Factory function for creating OAuth errors.

```typescript
function createOAuthError(
  code: OAuthErrorCode,
  provider?: OAuthProvider,
  originalError?: unknown,
): OAuthError;
```

## Database Models

### OAuthClient

Stores OAuth client registration information.

```prisma
model OAuthClient {
  id                      String    @id @default(cuid())
  mcpServerId            String    // Related MCP server

  // Client credentials (encrypted)
  clientId               String    /// @encrypted
  clientSecret           String?   /// @encrypted
  registrationAccessToken String?   /// @encrypted
  registrationClientUri  String?

  // OAuth endpoints
  authorizationServerUrl String
  tokenEndpoint         String
  authorizationEndpoint String
  registrationEndpoint  String?
  jwksUri              String?
  revocationEndpoint   String?
  introspectionEndpoint String?

  // Resource information
  protectedResourceUrl  String?
  resourceIndicator    String?

  // Configuration
  scopes               String[]
  grantTypes          String[]
  responseTypes       String[]
  tokenEndpointAuthMethod String @default("client_secret_basic")
  redirectUris        String[]

  // Metadata
  applicationName     String?
  applicationUri      String?
  logoUri            String?
  contactEmail       String?

  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  // Relations
  mcpServer          McpServer   @relation(...)
  oauthTokens        OAuthToken[]

  @@unique([mcpServerId])
  @@index([clientId])
}
```

### OAuthToken

Manages user-specific OAuth tokens.

```prisma
model OAuthToken {
  id                String    @id @default(cuid())
  userMcpConfigId   String    // User's MCP configuration
  oauthClientId     String    // OAuth client reference

  // Tokens (encrypted)
  accessToken       String    /// @encrypted
  refreshToken      String?   /// @encrypted
  idToken          String?   /// @encrypted

  // Token metadata
  tokenType        String    @default("Bearer")
  scope           String?
  expiresAt       DateTime?
  refreshExpiresAt DateTime?

  // PKCE/Session data (encrypted)
  state           String?   /// @encrypted
  nonce          String?   /// @encrypted
  codeVerifier   String?   /// @encrypted
  codeChallenge  String?
  codeChallengeMethod String? @default("S256")

  // Status tracking
  isValid        Boolean   @default(true)
  lastUsedAt     DateTime?
  refreshCount   Int       @default(0)

  // Error tracking
  lastError      String?
  lastErrorAt    DateTime?

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relations
  userMcpConfig  UserMcpServerConfig @relation(...)
  oauthClient    OAuthClient         @relation(...)

  @@unique([userMcpConfigId])
  @@index([oauthClientId])
  @@index([expiresAt])
}
```

### OAuthSession

Temporary storage for OAuth authorization flow.

```prisma
model OAuthSession {
  id                  String    @id @default(cuid())
  sessionId          String    @unique
  userId             String    // User performing auth
  mcpServerId        String    // Target MCP server

  // PKCE parameters (encrypted)
  codeVerifier       String    /// @encrypted
  codeChallenge      String
  codeChallengeMethod String    @default("S256")

  // Session data (encrypted)
  state              String    /// @encrypted
  nonce             String?   /// @encrypted
  redirectUri        String

  // Configuration
  requestedScopes    String[]

  // Status
  status            String    @default("pending")
  // Values: pending, completed, failed, expired

  // Error information
  errorCode         String?
  errorDescription  String?

  // Timestamps
  expiresAt         DateTime
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  user              User      @relation(...)

  @@index([sessionId])
  @@index([state])
  @@index([expiresAt])
}
```

## HTTP Response Codes

| Code | Description         | Scenario                         |
| ---- | ------------------- | -------------------------------- |
| 200  | Success             | Query executed successfully      |
| 201  | Created             | OAuth session created            |
| 400  | Bad Request         | Invalid provider or parameters   |
| 401  | Unauthorized        | No valid session                 |
| 403  | Forbidden           | Insufficient permissions         |
| 404  | Not Found           | Token or session not found       |
| 409  | Conflict            | Session already exists           |
| 500  | Server Error        | Internal server error            |
| 502  | Bad Gateway         | Auth0 API error                  |
| 503  | Service Unavailable | Provider temporarily unavailable |

## Rate Limits

### API Endpoints

- `startOAuthConnection`: 10 requests per minute per user
- `getProviderAccessToken`: 60 requests per minute per user
- `getConnectionStatus`: 100 requests per minute per user
- `saveTokenToEnvVars`: 20 requests per minute per user

### Auth0 Management API

- User profile reads: 1000 requests per minute
- Token operations: 100 requests per minute
- Burst allowance: 10 requests per second

## Webhook Events

### Token Events

```typescript
interface OAuthTokenEvent {
  event:
    | "oauth.token.created"
    | "oauth.token.refreshed"
    | "oauth.token.revoked";
  userId: string;
  provider: OAuthProvider;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
```

### Connection Events

```typescript
interface OAuthConnectionEvent {
  event: "oauth.connected" | "oauth.disconnected" | "oauth.failed";
  userId: string;
  provider: OAuthProvider;
  timestamp: Date;
  error?: string;
}
```
