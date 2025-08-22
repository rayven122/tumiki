import { defineUserMcpServerConfigFactory } from "../../../prisma/generated/fabbrica/index.js";
import { McpServerFactory } from "./mcpServer.js";
import { OrganizationFactory } from "./organization.js";

export const UserMcpServerConfigFactory = defineUserMcpServerConfigFactory({
  defaultData: ({ seq }) => ({
    id: `config_test_${seq}`,
    name: `Test Config ${seq}`,
    description: `Test configuration ${seq} for multi-tenancy`,
    envVars: `{"API_KEY": "test_api_key_${seq}"}`,
    mcpServer: McpServerFactory,
    organization: OrganizationFactory,
  }),
});
