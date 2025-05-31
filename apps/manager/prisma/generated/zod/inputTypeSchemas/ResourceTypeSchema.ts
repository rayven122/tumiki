import { z } from 'zod';

export const ResourceTypeSchema = z.enum(['GROUP','MEMBER','ROLE','MCP_SERVER_CONFIG','TOOL_GROUP','MCP_SERVER_INSTANCE']);

export type ResourceTypeType = `${z.infer<typeof ResourceTypeSchema>}`

export default ResourceTypeSchema;
