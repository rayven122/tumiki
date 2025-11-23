import { AuthType, ServerStatus, ServerType } from "@prisma/client";

import { defineMcpServerFactory } from "../../../prisma/generated/fabbrica/index.js";
import { OrganizationFactory } from "./organization.js";

export const McpServerFactory = defineMcpServerFactory({
  defaultData: ({ seq }) => ({
    id: `mcp_test_${seq}`,
    name: `Test MCP Server ${seq}`,
    description: `Test MCP Server ${seq} description`,
    serverStatus: ServerStatus.RUNNING,
    serverType: ServerType.CUSTOM,
    authType: AuthType.API_KEY,
    organization: OrganizationFactory,
  }),
});
