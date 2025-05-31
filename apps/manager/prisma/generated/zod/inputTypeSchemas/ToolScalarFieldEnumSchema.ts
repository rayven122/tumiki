import { z } from 'zod';

export const ToolScalarFieldEnumSchema = z.enum(['id','name','description','inputSchema','isEnabled','mcpServerId','createdAt','updatedAt']);

export default ToolScalarFieldEnumSchema;
