import type { AuthInfo } from "../../utils/session.js";

export const mockApiKey = "tumiki_test_api_key_1234567890";
export const mockBearerToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test";

export const mockOrganization = {
  id: "org_test_123",
  name: "Test Organization",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockMcpServerInstance = {
  id: "mcpserver_test_123",
  userId: "user_test_123",
  organizationId: "org_test_123",
  organization: mockOrganization,
  serverType: "test-server",
  authType: "API_KEY" as const,
  name: "Test MCP Server",
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  mcpServerConfigId: "config_test_123",
  serverParams: {},
  customInstructions: null,
};

export const mockAuthInfoApiKey: AuthInfo = {
  type: "api_key",
  userMcpServerInstanceId: "mcpserver_test_123",
  organizationId: "org_test_123",
};

export const mockAuthInfoOAuth: AuthInfo = {
  type: "oauth",
  userMcpServerInstanceId: "mcpserver_test_123",
  organizationId: "org_test_123",
};

export const mockJsonRpcRequest = {
  jsonrpc: "2.0" as const,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {
      roots: {
        listChanged: true,
      },
    },
    clientInfo: {
      name: "test-client",
      version: "1.0.0",
    },
  },
  id: 1,
};

export const mockJsonRpcResponse = {
  jsonrpc: "2.0" as const,
  result: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    serverInfo: {
      name: "test-server",
      version: "1.0.0",
    },
  },
  id: 1,
};

export const mockJsonRpcError = {
  jsonrpc: "2.0" as const,
  error: {
    code: -32600,
    message: "Invalid Request",
  },
  id: null,
};

export const mockSessionId = "session_test_123";

export const createMockRequest = (overrides = {}) => ({
  headers: {
    "content-type": "application/json",
    "x-client-id": "test-client",
  },
  body: mockJsonRpcRequest,
  method: "POST",
  params: {},
  query: {},
  ip: "127.0.0.1",
  ...overrides,
});

export const createMockAuthenticatedRequest = (
  authInfo: AuthInfo,
  overrides = {},
) => ({
  ...createMockRequest(overrides),
  authInfo,
});
