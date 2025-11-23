import { defineMcpConfigFactory } from "../../../prisma/generated/fabbrica/index.js";
import { McpServerTemplateFactory } from "./mcpServerTemplate.js";
import { OrganizationFactory } from "./organization.js";

export const McpConfigFactory = defineMcpConfigFactory({
  defaultData: ({ seq }) => ({
    id: `config_test_${seq}`,
    envVars: `{"API_KEY": "test_api_key_${seq}"}`,
    mcpServerTemplate: McpServerTemplateFactory,
    organization: OrganizationFactory,
  }),
});
