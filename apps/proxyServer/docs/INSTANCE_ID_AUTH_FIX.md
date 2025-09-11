# Instance ID Authentication Fix

## Issue Description

Claude Code could not connect to MCP Server Instance ID URLs with x-api-key header authentication, receiving 401 errors.

### Problem

The Tumiki proxy server acts as an intermediary between clients (like Claude Code) and backend MCP servers:

```
Claude Code → Tumiki Proxy Server → Backend MCP Server
```

The issue occurred because:
1. Claude Code successfully authenticated to the Tumiki proxy with x-api-key headers
2. However, when the proxy connected to backend MCP servers (SSE transport), it didn't forward authentication headers
3. Backend MCP servers requiring authentication would reject the connection with 401 errors

## Solution Implemented

### SSE Transport Fix

Modified `/apps/proxyServer/src/utils/proxy.ts` to add header forwarding for SSE transport connections:

1. **Environment Variable to Header Mapping**: Added logic to extract authentication credentials from environment variables and map them to appropriate headers:
   - `API_KEY` or `X_API_KEY` → `X-API-Key` header
   - `BEARER_TOKEN` or `AUTHORIZATION` → `Authorization: Bearer` header
   - `X_*` environment variables → corresponding headers

2. **Custom Fetch Implementation**: Created a custom fetch function for SSEClientTransport that includes authentication headers:

```typescript
const customFetch = async (url: string | URL, init: RequestInit) => {
  const finalInit = {
    ...init,
    headers: {
      ...init.headers,
      ...headers, // Include authentication headers
    },
  };
  return fetch(url, finalInit);
};
```

3. **Updated TransportConfigSSE Type**: Added `env` property to support environment variables:

```typescript
export type TransportConfigSSE = {
  type: "sse";
  url: string;
  env?: Record<string, string>; // 環境変数（認証ヘッダー設定用）
};
```

## Testing

### Test Scripts

Two test scripts have been created to verify the authentication fix:

#### 1. Streamable HTTP Transport Test
`scripts/test-instance-id-auth.ts`

Tests Instance ID URL authentication with x-api-key header using StreamableHTTPClientTransport.

```bash
# Run test with environment variables
MCP_INSTANCE_ID=your-instance-id TEST_API_KEY=your-api-key pnpm test:instance-id
```

#### 2. SSE Transport Test
`scripts/test-sse-instance-id-auth.ts`

Tests Instance ID URL authentication with x-api-key header using SSEClientTransport.

```bash
# Run test with environment variables
MCP_INSTANCE_ID=your-instance-id TEST_API_KEY=your-api-key pnpm test:sse-instance-id
```

### Test Process

1. **Start the proxy server**:
```bash
pnpm start
```

2. **Set environment variables**:
```bash
export MCP_INSTANCE_ID=your-actual-instance-id
export TEST_API_KEY=your-actual-api-key
export MCP_PROXY_URL=http://localhost:8080
```

3. **Run tests**:
```bash
# Test Streamable HTTP transport
pnpm test:instance-id

# Test SSE transport
pnpm test:sse-instance-id
```

### Expected Results

When authentication is working correctly:
- ✅ Successfully connected with Instance ID authentication
- ✅ Tools list retrieved successfully
- ✅ Tool calls executed (where applicable)

When authentication fails:
- ❌ 401 Unauthorized error
- Troubleshooting hints provided in error output

## Architecture Overview

### Transport Types

The proxy server supports two levels of transport:

1. **Client to Proxy**: How clients connect to Tumiki
   - Streamable HTTP (`/mcp/{instanceId}`)
   - SSE (`/sse/{instanceId}`)

2. **Proxy to Backend**: How Tumiki connects to actual MCP servers
   - STDIO (command-line based)
   - SSE (with authentication header support)

### Authentication Flow

1. **Client Authentication**: Claude Code sends x-api-key header to Tumiki proxy
2. **Proxy Validation**: Tumiki validates the API key and identifies the MCP server instance
3. **Backend Connection**: Tumiki connects to the backend MCP server
   - For STDIO: Environment variables passed to process
   - For SSE: Headers extracted from env vars and included in HTTP requests

## Limitations

- The fix currently only applies to SSE transport backend connections
- STDIO transport uses environment variables directly (no HTTP headers needed)
- There is no HTTP transport type for backend connections (only SSE and STDIO)

## Future Improvements

1. Support additional authentication methods (OAuth, JWT)
2. Add configuration for custom header mappings
3. Implement connection pooling for better performance
4. Add comprehensive integration tests for all transport combinations