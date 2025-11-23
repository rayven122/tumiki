import { AuthType, TransportType } from "@prisma/client";

import { defineMcpServerTemplateFactory } from "../../../prisma/generated/fabbrica/index.js";

export const McpServerTemplateFactory = defineMcpServerTemplateFactory({
  defaultData: ({ seq }) => ({
    id: `template_test_${seq}`,
    name: `Test MCP Server Template ${seq}`,
    transportType: TransportType.STDIO,
    authType: AuthType.API_KEY,
    url: `https://test-server-${seq}.com`,
    args: [],
    envVarKeys: ["API_KEY"],
    oauthScopes: [],
  }),
});
