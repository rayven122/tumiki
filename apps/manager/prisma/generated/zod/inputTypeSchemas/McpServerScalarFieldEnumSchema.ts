import { z } from 'zod';

export const McpServerScalarFieldEnumSchema = z.enum(['id','name','iconPath','command','args','envVars','isPublic','createdAt','updatedAt']);

export default McpServerScalarFieldEnumSchema;
