/**
 * Mock factories for proxy integration tests
 */

import type { ServerStatus, ServerType, AuthType } from "@tumiki/db";

type MockUserMcpServerInstance = {
  id: string;
  name: string;
  organizationId: string;
  description: string;
  iconPath: string | null;
  serverStatus: ServerStatus;
  serverType: ServerType;
  toolGroupId: string;
  authType: AuthType;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  displayOrder: number;
  toolGroup: {
    id: string;
    toolGroupTools: Array<{
      userMcpServerConfigId: string;
      tool: { id: string; name: string };
    }>;
  };
};

type MockUserMcpServerConfig = {
  id: string;
  name: string;
  organizationId: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  envVars: string;
  oauthConnection: string | null;
  mcpServerId: string;
  mcpServer: {
    command: string;
    args: string[];
  };
};

type MockConfigMetadata = {
  id: string;
  name: string;
  organizationId: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  envVars: string;
  oauthConnection: string | null;
  mcpServerId: string;
};

/**
 * Creates a mock server instance
 */
export const createMockServerInstance = (
  overrides: Partial<MockUserMcpServerInstance> = {},
): MockUserMcpServerInstance => ({
  id: "default-instance-id",
  name: "Default Instance",
  organizationId: "default-org",
  description: "Default test instance",
  iconPath: null,
  serverStatus: "RUNNING",
  serverType: "CUSTOM",
  toolGroupId: "default-tool-group",
  authType: "API_KEY",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  displayOrder: 0,
  toolGroup: {
    id: "default-tool-group",
    toolGroupTools: [],
  },
  ...overrides,
});

/**
 * Creates a mock server config
 */
export const createMockServerConfig = (
  overrides: Partial<MockUserMcpServerConfig> = {},
): MockUserMcpServerConfig => ({
  id: "default-config-id",
  organizationId: "default-org",
  name: "Default Config",
  description: "Default test config",
  createdAt: new Date(),
  updatedAt: new Date(),
  envVars: "{}",
  oauthConnection: null,
  mcpServerId: "default-mcp-id",
  mcpServer: {
    command: "node",
    args: ["default.js"],
  },
  ...overrides,
});

/**
 * Creates mock config metadata array
 */
export const createMockConfigMetadata = (
  configs: Array<{ id: string; updatedAt: Date }> = [],
): MockConfigMetadata[] => {
  return configs.map((config) => ({
    id: config.id || "default-config-id",
    name: "Default Metadata Config",
    organizationId: "default-org",
    description: "Default test metadata config",
    createdAt: new Date(),
    updatedAt: config.updatedAt || new Date(),
    envVars: "{}",
    oauthConnection: null,
    mcpServerId: "default-metadata-mcp-id",
  }));
};
