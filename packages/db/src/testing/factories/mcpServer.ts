import { AuthType, TransportType } from "@prisma/client";

import { defineMcpServerFactory } from "../../../prisma/generated/fabbrica/index.js";

export const McpServerFactory = defineMcpServerFactory({
  defaultData: ({ seq }) => ({
    id: `mcp_test_${seq}`,
    name: `Test MCP Server ${seq}`,
    transportType: TransportType.STDIO,
    authType: AuthType.API_KEY,
    url: `https://test-server-${seq}.com`,
    args: [],
    envVars: ["API_KEY"],
    oauthScopes: [],
  }),
});
