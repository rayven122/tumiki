import { z } from 'zod';

export const UserMcpServerConfigScalarFieldEnumSchema = z.enum(['id','name','description','envVars','mcpServerId','userId','organizationId','createdAt','updatedAt']);

export default UserMcpServerConfigScalarFieldEnumSchema;
